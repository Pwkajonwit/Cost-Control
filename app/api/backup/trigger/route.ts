import { NextRequest, NextResponse } from "next/server";
import { executeAndSaveSnapshot, getBackupConfig, getBackupHistory } from "@/lib/backup-service";
import { sendTextMessageDetailed } from "@/lib/line";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let backupType: "manual" | "weekly_auto" | "daily_auto" | "monthly_auto" = "manual";
    try {
      const body = await req.json();
      if (body?.backupType) {
        backupType = body.backupType;
      }
    } catch {}

    const snapshot = await executeAndSaveSnapshot(backupType);
    const config = await getBackupConfig();
    const history = await getBackupHistory();

    // Send LINE alert if notifyLine is enabled
    if (config.notifyLine) {
      try {
        const { data: lineOpt } = await supabaseAdmin
          .from("system_options")
          .select("data")
          .eq("id", "line_config")
          .maybeSingle();

        const lineConfig = lineOpt?.data || {};
        const target = config.targetLineGroup || lineConfig.LINE_GROUP_ID_PW || lineConfig.LINE_USER_ID_OWN;

        if (target) {
          const typeLabel =
            backupType === "weekly_auto" ? "ประจำสัปดาห์ (Weekly Auto)" :
            backupType === "daily_auto" ? "ประจำวัน (Daily Auto)" : "ด้วยตนเอง (Manual)";
          const sizeKb = (snapshot.sizeBytes / 1024).toFixed(1);
          const dateFormatted = new Date(snapshot.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

          const msg = `🛡️ บันทึกสำรองข้อมูลระบบสำเร็จ (${typeLabel})\n` +
            `📅 วันที่: ${dateFormatted}\n` +
            `📦 ข้อมูลทั้งหมด: ${snapshot.totalTables} ตาราง (${snapshot.totalRows.toLocaleString()} รายการ)\n` +
            `💾 ขนาดไฟล์: ${sizeKb} KB\n` +
            `📁 รหัสสำรอง: ${snapshot.id}\n` +
            `✅ สถานะ: สำรองข้อมูลสมบูรณ์พร้อมกู้คืน`;

          await sendTextMessageDetailed(target, msg);
        }
      } catch (lineErr) {
        console.warn("LINE backup alert skipped:", lineErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `สำรองข้อมูลสำเร็จ ${snapshot.totalRows.toLocaleString()} รายการ`,
      snapshot,
      config,
      history
    });
  } catch (error) {
    console.error("Backup trigger failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute backup" },
      { status: 500 }
    );
  }
}
