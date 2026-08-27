import { NextRequest, NextResponse } from "next/server";
import { executeAndSaveSnapshot, getBackupConfig, getBackupHistory } from "@/lib/backup-service";
import { sendTextMessageDetailed } from "@/lib/line";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const config = await getBackupConfig();

    if (!config.enabled) {
      return NextResponse.json({
        success: false,
        message: "ระบบสำรองข้อมูลอัตโนมัติถูกปิดการใช้งาน (Backup is disabled)"
      });
    }

    const backupType =
      config.frequency === "daily" ? "daily_auto" :
      config.frequency === "monthly" ? "monthly_auto" : "weekly_auto";

    const snapshot = await executeAndSaveSnapshot(backupType);
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
            config.frequency === "weekly" ? "ประจำสัปดาห์ (Weekly)" :
            config.frequency === "daily" ? "ประจำวัน (Daily)" : "ประจำเดือน (Monthly)";
          const sizeKb = (snapshot.sizeBytes / 1024).toFixed(1);
          const dateFormatted = new Date(snapshot.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });

          const msg = `🛡️ [อัตโนมัติ] สำรองข้อมูลระบบ ${typeLabel} สำเร็จ\n` +
            `📅 วันที่: ${dateFormatted}\n` +
            `📦 ข้อมูลทั้งหมด: ${snapshot.totalTables} ตาราง (${snapshot.totalRows.toLocaleString()} รายการ)\n` +
            `💾 ขนาดไฟล์: ${sizeKb} KB\n` +
            `📁 รหัสสำรอง: ${snapshot.id}\n` +
            `✅ สถานะ: ปลอดภัย พร้อมกู้คืนในระบบ`;

          await sendTextMessageDetailed(target, msg);
        }
      } catch (lineErr) {
        console.warn("LINE cron alert skipped:", lineErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron automated backup completed successfully (${snapshot.totalRows} rows)`,
      snapshot,
      config,
      history
    });
  } catch (error) {
    console.error("Cron backup failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron backup execution failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
