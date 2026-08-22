import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("system_options")
      .select("*")
      .eq("id", "users_list")
      .maybeSingle();

    if (error) {
      console.warn("⚠️ Failed to fetch users_list from Supabase:", error.message);
      return NextResponse.json({ success: true, users: [] });
    }

    if (data && data.data && Array.isArray(data.data)) {
      return NextResponse.json({ success: true, users: data.data });
    }

    return NextResponse.json({ success: true, users: [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { users } = body;

    if (!Array.isArray(users)) {
      return NextResponse.json({ success: false, error: "Invalid users payload" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("system_options")
      .upsert({
        id: "users_list",
        data: users,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("❌ Failed to save users_list to Supabase:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Automatically synchronize LINE Owner, Approvers, and Closers into line_config
    try {
      let ownerLineId = "";
      const approverLineIds: string[] = [];
      const closerLineIds: string[] = [];

      for (const u of users) {
        if (u.status === "Inactive") continue;
        const lineId = String(u.lineUserId || u.line_user_id || "").trim();
        if (!lineId) continue;

        if (u.isOwner || (!ownerLineId && (u.role === "Admin" || u.role === "Owner"))) {
          ownerLineId = lineId;
        }

        // 🟢 Admin (อนุมัติบิล)
        if (Boolean(u.canApprove) || u.role === "Admin_Approver" || u.role === "Approver") {
          if (!approverLineIds.includes(lineId)) {
            approverLineIds.push(lineId);
          }
        }

        // 🔵 Admin (Approve / ปิดบิล)
        if (Boolean(u.canCloseBill) || u.role === "Admin_Closer") {
          if (!closerLineIds.includes(lineId)) {
            closerLineIds.push(lineId);
          }
        }
      }

      const { data: currentLineCfg } = await supabaseAdmin
        .from("system_options")
        .select("data")
        .eq("id", "line_config")
        .maybeSingle();

      const existingCfg = currentLineCfg?.data || {};
      const updatedLineCfg = {
        ...existingCfg,
        LINE_USER_ID_OWN: ownerLineId || existingCfg.LINE_USER_ID_OWN || "",
        LINE_USER_ID_APPROVER: approverLineIds.join(",") || existingCfg.LINE_USER_ID_APPROVER || "",
        LINE_USER_ID_CLOSER: closerLineIds.join(",") || existingCfg.LINE_USER_ID_CLOSER || "",
        updated_at: new Date().toISOString()
      };

      await supabaseAdmin.from("system_options").upsert({
        id: "line_config",
        data: updatedLineCfg,
        updated_at: new Date().toISOString()
      });
    } catch (syncErr) {
      console.warn("Auto-sync of LINE owner/approvers warning:", syncErr);
    }

    return NextResponse.json({
      success: true,
      message: "บันทึกข้อมูลผู้ใช้งานระบบและอัปเดตสิทธิ์ผู้อนุมัติ LINE เรียบร้อยแล้ว!"
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

