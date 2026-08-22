import { NextRequest, NextResponse } from "next/server";
import { clearCache } from "@/lib/cache";
import { TABLES } from "@/lib/config";
import { getRows } from "@/lib/db";
import { isCommittedBill } from "@/lib/bill-status";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("refresh") === "1") {
    clearCache("rows:");
  }

  const [dataRows, projectRows] = await Promise.all([
    getRows(TABLES.DATA),
    getRows(TABLES.PROJECT)
  ]);

  const validDataRows = dataRows.filter(isCommittedBill);

  return NextResponse.json({
    dataRows: validDataRows,
    projectRows,
    totalRows: validDataRows.length,
    projectRowsCount: projectRows.length
  });
}

