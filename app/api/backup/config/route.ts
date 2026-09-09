import { NextRequest, NextResponse } from "next/server";
import { getBackupConfig, saveBackupConfig, getBackupHistory } from "@/lib/backup-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getBackupConfig();
    const history = await getBackupHistory();
    return NextResponse.json({
      success: true,
      config,
      history
    });
  } catch (error) {
    console.error("Failed to load backup config:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load backup config" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const updatedConfig = await saveBackupConfig(body);
    const history = await getBackupHistory();

    return NextResponse.json({
      success: true,
      message: "บันทึกการตั้งค่าตารางเวลาสำรองข้อมูลสำเร็จ",
      config: updatedConfig,
      history
    });
  } catch (error) {
    console.error("Failed to save backup config:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save backup config" },
      { status: 500 }
    );
  }
}
