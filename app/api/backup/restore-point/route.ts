import { NextRequest, NextResponse } from "next/server";
import { restoreFromSnapshotId, getBackupHistory } from "@/lib/backup-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const snapshotId = body?.snapshotId;

    if (!snapshotId) {
      return NextResponse.json({ error: "กรุณาระบุรหัสจุดสำรองข้อมูล (snapshotId)" }, { status: 400 });
    }

    const result = await restoreFromSnapshotId(snapshotId);
    const history = await getBackupHistory();

    return NextResponse.json({
      success: true,
      message: result.message,
      totalRestored: result.totalRestored,
      details: result.details,
      history
    });
  } catch (error) {
    console.error("Restore from snapshot failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore backup snapshot" },
      { status: 500 }
    );
  }
}
