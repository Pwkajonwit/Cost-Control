import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function normalizePhone(p?: string) {
  return String(p || "").replace(/\D/g, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, lineUserId, displayName, pictureUrl, phone, employeeId, name, role } = body;
    const cookieStore = await cookies();
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // ==========================================
    // 1. ACTION: LOGIN WITH LINE USER ID
    // ==========================================
    if (action === "login") {
      if (!lineUserId) {
        return NextResponse.json({ success: false, error: "Missing LINE User ID" }, { status: 400 });
      }

      // 1. Search in master_members (Primary Table)
      const { data: member, error: memberErr } = await supabaseAdmin
        .from("master_members")
        .select("*")
        .eq("line_user_id", lineUserId)
        .maybeSingle();

      if (memberErr) {
        console.warn("⚠️ Query master_members by line_user_id error:", memberErr.message);
      }

      let matchedUser: any = null;

      if (member) {
        matchedUser = {
          id: member.id,
          username: member.id,
          displayName: member.nickname || member.full_name || member.id,
          fullName: member.full_name || "",
          phone: member.phone || "",
          role: member.system_role || member.role || "User",
          status: member.status || "Active",
          isOwner: Boolean(member.is_owner),
          canApprove: Boolean(member.can_approve),
          canCloseBill: Boolean(member.can_close_bill),
          canDelete: Boolean(member.can_delete),
          lineUserId: lineUserId,
          pictureUrl: pictureUrl || member.pictureurl || "",
        };

        // Update profile picture if newer from LINE
        if (pictureUrl && member.pictureurl !== pictureUrl) {
          await supabaseAdmin
            .from("master_members")
            .update({ pictureurl: pictureUrl })
            .eq("id", member.id);
        }
      }

      // Fallback: Check system_options.users_list cache
      if (!matchedUser) {
        try {
          const { data: usersOpt } = await supabaseAdmin
            .from("system_options")
            .select("data")
            .eq("id", "users_list")
            .maybeSingle();

          const list = usersOpt?.data || [];
          const found = list.find((u: any) =>
            u.status !== "Inactive" && (
              u.lineUserId === lineUserId ||
              u.line_user_id === lineUserId
            )
          );

          if (found) {
            matchedUser = {
              id: found.id || found.username,
              username: found.username || found.id,
              displayName: found.displayName || found.name || found.id,
              role: found.role || "User",
              status: found.status || "Active",
              phone: found.phone || "",
              isOwner: Boolean(found.isOwner),
              canApprove: Boolean(found.canApprove),
              canCloseBill: Boolean(found.canCloseBill),
              canDelete: Boolean(found.canDelete),
              lineUserId: lineUserId,
              pictureUrl: pictureUrl || found.pictureUrl || "",
            };
          }
        } catch (e) {}
      }

      if (!matchedUser) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
      }

      if (matchedUser.status === "Inactive") {
        return NextResponse.json({ success: false, error: "บัญชีนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ" }, { status: 403 });
      }

      const empId = matchedUser.username || matchedUser.id;
      const userName = matchedUser.displayName || empId;
      const userRole = matchedUser.role || "User";
      const finalPicUrl = pictureUrl || matchedUser.pictureUrl || "";
      const canDelete = Boolean(matchedUser.canDelete);

      cookieStore.set("auth_employee_id", empId, { expires, path: "/" });
      cookieStore.set("auth_name", userName, { expires, path: "/" });
      cookieStore.set("auth_role", userRole, { expires, path: "/" });
      cookieStore.set("auth_can_delete", String(canDelete), { expires, path: "/" });
      if (finalPicUrl) cookieStore.set("auth_picture_url", finalPicUrl, { expires, path: "/" });
      cookieStore.set("auth_line_user_id", lineUserId, { expires, path: "/" });

      return NextResponse.json({
        success: true,
        user: matchedUser,
        message: `ยินดีต้อนรับ ${userName} เข้าสู่ระบบ`
      });
    }

    // ==========================================
    // 2. ACTION: REGISTER / ACCOUNT LINKING VIA PHONE
    // ==========================================
    if (action === "register") {
      if (!lineUserId) {
        return NextResponse.json({ success: false, error: "Missing LINE User ID" }, { status: 400 });
      }
      if (!phone) {
        return NextResponse.json({ success: false, error: "กรุณาระบุเบอร์โทรศัพท์เพื่อยืนยันตัวตน" }, { status: 400 });
      }

      const inputPhoneClean = normalizePhone(phone);
      const rawInputTrimmed = String(phone).trim().toLowerCase();

      // 1. Search in master_members (Primary Table)
      const { data: members } = await supabaseAdmin
        .from("master_members")
        .select("*");

      let matchedMember: any = null;

      if (members && Array.isArray(members)) {
        matchedMember = members.find((m: any) => {
          const mPhoneClean = normalizePhone(m.phone || m["เบอร์โทร"] || m["เบอร์โทรศัพท์"]);
          const mIdClean = String(m.id || m["รหัสพนักงาน"] || "").trim().toLowerCase();
          const mNicknameClean = String(m.nickname || m["ชื่อเล่น"] || "").trim().toLowerCase();
          const mFullNameClean = String(m.full_name || m["ชื่อ-นามสกุล"] || "").trim().toLowerCase();

          return (
            (inputPhoneClean && inputPhoneClean.length >= 8 && mPhoneClean && mPhoneClean === inputPhoneClean) ||
            mIdClean === rawInputTrimmed ||
            mNicknameClean === rawInputTrimmed ||
            mFullNameClean === rawInputTrimmed
          );
        });
      }

      if (matchedMember) {
        // Update LINE User ID and pictureurl in master_members
        const updatePayload: Record<string, any> = {
          line_user_id: lineUserId,
        };
        if (pictureUrl) updatePayload.pictureurl = pictureUrl;
        if (!matchedMember.phone && inputPhoneClean) updatePayload.phone = phone.trim();

        await supabaseAdmin
          .from("master_members")
          .update(updatePayload)
          .eq("id", matchedMember.id);

        const empId = matchedMember.id;
        const userName = matchedMember.nickname || matchedMember.full_name || empId;
        const userRole = matchedMember.system_role || matchedMember.role || "User";
        const canDelete = Boolean(matchedMember.can_delete);
        const finalPic = pictureUrl || matchedMember.pictureurl || "";

        // Sync LINE Config for notifications if user is Owner / Approver / Finance
        try {
          if (matchedMember.is_owner || matchedMember.can_approve || matchedMember.can_close_bill) {
            const { data: currentLineCfg } = await supabaseAdmin
              .from("system_options")
              .select("data")
              .eq("id", "line_config")
              .maybeSingle();

            const existingCfg = currentLineCfg?.data || {};
            const updatedLineCfg = { ...existingCfg };

            if (matchedMember.is_owner && !existingCfg.LINE_USER_ID_OWN) {
              updatedLineCfg.LINE_USER_ID_OWN = lineUserId;
            }
            if (matchedMember.can_approve) {
              const approvers = String(existingCfg.LINE_USER_ID_APPROVER || "").split(",").map((s: string) => s.trim()).filter(Boolean);
              if (!approvers.includes(lineUserId)) approvers.push(lineUserId);
              updatedLineCfg.LINE_USER_ID_APPROVER = approvers.join(",");
            }
            if (matchedMember.can_close_bill) {
              const closers = String(existingCfg.LINE_USER_ID_CLOSER || "").split(",").map((s: string) => s.trim()).filter(Boolean);
              if (!closers.includes(lineUserId)) closers.push(lineUserId);
              updatedLineCfg.LINE_USER_ID_CLOSER = closers.join(",");
            }

            await supabaseAdmin.from("system_options").upsert({
              id: "line_config",
              data: updatedLineCfg,
              updated_at: new Date().toISOString()
            });
          }
        } catch (syncErr) {
          console.warn("Failed auto-syncing line_config on linking:", syncErr);
        }

        // Set cookies
        cookieStore.set("auth_employee_id", empId, { expires, path: "/" });
        cookieStore.set("auth_name", userName, { expires, path: "/" });
        cookieStore.set("auth_role", userRole, { expires, path: "/" });
        cookieStore.set("auth_can_delete", String(canDelete), { expires, path: "/" });
        if (finalPic) cookieStore.set("auth_picture_url", finalPic, { expires, path: "/" });
        cookieStore.set("auth_line_user_id", lineUserId, { expires, path: "/" });

        return NextResponse.json({
          success: true,
          isLinked: true,
          user: { ...matchedMember, lineUserId },
          message: `ผูกบัญชี LINE กับพนักงาน "${userName}" (${userRole}) สำเร็จ!`
        });
      }

      // If not found in master_members
      return NextResponse.json({
        success: false,
        error: `ไม่พบข้อมูลเบอร์โทรศัพท์ "${phone}" ในระบบพนักงาน กรุณาระบุเบอร์โทรศัพท์ให้ตรงกับข้อมูลพนักงาน หรือติดต่อผู้ดูแลระบบ`
      }, { status: 404 });
    }

    // ==========================================
    // 3. STANDARD PHONE / EMPLOYEE ID LOGIN
    // ==========================================
    if (!employeeId) {
      return NextResponse.json({ error: "Missing employee ID" }, { status: 400 });
    }

    cookieStore.set("auth_employee_id", employeeId, { expires, path: "/" });
    cookieStore.set("auth_name", name || "", { expires, path: "/" });
    cookieStore.set("auth_role", role || "User", { expires, path: "/" });
    if (pictureUrl) {
      cookieStore.set("auth_picture_url", pictureUrl, { expires, path: "/" });
    }
    if (lineUserId) {
      cookieStore.set("auth_line_user_id", lineUserId, { expires, path: "/" });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to set auth cookies" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_employee_id");
  cookieStore.delete("auth_name");
  cookieStore.delete("auth_role");
  cookieStore.delete("auth_can_delete");
  cookieStore.delete("auth_picture_url");
  cookieStore.delete("auth_line_user_id");
  return NextResponse.json({ success: true });
}


