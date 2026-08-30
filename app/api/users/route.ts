import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("master_members")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.warn("⚠️ Failed to fetch master_members from Supabase:", error.message);
      return NextResponse.json({ success: true, users: [] });
    }

    const users = (data || []).map((m: any) => ({
      id: m.id,
      username: m.id,
      displayName: m.nickname || m.full_name || m.id,
      fullName: m.full_name || "",
      phone: m.phone || "",
      lineUserId: m.line_user_id || "",
      pictureUrl: m.pictureurl || "",
      role: m.system_role || m.role || "User",
      status: m.status || "Active",
      isOwner: Boolean(m.is_owner),
      canApprove: Boolean(m.can_approve),
      canCloseBill: Boolean(m.can_close_bill),
      canDelete: Boolean(m.can_delete),
      bankName: m.bank_name || "",
      bankAccount: m.bank_account || "",
      idCard: m.id_card || "",
      address: m.address || "",
      createdAt: m.created_at || ""
    }));

    return NextResponse.json({ success: true, users });
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

    // 1. Update/Upsert into master_members
    for (const u of users) {
      const uid = String(u.id || u.username || "").trim();
      if (!uid) continue;

      const payload: Record<string, any> = {
        nickname: u.displayName || u.nickname || uid,
        full_name: u.fullName || u.full_name || u.displayName || "",
        phone: u.phone || "",
        line_user_id: u.lineUserId || u.line_user_id || null,
        pictureurl: u.pictureUrl || u.pictureurl || null,
        system_role: u.role || "User",
        role: u.role === "Admin" || u.isOwner ? "Admin" : "User",
        status: u.status || "Active",
        is_owner: Boolean(u.isOwner),
        can_approve: Boolean(u.canApprove),
        can_close_bill: Boolean(u.canCloseBill),
        can_delete: Boolean(u.canDelete),
      };

      if (u.bankName !== undefined) payload.bank_name = u.bankName || null;
      if (u.bankAccount !== undefined) payload.bank_account = u.bankAccount || null;
      if (u.idCard !== undefined) payload.id_card = u.idCard || null;
      if (u.address !== undefined) payload.address = u.address || null;

      const { error: upsertErr } = await supabaseAdmin
        .from("master_members")
        .upsert({ id: uid, ...payload });

      if (upsertErr) {
        console.error(`❌ Failed to update member ${uid}:`, upsertErr);
      }
    }

    // 2. Also keep a synchronized cache in system_options.users_list for backwards compatibility
    try {
      await supabaseAdmin
        .from("system_options")
        .upsert({
          id: "users_list",
          data: users,
          updated_at: new Date().toISOString(),
        });
    } catch (e: any) {
      console.warn("Failed saving cache to users_list:", e);
    }

    // 3. Automatically synchronize LINE Owner, Approvers, and Closers into line_config
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

        // 🟢 Finance (canApprove)
        if (Boolean(u.canApprove) || u.role === "Admin_Approver" || u.role === "Approver") {
          if (!approverLineIds.includes(lineId)) {
            approverLineIds.push(lineId);
          }
        }

        // 🔵 Approver (canCloseBill)
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
      message: "บันทึกข้อมูลพนักงานและอัปเดตสิทธิ์การใช้งานใน master_members เรียบร้อยแล้ว!"
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


