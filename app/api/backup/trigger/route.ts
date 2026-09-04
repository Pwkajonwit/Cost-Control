import { NextRequest, NextResponse } from "next/server";
import { executeAndSaveSnapshot, getBackupConfig, getBackupHistory, sendBackupLineNotification } from "@/lib/backup-service";

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

    await sendBackupLineNotification(snapshot, config, false);

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
