import { NextResponse } from "next/server";
import { generateFullBackupPayload, restoreFromPayload } from "@/lib/backup-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { payload } = await generateFullBackupPayload("manual");
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Backup generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate backup" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await restoreFromPayload(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Backup restore failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore backup" },
      { status: 500 }
    );
  }
}

