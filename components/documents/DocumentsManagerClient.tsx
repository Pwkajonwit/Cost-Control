"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  FileCheck2,
  Receipt,
  Users,
  Building2,
  FolderKanban,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckSquare,
  Square,
  RefreshCw,
  Coins,
  ShieldCheck,
  Percent,
  X
} from "lucide-react";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";
import { BillDocumentModal } from "@/components/documents/BillDocumentModal";
import type { BillDocumentModel } from "@/lib/bill-document";

type DocumentsManagerClientProps = {
  bills: SheetRow[];
  projects: SheetRow[];
  contractors: SheetRow[];
  companies: SheetRow[];
};

export function DocumentsManagerClient({
  bills,
  projects,
  contractors,
  companies,
}: DocumentsManagerClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedContractor, setSelectedContractor] = useState<string>("all");
  const [filterTab, setFilterTab] = useState<"all" | "tax50twi" | "labor" | "approved">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewDocData, setPreviewDocData] = useState<BillDocumentModel | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Fast reference maps for instant lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, SheetRow>();
    projects.forEach((p) => {
      const id = String(p["ID Project"] || p.id || "").trim();
      if (id) map.set(id, p);
    });
    return map;
  }, [projects]);

  const contractorMap = useMemo(() => {
    const map = new Map<string, SheetRow>();
    contractors.forEach((c) => {
      const name = String(c["ชื่อเล่น"] || c["ชื่อ-นามสกุล"] || c["id_Contractor"] || "").trim();
      if (name) map.set(name, c);
    });
    return map;
  }, [contractors]);

  // Filter bills based on search, project, contractor, and filter tab
  const filteredBills = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return bills.filter((b) => {
      const billSeq = String(b["ลำดับ"] || b["ลำดับtest"] || b._sheetRow || "").trim();
      const projId = String(b["ID Project"] || "").trim();
      const projName = String(b["ชื่อ Project"] || "").trim();
      const contractorName = String(b["ร้าน/บุคคล"] || b["ผู้รับเหมา"] || b["ร้านค้า"] || "").trim();
      const jobDesc = String(b["สินค้า/ทำงาน"] || b["รายละเอียดงาน"] || "").trim();
      const taxPercent = toNumber(b["หัก"]);
      const whtAmt = toNumber(b["3เปอร์เซ็น"] || b["จำนวนหัก"]);
      const laborAmt = toNumber(b["ค่าแรง"]);
      const status = String(b["สถานะ"] || "");

      // Tab filter
      if (filterTab === "tax50twi" && taxPercent <= 0 && whtAmt <= 0) {
        return false;
      }
      if (filterTab === "labor" && laborAmt <= 0 && b["ร้านค้า/ผู้รับเหมา"] !== "ผู้รับเหมา" && !String(b["ประเภท"]).includes("ค่าแรง")) {
        return false;
      }
      if (filterTab === "approved" && !status.includes("อนุมัติ") && !status.includes("จ่ายแล้ว") && !status.includes("เสร็จ")) {
        return false;
      }

      // Project filter
      if (selectedProject !== "all" && projId !== selectedProject) {
        return false;
      }

      // Contractor filter
      if (selectedContractor !== "all" && contractorName !== selectedContractor) {
        return false;
      }

      // Search term filter
      if (term) {
        const match =
          billSeq.toLowerCase().includes(term) ||
          projId.toLowerCase().includes(term) ||
          projName.toLowerCase().includes(term) ||
          contractorName.toLowerCase().includes(term) ||
          jobDesc.toLowerCase().includes(term) ||
          status.toLowerCase().includes(term);
        if (!match) return false;
      }

      return true;
    });
  }, [bills, searchTerm, selectedProject, selectedContractor, filterTab]);

  // Key metrics
  const totalBillsCount = bills.length;
  const taxBillsCount = useMemo(
    () => bills.filter((b) => toNumber(b["หัก"]) > 0 || toNumber(b["3เปอร์เซ็น"]) > 0).length,
    [bills]
  );
  const laborBillsCount = useMemo(
    () => bills.filter((b) => toNumber(b["ค่าแรง"]) > 0 || b["ร้านค้า/ผู้รับเหมา"] === "ผู้รับเหมา").length,
    [bills]
  );

  // Selected totals
  const selectedBills = useMemo(() => {
    const idSet = new Set(selectedIds);
    return bills.filter((b) => idSet.has(String(b["ลำดับ"] || b["ลำดับtest"] || b._sheetRow || "")));
  }, [bills, selectedIds]);

  const selectedTotalAmount = useMemo(
    () => selectedBills.reduce((sum, b) => sum + toNumber(b["ยอดเงิน"]), 0),
    [selectedBills]
  );
  const selectedTotalWht = useMemo(
    () => selectedBills.reduce((sum, b) => sum + toNumber(b["3เปอร์เซ็น"] || b["จำนวนหัก"]), 0),
    [selectedBills]
  );

  // Master checkbox selection
  const allFilteredSelected =
    filteredBills.length > 0 &&
    filteredBills.every((b) =>
      selectedIds.includes(String(b["ลำดับ"] || b["ลำดับtest"] || b._sheetRow || ""))
    );

  function toggleSelectAll() {
    if (allFilteredSelected) {
      const filteredSeqSet = new Set(
        filteredBills.map((b) => String(b["ลำดับ"] || b["ลำดับtest"] || b._sheetRow || ""))
      );
      setSelectedIds((prev) => prev.filter((id) => !filteredSeqSet.has(id)));
    } else {
      const newIds = new Set(selectedIds);
      filteredBills.forEach((b) => {
        const id = String(b["ลำดับ"] || b["ลำดับtest"] || b._sheetRow || "");
        if (id) newIds.add(id);
      });
      setSelectedIds(Array.from(newIds));
    }
  }

  function toggleSelectRow(seq: string) {
    setSelectedIds((prev) =>
      prev.includes(seq) ? prev.filter((id) => id !== seq) : [...prev, seq]
    );
  }

  // Quick Single Preview Modal
  async function handleOpenSinglePreview(bill: SheetRow) {
    const seq = String(bill["ลำดับ"] || bill["ลำดับtest"] || bill._sheetRow || "");
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/documents/batch-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billIds: [seq], mode: "all" }),
      });
      const json = await res.json();
      if (json.success && json.documents && json.documents[0]) {
        setPreviewDocData(json.documents[0]);
        setPreviewModalOpen(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPreview(false);
    }
  }

  // Batch Print Navigation
  function handleBatchPrint(mode: "all" | "tax50twi" | "contract" | "voucher") {
    if (selectedIds.length === 0) return;
    const url = `/documents/print?ids=${encodeURIComponent(selectedIds.join(","))}&mode=${mode}`;
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen bg-slate-100/70 p-4 sm:p-6 lg:p-8 space-y-6 pb-28 font-sans font-normal text-slate-800">
      {/* 1. TOP HEADER & KPI CARDS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <FileText size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                ศูนย์จัดการพิมพ์เอกสาร & 50 ทวิ
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              เลือกบิลเพื่อพิมพ์สัญญาจ้างเหมา, ใบสำคัญจ่าย, และหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) ทีละหลายรายการ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer shadow-2xs"
            >
              <X size={14} />
              <span>ล้างการเลือก</span>
            </button>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer shadow-xs"
            >
              <CheckSquare size={14} />
              <span>{allFilteredSelected ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมดที่แสดง"}</span>
            </button>
          </div>
        </div>

        {/* 4 KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>บิลทั้งหมดในระบบ</span>
              <Receipt size={16} className="text-slate-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
              {totalBillsCount}
              <span className="text-xs text-slate-500 font-normal ml-1">รายการ</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>มีหัก ณ ที่จ่าย (50 ทวิ)</span>
              <FileCheck2 size={16} className="text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono">
              {taxBillsCount}
              <span className="text-xs text-emerald-600 font-normal ml-1">รายการ</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>บิลค่าแรง / รับเหมา</span>
              <Users size={16} className="text-indigo-600" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-indigo-700 font-mono">
              {laborBillsCount}
              <span className="text-xs text-indigo-600 font-normal ml-1">รายการ</span>
            </div>
          </div>

          <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
              <span>เลือกพิมพ์อยู่ขณะนี้</span>
              <Printer size={16} className="text-emerald-700" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-900 font-mono flex items-baseline gap-1.5">
              <span>{selectedIds.length}</span>
              <span className="text-xs font-normal text-emerald-700">รายการ</span>
              {selectedTotalAmount > 0 && (
                <span className="text-xs text-emerald-800 ml-auto font-sans font-medium">
                  ฿{money(selectedTotalAmount)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER TABS & SEARCH CONTROLS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 space-y-3">
        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                filterTab === "all"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              บิลทั้งหมด ({bills.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("tax50twi")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                filterTab === "tax50twi"
                  ? "bg-emerald-700 text-white shadow-2xs"
                  : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
              }`}
            >
              <FileCheck2 size={14} />
              <span>มีหักภาษี 50 ทวิ ({taxBillsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("labor")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                filterTab === "labor"
                  ? "bg-indigo-700 text-white shadow-2xs"
                  : "text-indigo-800 bg-indigo-50 hover:bg-indigo-100"
              }`}
            >
              <Users size={14} />
              <span>ค่าแรง/รับเหมา ({laborBillsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("approved")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium ${
                filterTab === "approved"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ShieldCheck size={14} />
              <span>อนุมัติแล้ว</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 font-mono shrink-0 hidden sm:inline">
            แสดง {filteredBills.length} จาก {bills.length} บิล
          </span>
        </div>

        {/* Search & Select dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-1 lg:col-span-2 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเลขที่บิล, ชื่อโครงการ, ผู้รับเหมา, รายละเอียดงาน..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-lg text-xs transition outline-none"
            />
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-lg text-xs transition outline-none cursor-pointer"
            >
              <option value="all">ทุกโครงการ ({projects.length})</option>
              {projects.map((p) => {
                const id = String(p["ID Project"] || p.id || "").trim();
                const name = String(p["ชื่อ Project"] || "").trim();
                return (
                  <option key={id} value={id}>
                    {id ? `[${id}] ` : ""}{name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Contractor Filter */}
          <div>
            <select
              value={selectedContractor}
              onChange={(e) => setSelectedContractor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-800 rounded-lg text-xs transition outline-none cursor-pointer"
            >
              <option value="all">ทุกผู้รับเหมา/ร้านค้า ({contractors.length})</option>
              {contractors.map((c) => {
                const name = String(c["ชื่อเล่น"] || c["ชื่อ-นามสกุล"] || c["id_Contractor"] || "").trim();
                return (
                  <option key={name} value={name}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* 3. MULTI-SELECT BILLS DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 accent-slate-900 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-20">เลขที่บิล</th>
                <th className="py-3 px-3 w-24">วันที่บิล</th>
                <th className="py-3 px-3 min-w-[140px]">โครงการ</th>
                <th className="py-3 px-3 min-w-[150px]">ผู้รับเหมา / ร้านค้า</th>
                <th className="py-3 px-3 min-w-[160px]">รายละเอียดงาน</th>
                <th className="py-3 px-3 text-right w-28">ยอดเงินเบิก</th>
                <th className="py-3 px-3 text-center w-28">หัก ณ ที่จ่าย</th>
                <th className="py-3 px-3 text-right w-28">ยอดสุทธิ</th>
                <th className="py-3 px-3 text-center w-24">สถานะ</th>
                <th className="py-3 px-3 text-center w-28">คำสั่งพิมพ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 text-xs">
                    ไม่พบรายการบิลที่ตรงตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredBills.map((row) => {
                  const seq = String(row["ลำดับ"] || row["ลำดับtest"] || row._sheetRow || "");
                  const isSelected = selectedIds.includes(seq);
                  const projName = String(row["ชื่อ Project"] || "-");
                  const contractorName = String(row["ร้าน/บุคคล"] || row["ผู้รับเหมา"] || row["ร้านค้า"] || "-");
                  const jobDesc = String(row["สินค้า/ทำงาน"] || row["รายละเอียดงาน"] || "-");
                  const dateStr = String(row["ว/ด/ป"] || row["วันได้บิล"] || "-");
                  const baseAmt = toNumber(row["ยอดเงิน"]);
                  const taxPercent = toNumber(row["หัก"]);
                  const whtAmt = toNumber(row["3เปอร์เซ็น"] || row["จำนวนหัก"]);
                  const netAmt = toNumber(row["ยอดโอน"] || (baseAmt - whtAmt));
                  const status = String(row["สถานะ"] || "รออนุมัติ");
                  const isCorporate = String(row["statusค่าแรง"] || "").includes("บริษัท");

                  return (
                    <tr
                      key={seq}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isSelected ? "bg-emerald-50/40" : ""
                      }`}
                      onClick={() => toggleSelectRow(seq)}
                    >
                      {/* Checkbox */}
                      <td
                        className="p-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(seq)}
                          className="w-4 h-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
                        />
                      </td>

                      {/* Bill Sequence */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs">
                          #{seq}
                        </span>
                      </td>

                      {/* Bill Date */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Project */}
                      <td className="py-3 px-3 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5 truncate max-w-xs">
                          <FolderKanban size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{projName}</span>
                        </div>
                      </td>

                      {/* Contractor / Vendor */}
                      <td className="py-3 px-3 text-slate-700">
                        <div className="flex items-center gap-1.5 truncate max-w-xs">
                          <Users size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate font-medium">{contractorName}</span>
                          {isCorporate ? (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded border border-slate-200 shrink-0">
                              บริษัท
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded border border-slate-200 shrink-0">
                              บุคคล
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Job Description */}
                      <td className="py-3 px-3 text-slate-600 truncate max-w-xs" title={jobDesc}>
                        {jobDesc}
                      </td>

                      {/* Base Amount */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">
                        ฿{money(baseAmt)}
                      </td>

                      {/* Withholding Tax */}
                      <td className="py-3 px-3 text-center">
                        {whtAmt > 0 || taxPercent > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                            <span>หัก {taxPercent ? `${taxPercent}%` : "3%"}</span>
                            <span>(฿{money(whtAmt)})</span>
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </td>

                      {/* Net Amount */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                        ฿{money(netAmt)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            status.includes("อนุมัติ") || status.includes("จ่ายแล้ว")
                              ? "bg-emerald-100 text-emerald-800"
                              : status.includes("รอ")
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Row Actions */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenSinglePreview(row)}
                            title="ดูตัวอย่างเอกสาร"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>
                          <a
                            href={`/bills/${encodeURIComponent(seq)}/document`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="เปิดหน้าพิมพ์เดี่ยวในแท็บใหม่"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                          >
                            <Printer size={15} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. FLOATING STICKY BOTTOM BATCH ACTION BAR (Active when items selected) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-950/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left: Summary Count */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-sm">
                  {selectedIds.length}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-100">
                    เลือกแล้ว {selectedIds.length} รายการ
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    ยอดรวม ฿{money(selectedTotalAmount)} {selectedTotalWht > 0 && `(หักภาษี ฿${money(selectedTotalWht)})`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-slate-400 hover:text-rose-400 underline transition cursor-pointer sm:ml-2"
              >
                ยกเลิกทั้งหมด
              </button>
            </div>

            {/* Right: Print Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
              <button
                type="button"
                onClick={() => handleBatchPrint("tax50twi")}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition cursor-pointer shadow-xs active:scale-95"
              >
                <FileCheck2 size={14} />
                <span>พิมพ์ 50 ทวิ ({selectedIds.length} หน้า)</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchPrint("all")}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition cursor-pointer shadow-md active:scale-95"
              >
                <Printer size={15} />
                <span>พิมพ์ชุดเอกสารครบ ({selectedIds.length * 3} หน้า)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE BILL PREVIEW MODAL */}
      {previewModalOpen && previewDocData && (
        <BillDocumentModal
          data={previewDocData}
          isOpen={previewModalOpen}
          onClose={() => {
            setPreviewModalOpen(false);
            setPreviewDocData(null);
          }}
        />
      )}
    </div>
  );
}
