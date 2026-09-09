import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { extractMemberPermissions } from "@/lib/user-permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const empId = cookieStore.get("auth_employee_id")?.value;

    if (!empId) {
      return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 });
    }

    const { data: member, error } = await supabaseAdmin
      .from("master_members")
      .select("*")
      .eq("id", empId)
      .maybeSingle();

    if (error || !member) {
      return NextResponse.json({ success: false, error: error?.message || "User not found" }, { status: 404 });
    }

    const perms = extractMemberPermissions(member);

    // Refresh cookies to latest values
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = { expires, path: "/", sameSite: "lax" as const, secure: isProd };

    cookieStore.set("auth_role", perms.role, cookieOptions);
    cookieStore.set("auth_can_delete", String(perms.canDelete), cookieOptions);
    if (perms.displayName) {
      cookieStore.set("auth_name", perms.displayName, cookieOptions);
    }
    if (perms.pictureUrl) {
      cookieStore.set("auth_picture_url", perms.pictureUrl, cookieOptions);
    }

    return NextResponse.json({
      success: true,
      user: perms,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
