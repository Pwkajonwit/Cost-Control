import { NextRequest, NextResponse } from "next/server";
import { clearCache } from "@/lib/cache";
import { TABLES } from "@/lib/config";
import { getRows } from "@/lib/db";
import { isCommittedBill } from "@/lib/bill-status";

export async function GET(request: NextRequest) {
  const isRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  if (isRefresh) {
    clearCache("rows:");
    clearCache("dashboard");
  }

  const [dataRows, projectRows] = await Promise.all([
    getRows(TABLES.DATA),
    getRows(TABLES.PROJECT)
  ]);

  const validDataRows = dataRows.filter(isCommittedBill);

  const response = NextResponse.json({
    dataRows: validDataRows,
    projectRows,
    totalRows: validDataRows.length,
    projectRowsCount: projectRows.length
  });

  // Add Cache-Control header to enable fast client/edge caching while allowing revalidation
  response.headers.set(
    "Cache-Control",
    isRefresh ? "no-store, no-cache, must-revalidate" : "private, max-age=30, stale-while-revalidate=60"
  );

  return response;
}
