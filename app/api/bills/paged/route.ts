import { NextRequest, NextResponse } from "next/server";
import { getBillsPagedFromSupabase } from "@/lib/supabase-db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const projectId = searchParams.get("projectId") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const sortDesc = searchParams.get("sortDesc") !== "false";

    const result = await getBillsPagedFromSupabase({
      page,
      pageSize,
      search,
      status,
      projectId,
      startDate,
      endDate,
      sortDesc,
    });

    return NextResponse.json({
      success: true,
      ...result,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=15",
      }
    });
  } catch (error: any) {
    console.error("GET /api/bills/paged error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
