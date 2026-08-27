"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileCheck,
  FileText,
  Layers,
  Receipt,
  ShieldCheck,
  Tag,
  User,
  Wrench
} from "lucide-react";
import { BillImageThumbnail } from "@/components/BillImageThumbnail";
import { BillWorkflowActions } from "@/components/BillWorkflowActions";
import { DataTable } from "@/components/tables/DataTable";
import { FormModal } from "@/components/FormModal";
import { BillDocumentModal } from "@/components/documents/BillDocumentModal";
import { money, toNumber } from "@/lib/numbers";
import { isVatActive, parseDeductPercent, parseCreditDays } from "@/lib/project-summary";
import type { SheetRow } from "@/lib/types";
import type { BillDocumentModel } from "@/lib/bill-document";

type BillDetailClientProps = {
  bill: SheetRow;
  decodedBillId: string;
  project: SheetRow[];
  contract: SheetRow[];
  requesterDisplay?: string;
  requesterLink?: string;
  createdByDisplay?: string;
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
  createdByDisplay,
  vendorDisplay,
  vendorLink,
  form,
  documentData,
}: BillDetailClientProps) {
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  const billId = billKey(bill) || decodedBillId;
  const projectId = text(bill["ID Project"]);
  const projectName = text(bill["ชื่อ Project"]) || "ไม่ระบุโครงการ";
  const imageValue = bill["รูปถ่ายบิล"];
  const total = toNumber(bill["ยอดเงิน"]);
  const status = text(bill["สถานะ"]) || "รอตั้งเบิก";
  const isApproved = status === "อนุมัติ";
  const isPaid = status === "เบิกแล้ว";

  const hasVat = isVatActive(bill.vat);
  const vatDisplay = text(bill.vat) || (hasVat ? "รวม VAT" : "ไม่มี VAT");

  const deductRate = parseDeductPercent(bill["หัก"]);
  const hasDeduct = deductRate > 0;
  const rawDeductAmt = toNumber(bill["จำนวนหัก"] ?? bill["3เปอร์"] ?? bill["3เปอร์เซ็น"]);
  const deductAmount = rawDeductAmt > 0
    ? rawDeductAmt
    : (hasDeduct ? (hasVat ? (total / 1.07) * (deductRate / 100) : (total * deductRate) / 100) : 0);

  const rawTransfer = toNumber(bill["ยอดโอน"]);
  const transferAmount = rawTransfer > 0 ? rawTransfer : (total - deductAmount);

  const creditDays = parseCreditDays(bill["เครดิต"]);
  const creditDisplay = text(bill["เครดิต"]) || (creditDays > 0 ? `${creditDays} วัน` : "เงินสด");

  const vendor = vendorDisplay || firstText(bill, ["ร้านค้า", "ผู้รับเหมา", "ร้านค้า/ผู้รับเหมา", "ร้าน/บุคคล"]);
  const requester = requesterDisplay || text(bill["ผู้เบิก"]) || "-";
  const createdBy = text(bill["ผู้สร้างบิล"] || bill["created_by"] || bill["ผู้บันทึก"]) || "-";
  const billNo = text(bill["บิล"] || bill.bill_no) || "-";
  const vendorType = text(bill["ร้านค้า/ผู้รับเหมา"]) || (text(bill["ผู้รับเหมา"]) ? "ผู้รับเหมา" : "ร้านค้า");
  const category = text(bill["ประเภท"] || bill.category) || "-";
  const productOrWork = text(bill["สินค้า/ทำงาน"] || bill["สินค้า"] || bill["รายละเอียดงาน"] || bill.description) || "-";
  const laborStatus = text(bill["statusค่าแรง"]);
  const itemName = text(bill["รายการ"] || bill.sub_category);
  const toolName = text(bill["ชื่อเครื่องมือ"] || bill.tool_name);
  const carPlate = text(bill["ทะเบียน"] || bill.plate_no);
  const staffName = text(bill["ชื่อพนักงาน"] || bill.staff_name);

  const billDate = formatDateThai(bill["ว/ด/ป"] || bill.bill_date);
  const billReceivedDate = formatDateThai(bill["วันได้บิล"] || bill.bill_received_date);
  const whtIssuedDate = formatDateThai(bill["วันออก 3%"] || bill.wht_issued_date);
  const paidDueDate = formatDateThai(bill["วันจ่าย"] || bill.paid_date);
  const createdAtFormatted = formatDateThai(bill.created_at);

  // Expense Breakdown List
  const expenseBreakdown = useMemo(() => {
    const items: Array<{ label: string; value: unknown; extra?: string; isAmount?: boolean }> = [];

    if (hasValue(bill["ค่าของ"])) items.push({ label: "ค่าของ (วัสดุก่อสร้าง)", value: bill["ค่าของ"], isAmount: true });
    if (hasValue(bill["ค่าแรง"])) items.push({ label: "ค่าแรง", value: bill["ค่าแรง"], isAmount: true, extra: laborStatus ? `สถานะ: ${laborStatus}` : undefined });
    if (hasValue(bill["พนักงาน"])) items.push({ label: "ค่าแรงพนักงาน", value: bill["พนักงาน"], isAmount: true, extra: staffName ? `ชื่อ: ${staffName}` : undefined });
    if (hasValue(bill["น้ำมัน"])) items.push({ label: "ค่าน้ำมัน", value: bill["น้ำมัน"], isAmount: true });
    if (hasValue(bill["ซ่อมรถ"])) items.push({ label: "ค่าซ่อมรถ", value: bill["ซ่อมรถ"], isAmount: true, extra: carPlate ? `ทะเบียน: ${carPlate}` : undefined });
    if (hasValue(bill["เครื่องจักร"])) items.push({ label: "ค่าเครื่องจักร", value: bill["เครื่องจักร"], isAmount: true });
    if (hasValue(bill["เครื่องมือ"])) items.push({ label: "ค่าเครื่องมือ", value: bill["เครื่องมือ"], isAmount: true, extra: toolName ? `ชื่อ: ${toolName}` : undefined });
    if (hasValue(bill["อื่นๆ"])) items.push({ label: "ค่าใช้จ่ายอื่นๆ", value: bill["อื่นๆ"], isAmount: true, extra: itemName ? `รายการ: ${itemName}` : undefined });
    if (hasValue(bill["ค่าแรงคงเหลือ"])) items.push({ label: "ค่าแรงคงเหลือของสัญญา", value: bill["ค่าแรงคงเหลือ"], isAmount: true });

    return items;
  }, [bill, laborStatus, itemName, toolName, carPlate, staffName]);

  return (
    <div className="w-full flex flex-col gap-4 p-4 sm:p-6 max-w-[1400px] mx-auto font-sans text-sm text-slate-800">
      {/* 1. HEADER ROW */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3.5 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Link
            href="/bills"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition shrink-0 font-medium px-2 py-1 rounded-md hover:bg-slate-100"
          >
            <ArrowLeft size={14} />
            <span>รายการบิลทั้งหมด</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-900 shrink-0 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            บิล #{billId}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 border ${
              isPaid
                ? "bg-slate-100 text-slate-700 border-slate-300"
                : isApproved
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {status}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition shadow-2xs cursor-pointer"
            title="พิมพ์เอกสารสัญญาจ้าง / ใบสำคัญจ่าย / 50 ทวิ"
          >
            <FileText size={14} className="text-emerald-600 shrink-0" />
            <span>พิมพ์เอกสาร / 50 ทวิ</span>
          </button>
          <BillWorkflowActions row={bill} allowEdit redirectAfterDelete="/bills" />
        </div>
      </div>

      {/* 2. TITLE & META */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">{projectName}</h1>
            {projectId && (
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono font-medium">
                PJ-{projectId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5 flex-wrap">
            <span>คู่ค้า: <strong className="text-slate-800">{vendor}</strong></span>
            <span className="text-slate-300">•</span>
            <span>ผู้เบิก: <strong className="text-slate-800">{requester}</strong></span>
            <span className="text-slate-300">•</span>
            <span>วันที่บิล: <strong className="text-slate-800">{billDate}</strong></span>
            {billNo !== "-" && (
              <>
                <span className="text-slate-300">•</span>
                <span>เลขที่บิล: <strong className="text-slate-800">{billNo}</strong></span>
              </>
            )}
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <span className="text-xs text-slate-400 block font-medium">ยอดเงินเบิกทั้งสิ้น</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900">
            {money(total)} <span className="text-sm font-normal text-slate-500">฿</span>
          </span>
        </div>
      </div>

      {/* 3. 4 KEY FINANCIAL & TERMS KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: ยอดเงินรวม */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>ยอดเงินรวม</span>
            <Receipt size={15} className="text-slate-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900">{money(total)} ฿</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">{category}</div>
        </div>

        {/* Card 2: ภาษีหัก ณ ที่จ่าย */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>หัก ณ ที่จ่าย</span>
            <ShieldCheck size={15} className="text-amber-500" />
          </div>
          <div className={`text-base sm:text-lg font-bold ${deductAmount > 0 ? "text-amber-600" : "text-slate-700"}`}>
            {deductAmount > 0 ? `-${money(deductAmount)} ฿` : "0.00 ฿"}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {hasDeduct ? `อัตรา ${bill["หัก"]}` : "ไม่มีการหักภาษี"}
          </div>
        </div>

        {/* Card 3: ยอดโอนสุทธิ */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>ยอดโอนสุทธิ</span>
            <Banknote size={15} className="text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-700">{money(transferAmount)} ฿</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {isPaid ? "สถานะ: โอนชำระแล้ว" : "ยอดที่ต้องโอนจริง"}
          </div>
        </div>

        {/* Card 4: เงื่อนไขชำระ & เครดิต */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>เงื่อนไขชำระเงิน</span>
            <CreditCard size={15} className="text-indigo-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900">{creditDisplay}</div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">
            {paidDueDate !== "-" ? `ครบกำหนด: ${paidDueDate}` : "ชำระทันที"}
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT: Left Details & Right Attachments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* LEFT COLUMN: General Info + Expenses + Taxes (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Section 1: ข้อมูลทั่วไปของบิล */}
          <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-xs text-slate-700">
                <FileText size={14} className="text-slate-500" />
                <span>ข้อมูลทั่วไปของบิล</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">#{billId}</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                <span className="text-slate-500 font-medium">เลขที่เอกสาร / บิล:</span>
                <span className="sm:col-span-2 text-slate-900 font-medium">{billNo}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                <span className="text-slate-500 font-medium">วันที่ของบิล (ว/ด/ป):</span>
                <span className="sm:col-span-2 text-slate-900">{billDate}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                <span className="text-slate-500 font-medium">โครงการ:</span>
                <span className="sm:col-span-2 text-slate-900">
                  {projectId ? (
                    <Link href={`/views/project-all?search=${encodeURIComponent(projectId)}`} className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                      <span>[{projectId}] {projectName}</span>
                      <ArrowUpRight size={12} />
                    </Link>
                  ) : (
                    projectName
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                <span className="text-slate-500 font-medium">ร้านค้า / ผู้รับเหมา:</span>
                <span className="sm:col-span-2 text-slate-900">
                  {vendorLink ? (
                    <Link href={vendorLink} className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                      <span>{vendor}</span>
                      <span className="text-slate-400 font-normal">({vendorType})</span>
                      <ArrowUpRight size={12} />
                    </Link>
                  ) : (
                    <span>{vendor} <span className="text-slate-400 font-normal">({vendorType})</span></span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                <span className="text-slate-500 font-medium">หมวดหมู่ค่าใช้จ่าย:</span>
                <span className="sm:col-span-2 text-slate-900 font-medium">{category}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                <span className="text-slate-500 font-medium">สินค้า / ทำงาน:</span>
                <span className="sm:col-span-2 text-slate-900 font-medium">{productOrWork}</span>
              </div>

              {itemName && (
                <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1 bg-amber-50/40">
                  <span className="text-amber-800 font-medium">รายการย่อย (อื่นๆ):</span>
                  <span className="sm:col-span-2 text-slate-900 font-semibold flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs border border-amber-300">
                      {itemName}
                    </span>
                  </span>
                </div>
              )}

              {toolName && (
                <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1 bg-blue-50/40">
                  <span className="text-blue-800 font-medium">ชื่อเครื่องมือ:</span>
                  <span className="sm:col-span-2 text-slate-900 font-semibold flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-xs border border-blue-300">
                      {toolName}
                    </span>
                  </span>
                </div>
              )}

              {carPlate && (
                <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1 bg-slate-50">
                  <span className="text-slate-600 font-medium">หมายเลขทะเบียนรถ:</span>
                  <span className="sm:col-span-2 text-slate-900 font-semibold flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-xs border border-slate-300">
                      {carPlate}
                    </span>
                  </span>
                </div>
              )}

              {staffName && (
                <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1 bg-indigo-50/40">
                  <span className="text-indigo-800 font-medium">ชื่อพนักงาน:</span>
                  <span className="sm:col-span-2 text-slate-900 font-semibold flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-xs border border-indigo-300">
                      {staffName}
                    </span>
                  </span>
                </div>
              )}

              {laborStatus && (
                <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                  <span className="text-slate-500 font-medium">รูปแบบการจ้างค่าแรง:</span>
                  <span className="sm:col-span-2 text-slate-900">
                    <span className={`px-2 py-0.5 rounded text-xs border ${laborStatus === "บริษัท" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                      {laborStatus === "บริษัท" ? "บริษัท (มี VAT)" : "บุคคลธรรมดา (หัก ณ ที่จ่าย)"}
                    </span>
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                <span className="text-slate-500 font-medium">ผู้เบิกเงิน:</span>
                <span className="sm:col-span-2 text-slate-900">
                  {requesterLink ? (
                    <Link href={requesterLink} className="text-indigo-600 hover:underline inline-flex items-center gap-1">
                      <span>{requester}</span>
                      <ArrowUpRight size={12} />
                    </Link>
                  ) : (
                    requester
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                <span className="text-slate-500 font-medium">ผู้สร้าง/บันทึกบิล:</span>
                <div className="sm:col-span-2 flex items-center gap-2 flex-wrap">
                  <span className="text-slate-800 font-medium">{createdByDisplay || createdBy}</span>
                  {(() => {
                    const c = (createdByDisplay || createdBy).toLowerCase().trim();
                    const r = (requesterDisplay || requester).toLowerCase().trim();
                    if (c && r && c !== "-" && r !== "-" && !c.includes(r) && !r.includes(c)) {
                      return (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md border border-sky-200 font-medium">
                          สร้างแทนผู้เบิก
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {createdAtFormatted !== "-" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                  <span className="text-slate-500 font-medium">บันทึกเข้าระบบเมื่อ:</span>
                  <span className="sm:col-span-2 text-slate-500">{createdAtFormatted}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: รายการค่าใช้จ่าย (Expense Breakdown) */}
          <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-xs text-slate-700">
                <Layers size={14} className="text-slate-500" />
                <span>แจกแจงรายการค่าใช้จ่าย</span>
              </div>
              <span className="text-xs font-semibold text-slate-900">{money(total)} ฿</span>
            </div>

            {expenseBreakdown.length > 0 ? (
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  {expenseBreakdown.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-2.5 text-slate-600 font-medium w-[45%]">
                        <div>{item.label}</div>
                        {item.extra && <div className="text-xs text-slate-400 font-normal mt-0.5">{item.extra}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">
                        {item.isAmount ? `${money(item.value)} ฿` : String(item.value)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t border-slate-200">
                    <td className="px-4 py-2.5 text-slate-800">ยอดเงินรวมทั้งสิ้น</td>
                    <td className="px-4 py-2.5 text-right text-slate-900 text-sm">{money(total)} ฿</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs">
                ยอดเงินรวม {money(total)} ฿ (ไม่มีการแจกแจงหมวดย่อยเพิ่มเติม)
              </div>
            )}
          </div>

          {/* Section 3: ภาษี & เงื่อนไขการชำระเงิน */}
          <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-xs text-slate-700">
                <CreditCard size={14} className="text-slate-500" />
                <span>ภาษี & เงื่อนไขการชำระเงิน</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-medium border ${hasVat ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {vatDisplay}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                <span className="text-slate-500 font-medium">ภาษีมูลค่าเพิ่ม (VAT):</span>
                <span className="sm:col-span-2 text-slate-900 font-medium">
                  {vatDisplay}
                </span>
              </div>

              {hasVat && (
                <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                  <span className="text-slate-500 font-medium">วันที่ได้รับใบกำกับภาษี (วันได้บิล):</span>
                  <span className="sm:col-span-2 text-slate-900 flex items-center gap-2">
                    <span>{billReceivedDate}</span>
                    {billReceivedDate !== "-" ? (
                      <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.2 rounded border border-emerald-200 font-medium">ได้รับแล้ว</span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 text-xs px-2 py-0.2 rounded border border-amber-200 font-medium">รอใบกำกับ</span>
                    )}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                <span className="text-slate-500 font-medium">ภาษีหัก ณ ที่จ่าย (หัก):</span>
                <span className="sm:col-span-2 text-slate-900">
                  {hasDeduct ? (
                    <span className="text-amber-700 font-medium">{bill["หัก"]}</span>
                  ) : (
                    <span className="text-slate-500">ไม่มีการหักภาษี</span>
                  )}
                </span>
              </div>

              {hasDeduct && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                    <span className="text-slate-500 font-medium">จำนวนเงินที่หัก (จำนวนหัก):</span>
                    <span className="sm:col-span-2 text-amber-600 font-semibold">{money(deductAmount)} ฿</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                    <span className="text-slate-500 font-medium">วันที่ออกหนังสือ 50 ทวิ (วันออก 3%):</span>
                    <span className="sm:col-span-2 text-slate-900 flex items-center gap-2">
                      <span>{whtIssuedDate}</span>
                      {whtIssuedDate !== "-" ? (
                        <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.2 rounded border border-emerald-200 font-medium">ออกหนังสือแล้ว</span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 text-xs px-2 py-0.2 rounded border border-amber-200 font-medium">รอออกหนังสือ</span>
                      )}
                    </span>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                <span className="text-slate-500 font-medium">ระยะเวลาเครดิต:</span>
                <span className="sm:col-span-2 text-slate-900 font-medium">{creditDisplay}</span>
              </div>

              {paidDueDate !== "-" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1">
                  <span className="text-slate-500 font-medium">วันครบกำหนดชำระ (วันจ่าย):</span>
                  <span className="sm:col-span-2 text-slate-900 font-medium text-indigo-700">{paidDueDate}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 px-4 py-2.5 gap-1 bg-emerald-50/50">
                <span className="text-emerald-900 font-bold">ยอดโอนสุทธิ (ยอดโอน):</span>
                <span className="sm:col-span-2 text-emerald-800 font-bold text-sm">{money(transferAmount)} ฿</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Bill Image & Proof Attachments (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden h-full flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-xs text-slate-700">
                <Receipt size={14} className="text-slate-500" />
                <span>รูปถ่ายบิล & สลิปเอกสารแนบ</span>
              </div>
              {hasValue(imageValue) && (
                <span className="text-xs text-slate-400">คลิกเพื่อดูภาพขยาย</span>
              )}
            </div>

            <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[320px]">
              <BillImageThumbnail value={imageValue} large />
            </div>

            {hasValue(imageValue) && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>เอกสารแนบในระบบ</span>
                <a
                  href={String(imageValue).split(",")[0]?.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                >
                  <span>เปิดรูปขนาดเต็ม</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 5. RELATED PROJECT & CONTRACT WORK TABLES */}
      <div className="space-y-4 mt-2">
        {project.length > 0 && (
          <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-xs text-slate-700">
                <Building2 size={14} className="text-indigo-600" />
                <span>โครงการที่เกี่ยวข้อง ({project.length})</span>
              </div>
              <Link href={`/views/project-all?search=${encodeURIComponent(projectId)}`} className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1">
                <span>ดูรายละเอียดโครงการ</span>
                <ArrowUpRight size={12} />
              </Link>
            </div>
            <DataTable
              columns={["ID Project", "ชื่อ Project", "ยอดงาน", "ยอดรวม vat", "งบไม่เกิน", "วันที่", "รับผิดชอบ"]}
              rows={project}
              title=""
              rowLabel="รายการ"
              limit={5}
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
          <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-medium text-xs text-slate-700">
                <Wrench size={14} className="text-amber-600" />
                <span>สัญญาเปิดจ้างผู้รับเหมาที่เกี่ยวข้อง ({contract.length})</span>
              </div>
              <Link href={`/contract-open`} className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1">
                <span>ดูรายการเปิดจ้างทั้งหมด</span>
                <ArrowUpRight size={12} />
              </Link>
            </div>
            <DataTable
              columns={["id_Conwork", "id_Contractor", "ยอดเงินจ้าง", "ยอดเงินจ่าย", "ค่าแรงคงเหลือ", "รายละเอียดงาน", "วันที่"]}
              rows={contract}
              title=""
              rowLabel="รายการ"
              limit={5}
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
  return value !== null && value !== undefined && String(value).trim() !== "" && String(value).trim() !== "0" && String(value).trim() !== "0.00";
}

function billKey(row: SheetRow) {
  return text(row["ลำดับ"]) || text(row._sheetRow);
}
