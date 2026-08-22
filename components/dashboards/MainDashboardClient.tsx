"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileCheck,
  Filter,
  FolderKanban,
  Layers,
  PieChart,
  Receipt,
  RotateCw,
  TrendingUp,
  UserCheck,
  Wallet,
} from "lucide-react";
import { money, toNumber } from "@/lib/numbers";
import { isCreditActive, isDeductActive, isVatActive } from "@/lib/project-summary";
import type { SheetRow } from "@/lib/types";

import { useSearchParams } from "next/navigation";

type MainDashboardClientProps = {
  initialDataRows: SheetRow[];
  initialProjectRows: SheetRow[];
};

type Preset = "today" | "yesterday" | "month" | "previousMonth" | "all" | "custom";

const COST_COLUMNS = ["ค่าของ", "ค่าแรง", "พนักงาน", "น้ำมัน", "ซ่อมรถ", "เครื่องจักร", "เครื่องมือ", "อื่นๆ"];

export function MainDashboardClient({ initialDataRows, initialProjectRows }: MainDashboardClientProps) {
  const searchParams = useSearchParams();
  const urlSearch = (searchParams.get("search") || "").trim().toLowerCase();

  const [dataRows, setDataRows] = useState(initialDataRows);
  const [projectRows, setProjectRows] = useState(initialProjectRows);
  const [preset, setPreset] = useState<Preset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"vat" | "natural" | "equipment">("vat");

  const range = useMemo(() => getRange(preset, from, to), [preset, from, to]);
  const dateFilteredDataRows = useMemo(() => filterRowsByDate(dataRows, range, ["ว/ด/ป", "วันที่"]), [dataRows, range]);
  const dateFilteredProjectRows = useMemo(() => filterRowsByDate(projectRows, range, ["วันที่"]), [projectRows, range]);

  const filteredDataRows = useMemo(() => {
    if (!urlSearch) return dateFilteredDataRows;
    return dateFilteredDataRows.filter(row =>
      Object.values(row).some(v => String(v || "").toLowerCase().includes(urlSearch))
    );
  }, [dateFilteredDataRows, urlSearch]);

  const filteredProjectRows = useMemo(() => {
    if (!urlSearch) return dateFilteredProjectRows;
    return dateFilteredProjectRows.filter(row =>
      Object.values(row).some(v => String(v || "").toLowerCase().includes(urlSearch))
    );
  }, [dateFilteredProjectRows, urlSearch]);

  const summary = useMemo(() => buildMainSummary(filteredDataRows, filteredProjectRows), [filteredDataRows, filteredProjectRows]);

  async function refreshData() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/dashboard?refresh=1", { cache: "no-store" });
      if (!response.ok) throw new Error("Refresh failed");
      const payload = await response.json();
      setDataRows(payload.dataRows || []);
      setProjectRows(payload.projectRows || []);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="w-full flex flex-col gap-4 p-3 sm:p-5 max-w-[1600px] mx-auto font-sans text-xs text-slate-800">
      {/* 1. EXECUTIVE FILTER & DATE RANGE BAR */}
      <div className="bg-white rounded-xl md:rounded-md p-2.5 sm:p-3 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shadow-2xs">
        {/* Date Presets (Horizontal scrollable on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
          <span className="text-xs sm:text-xs text-slate-500 mr-1 uppercase shrink-0">ช่วงเวลา:</span>
          {(
            [
              ["all", "ทั้งหมด"],
              ["today", "วันนี้"],
              ["yesterday", "เมื่อวาน"],
              ["month", "เดือนนี้"],
              ["previousMonth", "เดือนก่อน"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPreset(key as Preset)}
              className={`px-2.5 py-1 rounded-lg sm:rounded-md transition cursor-pointer text-xs sm:text-xs shrink-0 whitespace-nowrap active:scale-95 ${
                preset === key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom Range & Refresh on same line */}
        <div className="flex items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className="text-slate-500 font-medium text-xs sm:text-xs shrink-0">เริ่ม:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
              className="w-full bg-slate-50 md:bg-white text-slate-800 font-medium px-1.5 py-1 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-500 text-xs sm:text-xs"
            />
          </div>

          <div className="flex items-center gap-1 flex-1 min-w-0">
            <span className="text-slate-500 font-medium text-xs sm:text-xs shrink-0">ถึง:</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
              className="w-full bg-slate-50 md:bg-white text-slate-800 font-medium px-1.5 py-1 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-500 text-xs sm:text-xs"
            />
          </div>

          <button
            type="button"
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition cursor-pointer text-xs sm:text-xs shrink-0 active:scale-95 shadow-2xs"
          >
            <RotateCw size={12} className={refreshing ? "animate-spin text-slate-900" : "text-slate-600"} />
            <span className="hidden sm:inline">{refreshing ? "รีเฟรช..." : "รีเฟรช"}</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE METRICS STAT GRID (2 Columns 2x2 on Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Total Expenses */}
        <div className="bg-white rounded-xl md:rounded-md p-2.5 sm:p-4 border border-slate-200 flex flex-col justify-between gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs sm:text-xs text-slate-500 uppercase tracking-wider truncate">ยอดค่าใช้จ่ายรวม</span>
            <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Wallet size={13} className="sm:w-4 sm:h-4" />
            </span>
          </div>
          <div>
            <div className="text-sm sm:text-lg lg:text-xl text-slate-900 truncate">{money(summary.total)}</div>
            <div className="text-xs sm:text-xs text-slate-500 font-normal mt-0.5 truncate">รวม {summary.dataCount} บิล</div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-xl md:rounded-md p-2.5 sm:p-4 border border-slate-200 flex flex-col justify-between gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs sm:text-xs text-slate-500 uppercase tracking-wider truncate">ยอดงานรวมภาษี</span>
            <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp size={13} className="sm:w-4 sm:h-4" />
            </span>
          </div>
          <div>
            <div className="text-sm sm:text-lg lg:text-xl text-slate-900 truncate">{money(summary.revenue)}</div>
            <div className="text-xs sm:text-xs text-slate-500 font-normal mt-0.5 truncate">รวม {summary.projectCount} โครงการ</div>
          </div>
        </div>

        {/* Project Status */}
        <div className="bg-white rounded-xl md:rounded-md p-2.5 sm:p-4 border border-slate-200 flex flex-col justify-between gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs sm:text-xs text-slate-500 uppercase tracking-wider truncate">สถานะโครงการ</span>
            <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <FolderKanban size={13} className="sm:w-4 sm:h-4" />
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div>
              <div className="text-xs sm:text-xs text-slate-500 font-medium truncate">กำลังทำ</div>
              <div className="text-sm sm:text-lg text-indigo-900">{summary.activeProjects}</div>
            </div>
            <div className="h-5 sm:h-6 w-px bg-slate-200" />
            <div>
              <div className="text-xs sm:text-xs text-slate-500 font-medium truncate">เสร็จสิ้น</div>
              <div className="text-sm sm:text-lg text-slate-600">{summary.completeProjects}</div>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white rounded-xl md:rounded-md p-2.5 sm:p-4 border border-slate-200 flex flex-col justify-between gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs sm:text-xs text-slate-500 uppercase tracking-wider truncate">กำไรสุทธิ (Profit)</span>
            <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              <DollarSign size={13} className="sm:w-4 sm:h-4" />
            </span>
          </div>
          <div>
            <div className="text-sm sm:text-lg lg:text-xl text-slate-900 truncate">{money(summary.profit)}</div>
            <div className="space-y-1 mt-1">
              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, summary.profitPercent))}%` }}
                />
              </div>
              <div className="text-xs sm:text-xs font-medium text-slate-500 text-right truncate">
                กำไร: {summary.profitPercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. STATUS COUNTERS STRIP (Clickable Quick Nav on Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs">
        <a href="/bill-follow?tab=vat" className="bg-white p-2.5 sm:p-3 rounded-xl md:rounded-md border border-slate-200 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-sky-300 transition active:scale-95">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0">
            <FileCheck size={13} className="sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-slate-500 text-xs sm:text-xs truncate">ตาม VAT (รอได้บิล)</div>
            <div className="text-slate-900 truncate text-xs sm:text-sm">{summary.vatCount} <span className="text-xs font-normal text-slate-400">บิล</span></div>
          </div>
        </a>

        <a href="/bill-follow?tab=natural" className="bg-white p-2.5 sm:p-3 rounded-xl md:rounded-md border border-slate-200 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-purple-300 transition active:scale-95">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shrink-0">
            <UserCheck size={13} className="sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-slate-500 text-xs sm:text-xs truncate">ตาม หัก 3% บุคคล</div>
            <div className="text-slate-900 truncate text-xs sm:text-sm">{summary.naturalDeductCount} <span className="text-xs font-normal text-slate-400">บิล</span></div>
          </div>
        </a>

        <a href="/bill-follow?tab=company" className="bg-white p-2.5 sm:p-3 rounded-xl md:rounded-md border border-slate-200 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-blue-300 transition active:scale-95">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 size={13} className="sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-slate-500 text-xs sm:text-xs truncate">ตาม หัก 3% บริษัท</div>
            <div className="text-slate-900 truncate text-xs sm:text-sm">{summary.companyDeductCount} <span className="text-xs font-normal text-slate-400">บิล</span></div>
          </div>
        </a>

        <a href="/bill-follow?tab=credit" className="bg-white p-2.5 sm:p-3 rounded-xl md:rounded-md border border-slate-200 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-orange-300 transition active:scale-95">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <Clock3 size={13} className="sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-slate-500 text-xs sm:text-xs truncate">ตาม เครดิต (รอจ่าย)</div>
            <div className="text-slate-900 truncate text-xs sm:text-sm">{summary.creditCount} <span className="text-xs font-normal text-slate-400">บิล</span></div>
          </div>
        </a>
      </div>

      {/* 4. TABBED BREAKDOWN TABLES */}
      <div className="bg-white rounded-xl md:rounded-md border border-slate-200 overflow-hidden shadow-2xs">
        {/* Tabs Bar (Scrollable on mobile) */}
        <div className="p-2 sm:p-3 border-b border-slate-200 flex items-center gap-1.5 bg-white overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab("vat")}
            className={`px-3 py-1.5 rounded-lg md:rounded-md text-xs transition cursor-pointer shrink-0 active:scale-95 ${
              activeTab === "vat"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ค่าแรงบริษัท & ภาษี VAT
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("natural")}
            className={`px-3 py-1.5 rounded-lg md:rounded-md text-xs transition cursor-pointer shrink-0 active:scale-95 ${
              activeTab === "natural"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ค่าแรงบุคคล & ดำเนินงาน
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("equipment")}
            className={`px-3 py-1.5 rounded-lg md:rounded-md text-xs transition cursor-pointer shrink-0 active:scale-95 ${
              activeTab === "equipment"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            เครื่องจักร เครื่องมือ & อื่นๆ
          </button>
        </div>

        {/* Tab 1 Content: VAT & Company Labor */}
        {activeTab === "vat" && (
          <div className="p-4 space-y-3">
            <h3 className="text-xs text-slate-900 uppercase tracking-wider">
              รายงานสรุปค่าใช้จ่าย ค่าแรงบริษัท และภาษี VAT
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-xs">
                    <th className="py-2.5 px-3 border-r border-slate-200">รายการ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">ก่อน VAT (บาท)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">คำนวณ VAT / ภาษี (บาท)</th>
                    <th className="py-2.5 px-3 text-right">ยอดรวมสุทธิ (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">ค่าแรงบริษัท</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.laborBeforeVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.laborVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main3.laborBeforeVat)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">ค่าของ (มี VAT)</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.materialBeforeVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.materialVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main3.materialBeforeVat + summary.main3.materialVat)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">น้ำมัน (มี VAT)</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.fuelBeforeVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.fuelVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main3.fuelBeforeVat + summary.main3.fuelVat)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">ซ่อมรถ (มี VAT)</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.repairBeforeVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main3.repairVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main3.repairBeforeVat + summary.main3.repairVat)}</td>
                  </tr>
                  <tr className="bg-slate-50 text-slate-900 border-t border-slate-200">
                    <td className="py-2.5 px-3 border-r border-slate-200">รวมทั้งสิ้น</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right text-slate-900 ">{money(summary.main3BeforeVatTotal)}</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right text-slate-900 ">{money(summary.main3VatTotal)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-900 ">{money(summary.main3GrandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2 Content: Natural Labor & Operating Costs */}
        {activeTab === "natural" && (
          <div className="p-4 space-y-3">
            <h3 className="text-xs text-slate-900 uppercase tracking-wider">
              รายงานสรุปค่าแรงบุคคลธรรมดา และงานดำเนินการ
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-xs">
                    <th className="py-2.5 px-3 border-r border-slate-200">รายการ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">ยอดรวมค่าใช้จ่าย (บาท)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">หัก ณ ที่จ่าย (บาท)</th>
                    <th className="py-2.5 px-3 text-right">ยอดโอนสุทธิ (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">ค่าแรง</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main4.naturalLabor)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium text-amber-700">{money(summary.main4.naturalLaborDeduct)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main4.naturalLabor - summary.main4.naturalLaborDeduct)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">พนักงาน</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main4.staff)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium text-amber-700">{money(summary.main4.staffDeduct)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main4.staff - summary.main4.staffDeduct)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">ค่าของ</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main4.material)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium text-amber-700">{money(summary.main4.materialDeduct)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main4.material - summary.main4.materialDeduct)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">น้ำมัน</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main4.fuel)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium text-amber-700">{money(summary.main4.fuelDeduct)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main4.fuel - summary.main4.fuelDeduct)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">ซ่อมรถ</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main4.repair)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium text-amber-700">{money(summary.main4.repairDeduct)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main4.repair - summary.main4.repairDeduct)}</td>
                  </tr>
                  <tr className="bg-slate-50 text-slate-900 border-t border-slate-200">
                    <td className="py-2.5 px-3 border-r border-slate-200">รวมทั้งสิ้น</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right text-slate-900 ">{money(summary.main4Total)}</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right text-amber-700 ">{money(summary.main4DeductTotal)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-900 ">{money(summary.main4NetTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3 Content: Machines, Tools & Others */}
        {activeTab === "equipment" && (
          <div className="p-4 space-y-3">
            <h3 className="text-xs text-slate-900 uppercase tracking-wider">
              รายงานสรุปเครื่องจักร เครื่องมือ และหมวดอื่นๆ
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-xs">
                    <th className="py-2.5 px-3 border-r border-slate-200">รายการ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">เครื่องจักร (บาท)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right">เครื่องมือ (บาท)</th>
                    <th className="py-2.5 px-3 text-right">อื่นๆ (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">ก่อน VAT</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.machineBeforeVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.toolBeforeVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main5.otherBeforeVat)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">คำนวณ VAT (บาท)</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.machineVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.toolVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main5.otherVat)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">ไม่มี VAT</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.machineNoVat)}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-right font-medium">{money(summary.main5.toolNoVat)}</td>
                    <td className="py-2 px-3 text-right font-medium">{money(summary.main5.otherNoVat)}</td>
                  </tr>
                  <tr className="bg-slate-50 text-slate-900 border-t border-slate-200">
                    <td className="py-2.5 px-3 border-r border-slate-200">รวมก่อน VAT</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right ">{money(summary.main5BeforeVatTotal)}</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right ">{money(summary.main5ToolBeforeVatTotal)}</td>
                    <td className="py-2.5 px-3 text-right ">{money(summary.main5OtherBeforeVatTotal)}</td>
                  </tr>
                  <tr className="bg-slate-50 text-slate-900 border-t border-slate-200">
                    <td className="py-2.5 px-3 border-r border-slate-200">รวมไม่มี VAT</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right ">{money(summary.main5NoVatTotal)}</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-right ">{money(summary.main5ToolNoVatTotal)}</td>
                    <td className="py-2.5 px-3 text-right ">{money(summary.main5OtherNoVatTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getBillAmount(row: SheetRow): number {
  if (!row) return 0;
  const direct = toNumber(row["ยอดเงิน"]);
  if (direct > 0) return direct;
  return COST_COLUMNS.reduce((sum, col) => sum + toNumber(row[col]), 0);
}

function getCategoryAmount(row: SheetRow, categoryKeyword: string): number {
  if (!row) return 0;
  const legacyVal = toNumber(row[categoryKeyword]);
  if (legacyVal > 0) return legacyVal;

  const categoryType = String(row["ประเภท"] || "").toLowerCase();
  if (categoryType.includes(categoryKeyword.toLowerCase())) {
    return getBillAmount(row);
  }

  return 0;
}

function sumRowsTotal(rows: SheetRow[]): number {
  return rows.reduce((sum, row) => sum + getBillAmount(row), 0);
}

function sumCategoryRows(rows: SheetRow[], categoryKeyword: string): number {
  return rows.reduce((sum, row) => sum + getCategoryAmount(row, categoryKeyword), 0);
}

function getCategoryDeductAmount(row: SheetRow, categoryKeyword: string): number {
  const amt = getCategoryAmount(row, categoryKeyword);
  if (amt <= 0 || !isDeductActive(row["หัก"])) return 0;
  const custom = toNumber(row["จำนวนหัก"]);
  const billAmt = getBillAmount(row);
  if (custom > 0 && billAmt > 0) {
    return (custom * amt) / billAmt;
  }
  const rate = toNumber(row["หัก"]);
  return (amt * rate) / 100;
}

function sumCategoryDeductRows(rows: SheetRow[], categoryKeyword: string): number {
  return rows.reduce((sum, row) => sum + getCategoryDeductAmount(row, categoryKeyword), 0);
}

function buildMainSummary(dataRows: SheetRow[], projectRows: SheetRow[]) {
  const total = sumRowsTotal(dataRows);
  const vatCount = dataRows.filter(row => isVatActive(row.vat) && !hasValue(row["วันได้บิล"])).length;
  const naturalDeductCount = dataRows.filter(row => isDeductActive(row["หัก"]) && !hasValue(row["วันออก 3%"]) && !String(row["statusค่าแรง"] || "").includes("บริษัท")).length;
  const companyDeductCount = dataRows.filter(row => isDeductActive(row["หัก"]) && !hasValue(row["วันออก 3%"]) && String(row["statusค่าแรง"] || "").includes("บริษัท")).length;
  const creditCount = dataRows.filter(row => isCreditActive(row["เครดิต"]) && !hasValue(row["วันจ่าย"])).length;
  const activeProjects = projectRows.filter(row => lower(row.color) === "red" || lower(row.color) === "green").length;
  const completeProjects = projectRows.filter(row => lower(row.color) === "black").length;

  const companyRows = dataRows.filter(row => String(row["statusค่าแรง"] || "").includes("บริษัท"));
  const naturalRows = dataRows.filter(row => !String(row["statusค่าแรง"] || "").includes("บริษัท"));
  const vatRows = dataRows.filter(row => isVatActive(row.vat));
  const noVatRows = dataRows.filter(row => !isVatActive(row.vat));
  const operatingRows = dataRows.filter(row => String(row["ชื่อ Project"] || "").includes("ดำเนินการ"));

  const matVatTot = sumCategoryRows(vatRows, "ค่าของ");
  const fuelVatTot = sumCategoryRows(vatRows, "น้ำมัน");
  const repVatTot = sumCategoryRows(vatRows, "ซ่อมรถ");

  const main3 = {
    laborBeforeVat: sumCategoryRows(companyRows, "ค่าแรง"),
    materialBeforeVat: matVatTot > 0 ? matVatTot / 1.07 : 0,
    fuelBeforeVat: fuelVatTot > 0 ? fuelVatTot / 1.07 : 0,
    repairBeforeVat: repVatTot > 0 ? repVatTot / 1.07 : 0,
    laborVat: sumCategoryRows(companyRows, "ค่าแรง") * 0.03,
    materialVat: matVatTot > 0 ? matVatTot - (matVatTot / 1.07) : 0,
    fuelVat: fuelVatTot > 0 ? fuelVatTot - (fuelVatTot / 1.07) : 0,
    repairVat: repVatTot > 0 ? repVatTot - (repVatTot / 1.07) : 0
  };
  const main3Total = main3.laborVat + main3.materialVat + main3.fuelVat + main3.repairVat;

  const main4 = {
    naturalLabor: sumCategoryRows(naturalRows, "ค่าแรง"),
    naturalLaborDeduct: sumCategoryDeductRows(naturalRows, "ค่าแรง"),
    staff: sumCategoryRows(dataRows, "พนักงาน"),
    staffDeduct: sumCategoryDeductRows(dataRows, "พนักงาน"),
    material: sumCategoryRows(noVatRows, "ค่าของ"),
    materialDeduct: sumCategoryDeductRows(noVatRows, "ค่าของ"),
    fuel: sumCategoryRows(noVatRows, "น้ำมัน"),
    fuelDeduct: sumCategoryDeductRows(noVatRows, "น้ำมัน"),
    repair: sumCategoryRows(noVatRows, "ซ่อมรถ"),
    repairDeduct: sumCategoryDeductRows(noVatRows, "ซ่อมรถ"),
    operatingLabor: sumCategoryRows(operatingRows, "ค่าแรง"),
    operatingStaff: sumCategoryRows(operatingRows, "พนักงาน"),
    operatingMaterial: sumCategoryRows(operatingRows, "ค่าของ"),
    operatingFuel: sumCategoryRows(operatingRows, "น้ำมัน"),
    operatingRepair: sumCategoryRows(operatingRows, "ซ่อมรถ")
  };
  const main4Total = main4.naturalLabor + main4.staff + main4.material + main4.fuel + main4.repair;
  const main4DeductTotal = main4.naturalLaborDeduct + main4.staffDeduct + main4.materialDeduct + main4.fuelDeduct + main4.repairDeduct;
  const main4NetTotal = main4Total - main4DeductTotal;

  const machVatTot = sumCategoryRows(vatRows, "เครื่องจักร");
  const toolVatTot = sumCategoryRows(vatRows, "เครื่องมือ");
  const othVatTot = sumCategoryRows(vatRows, "อื่นๆ");

  const main5 = {
    machineBeforeVat: machVatTot > 0 ? machVatTot / 1.07 : 0,
    toolBeforeVat: toolVatTot > 0 ? toolVatTot / 1.07 : 0,
    otherBeforeVat: othVatTot > 0 ? othVatTot / 1.07 : 0,
    machineVat: machVatTot > 0 ? machVatTot - (machVatTot / 1.07) : 0,
    toolVat: toolVatTot > 0 ? toolVatTot - (toolVatTot / 1.07) : 0,
    otherVat: othVatTot > 0 ? othVatTot - (othVatTot / 1.07) : 0,
    machineNoVat: sumCategoryRows(noVatRows, "เครื่องจักร"),
    toolNoVat: sumCategoryRows(noVatRows, "เครื่องมือ"),
    otherNoVat: sumCategoryRows(noVatRows, "อื่นๆ")
  };
  const main3BeforeVatTotal = main3.laborBeforeVat + main3.materialBeforeVat + main3.fuelBeforeVat + main3.repairBeforeVat;
  const main3VatTotal = main3.laborVat + main3.materialVat + main3.fuelVat + main3.repairVat;
  const main3GrandTotal = main3BeforeVatTotal + main3VatTotal;

  const main4OperatingTotal = main4.operatingLabor + main4.operatingStaff + main4.operatingMaterial + main4.operatingFuel + main4.operatingRepair;

  const main5BeforeVatTotal = main5.machineBeforeVat + main5.toolBeforeVat + main5.otherBeforeVat;
  const main5NoVatTotal = main5.machineNoVat + main5.toolNoVat + main5.otherNoVat;
  const main5MachineBeforeVatTotal = main5.machineBeforeVat;
  const main5ToolBeforeVatTotal = main5.toolBeforeVat;
  const main5OtherBeforeVatTotal = main5.otherBeforeVat;
  const main5MachineNoVatTotal = main5.machineNoVat;
  const main5ToolNoVatTotal = main5.toolNoVat;
  const main5OtherNoVatTotal = main5.otherNoVat;
  const main5MachineTotal = main5.machineBeforeVat + main5.machineVat + main5.machineNoVat;
  const main5ToolTotal = main5.toolBeforeVat + main5.toolVat + main5.toolNoVat;
  const main5OtherTotal = main5.otherBeforeVat + main5.otherVat + main5.otherNoVat;

  const revenue = sumColumns(projectRows, ["ยอดรวม vat", "ยอดงาน"]);
  const investment = total;
  const operating = sumRowsTotal(operatingRows);
  const profit = revenue - investment;
  const profitPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    filterLabel: "ข้อมูลทั้งหมด",
    dataCount: dataRows.length,
    projectCount: projectRows.length,
    total,
    vatCount,
    naturalDeductCount,
    companyDeductCount,
    creditCount,
    activeProjects,
    completeProjects,
    revenue,
    investment,
    operating,
    profit,
    profitPercent,
    main3,
    main3BeforeVatTotal,
    main3VatTotal,
    main3GrandTotal,
    main3Total,
    main4,
    main4Total,
    main4DeductTotal,
    main4NetTotal,
    main4OperatingTotal,
    main5,
    main5BeforeVatTotal,
    main5NoVatTotal,
    main5MachineBeforeVatTotal,
    main5ToolBeforeVatTotal,
    main5OtherBeforeVatTotal,
    main5MachineNoVatTotal,
    main5ToolNoVatTotal,
    main5OtherNoVatTotal,
    main5MachineTotal,
    main5ToolTotal,
    main5OtherTotal
  };
}

function filterRowsByDate(rows: SheetRow[], range: { from?: Date; to?: Date } | null, dateColumns: string[]) {
  if (!range || (!range.from && !range.to)) return rows;
  return rows.filter(row => {
    const rawDate = firstValue(row, dateColumns);
    const date = parseDateCell(rawDate);
    if (!date) return true;
    if (range.from && date < range.from) return false;
    if (range.to && date > range.to) return false;
    return true;
  });
}

function getRange(preset: Preset, from: string, to: string) {
  if (preset === "all") return null;
  const now = new Date();

  if (preset === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { from: start, to: end };
  }

  if (preset === "yesterday") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return { from: start, to: end };
  }

  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from: start, to: end };
  }

  if (preset === "previousMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { from: start, to: end };
  }

  const fromDate = parseInputDate(from);
  const toDate = parseInputDate(to);
  if (toDate) toDate.setHours(23, 59, 59, 999);
  return { from: fromDate || undefined, to: toDate || undefined };
}

function parseInputDate(value: string) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function parseDateCell(value: unknown) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const dmMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmMatch) {
    const day = Number(dmMatch[1]);
    const month = Number(dmMatch[2]) - 1;
    const rawYear = Number(dmMatch[3]);
    const year = rawYear > 2400 ? rawYear - 543 : rawYear;
    return new Date(year, month, day);
  }

  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sumColumns(rows: SheetRow[], columns: string[]) {
  return rows.reduce((sum, row) => sum + columns.reduce((inner, column) => inner + toNumber(row[column]), 0), 0);
}

function firstValue(row: SheetRow, columns: string[]) {
  for (const column of columns) {
    if (hasValue(row[column])) return row[column];
  }
  return "";
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function lower(value: unknown) {
  return String(value || "").toLowerCase();
}

