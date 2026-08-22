import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const DEFAULT_USERS = [
  { id: "PT101", username: "PT101", displayName: "คุณแมน", role: "Admin", status: "Active", phone: "081-999-9999", createdAt: "2026-01-01" },
  { id: "PT102", username: "PT102", displayName: "คุณซ้อ", role: "Manager", status: "Active", phone: "081-888-8888", createdAt: "2026-01-01" },
  { id: "PT103", username: "PT103", displayName: "บัญชี/การเงิน", role: "Manager", status: "Active", phone: "081-777-7777", createdAt: "2026-01-02" },
  { id: "PT104", username: "PT104", displayName: "ช่างรับเหมา 1", role: "User", status: "Active", phone: "081-666-6666", createdAt: "2026-01-05" },
];

function normalizePhone(p?: string) {
  return String(p || "").replace(/\D/g, "");
}

async function getUsersList(): Promise<any[]> {
  const { data } = await supabaseAdmin
    .from("system_options")
    .select("data")
    .eq("id", "users_list")
    .maybeSingle();

  if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
    return data.data;
  }
  return DEFAULT_USERS;
}

async function saveUsersList(users: any[]) {
  return await supabaseAdmin
    .from("system_options")
    .upsert({
      id: "users_list",
      data: users,
      updated_at: new Date().toISOString(),
    });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, lineUserId, displayName, pictureUrl, phone } = body;

    if (!lineUserId) {
      return NextResponse.json({ success: false, error: "Missing LINE User ID" }, { status: 400 });
    }

    const users = await getUsersList();
    const cookieStore = await cookies();
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // ==========================================
    // 1. ACTION: LOGIN WITH LINE USER ID
    // ==========================================
    if (action === "login") {
      let matchedUser = users.find(u =>
        u.status === "Active" && (
          u.lineUserId === lineUserId ||
          u.line_user_id === lineUserId
        )
      );

      if (!matchedUser) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
      }

      // Update profile picture if updated on LINE
      if (pictureUrl && matchedUser.pictureUrl !== pictureUrl) {
        matchedUser.pictureUrl = pictureUrl;
        await saveUsersList(users);
      }

      const empId = matchedUser.username || matchedUser.id;
      const name = matchedUser.displayName || matchedUser.name || empId;
      const role = matchedUser.role || "User";

      cookieStore.set("auth_employee_id", empId, { expires, path: "/" });
      cookieStore.set("auth_name", name, { expires, path: "/" });
      cookieStore.set("auth_role", role, { expires, path: "/" });
      if (pictureUrl) cookieStore.set("auth_picture_url", pictureUrl, { expires, path: "/" });
      cookieStore.set("auth_line_user_id", lineUserId, { expires, path: "/" });

      return NextResponse.json({
        success: true,
        user: matchedUser,
        message: `ยินดีต้อนรับ ${name} เข้าสู่ระบบ`
      });
    }

    // ==========================================
    // 2. ACTION: REGISTER / ACCOUNT LINKING VIA PHONE
    // ==========================================
    if (action === "register") {
      if (!phone) {
        return NextResponse.json({ success: false, error: "กรุณาระบุเบอร์โทรศัพท์เพื่อยืนยันตัวตน" }, { status: 400 });
      }

      const inputPhoneClean = normalizePhone(phone);
      if (!inputPhoneClean || inputPhoneClean.length < 9) {
        return NextResponse.json({ success: false, error: "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง" }, { status: 400 });
      }

      // Find if phone exists in existing users (Account Linking)
      const existingUserIndex = users.findIndex(u => {
        const uPhoneClean = normalizePhone(u.phone);
        const uUsernameClean = normalizePhone(u.username);
        const uIdClean = normalizePhone(u.id);
        return inputPhoneClean && (
          (uPhoneClean && uPhoneClean === inputPhoneClean) ||
          (uUsernameClean && uUsernameClean === inputPhoneClean) ||
          (uIdClean && uIdClean === inputPhoneClean)
        );
      });

      if (existingUserIndex !== -1) {
        // CASE A: Account Linking with existing user
        const existingUser = users[existingUserIndex];
        existingUser.lineUserId = lineUserId;
        if (pictureUrl) existingUser.pictureUrl = pictureUrl;
        if (!existingUser.phone) existingUser.phone = phone;

        users[existingUserIndex] = existingUser;
        await saveUsersList(users);

        const empId = existingUser.username || existingUser.id;
        const name = existingUser.displayName || existingUser.name || empId;
        const role = existingUser.role || "User";

        cookieStore.set("auth_employee_id", empId, { expires, path: "/" });
        cookieStore.set("auth_name", name, { expires, path: "/" });
        cookieStore.set("auth_role", role, { expires, path: "/" });
        if (pictureUrl) cookieStore.set("auth_picture_url", pictureUrl, { expires, path: "/" });
        cookieStore.set("auth_line_user_id", lineUserId, { expires, path: "/" });

        return NextResponse.json({
          success: true,
          isLinked: true,
          user: existingUser,
          message: `ผูกบัญชี LINE กับผู้ใช้งาน "${name}" สำเร็จ!`
        });
      }

      // CASE B: New Account Provisioning
      const newUserId = phone;
      const newUser = {
        id: newUserId,
        username: phone,
        displayName: displayName || `ผู้ใช้ LINE (${phone})`,
        role: "User",
        status: "Active",
        phone: phone,
        lineUserId: lineUserId,
        pictureUrl: pictureUrl || "",
        createdAt: new Date().toISOString().slice(0, 10)
      };

      users.push(newUser);
      await saveUsersList(users);

      cookieStore.set("auth_employee_id", newUserId, { expires, path: "/" });
      cookieStore.set("auth_name", newUser.displayName, { expires, path: "/" });
      cookieStore.set("auth_role", "User", { expires, path: "/" });
      if (pictureUrl) cookieStore.set("auth_picture_url", pictureUrl, { expires, path: "/" });
      cookieStore.set("auth_line_user_id", lineUserId, { expires, path: "/" });

      return NextResponse.json({
        success: true,
        isLinked: false,
        user: newUser,
        message: "ลงทะเบียนบัญชีใหม่สำเร็จ!"
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("LINE Auth Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to process LINE authentication" }, { status: 500 });
  }
}
