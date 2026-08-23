"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronLeft, ChevronRight, Eye, Filter, Search, X } from "lucide-react";
import { FormModal } from "@/components/FormModal";
import { BillWorkflowActions } from "@/components/BillWorkflowActions";
import { BillDetailDrawer } from "@/components/BillDetailDrawer";
import { BillImageThumbnail } from "@/components/BillImageThumbnail";
import { FORM_SCHEMAS } from "@/lib/schemas";
import { formatDateDisplay, normalizeDateToIso, parseDateStrict } from "@/lib/dates";
import { money, toNumber } from "@/lib/numbers";
import { normalizeBillStatus } from "@/lib/bill-status";
import { showConfirm, showToast } from "@/components/ToastProvider";
import type { SheetRow } from "@/lib/types";

type BillsDashboardClientProps = {
  columns: string[];
  initialRows: SheetRow[];
  form?: any;
  isAdmin: boolean;
  peopleRows: SheetRow[];
  search: string;
  page: number;
  pageSize: number;
  sort: "latest" | "oldest";
};

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

export function BillsDashboardClient({
  columns,
  initialRows,
  form,
  isAdmin,
  peopleRows,
  search: initialSearch = "",
  page: initialPage = 1,
  pageSize: initialPageSize = 20,
  sort: initialSort = "latest",
}: BillsDashboardClientProps) {
  const [filters, setFilters] = useState({
    requester: "",
    date: "",
    bill: "",
    status: "",
    search: initialSearch,
  });

  useEffect(() => {
    setFilters(prev => ({ ...prev, search: initialSearch }));
  }, [initialSearch]);

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortDesc, setSortDesc] = useState(initialSort === "latest");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Bill Detail Drawer State
  const [selectedDetailIndex, setSelectedDetailIndex] = useState<number | null>(null);

  const requesterNames = useMemo(() => {
    return peopleRows.reduce<Record<string, string>>((names, row) => {
      const key = String(row["รหัสพนักงาน"] || row["ชื่อเล่น"] || "").trim();
      const name = String(row["ชื่อเล่น"] || "").trim();
      if (key && name) names[key] = name;
      return names;
    }, {});
  }, [peopleRows]);

  const filteredRows = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const requester = filters.requester.trim();
    const bill = filters.bill.trim();
    const status = filters.status.trim();
    const filterDateIso = filters.date.trim();

    return initialRows.filter(row => {
      if (requester && String(row["ผู้เบิก"] || "").trim() !== requester) return false;
      if (bill && String(row["บิล"] || "").trim() !== bill) return false;
      if (status && String(row["สถานะ"] || "").trim() !== status) return false;
      if (filterDateIso) {
        const rowIso = normalizeDateToIso(row["ว/ด/ป"]);
        if (rowIso !== filterDateIso) return false;
      }
      if (query) {
        const found = Object.values(row).some(v => String(v || "").toLowerCase().includes(query));
        if (!found) return false;
      }
      return true;
    }).sort((a, b) => {
      const seqA = Number(a._sheetRow || a["ลำดับ"] || a.id || 0);
      const seqB = Number(b._sheetRow || b["ลำดับ"] || b.id || 0);
      return sortDesc ? seqB - seqA : seqA - seqB;
    });
  }, [initialRows, filters, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleRows = filteredRows.slice(pageStart, pageStart + pageSize);
  const visibleStart = visibleRows.length ? pageStart + 1 : 0;
  const visibleEnd = pageStart + visibleRows.length;

  const totalAmount = filteredRows.reduce((sum, row) => sum + toNumber(row["ยอดเงิน"]), 0);
  const approvedAmount = filteredRows
    .filter(row => {
      const st = normalizeBillStatus(row["สถานะ"]);
      return st === "อนุมัติ" || st === "เบิกแล้ว";
    })
    .reduce((sum, row) => sum + toNumber(row["ยอดเงิน"]), 0);
  const pendingAmount = totalAmount - approvedAmount;

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  function updateFilter(name: string, value: string) {
    setFilters(cur => ({ ...cur, [name]: value }));
  }

  return (
    <div className="w-full flex flex-col gap-3 p-3 sm:p-5 max-w-[1600px] mx-auto font-sans text-sm text-slate-800">
      {/* 1. EXECUTIVE SUMMARY KPI CARDS (Hidden on Mobile for clean layout) */}
      <div className="hidden md:grid md:grid-cols-4 gap-3">
        <div className="bg-white rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-xs sm:text-xs text-slate-500 block truncate">รายการบิลทั้งหมด</span>
          <div className="text-base sm:text-lg text-slate-900 mt-0.5">{filteredRows.length} รายการ</div>
        </div>

        <div className="bg-white rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-xs sm:text-xs text-slate-500 block truncate">รวมยอดเงินบิล</span>
          <div className="text-base sm:text-lg text-slate-900 mt-0.5">{money(totalAmount)}</div>
        </div>

        <div className="bg-white rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-xs sm:text-xs text-slate-500 block truncate">ยอดอนุมัติ/เบิกแล้ว</span>
          <div className="text-base sm:text-lg text-emerald-700 mt-0.5">{money(approvedAmount)}</div>
        </div>

        <div className="bg-white rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs">
          <span className="text-xs sm:text-xs text-slate-500 block truncate">ยอดรออนุมัติ</span>
          <div className="text-base sm:text-lg text-amber-700 mt-0.5">{money(pendingAmount)}</div>
        </div>
      </div>

      {/* 2. MOBILE QUICK TOOLBAR & STATUS CHIPS (Visible only on Mobile) */}
      <div className="flex md:hidden flex-col gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        {/* Search + Sort row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาบิล, ร้านค้า, โครงการ..."
              value={filters.search}
              onChange={event => updateFilter("search", event.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:bg-white focus:border-slate-400 placeholder:text-slate-400"
            />
            {filters.search && (
              <X size={14} className="absolute right-2 text-slate-400 cursor-pointer" onClick={() => updateFilter("search", "")} />
            )}
          </div>
          <button
            type="button"
            onClick={() => setSortDesc(cur => !cur)}
            className="p-1.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 flex items-center gap-1 text-xs shrink-0 cursor-pointer active:bg-slate-200"
            title="สลับการเรียงลำดับ"
          >
            {sortDesc ? <ArrowDownWideNarrow size={14} /> : <ArrowUpWideNarrow size={14} />}
          </button>
        </div>

        {/* Quick Filter Chips (Horizontal Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => updateFilter("status", "")}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer text-xs ${
              filters.status === ""
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            ทั้งหมด ({initialRows.length})
          </button>
          <button
            type="button"
            onClick={() => updateFilter("status", "รออนุมัติ")}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer text-xs ${
              filters.status === "รออนุมัติ"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
            }`}
          >
            รออนุมัติ
          </button>
          <button
            type="button"
            onClick={() => updateFilter("status", "อนุมัติ")}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer text-xs ${
              filters.status === "อนุมัติ"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
            }`}
          >
            อนุมัติแล้ว
          </button>
          <button
            type="button"
            onClick={() => updateFilter("status", "เบิกแล้ว")}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition cursor-pointer text-xs ${
              filters.status === "เบิกแล้ว"
                ? "bg-slate-700 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            เบิกแล้ว
          </button>
        </div>
      </div>

      {/* 2. DESKTOP FILTER TOOLBAR */}
      <div className="hidden md:flex border border-slate-200 rounded-md p-2.5 bg-white flex-col gap-2 text-xs">
        {/* Search Bar & Controls Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex items-center flex-1">
              <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหา Project, ร้านค้า, รายการ..."
                value={filters.search}
                onChange={event => updateFilter("search", event.target.value)}
                className="w-full bg-white text-slate-800 text-xs pl-8 pr-7 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:border-slate-500 placeholder:text-slate-400"
              />
              {filters.search && (
                <X size={14} className="absolute right-2 text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => updateFilter("search", "")} />
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="md:hidden px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Filter size={13} />
              <span>{showMobileFilters ? "ซ่อนตัวกรอง" : "ตัวกรอง"}</span>
            </button>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 shrink-0 justify-end">
            <button
              type="button"
              onClick={() => setSortDesc(cur => !cur)}
              className="px-2.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              title="สลับการเรียงลำดับ"
            >
              {sortDesc ? <ArrowDownWideNarrow size={14} className="text-slate-600" /> : <ArrowUpWideNarrow size={14} className="text-slate-600" />}
              <span>{sortDesc ? "ล่าสุดก่อน" : "เก่าสุดก่อน"}</span>
            </button>

            <FormModal
              tableName="Data"
              form={form}
              title="เพิ่มบิล"
              buttonLabel="เพิ่มบิล"
              submitPath="/api/bills"
              openEventName="open-bill-form"
            />
          </div>
        </div>

        {/* Expandable Filter Controls */}
        <div className={`flex-wrap items-center gap-2.5 pt-1.5 border-t border-slate-100 md:border-t-0 md:pt-0 ${showMobileFilters ? "flex" : "hidden md:flex"}`}>
          {/* Requester Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700 whitespace-nowrap">ผู้เบิก:</span>
            <select
              value={filters.requester}
              onChange={event => updateFilter("requester", event.target.value)}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-2 py-1 rounded-md focus:outline-none cursor-pointer"
            >
              <option value="">ทั้งหมด</option>
              {peopleRows.map(row => {
                const key = String(row["รหัสพนักงาน"] || row["ชื่อเล่น"] || row._sheetRow || "");
                const label = row["ชื่อเล่น"] ? `${key} - ${row["ชื่อเล่น"]}` : key;
                return key ? <option key={key} value={key}>{label}</option> : null;
              })}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700 whitespace-nowrap">วันที่:</span>
            <input
              type="date"
              value={filters.date}
              onChange={event => updateFilter("date", event.target.value)}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-2 py-1 rounded-md focus:outline-none cursor-pointer"
            />
          </div>

          {/* Bill Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700 whitespace-nowrap">ประเภท:</span>
            <select
              value={filters.bill}
              onChange={event => updateFilter("bill", event.target.value)}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-2 py-1 rounded-md focus:outline-none cursor-pointer"
            >
              <option value="">ทั้งหมด</option>
              <option value="หลัก">หลัก</option>
              <option value="ย่อย">ย่อย</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-700 whitespace-nowrap">สถานะ:</span>
            <select
              value={filters.status}
              onChange={event => updateFilter("status", event.target.value)}
              className="bg-white border border-slate-300 text-xs text-slate-800 px-2 py-1 rounded-md focus:outline-none cursor-pointer"
            >
              <option value="">ทั้งหมด</option>
              <option value="รออนุมัติ">รออนุมัติ</option>
              <option value="ตั้งเบิก">ตั้งเบิก</option>
              <option value="อนุมัติ">อนุมัติ</option>
              <option value="เบิกแล้ว">เบิกแล้ว</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hidden Add Modal Trigger for Mobile & Global Events */}
      <FormModal
        tableName="Data"
        form={form}
        title="เพิ่มบิล"
        buttonLabel="เพิ่มบิล"
        submitPath="/api/bills"
        openEventName="open-bill-form"
        hideLauncher
      />

      {/* Hidden Edit Modal Trigger */}
      <FormModal
        tableName="Data"
        form={form}
        title="แก้ไขบิล"
        buttonLabel="แก้ไขบิล"
        submitPath="/api/rows"
        openEventName="open-bill-edit-form"
        hideLauncher
      />

      {/* 3. WORK TABLE / MOBILE HIGH-DENSITY CARD FEED */}
      <div className="border border-slate-200 rounded-xl md:rounded-md bg-white overflow-hidden shadow-2xs">
        {!visibleRows.length ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">ไม่พบรายการบิล</div>
        ) : (
          <>
            {/* MOBILE COMPACT CARD FEED (High-Density & Fast Scanning) */}
            <div className="block md:hidden divide-y divide-slate-200 border-t border-slate-200">
              {visibleRows.map((row, idx) => {
                const seq = String(row["ลำดับ"] || row._sheetRow || row.id || idx + 1);
                const statusStr = String(row["สถานะ"] || "รออนุมัติ").trim();
                const requesterKey = String(row["ผู้เบิก"] || "").trim();
                const requesterName = requesterNames[requesterKey] || requesterKey || "-";
                const isPending = statusStr.includes("รออนุมัติ") || statusStr.includes("ตั้งเบิก");
                const isApproved = statusStr.includes("อนุมัติ");

                return (
                  <div
                    key={`mobile-${seq}-${idx}`}
                    onClick={() => window.location.href = `/bills/${seq}`}
                    className="p-3 hover:bg-slate-50 active:bg-slate-100 transition cursor-pointer flex items-center gap-3 relative"
                  >
                    {/* 1. Left Thumbnail (46x46) */}
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <BillImageThumbnail value={row["รูปถ่ายบิล"]} />
                    </div>

                    {/* 2. Middle Content (Project, Shop, Items) */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs bg-slate-900 text-white px-1.5 py-0.2 rounded shrink-0">
                          #{seq}
                        </span>
                        <span className="text-xs text-slate-900 truncate">
                          {row["ID Project"] ? `[${row["ID Project"]}] ` : ""}{String(row["ชื่อ Project"] || "-")}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 font-medium truncate" title={String(row["ร้าน/บุคคล"] || "")}>
                        {String(row["ร้าน/บุคคล"] || "-")}
                      </div>

                      <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                        <span>{formatDateDisplay(row["ว/ด/ป"])}</span>
                        <span>•</span>
                        <span className="truncate">{String(row["สินค้า/ทำงาน"] || "-")}</span>
                        <span>•</span>
                        <span>{requesterName}</span>
                      </div>
                    </div>

                    {/* 3. Right Amount & Status Badge */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="text-xs sm:text-sm text-slate-900">
                        {money(row["ยอดเงิน"])} <span className="text-xs font-normal text-slate-500">฿</span>
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                        isApproved
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                          : isPending
                          ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {statusStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (Display only on screens >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 text-xs">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">ลำดับ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">ID Project</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">ชื่อ Project</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">รูปถ่ายบิล</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">ร้าน/บุคคล</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">สินค้า/ทำงาน</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">บิล</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">ประเภท</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">ยอดเงิน</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">เงื่อนไข</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">ผู้เบิก</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">ว/ด/ป</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row, idx) => {
                    const seq = String(row["ลำดับ"] || row._sheetRow || row.id || idx + 1);
                    const statusStr = String(row["สถานะ"] || "รออนุมัติ").trim();
                    const requesterKey = String(row["ผู้เบิก"] || "").trim();
                    const requesterName = requesterNames[requesterKey] || requesterKey || "-";
                    const conditions = [
                      row.vat ? `VAT ${row.vat}` : "",
                      row["หัก"] ? `หัก ${row["หัก"]}` : "",
                      row["เครดิต"] ? `เครดิต ${row["เครดิต"]}` : ""
                    ].filter(Boolean).join(" · ");

                    return (
                      <tr
                        key={`${seq}-${idx}`}
                        onClick={() => window.location.href = `/bills/${seq}`}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-3 text-center text-slate-900 border-r border-slate-100">{seq}</td>
                        <td className="py-2 px-3 text-center text-slate-900 border-r border-slate-100">{String(row["ID Project"] || "-")}</td>
                        <td className="py-2 px-3 text-slate-900 max-w-[200px] truncate border-r border-slate-100" title={String(row["ชื่อ Project"] || "")}>
                          {String(row["ชื่อ Project"] || "-")}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <BillImageThumbnail value={row["รูปถ่ายบิล"]} />
                        </td>
                        <td className="py-2 px-3 text-slate-800 max-w-[160px] truncate border-r border-slate-100" title={String(row["ร้าน/บุคคล"] || "")}>
                          {String(row["ร้าน/บุคคล"] || "-")}
                        </td>
                        <td className="py-2 px-3 text-slate-700 max-w-[180px] truncate border-r border-slate-100" title={String(row["สินค้า/ทำงาน"] || "")}>
                          {String(row["สินค้า/ทำงาน"] || "-")}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700 border-r border-slate-100">{String(row["บิล"] || "-")}</td>
                        <td className="py-2 px-3 text-center text-slate-600 border-r border-slate-100">{String(row["ประเภท"] || "-")}</td>
                        <td className="py-2 px-3 text-right text-slate-900 border-r border-slate-100">{money(row["ยอดเงิน"])}</td>
                        <td className="py-2 px-3 text-center text-xs text-slate-500 border-r border-slate-100">{conditions || "-"}</td>
                        <td className="py-2 px-3 text-center text-slate-700 border-r border-slate-100">{requesterName}</td>
                        <td className="py-2 px-3 text-center font-medium text-slate-600 border-r border-slate-100 whitespace-nowrap">{formatDateDisplay(row["ว/ด/ป"])}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                            statusStr.includes("อนุมัติ")
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : statusStr.includes("เบิกแล้ว")
                              ? "bg-slate-100 text-slate-600 border border-slate-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {statusStr}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* PAGINATION: SEPARATE SLEEK MOBILE & DESKTOP DESIGNS */}
        {filteredRows.length > 0 && (
          <>
            {/* 1. Sleek Mobile Pagination */}
            <div className="block md:hidden border-t border-slate-100 bg-slate-50/50">
              {totalPages <= 1 ? (
                <div className="p-3 text-center text-xs text-slate-400 font-medium">
                  แสดงทั้งหมด {filteredRows.length} รายการ
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 sm:p-3 text-xs">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition text-slate-700 flex items-center gap-1 cursor-pointer active:bg-slate-100 shadow-2xs"
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
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition text-slate-700 flex items-center gap-1 cursor-pointer active:bg-slate-100 shadow-2xs"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* 2. Professional Desktop Pagination */}
            <div className="hidden md:flex flex-row items-center justify-between gap-3 p-3 border-t border-slate-200 text-xs text-slate-600 bg-slate-50/80">
              <div>
                แสดง <strong className="text-slate-800 ">{visibleStart}-{visibleEnd}</strong> จาก <strong className="text-slate-800 ">{filteredRows.length}</strong> รายการ
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium">แสดงต่อหน้า:</span>
                  {PAGE_SIZE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setPageSize(opt)}
                      className={`px-2 py-0.5 rounded text-xs transition cursor-pointer ${
                        opt === pageSize ? "bg-slate-900 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(page - 1)}
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
                    onClick={() => setPage(page + 1)}
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

      {/* BILL DETAIL DRAWER & PROJECT DETAIL LINK */}
      {selectedDetailIndex !== null && (
        <BillDetailDrawer
          bill={visibleRows[selectedDetailIndex] || null}
          onClose={() => setSelectedDetailIndex(null)}
          onEdit={(bill) => {
            setSelectedDetailIndex(null);
            window.dispatchEvent(new CustomEvent("open-bill-edit-form", { detail: { row: bill } }));
          }}
          onDelete={async (bill) => {
            if (!isAdmin) {
              showToast("error", "เฉพาะสิทธิ์แอดมิน (Admin) เท่านั้นที่สามารถลบบิลได้");
              return;
            }
            const currentStatus = normalizeBillStatus(bill["สถานะ"]);
            if (currentStatus !== "รออนุมัติ") {
              showToast("error", "สามารถลบได้เฉพาะบิลที่มีสถานะรออนุมัติเท่านั้น");
              return;
            }
            const sheetRow = Number(bill._sheetRow || bill.id || bill["ลำดับ"]);
            const confirmed = await showConfirm(`คุณต้องการลบบิล ${String(bill["ลำดับ"] || bill["รายการ"] || "")} ใช่หรือไม่?`);
            if (!confirmed) return;
            try {
              const res = await fetch("/api/rows", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tableName: "Data", sheetRows: [sheetRow] }),
              });
              if (res.ok) {
                setSelectedDetailIndex(null);
                showToast("success", "ลบบิลสำเร็จเรียบร้อย");
                window.location.reload();
              } else {
                const err = await res.json();
                showToast("error", `ลบบิลไม่สำเร็จ: ${err.error || "เกิดข้อผิดพลาด"}`);
              }
            } catch (e: any) {
              showToast("error", `เกิดข้อผิดพลาด: ${e.message}`);
            }
          }}
          onPrev={() => setSelectedDetailIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setSelectedDetailIndex((i) => (i !== null && i < visibleRows.length - 1 ? i + 1 : i))}
          hasPrev={selectedDetailIndex > 0}
          hasNext={selectedDetailIndex < visibleRows.length - 1}
        />
      )}
    </div>
  );
}

