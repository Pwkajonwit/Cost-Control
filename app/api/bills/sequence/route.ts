import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSystemOptionsFromSupabase, isSupabaseConfigured } from "@/lib/supabase-db";
import { clearCache } from "@/lib/cache";
import { getRows } from "@/lib/db";
import { TABLES } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [rows, options] = await Promise.all([
      getRows(TABLES.DATA, 15_000).catch(() => []),
      getSystemOptionsFromSupabase().catch(() => ({} as Record<string, any>))
    ]);

    const maxFromRows = rows.reduce((max, row) => {
      const first = Number(row["ลำดับtest"] || 0);
      const second = Number(row["ลำดับ"] || 0);
      return Math.max(max, first, second);
    }, 0);

    const configuredStart = Number(
      (options as any)?.["bill_start_sequence"] ||
      (options as any)?.["ลำดับบิลเริ่มต้น"] ||
      1
    );

    const nextSequence = maxFromRows === 0
      ? (configuredStart > 0 ? configuredStart : 1)
      : (configuredStart > maxFromRows ? configuredStart : maxFromRows + 1);

    return NextResponse.json({
      success: true,
      totalBills: rows.length,
      maxBillId: maxFromRows,
      configuredStartSequence: configuredStart,
      nextSequence
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, startSequence } = body;

    if (action === "set_start_sequence") {
      const seqNum = Number(startSequence);
      if (!Number.isFinite(seqNum) || seqNum < 1) {
        return NextResponse.json({ success: false, error: "เลขเริ่มต้นต้องเป็นตัวเลขมากกว่า 0" }, { status: 400 });
      }

      if (isSupabaseConfigured()) {
        const { data: currentOptRow } = await supabaseAdmin
          .from("system_options")
          .select("data")
          .eq("id", "system_options")
          .maybeSingle();

        const currentData = currentOptRow?.data || {};
        currentData["bill_start_sequence"] = seqNum;
        currentData["ลำดับบิลเริ่มต้น"] = seqNum;

        await supabaseAdmin
          .from("system_options")
          .upsert({
            id: "system_options",
            data: currentData,
            updated_at: new Date().toISOString()
          });

        clearCache("sys_opt:all_options");
        clearCache("sys_opt:all");
        clearCache("rows:Data:15000");
        clearCache("rows:Data:5000");
        clearCache("rows:Data:1000");
      }

      return NextResponse.json({
        success: true,
        message: `ตั้งค่าเลขเริ่มต้นบิลเป็น ${seqNum} เรียบร้อยแล้ว`,
        startSequence: seqNum
      });
    }

    if (action === "reset_bills_and_sequence") {
      const seqNum = Number(startSequence) || 1;

      if (isSupabaseConfigured()) {
        // 1. Delete all rows in bills table
        const { error: delError } = await supabaseAdmin
          .from("bills")
          .delete()
          .gt("id", 0);

        if (delError) {
          console.error("Error resetting bills table:", delError);
          return NextResponse.json({ success: false, error: delError.message }, { status: 500 });
        }

        // 2. Clear bill_follow_dates in system_options
        await supabaseAdmin
          .from("system_options")
          .upsert({
            id: "bill_follow_dates",
            data: {},
            updated_at: new Date().toISOString()
          });

        // 3. Update bill_start_sequence in system_options
        const { data: currentOptRow } = await supabaseAdmin
          .from("system_options")
          .select("data")
          .eq("id", "system_options")
          .maybeSingle();

        const currentData = currentOptRow?.data || {};
        currentData["bill_start_sequence"] = seqNum;
        currentData["ลำดับบิลเริ่มต้น"] = seqNum;

        await supabaseAdmin
          .from("system_options")
          .upsert({
            id: "system_options",
            data: currentData,
            updated_at: new Date().toISOString()
          });

        clearCache();
      }

      return NextResponse.json({
        success: true,
        message: `ล้างข้อมูลบิลทั้งหมดและรีเซ็ตเลขเริ่มต้นเป็น ${seqNum} เรียบร้อยแล้ว`,
        nextSequence: seqNum
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
