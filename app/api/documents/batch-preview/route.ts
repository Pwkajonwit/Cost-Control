import { NextRequest, NextResponse } from "next/server";
import { getMultipleBillsDocumentData } from "@/lib/bill-document";
import { renderMultipleBillsDocumentHtml } from "@/lib/document-template-html";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const billIds: string[] = Array.isArray(body.billIds) ? body.billIds : [];
    const mode = (body.mode || "all") as "all" | "contract" | "voucher" | "tax50twi";

    if (!billIds.length) {
      return NextResponse.json({ success: false, error: "กรุณาระบุเลขที่บิลที่ต้องการพิมพ์" }, { status: 400 });
    }

    const docModels = await getMultipleBillsDocumentData(billIds);
    const html = renderMultipleBillsDocumentHtml(docModels, mode);

    return NextResponse.json({
      success: true,
      count: docModels.length,
      documents: docModels,
      html,
    });
  } catch (error) {
    console.error("Error generating batch documents:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้างเอกสาร" },
      { status: 500 }
    );
  }
}
