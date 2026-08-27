import { NextRequest, NextResponse } from "next/server";
import { sendFlexMessageDetailed, sendTextMessageDetailed, createEveningSummaryCarouselFlex } from "@/lib/line";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Check custom target query parameter ?target=...
    const searchTarget = req.nextUrl.searchParams.get("target")?.trim();

    // 2. Fetch dynamic LINE config from Supabase system_options
    const { data: configRow } = await supabaseAdmin
      .from("system_options")
      .select("data")
      .eq("id", "line_config")
      .maybeSingle();

    const config = configRow?.data || {};
    const configuredTime = config.CRON_TIME_EVENING || "17:00";

    // Dynamic resolution of target LINE group / User ID
    const targetGroup =
      searchTarget ||
      config.LINE_GROUP_ID_SUMMARY ||
      config.LINE_GROUP_ID_FINANCE ||
      config.LINE_USER_ID_OWN;

    if (!targetGroup) {
      return NextResponse.json(
        { error: "ไม่พบรหัสปลายทาง! กรุณาระบุรหัสกลุ่มไลน์หรือ User ID ในช่องทดสอบ หรือบันทึกในหน้าตั้งค่าก่อนครับ" },
        { status: 400 }
      );
    }

    // 3. Fetch summary statistics from Supabase PostgreSQL (Bills & Contract Works)
    const [billsRes, worksRes] = await Promise.all([
      supabaseAdmin.from("bills").select("amount, status"),
      supabaseAdmin.from("contract_works").select("*")
    ]);

    const bills = billsRes.data || [];
    const works = worksRes.data || [];

    const totalBills = bills.length;
    const totalAmount = bills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
    const pendingCount = bills.filter((b) => b.status === "รอตรวจสอบ" || b.status === "รออนุมัติ").length;
    const approvedCount = bills.filter((b) => b.status === "อนุมัติแล้ว" || b.status === "จ่ายแล้ว").length;

    const activeWorks = works.filter(w => !String(w.work_details || "").includes("[เสร็จสิ้น]"));
    const activeWorksCount = activeWorks.length;
    const completedWorksCount = works.filter(w => String(w.work_details || "").includes("[เสร็จสิ้น]")).length;

    const lateTasks = activeWorks.slice(0, 5).map(w => ({
      id: w.id,
      details: w.work_details || w.project_name || "งานค้าง",
      assignee: w["ชื่อเล่น"] || w.contractor_name || "ทีมงาน"
    }));

    const todayStr = new Date().toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    // Build 3-Tab Swipable Flex Carousel Card for LINE Evening Summary
    const flexCarousel = createEveningSummaryCarouselFlex({
      dateStr: `${todayStr} (${configuredTime} น.)`,
      totalBills,
      totalAmount,
      pendingCount,
      approvedCount,
      activeWorksCount,
      completedWorksCount,
      lateTasks
    });

    const sendResult = await sendFlexMessageDetailed(
      targetGroup,
      `📊 สรุปรายงานเย็น Multi-Tab Carousel (${todayStr})`,
      flexCarousel
    );

    if (!sendResult.success) {
      let teamSummaryText = `📊 สรุปภาพรวมการเงิน & ผลงานทีม (${todayStr} - ${configuredTime} น.)\n\n`;
      teamSummaryText += `🧾 รายการบิล: ${totalBills} รายการ (รออนุมัติ: ${pendingCount}, อนุมัติแล้ว: ${approvedCount})\n`;
      teamSummaryText += `💰 ยอดเงินรวม: ฿${totalAmount.toLocaleString("th-TH")}\n`;
      teamSummaryText += `👷‍♂️ งานรับเหมา/PW: กำลังทำ ${activeWorksCount} รายการ, เสร็จแล้ว ${completedWorksCount} รายการ`;

      const textResult = await sendTextMessageDetailed(targetGroup, teamSummaryText);
      return NextResponse.json({
        success: textResult.success,
        targetGroup,
        configuredTime,
        fallbackText: true,
        summary: { dateStr: todayStr, totalBills, totalAmount, pendingCount, approvedCount, activeWorksCount, completedWorksCount },
      });
    }

    return NextResponse.json({
      success: true,
      targetGroup,
      configuredTime,
      todayStr,
      summary: { dateStr: todayStr, totalBills, totalAmount, pendingCount, approvedCount, activeWorksCount, completedWorksCount },
      tabs: 3,
    });
  } catch (err: any) {
    console.error("❌ Cron daily summary error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
