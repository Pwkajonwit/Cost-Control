import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { TABLES } from "@/lib/config";
import { getRows } from "@/lib/db";
import { hydrateBillRows } from "@/lib/formulas";
import { getBillDocumentData } from "@/lib/bill-document";
import { BillDocumentPrintClient } from "@/components/documents/BillDocumentPrintClient";

export const dynamic = "force-dynamic";

type BillDocumentPageProps = {
  params: Promise<{ billId: string }>;
};

export default async function BillDocumentPage({ params }: BillDocumentPageProps) {
  const { billId } = await params;
  const decodedBillId = decodeURIComponent(billId).trim();

  const [rawDataRows, rawProjectRows, rawContractRows, storeRows, contractorRows, rawCompanyRows] = await Promise.all([
    getRows(TABLES.DATA).catch(() => []),
    getRows(TABLES.PROJECT).catch(() => []),
    getRows(TABLES.CONTRACT_WORK).catch(() => []),
    getRows(TABLES.STORE).catch(() => []),
    getRows(TABLES.CONTRACTOR).catch(() => []),
    getRows(TABLES.COMPANY).catch(() => []),
  ]);

  const dataRows = await hydrateBillRows(rawDataRows, {
    projects: rawProjectRows,
    stores: storeRows,
    contracts: rawContractRows,
    contractors: contractorRows,
  });

  const bill = dataRows.find(
    (row) =>
      String(row["ลำดับ"] || "").trim() === decodedBillId ||
      String(row._sheetRow || "").trim() === decodedBillId ||
      String(row.id || "").trim() === decodedBillId
  );
  if (!bill) notFound();

  const docData = await getBillDocumentData(bill, {
    projects: rawProjectRows,
    companies: rawCompanyRows,
    contractors: contractorRows,
    bills: dataRows,
  });
  if (!docData) notFound();

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 font-sans">
      {/* TOP ACTION BAR (No Print) */}
      <div className="sticky top-0 z-40 bg-slate-900 text-white px-4 py-3 shadow-md flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <Link
            href={`/bills/${encodeURIComponent(decodedBillId)}`}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
          >
            <ArrowLeft size={14} />
            <span>กลับหน้ารายละเอียดบิล</span>
          </Link>
          <span className="text-slate-500">|</span>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-emerald-400" />
            <h1 className="text-sm text-slate-100 truncate">
              เอกสารสัญญาจ้าง / ใบสำคัญจ่าย / 50 ทวิ (บิล #{docData.billSequence})
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden md:inline">
            โครงการ: <b className="text-slate-200">{docData.project.name}</b>
          </span>
        </div>
      </div>

      {/* PRINT CLIENT WRAPPER */}
      <BillDocumentPrintClient data={docData} />
    </div>
  );
}
