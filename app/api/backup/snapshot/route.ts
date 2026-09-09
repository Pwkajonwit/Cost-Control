import { NextRequest, NextResponse } from "next/server";
import { getBackupSnapshotFile, deleteBackupSnapshot } from "@/lib/backup-service";

export const dynamic = "force-dynamic";

// GET /api/backup/snapshot?id=bk_... -> Download backup file as JSON attachment
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const snapshotId = searchParams.get("id");

    if (!snapshotId) {
      return NextResponse.json({ error: "กรุณาระบุรหัสจุดสำรองข้อมูล (id)" }, { status: 400 });
    }

    const { filename, data } = await getBackupSnapshotFile(snapshotId);
    const arrayBuffer = await data.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });
  } catch (error) {
    console.error("Download snapshot failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download backup snapshot" },
      { status: 500 }
    );
  }
}

// DELETE /api/backup/snapshot?id=bk_... -> Delete snapshot from history and storage
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let snapshotId = searchParams.get("id");

    if (!snapshotId) {
      try {
        const body = await req.json();
        snapshotId = body?.snapshotId || body?.id;
      } catch (_) {}
    }

    if (!snapshotId) {
      return NextResponse.json({ error: "กรุณาระบุรหัสจุดสำรองข้อมูล (id)" }, { status: 400 });
    }

    const result = await deleteBackupSnapshot(snapshotId);

    return NextResponse.json({
      success: true,
      message: result.message,
      history: result.history
    });
  } catch (error) {
    console.error("Delete snapshot failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete backup snapshot" },
      { status: 500 }
    );
  }
}
