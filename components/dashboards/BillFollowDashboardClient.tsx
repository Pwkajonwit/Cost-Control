"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  FileCheck,
  Filter,
  Loader2,
  MessageSquare,
  Receipt,
  RotateCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import { money, toNumber } from "@/lib/numbers";
import { formatDateDisplay, normalizeDateToIso } from "@/lib/dates";
import { isVatActive, parseDeductPercent, parseCreditDays } from "@/lib/project-summary";
import { formatVatDisplay, formatDeductDisplay, formatCreditDisplay } from "@/lib/bill-status";
import { useRealtimeSync } from "@/lib/use-realtime-sync";
import type { SheetRow } from "@/lib/types";

const PAGE_SIZE_OPTIONS = [20, 40, 60, 100];

type BillFollowDashboardClientProps = {
  vatRows: SheetRow[];
  naturalDeductRows: SheetRow[];
  companyDeductRows: SheetRow[];
  creditRows: SheetRow[];
  requesterNames: Record<string, string>;
  peopleRows?: SheetRow[];
};

function calculateDaysElapsed(dateVal: unknown): number {
  if (!dateVal) return 0;
  const iso = normalizeDateToIso(dateVal);
  if (!iso) return 0;
  const billDate = new Date(iso);
  if (isNaN(billDate.getTime())) return 0;
  const today = new Date();
  const diffTime = Math.max(0, today.getTime() - billDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function BillFollowDashboardClient({
  vatRows,
  naturalDeductRows,
  companyDeductRows,
  creditRows,
  requesterNames,
  peopleRows = [],
}: BillFollowDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";

  const [activeTab, setActiveTab] = useState<"all" | "vat" | "natural" | "company" | "credit">("all");
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [selectedRequester, setSelectedRequester] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    setSearchTerm(urlSearch);
    setDebouncedSearch(urlSearch);
    setPage(1);
  }, [urlSearch]);

  // Debounce search input by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // High-performance debounced live sync from Supabase PostgreSQL + Local Form Events
  useRealtimeSync({
    channelName: "bill_follow_live_sync",
    tables: ["bills"],
    onSync: () => router.refresh(),
    debounceMs: 700,
    customEvents: ["bills-data-updated", "data-updated"],
  });

  // Quick Action & Notification States
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [completedRowIds, setCompletedRowIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  // Combine rows according to active tab
  const allPendingRows = useMemo(() => {
    const map = new Map<string, SheetRow>();
    [...vatRows, ...naturalDeductRows, ...companyDeductRows, ...creditRows].forEach((row) => {
      const key = String(row._sheetRow || row["ลำดับ"] || Math.random());
      map.set(key, row);
    });
    return Array.from(map.values());
  }, [vatRows, naturalDeductRows, companyDeductRows, creditRows]);

  const activeCategoryRows = useMemo(() => {
    switch (activeTab) {
      case "vat":
        return vatRows;
      case "natural":
        return naturalDeductRows;
      case "company":
        return companyDeductRows;
      case "credit":
        return creditRows;
      default:
        return allPendingRows;
    }
  }, [activeTab, vatRows, naturalDeductRows, companyDeductRows, creditRows, allPendingRows]);

  // Filtered rows by requester, date, and search term
  const filteredRows = useMemo(() => {
    return activeCategoryRows.filter((row) => {
      // Filter by requester
      if (selectedRequester && String(row["ผู้เบิก"] || "").trim() !== selectedRequester) {
        return false;
      }
      // Filter by date
      if (selectedDate) {
        const rowIso = normalizeDateToIso(row["ว/ด/ป"]);
        if (rowIso !== selectedDate) return false;
      }
      // Filter by search
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const match =
          String(row["ลำดับ"] || "").toLowerCase().includes(q) ||
          String(row["ร้าน/บุคคล"] || "").toLowerCase().includes(q) ||
          String(row["ชื่อ Project"] || "").toLowerCase().includes(q) ||
          String(row["สินค้า/ทำงาน"] || row["รายการ"] || "").toLowerCase().includes(q) ||
          String(row["ผู้เบิก"] || "").toLowerCase().includes(q) ||
          String(row["บิล"] || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activeCategoryRows, selectedRequester, selectedDate, debouncedSearch]);

  // Financial totals
  const allPendingTotal = useMemo(() => allPendingRows.reduce((sum, r) => sum + toNumber(r["ยอดเงิน"]), 0), [allPendingRows]);
  const vatTotal = useMemo(() => vatRows.reduce((sum, r) => sum + toNumber(r["ยอดเงิน"]), 0), [vatRows]);
  const naturalTotal = useMemo(() => naturalDeductRows.reduce((sum, r) => sum + toNumber(r["ยอดเงิน"]), 0), [naturalDeductRows]);
  const companyTotal = useMemo(() => companyDeductRows.reduce((sum, r) => sum + toNumber(r["ยอดเงิน"]), 0), [companyDeductRows]);
  const creditTotal = useMemo(() => creditRows.reduce((sum, r) => sum + toNumber(r["ยอดเงิน"]), 0), [creditRows]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleStart = filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const visibleEnd = Math.min(currentPage * pageSize, filteredRows.length);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleTabChange = (tab: "all" | "vat" | "natural" | "company" | "credit") => {
    setActiveTab(tab);
    setPage(1);
  };

  // Quick Action: Mark Received / Completed
  async function handleMarkReceived(row: SheetRow, targetType: "vat" | "deduct" | "credit" | "all") {
    const sheetRow = row._sheetRow ?? row.id ?? row["ลำดับ"];
    const rowId = String(row["ลำดับ"] || row._sheetRow || "");
    if (!sheetRow) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const updateValues: SheetRow = {};

    if (targetType === "vat" || (targetType === "all" && row.vat && !row["วันได้บิล"])) {
      updateValues["วันได้บิล"] = todayStr;
    }
    if (targetType === "deduct" || (targetType === "all" && row["หัก"] && !row["วันออก 3%"])) {
      updateValues["วันออก 3%"] = todayStr;
    }
    if (targetType === "credit" || (targetType === "all" && row["เครดิต"] && !row["วันจ่าย"])) {
      updateValues["วันจ่าย"] = todayStr;
    }

    if (!Object.keys(updateValues).length) {
      updateValues["วันได้บิล"] = todayStr;
    }
    if (rowId) {
      updateValues["ลำดับ"] = rowId;
    }

    setSavingRowId(rowId);
    // ⚡ Optimistic UI Update: Mark row as completed immediately (< 20ms)
    setCompletedRowIds((prev) => new Set(prev).add(rowId));

    try {
      const res = await fetch("/api/rows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableName: "Data",
          sheetRow,
          values: updateValues,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");

      showToast(`บันทึกได้รับบิลรายการ #${rowId} เรียบร้อยแล้ว`);
      router.refresh();
    } catch (err: any) {
      // 🔄 Rollback optimistic change on error
      setCompletedRowIds((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
      showToast(`เกิดข้อผิดพลาดในการบันทึกสถานะบิล: ${err?.message || "กรุณาลองใหม่อีกครั้ง"}`);
    } finally {
      setSavingRowId(null);
    }
  }

  // Generate LINE follow-up message text
  function generateLineText(row: SheetRow) {
    const billId = String(row["ลำดับ"] || row._sheetRow || "");
    const vendor = String(row["ร้าน/บุคคล"] || "-");
    const project = String(row["ชื่อ Project"] || "-");
    const item = String(row["สินค้า/ทำงาน"] || row["รายการ"] || "-");
    const date = formatDateDisplay(row["ว/ด/ป"]);
    const requesterCode = String(row["ผู้เบิก"] || "").trim();
    const requesterName = requesterNames[requesterCode] || requesterCode || "ผู้เบิก";
    const amount = money(toNumber(row["ยอดเงิน"]));
    const days = calculateDaysElapsed(row["ว/ด/ป"]);

    const conditions = [];
    if (row.vat && !row["วันได้บิล"]) conditions.push(`ใบกำกับภาษี ${formatVatDisplay(row.vat)}`);
    if (row["หัก"] && !row["วันออก 3%"]) conditions.push(`หนังสือ${formatDeductDisplay(row["หัก"])}`);
    if (row["เครดิต"] && !row["วันจ่าย"]) conditions.push(`บิล${formatCreditDisplay(row["เครดิต"])}`);
    const condStr = conditions.join(" / ") || "บิลสินค้า";

    return `📢 แจ้งติดตามเอกสารบิล/ใบเสร็จรับเงิน
----------------------------------
👤 ผู้เบิก: ${requesterName}
🏗️ โครงการ: ${project}
🏪 ร้าน/บุคคล: ${vendor}
📄 เลขที่บิล/ลำดับ: #${billId}
📝 รายการ: ${item}
💰 ยอดเงิน: ${amount} บาท
📅 วันที่รายการ: ${date}
⏳ ค้างเอกสารมาแล้ว: ${days} วัน
📌 เอกสารที่ต้องส่ง: ${condStr}
----------------------------------
รบกวนนำส่งเอกสารต้นฉบับให้ฝ่ายบัญชีด้วยครับ/ค่ะ 🙏`;
  }

  function copyLineText(row: SheetRow) {
    const billId = String(row["ลำดับ"] || row._sheetRow || "");
    const text = generateLineText(row);
    navigator.clipboard.writeText(text);
    setCopiedId(billId);
    showToast(`คัดลอกข้อความติดตามบิล #${billId} สำหรับส่ง LINE แล้ว!`);
    setTimeout(() => setCopiedId(null), 2500);
  }

  // Copy batch summary for selected requester
  function copyRequesterBatchText() {
    if (!selectedRequester || !filteredRows.length) return;
    const reqName = requesterNames[selectedRequester] || selectedRequester;
    let text = `📢 สรุปรายการตามบิลค้างส่งของคุณ ${reqName} (${filteredRows.length} รายการ)\n----------------------------------\n`;

    filteredRows.forEach((r, idx) => {
      const bId = String(r["ลำดับ"] || r._sheetRow || idx + 1);
      const prj = String(r["ชื่อ Project"] || "-");
      const vdr = String(r["ร้าน/บุคคล"] || "-");
      const amt = money(toNumber(r["ยอดเงิน"]));
      const days = calculateDaysElapsed(r["ว/ด/ป"]);
      text += `${idx + 1}. #${bId} - ${prj} (${vdr}) ยอด ${amt} บ. [ค้าง ${days} วัน]\n`;
    });

    text += `----------------------------------\nรบกวนตรวจสอบและส่งเอกสารให้ฝ่ายบัญชีด้วยนะครับ/ค่ะ 🙏`;
    navigator.clipboard.writeText(text);
    showToast(`คัดลอกสรุปรายการตามบิลของคุณ ${reqName} แล้ว!`);
  }

  return (
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 max-w-[1600px] mx-auto font-sans text-sm text-slate-800 relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-3 rounded-md shadow-lg flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span className="text-xs ">{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
            <X size={15} />
          </button>
        </div>
      )}

      {/* 1. EXECUTIVE SUMMARY KPI CARDS (Horizontal Scrollable Tabs on Mobile, Grid on Desktop) */}
      <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-1">
        {/* Card 1: All Bills Total Card */}
        <div
          onClick={() => handleTabChange("all")}
          className={`min-w-[140px] sm:min-w-0 flex-1 rounded-xl p-2.5 sm:p-3 border transition cursor-pointer shadow-2xs shrink-0 active:scale-95 ${
            activeTab === "all"
              ? "border-2 border-[#0b3531] bg-[#f2f9f6] shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs sm:text-xs">
            <span className={`truncate ${activeTab === "all" ? "text-[#0b3531]" : "text-slate-700"}`}>ทั้งหมด</span>
            <span className={`shrink-0 ml-1 font-mono text-xs px-1.5 py-0.2 rounded-full ${
              activeTab === "all" ? "bg-[#0b3531] text-[#d4f54e]" : "bg-slate-100 text-slate-500"
            }`}>{allPendingRows.length}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-sm sm:text-lg truncate ${activeTab === "all" ? "text-[#0b3531]" : "text-slate-900"}`}>{money(allPendingTotal)}</span>
          </div>
        </div>

        {/* Card 2: Vat Card */}
        <div
          onClick={() => handleTabChange("vat")}
          className={`min-w-[140px] sm:min-w-0 flex-1 rounded-xl p-2.5 sm:p-3 border transition cursor-pointer shadow-2xs shrink-0 active:scale-95 ${
            activeTab === "vat"
              ? "border-2 border-[#0b3531] bg-[#f2f9f6] shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs sm:text-xs">
            <span className={`truncate ${activeTab === "vat" ? "text-[#0b3531]" : "text-slate-700"}`}>ตาม VAT</span>
            <span className={`shrink-0 ml-1 font-mono text-xs px-1.5 py-0.2 rounded-full ${
              activeTab === "vat" ? "bg-[#0b3531] text-[#d4f54e]" : "bg-slate-100 text-slate-500"
            }`}>{vatRows.length}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-sm sm:text-lg truncate ${activeTab === "vat" ? "text-[#0b3531]" : "text-slate-900"}`}>{money(vatTotal)}</span>
          </div>
        </div>

        {/* Card 3: Natural Deduct 3% Card */}
        <div
          onClick={() => handleTabChange("natural")}
          className={`min-w-[140px] sm:min-w-0 flex-1 rounded-xl p-2.5 sm:p-3 border transition cursor-pointer shadow-2xs shrink-0 active:scale-95 ${
            activeTab === "natural"
              ? "border-2 border-[#0b3531] bg-[#f2f9f6] shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs sm:text-xs">
            <span className={`truncate ${activeTab === "natural" ? "text-[#0b3531]" : "text-slate-700"}`}>หัก 3% บุคคล</span>
            <span className={`shrink-0 ml-1 font-mono text-xs px-1.5 py-0.2 rounded-full ${
              activeTab === "natural" ? "bg-[#0b3531] text-[#d4f54e]" : "bg-slate-100 text-slate-500"
            }`}>{naturalDeductRows.length}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-sm sm:text-lg truncate ${activeTab === "natural" ? "text-[#0b3531]" : "text-slate-900"}`}>{money(naturalTotal)}</span>
          </div>
        </div>

        {/* Card 4: Company Deduct 3% Card */}
        <div
          onClick={() => handleTabChange("company")}
          className={`min-w-[140px] sm:min-w-0 flex-1 rounded-xl p-2.5 sm:p-3 border transition cursor-pointer shadow-2xs shrink-0 active:scale-95 ${
            activeTab === "company"
              ? "border-2 border-[#0b3531] bg-[#f2f9f6] shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs sm:text-xs">
            <span className={`truncate ${activeTab === "company" ? "text-[#0b3531]" : "text-slate-700"}`}>หัก 3% บริษัท</span>
            <span className={`shrink-0 ml-1 font-mono text-xs px-1.5 py-0.2 rounded-full ${
              activeTab === "company" ? "bg-[#0b3531] text-[#d4f54e]" : "bg-slate-100 text-slate-500"
            }`}>{companyDeductRows.length}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-sm sm:text-lg truncate ${activeTab === "company" ? "text-[#0b3531]" : "text-slate-900"}`}>{money(companyTotal)}</span>
          </div>
        </div>

        {/* Card 5: Credit Card */}
        <div
          onClick={() => handleTabChange("credit")}
          className={`min-w-[140px] sm:min-w-0 flex-1 rounded-xl p-2.5 sm:p-3 border transition cursor-pointer shadow-2xs shrink-0 active:scale-95 ${
            activeTab === "credit"
              ? "border-2 border-[#0b3531] bg-[#f2f9f6] shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs sm:text-xs">
            <span className={`truncate ${activeTab === "credit" ? "text-[#0b3531]" : "text-slate-700"}`}>ตาม เครดิต</span>
            <span className={`shrink-0 ml-1 font-mono text-xs px-1.5 py-0.2 rounded-full ${
              activeTab === "credit" ? "bg-[#0b3531] text-[#d4f54e]" : "bg-slate-100 text-slate-500"
            }`}>{creditRows.length}</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`text-sm sm:text-lg truncate ${activeTab === "credit" ? "text-[#0b3531]" : "text-slate-900"}`}>{money(creditTotal)}</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & ACTION TOOLBAR (Clean High-Efficiency Layout) */}
      <div className="border border-slate-200 rounded-xl md:rounded-md p-2 sm:p-3 bg-white flex flex-col gap-2 text-xs shadow-2xs">
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Universal Search Box */}
          <div className="relative flex items-center flex-1 min-w-0">
            <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none shrink-0" />
            <input
              type="text"
              placeholder="ค้นหาลำดับ, ร้านค้า, Project..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 md:bg-white text-slate-800 text-xs pl-8 pr-7 py-1.5 rounded-lg md:rounded-md border border-slate-200 md:border-slate-300 focus:outline-none focus:bg-white focus:border-slate-400 placeholder:text-slate-400"
            />
            {searchTerm && (
              <X
                size={14}
                className="absolute right-2 text-slate-400 cursor-pointer hover:text-slate-600"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
              />
            )}
          </div>

          {/* Controls: Filter Toggle & Batch LINE Copy */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`md:hidden px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition ${
                showMobileFilters || selectedRequester || selectedDate
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
              }`}
            >
              <Filter size={13} className={showMobileFilters || selectedRequester || selectedDate ? "text-[#d4f54e]" : "text-slate-500"} />
              <span>{showMobileFilters ? "ซ่อน" : "ตัวกรอง"}</span>
            </button>

            {selectedRequester && filteredRows.length > 0 && (
              <button
                type="button"
                onClick={copyRequesterBatchText}
                className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs rounded-lg transition cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs active:scale-95"
                title="คัดลอกข้อความสรุปบิลค้างทั้งหมดของผู้เบิกรายนี้"
              >
                <span>LINE ({filteredRows.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Dropdown Filters (Requester & Date) */}
        <div className={`flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 ${showMobileFilters ? "flex" : "hidden md:flex"}`}>
          {/* Requester dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700 whitespace-nowrap">ผู้เบิก:</span>
            <select
              value={selectedRequester}
              onChange={(e) => {
                setSelectedRequester(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-2 py-1 rounded-md focus:outline-none cursor-pointer"
            >
              <option value="">ทั้งหมด ({allPendingRows.length} รายการ)</option>
              {peopleRows.map((row) => {
                const key = String(row["รหัสพนักงาน"] || row["ชื่อเล่น"] || row._sheetRow || "").trim();
                const label = row["ชื่อเล่น"] ? `${key} - ${row["ชื่อเล่น"]}` : key;
                return key ? (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ) : null;
              })}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700 whitespace-nowrap">วันที่:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-2 py-1 rounded-md focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. WORK TABLE / MOBILE ULTRA-COMPACT CARDS FEED */}
      <div className="md:border md:border-slate-200 md:rounded-md md:bg-white md:overflow-hidden md:shadow-2xs">
        {/* MOBILE ULTRA-COMPACT CARD FEED */}
        <div className="block md:hidden space-y-2">
          {!paginatedRows.length ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium bg-white rounded-xl border border-slate-200 shadow-2xs">
              ไม่พบรายการตามบิลที่ค้นหา
            </div>
          ) : (
            paginatedRows.map((row, index) => {
              const billId = String(row["ลำดับ"] || row._sheetRow || index);
              const vendor = String(row["ร้าน/บุคคล"] || "-");
              const project = String(row["ชื่อ Project"] || "-");
              const item = String(row["สินค้า/ทำงาน"] || row["รายการ"] || "-");
              const date = formatDateDisplay(row["ว/ด/ป"]);
              const requesterCode = String(row["ผู้เบิก"] || "").trim();
              const requesterName = requesterNames[requesterCode] || requesterCode || "-";
              const amount = toNumber(row["ยอดเงิน"]);
              const daysElapsed = calculateDaysElapsed(row["ว/ด/ป"]);

              const hasVat = isVatActive(row.vat);
              const hasDeduct = parseDeductPercent(row["หัก"]) > 0;
              const isCompany = String(row["statusค่าแรง"] || "").trim() === "บริษัท";
              const hasCredit = parseCreditDays(row["เครดิต"]) > 0;

              const isSaving = savingRowId === billId;
              const isCopied = copiedId === billId;
              const isCompleted = completedRowIds.has(billId) || (hasVat && Boolean(row["วันได้บิล"])) || (hasDeduct && Boolean(row["วันออก 3%"])) || (hasCredit && Boolean(row["วันจ่าย"]));

              // Card aging border highlight
              const agingBorderClass =
                daysElapsed >= 15
                  ? "border-l-[3.5px] border-l-rose-500"
                  : daysElapsed >= 8
                  ? "border-l-[3.5px] border-l-amber-500"
                  : "border-l-[3.5px] border-l-slate-300";

              return (
                <div
                  key={`mob-bill-follow-${billId}-${index}`}
                  className={`bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs space-y-1.5 transition ${agingBorderClass}`}
                >
                  {/* Row 1: Bill ID + Project Name ── Amount */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Link
                        href={`/bills/${encodeURIComponent(billId)}`}
                        className="text-xs bg-slate-900 text-white px-1.5 py-0.2 rounded shrink-0 hover:bg-slate-800 active:scale-95 transition"
                        title="ดูรายละเอียดบิล"
                      >
                        #{billId}
                      </Link>
                      <span className="text-xs text-slate-900 truncate">
                        {project}
                      </span>
                    </div>

                    <span className="text-xs sm:text-sm text-slate-900 shrink-0">
                      {money(amount)} <span className="text-xs font-normal text-slate-400">฿</span>
                    </span>
                  </div>

                  {/* Row 2: Vendor • Item • Requester • Date ── Aging Tag */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="text-slate-800 truncate">{vendor}</span>
                      {item && item !== "-" && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 truncate">{item}</span>
                        </>
                      )}
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400 shrink-0">{requesterName}</span>
                    </div>

                    <span className={`px-1.5 py-0.2 rounded text-xs shrink-0 ${
                      daysElapsed >= 15
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : daysElapsed >= 8
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      ค้าง {daysElapsed} วัน
                    </span>
                  </div>

                  {/* Row 3: Conditions Badges ── Quick Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/80">
                    {/* Condition badges */}
                    <div className="flex flex-wrap items-center gap-1">
                      {hasVat && (
                        <span className="px-1.5 py-0.2 rounded text-xs bg-sky-50 text-sky-700 border border-sky-200">
                          {formatVatDisplay(row.vat)}
                        </span>
                      )}
                      {hasDeduct && (
                        <span className="px-1.5 py-0.2 rounded text-xs bg-purple-50 text-purple-700 border border-purple-200">
                          {formatDeductDisplay(row["หัก"])} {isCompany ? "(บ.)" : "(บุคคล)"}
                        </span>
                      )}
                      {hasCredit && (
                        <span className="px-1.5 py-0.2 rounded text-xs bg-orange-50 text-orange-700 border border-orange-200">
                          {formatCreditDisplay(row["เครดิต"])}
                        </span>
                      )}
                    </div>

                    {/* Quick Actions: LINE text & Mark Received */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyLineText(row)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs transition border cursor-pointer active:scale-95 ${
                          isCopied
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200 shadow-2xs"
                        }`}
                        title="คัดลอกข้อความส่ง LINE ติดตาม"
                      >
                        <MessageSquare size={12} />
                      </button>

                      {isCompleted ? (
                        <span className="px-2 py-1 bg-slate-100 text-slate-400 text-xs rounded-lg border border-slate-200">
                          ได้บิลแล้ว
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleMarkReceived(row, (activeTab === "natural" || activeTab === "company") ? "deduct" : activeTab)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs rounded-lg transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
                          title="กดเพื่อบันทึกว่าได้รับบิลแล้ว"
                        >
                          {isSaving ? "บันทึก..." : "ได้บิลแล้ว"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP HIGH-DENSITY TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-xs">
                <th className="py-2.5 px-3 border-r border-slate-200">ลำดับ</th>
                <th className="py-2.5 px-3 border-r border-slate-200">ร้าน/บุคคล</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Project</th>
                <th className="py-2.5 px-3 border-r border-slate-200">สินค้า/ทำงาน</th>
                <th className="py-2.5 px-3 border-r border-slate-200">วันที่</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center">ค้างเอกสาร</th>
                <th className="py-2.5 px-3 border-r border-slate-200">ผู้เบิก</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right">ยอดเงิน</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center">เงื่อนไข</th>
                <th className="py-2.5 px-3 text-center">จัดการตามบิล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.map((row, index) => {
                const billId = String(row["ลำดับ"] || row._sheetRow || index);
                const vendor = String(row["ร้าน/บุคคล"] || "-");
                const project = String(row["ชื่อ Project"] || "-");
                const item = String(row["สินค้า/ทำงาน"] || row["รายการ"] || "-");
                const date = formatDateDisplay(row["ว/ด/ป"]);
                const requesterCode = String(row["ผู้เบิก"] || "").trim();
                const requesterName = requesterNames[requesterCode] || requesterCode || "-";
                const amount = toNumber(row["ยอดเงิน"]);
                const daysElapsed = calculateDaysElapsed(row["ว/ด/ป"]);

                const hasVat = isVatActive(row.vat);
                const hasDeduct = parseDeductPercent(row["หัก"]) > 0;
                const isCompany = String(row["statusค่าแรง"] || "").trim() === "บริษัท";
                const hasCredit = parseCreditDays(row["เครดิต"]) > 0;

                const isSaving = savingRowId === billId;
                const isCopied = copiedId === billId;

                return (
                  <tr key={`${billId}-${index}`} className="hover:bg-slate-50 transition-colors">
                    {/* Sequence */}
                    <td className="py-2 px-3 text-slate-800 border-r border-slate-100">
                      <Link
                        href={`/bills/${encodeURIComponent(billId)}`}
                        className="text-slate-900 hover:underline"
                        title="ดูรายละเอียดบิล"
                      >
                        #{billId}
                      </Link>
                    </td>

                    {/* Vendor */}
                    <td className="py-2 px-3 text-slate-900 border-r border-slate-100">
                      {vendor}
                    </td>

                    {/* Project */}
                    <td className="py-2 px-3 text-slate-700 border-r border-slate-100">
                      {project}
                    </td>

                    {/* Item */}
                    <td className="py-2 px-3 text-slate-700 border-r border-slate-100">
                      {item}
                    </td>

                    {/* Date */}
                    <td className="py-2 px-3 text-slate-500 border-r border-slate-100 whitespace-nowrap">
                      {date}
                    </td>

                    {/* Days Elapsed Aging */}
                    <td className="py-2 px-3 text-center border-r border-slate-100">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        daysElapsed >= 15
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : daysElapsed >= 8
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {daysElapsed} วัน
                      </span>
                    </td>

                    {/* Requester */}
                    <td className="py-2 px-3 text-slate-700 font-medium border-r border-slate-100">
                      {requesterName}
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-3 text-right text-slate-900 border-r border-slate-100">
                      {money(amount)}
                    </td>

                    {/* Conditions */}
                    <td className="py-2 px-3 text-center border-r border-slate-100">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {hasVat && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                            {formatVatDisplay(row.vat)}
                          </span>
                        )}
                        {hasDeduct && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                            {formatDeductDisplay(row["หัก"])} {isCompany ? "(บ.)" : "(บุคคล)"}
                          </span>
                        )}
                        {hasCredit && (
                          <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
                            {formatCreditDisplay(row["เครดิต"])}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions: Mark Received & LINE Copy */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {completedRowIds.has(billId) || (hasVat && Boolean(row["วันได้บิล"])) || (hasDeduct && Boolean(row["วันออก 3%"])) || (hasCredit && Boolean(row["วันจ่าย"])) ? (
                          <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded border border-slate-200 cursor-not-allowed">
                            ได้บิลแล้ว
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleMarkReceived(row, (activeTab === "natural" || activeTab === "company") ? "deduct" : activeTab)}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs rounded transition cursor-pointer disabled:opacity-50"
                            title="กดเพื่อบันทึกว่าได้รับบิลแล้ว"
                          >
                            {isSaving ? "บันทึก..." : "ได้บิลแล้ว"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => copyLineText(row)}
                          className={`p-1 rounded text-xs transition border cursor-pointer ${
                            isCopied
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-600 hover:bg-slate-50 border-slate-300"
                          }`}
                          title="คัดลอกข้อความส่ง LINE ติดตาม"
                        >
                          <MessageSquare size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!paginatedRows.length && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs font-medium">
                    ไม่พบรายการตามบิลที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. SLEEK PAGINATION */}
        {filteredRows.length > 0 && (
          <>
            {/* Mobile Minimal Pagination (Clean Minimal Footer) */}
            <div className="block md:hidden pt-1 pb-3">
              {totalPages <= 1 ? (
                <div className="text-center text-xs text-slate-400 font-medium select-none">
                  • แสดงครบทั้งหมด {filteredRows.length} รายการ •
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 text-xs bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition text-slate-700 flex items-center gap-1 cursor-pointer active:bg-slate-200"
                  >
                    <ChevronLeft size={14} />
                    <span>ก่อนหน้า</span>
                  </button>

                  <span className="text-slate-700 text-xs">
                    หน้า {currentPage} / {totalPages} <span className="font-normal text-slate-400 text-xs">({filteredRows.length} รายการ)</span>
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 transition text-slate-700 flex items-center gap-1 cursor-pointer active:bg-slate-200"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Full Pagination */}
            <div className="hidden md:flex flex-row items-center justify-between gap-3 p-3 border-t border-slate-200 text-xs text-slate-600 bg-slate-50">
              <div>
                แสดง {visibleStart}-{visibleEnd} จาก {filteredRows.length} รายการ
              </div>

              <div className="flex items-center gap-3">
                {/* Rows per page */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium">แสดงต่อหน้า:</span>
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setPageSize(opt);
                        setPage(1);
                      }}
                      className={`px-2 py-0.5 rounded text-xs transition cursor-pointer ${
                        opt === pageSize ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {/* Page prev next navigation */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer text-slate-700"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-slate-800 px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer text-slate-700"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
