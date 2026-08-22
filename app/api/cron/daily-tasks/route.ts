import { NextRequest, NextResponse } from "next/server";
import { sendTextMessageDetailed, sendFlexMessageDetailed, createMorningTasksCarouselFlex } from "@/lib/line";
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
    const configuredTime = config.CRON_TIME_MORNING || "07:30";

    // Dynamic resolution of target LINE group / User ID
    const targetGroup =
      searchTarget ||
      config.LINE_GROUP_ID_TASK ||
      config.LINE_GROUP_ID_PW ||
      config.LINE_USER_ID_OWN;

    if (!targetGroup) {
      return NextResponse.json(
        { error: "ไม่พบรหัสปลายทาง! กรุณาระบุรหัสกลุ่มไลน์หรือ User ID ในช่องทดสอบ หรือบันทึกในหน้าตั้งค่าก่อนครับ" },
        { status: 400 }
      );
    }

    // 3. Fetch active tasks, contract works & pending bills from Supabase PostgreSQL
    const [worksRes, billsRes] = await Promise.all([
      supabaseAdmin.from("contract_works").select("*").order("id", { ascending: false }).limit(15),
      supabaseAdmin.from("bills").select("*").or("status.eq.รออนุมัติ,status.eq.รอตรวจสอบ").limit(10)
    ]);

    const contractWorks = worksRes.data || [];
    const bills = billsRes.data || [];

    const todayStr = new Date().toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const activeTasks = contractWorks.filter(w => !String(w.work_details || "").includes("[เสร็จสิ้น]")).map(t => ({
      id: t.id,
      details: t.work_details || t.project_name || "งานประจำวัน",
      status: "กำลังทำ",
      project: t.project_name || "งานทั่วไป"
    }));

    const activeWorks = contractWorks.map(w => ({
      id: w.id,
      details: w.work_details || w.project_name || "งานเปิดจ้าง",
      contractor: w["ชื่อเล่น"] || w.contractor_name || "-",
      project: w.project_name || "ทั่วไป"
    }));

    const pendingBills = bills.map(b => ({
      id: b.id || b["ลำดับ"],
      requester: b["ผู้เบิก"] || b.requester || "-",
      amount: b["ยอดเงิน"] || b.amount || 0
    }));

    // Build 3-Tab Swipable Flex Carousel Card for LINE
    const flexCarousel = createMorningTasksCarouselFlex({
      dateStr: `${todayStr} (เวลาแจ้งเตือน ${configuredTime} น.)`,
      tasks: activeTasks,
      works: activeWorks,
      pendingBills
    });

    const sendResult = await sendFlexMessageDetailed(
      targetGroup,
      `☀️ รายงานสรุปงานเช้า Multi-Tab Carousel (${todayStr})`,
      flexCarousel
    );

    if (!sendResult.success) {
      // Fallback to text message
      let textMsg = `☀️ รายงานสรุปงานเช้า (${todayStr} - ${configuredTime} น.)\n\n📋 งานค้างทั้งหมด ${activeTasks.length} รายการ:\n\n`;
      activeTasks.slice(0, 8).forEach((w, i) => {
        textMsg += `${i + 1}. [CW${w.id}] ${w.details}\n`;
      });
      const textResult = await sendTextMessageDetailed(targetGroup, textMsg);
      return NextResponse.json({
        success: textResult.success,
        targetGroup,
        configuredTime,
        fallbackText: true,
        activeCount: activeTasks.length,
      });
    }

    return NextResponse.json({
      success: true,
      targetGroup,
      configuredTime,
      todayStr,
      activeCount: activeTasks.length,
      tabs: 3,
    });
  } catch (err: any) {
    console.error("❌ Cron daily tasks error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
