"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { BillImageThumbnail } from "@/components/BillImageThumbnail";
import { BillWorkflowActions } from "@/components/BillWorkflowActions";
import { DataTable } from "@/components/tables/DataTable";
import { FormModal } from "@/components/FormModal";
import { BillDocumentModal } from "@/components/documents/BillDocumentModal";
import { FORM_SCHEMAS } from "@/lib/schemas";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";
import type { BillDocumentModel } from "@/lib/bill-document";

type BillDetailClientProps = {
  bill: SheetRow;
  decodedBillId: string;
  project: SheetRow[];
  contract: SheetRow[];
  requesterDisplay?: string;
  requesterLink?: string;
  vendorDisplay?: string;
  vendorLink?: string;
  form?: any;
  documentData?: BillDocumentModel | null;
};

export function BillDetailClient({
  bill,
  decodedBillId,
  project,
  contract,
  requesterDisplay,
  requesterLink,
  vendorDisplay,
  vendorLink,
  form,
  documentData,
}: BillDetailClientProps) {
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const projectId = text(bill["ID Project"]);
  const projectName = text(bill["ชื่อ Project"]) || "ไม่ระบุโครงการ";
  const imageValue = bill["รูปถ่ายบิล"];
  const total = toNumber(bill["ยอดเงิน"]);
  const status = text(bill["สถานะ"]) || "รออนุมัติ";
  const isApproved = status === "อนุมัติ";
  const isPaid = status === "เบิกแล้ว";
  // ยอดโอนแล้ว = แสดงเฉพาะเมื่อสถานะ "เบิกแล้ว" เท่านั้น
  const transfer = isPaid ? toNumber(bill["ยอดโอน"]) : 0;
  const remaining = total - transfer;
  const vendor = vendorDisplay || firstText(bill, ["ร้านค้า", "ผู้รับเหมา", "ร้านค้า/ผู้รับเหมา", "ร้าน/บุคคล"]);
  const requester = requesterDisplay || text(bill["ผู้เบิก"]) || "-";
  const rawBillDate = firstText(bill, ["ว/ด/ป", "วันได้บิล"]);
  const billDate = formatDateThai(rawBillDate);
  const expenseItems = useMemo(() => {
    return [
      { label: "รายละเอียดงาน", value: bill["รายละเอียดงาน"] },
      { label: "สินค้า", value: bill["สินค้า"] },
      { label: "รายการ", value: bill["รายการ"] },
      { label: "ค่าของ", value: bill["ค่าของ"], isAmount: true },
      { label: "ค่าแรง", value: bill["ค่าแรง"], isAmount: true },
      { label: "น้ำมัน", value: bill["น้ำมัน"], isAmount: true },
      { label: "ซ่อมรถ", value: bill["ซ่อมรถ"], isAmount: true },
      { label: "ทะเบียนรถ", value: bill["ทะเบียน"] },
      { label: "เครื่องจักร", value: bill["เครื่องจักร"], isAmount: true },
      { label: "เครื่องมือ", value: bill["เครื่องมือ"], isAmount: true },
      { label: "ชื่อเครื่องมือ", value: bill["ชื่อเครื่องมือ"] },
      { label: "อื่นๆ", value: bill["อื่นๆ"], isAmount: true },
    ].filter((item) => hasValue(item.value));
  }, [bill]);

  const paymentItems = useMemo(() => {
    return [
      { label: "VAT", value: bill.vat },
      { label: "หัก ณ ที่จ่าย", value: bill["หัก"] },
      { label: "3 เปอร์เซ็นต์", value: bill["3เปอร์เซ็น"], isAmount: true },
      { label: "เครดิต (วัน)", value: bill["เครดิต"] },
      { label: "ผู้เบิก", value: requester, link: requesterLink },
      { label: "พนักงาน", value: firstText(bill, ["ชื่อพนักงาน", "พนักงาน"]) },
      { label: "วันที่บิล", value: formatDateThai(firstText(bill, ["ว/ด/ป", "วันได้บิล"])) },
      { label: "วันออก 3%", value: formatDateThai(bill["วันออก 3%"]) },
      { label: "วันจ่าย", value: formatDateThai(bill["วันจ่าย"]) },
    ].filter((item) => hasValue(item.value));
  }, [bill, requester, requesterLink]);

  return (
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 max-w-[1400px] mx-auto font-sans text-sm text-slate-800">
      {/* 1. HEADER ROW (Buttons aligned to top-right) */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Link
            href="/bills"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition shrink-0 font-medium"
          >
            <ArrowLeft size={14} />
            <span>รายการบิล</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs text-slate-700 shrink-0">บิล #{billKey(bill) || decodedBillId}</span>
          <span
            className={`px-2 py-0.5 rounded text-xs shrink-0 ${
              isPaid
                ? "bg-slate-100 text-slate-600 border border-slate-200"
                : isApproved
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition shadow-2xs cursor-pointer"
            title="พิมพ์เอกสารสัญญาจ้าง / ใบสำคัญจ่าย / 50 ทวิ"
          >
            <FileText size={14} className="text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">พิมพ์สัญญา / 50 ทวิ</span>
            <span className="sm:hidden">พิมพ์เอกสาร</span>
          </button>
          <BillWorkflowActions row={bill} allowEdit redirectAfterDelete="/bills" />
        </div>
      </div>

      {/* 2. TITLE & META */}
      <div>
        <h1 className="text-lg text-slate-900">{projectName}</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          คู่ค้า: <span className="text-slate-700">{vendor}</span> · ผู้เบิก: <span className="text-slate-700">{requester}</span> · วันที่: <span className="text-slate-700">{billDate}</span>
        </p>
      </div>

      {/* 3. FINANCIAL METRICS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-xs text-slate-400 font-medium mb-1">ยอดเงินรวม</div>
          <div className="text-base text-slate-900">{money(total)}</div>
        </div>
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-xs text-slate-400 font-medium mb-1">ยอดโอนแล้ว</div>
          <div className="text-base text-indigo-700">{money(transfer)}</div>
        </div>
        <div className="border border-slate-200 rounded-md p-3 bg-white">
          <div className="text-xs text-slate-400 font-medium mb-1">ยอดคงเหลือ</div>
          <div className={`text-base ${remaining > 0 ? "text-amber-600" : "text-emerald-700"}`}>
            {money(remaining)}
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT: Details (left) + Image (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left column: expense + payment tables */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Expense Breakdown */}
          <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xs text-slate-700">รายการค่าใช้จ่าย</h2>
            </div>
            {expenseItems.length > 0 ? (
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  {expenseItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-slate-500 font-medium whitespace-nowrap w-[40%]">{item.label}</td>
                      <td className={`px-3 py-2 ${item.isAmount ? "text-slate-900" : "text-slate-800"}`}>
                        {item.isAmount ? money(item.value) : String(item.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs">ไม่มีรายละเอียดค่าใช้จ่ายเพิ่มเติม</div>
            )}
          </div>

          {/* Payment & Tax Details */}
          <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xs text-slate-700">เงื่อนไขการชำระเงิน & ภาษี</h2>
            </div>
            {paymentItems.length > 0 ? (
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  {paymentItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-slate-500 font-medium whitespace-nowrap w-[40%]">{item.label}</td>
                      <td className="px-3 py-2 text-slate-800">
                        {item.link ? (
                          <Link href={item.link} className="text-indigo-600 hover:underline">
                            {String(item.value)}
                          </Link>
                        ) : item.isAmount ? (
                          money(item.value)
                        ) : (
                          String(item.value)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs">ไม่มีเงื่อนไขชำระเงินเพิ่มเติม</div>
            )}
          </div>
        </div>

        {/* Right column: Bill Image — large preview */}
        <div className="lg:col-span-5">
          <div className="border border-slate-200 rounded-md bg-white overflow-hidden h-full">
            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-xs text-slate-700">รูปถ่ายบิล & เอกสารประกอบ</h2>
              {hasValue(imageValue) && (
                <span className="text-xs text-slate-400">คลิกรูปเพื่อขยาย</span>
              )}
            </div>
            <div className="p-3">
              <BillImageThumbnail value={imageValue} large />
            </div>
          </div>
        </div>

      </div>

      {/* 6. RELATED TABLES */}
      <div className="space-y-4">
        {project.length > 0 && (
          <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
            <DataTable
              columns={["ID Project", "ชื่อ Project", "ยอดงาน", "ยอดรวม vat", "งบไม่เกิน", "วันที่", "รับผิดชอบ"]}
              rows={project}
              title="โครงการที่เกี่ยวข้อง"
              rowLabel="รายการ"
              limit={10}
              detailBasePath="/work-status"
              detailKeyColumn="ID Project"
              showDetailColumn={false}
              cellFormatters={{
                "วันที่": (v) => formatDateThai(v),
                "ยอดงาน": (v) => money(v),
                "ยอดรวม vat": (v) => money(v),
                "งบไม่เกิน": (v) => money(v),
              }}
            />
          </div>
        )}

        {contract.length > 0 && (
          <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
            <DataTable
              columns={["id_Conwork", "id_Contractor", "ยอดเงินจ้าง", "ยอดเงินจ่าย", "ค่าแรงคงเหลือ", "รายละเอียดงาน", "วันที่"]}
              rows={contract}
              title="เปิดจ้างที่เกี่ยวข้อง"
              rowLabel="รายการ"
              limit={10}
              detailBasePath="/contract-open"
              detailKeyColumn="id_Conwork"
              showDetailColumn={false}
              cellFormatters={{
                "วันที่": (v) => formatDateThai(v),
                "ยอดเงินจ้าง": (v) => money(v),
                "ยอดเงินจ่าย": (v) => money(v),
                "ค่าแรงคงเหลือ": (v) => money(v),
              }}
            />
          </div>
        )}
      </div>

      {/* EDIT FORM MODAL */}
      <FormModal
        tableName="Data"
        form={form}
        title="แก้ไขบิล"
        submitPath="/api/rows"
        openEventName="open-bill-edit-form"
        hideLauncher
        relaxed
      />

      {/* DOCUMENT PREVIEW & PRINT MODAL */}
      {documentData && (
        <BillDocumentModal
          data={documentData}
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
        />
      )}
    </div>
  );
}

function formatDateThai(value: unknown): string {
  const str = String(value || "").trim();
  if (!str) return "-";
  const m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return str;
}

function text(value: unknown) {
  return String(value || "").trim();
}

function firstText(row: SheetRow, columns: string[]) {
  for (const column of columns) {
    const val = text(row[column]);
    if (val) return val;
  }
  return "";
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function billKey(row: SheetRow) {
  return text(row["ลำดับ"]) || text(row._sheetRow);
}

