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

    return NextResponse.json({ success: true, message: "บันทึกข้อมูลผู้ใช้งานระบบลง Supabase สำเร็จ!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

