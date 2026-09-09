"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRealtimeSync } from "@/lib/use-realtime-sync";
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  Clock3,
  Coins,
  FileCheck,
  FolderKanban,
  Fuel,
  Hammer,
  LayoutGrid,
  PieChart,
  RotateCw,
  SlidersHorizontal,
  TableProperties,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { money, toNumber } from "@/lib/numbers";
import { computeCashFlowBreakdown, getProfitHealthStatus, isCreditActive, isDeductActive, isVatActive } from "@/lib/project-summary";
import { isCommittedBill, isPaidBill } from "@/lib/bill-status";
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

  // Smart initial tab: if no VAT bills exist but non-VAT bills exist, default directly to natural bills
  const defaultTab = useMemo<"vat" | "natural" | "equipment">(() => {
    const hasVat = (initialDataRows || []).some(row => isVatActive(row.vat) || String(row["statusค่าแรง"] || "").includes("บริษัท"));
    const hasNatural = (initialDataRows || []).some(row => !isVatActive(row.vat) && !String(row["statusค่าแรง"] || "").includes("บริษัท"));
    if (!hasVat && hasNatural) return "natural";
    return "vat";
  }, [initialDataRows]);

  const [activeTab, setActiveTab] = useState<"vat" | "natural" | "equipment">(defaultTab);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [costBreakdownTab, setCostBreakdownTab] = useState<"paid" | "pending">("paid");

  const range = useMemo(() => getRange(preset, from, to), [preset, from, to]);
  const dateFilteredDataRows = useMemo(() => filterRowsByDate(dataRows, range, ["ว/ด/ป", "วันที่"]), [dataRows, range]);
  const dateFilteredProjectRows = useMemo(() => filterRowsByDate(projectRows, range, ["วันที่"]), [projectRows, range]);

  const filteredDataRows = useMemo(() => {
    if (!urlSearch) return dateFilteredDataRows;
    return dateFilteredDataRows.filter(row => {
      const p1 = String(row["ชื่อ Project"] || "").toLowerCase().includes(urlSearch);
      const p2 = String(row["ร้าน/บุคคล"] || "").toLowerCase().includes(urlSearch);
      const p3 = String(row["สินค้า/ทำงาน"] || "").toLowerCase().includes(urlSearch);
      const p4 = String(row["บิล"] || "").toLowerCase().includes(urlSearch);
      if (p1 || p2 || p3 || p4) return true;
      return Object.values(row).some(v => typeof v === "string" && v.toLowerCase().includes(urlSearch));
    });
  }, [dateFilteredDataRows, urlSearch]);

  const filteredProjectRows = useMemo(() => {
    if (!urlSearch) return dateFilteredProjectRows;
    return dateFilteredProjectRows.filter(row => {
      const p1 = String(row["ชื่อ Project"] || row.name || "").toLowerCase().includes(urlSearch);
      const p2 = String(row["ชื่อลูกค้า"] || row.customer_name || "").toLowerCase().includes(urlSearch);
      if (p1 || p2) return true;
      return Object.values(row).some(v => typeof v === "string" && v.toLowerCase().includes(urlSearch));
    });
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

  // High-performance debounced Realtime live sync from Supabase PostgreSQL
  useRealtimeSync({
    channelName: "main_dashboard_live_sync",
    tables: ["bills", "projects"],
    onSync: refreshData,
    debounceMs: 700,
  });

  const presetLabels: Record<Preset, string> = {
    all: "ข้อมูลทั้งหมด",
    today: "วันนี้",
    yesterday: "เมื่อวาน",
    month: "เดือนนี้",
    previousMonth: "เดือนก่อน",
    custom: "ช่วงวันที่กำหนด",
  };

  // Cost proportions for quick executive chart - Strictly distinguishes paid cash from pending AP
  const costBreakdown = useMemo(() => {
    const isPaidMode = costBreakdownTab === "paid";
    const total = isPaidMode
      ? (summary.cashPaid > 0 ? summary.cashPaid : 0)
      : (summary.pendingAP > 0 ? summary.pendingAP : 0);

    const laborPaid = summary.main3Paid.laborBeforeVat + summary.main4Paid.naturalLabor + summary.main4Paid.staff;
    const laborPending = summary.main3Pending.laborBeforeVat + summary.main4Pending.naturalLabor + summary.main4Pending.staff;

    const materialPaid = (summary.main3Paid.materialBeforeVat + summary.main3Paid.materialVat) + summary.main4Paid.material;
    const materialPending = (summary.main3Pending.materialBeforeVat + summary.main3Pending.materialVat) + summary.main4Pending.material;

    const fleetPaid = (summary.main3Paid.fuelBeforeVat + summary.main3Paid.fuelVat + summary.main3Paid.repairBeforeVat + summary.main3Paid.repairVat) + summary.main4Paid.fuel + summary.main4Paid.repair;
    const fleetPending = (summary.main3Pending.fuelBeforeVat + summary.main3Pending.fuelVat + summary.main3Pending.repairBeforeVat + summary.main3Pending.repairVat) + summary.main4Pending.fuel + summary.main4Pending.repair;

    const equipmentPaid = summary.main5PaidMachineTotal + summary.main5PaidToolTotal;
    const equipmentPending = summary.main5PendingMachineTotal + summary.main5PendingToolTotal;

    const otherPaid = summary.main5PaidOtherTotal;
    const otherPending = summary.main5PendingOtherTotal;

    if (isPaidMode) {
      if (total <= 0) return [];
      return [
        { name: "ค่าแรง/พนักงาน", amount: laborPaid, pendingAmount: laborPending, percent: (laborPaid / total) * 100, color: "bg-indigo-600", text: "text-indigo-900 font-semibold", lightBg: "bg-indigo-50 border-indigo-200" },
        { name: "ค่าของ/วัสดุ", amount: materialPaid, pendingAmount: materialPending, percent: (materialPaid / total) * 100, color: "bg-emerald-600", text: "text-emerald-900 font-semibold", lightBg: "bg-emerald-50 border-emerald-200" },
        { name: "น้ำมัน/ซ่อมรถ", amount: fleetPaid, pendingAmount: fleetPending, percent: (fleetPaid / total) * 100, color: "bg-amber-600", text: "text-amber-900 font-semibold", lightBg: "bg-amber-50 border-amber-200" },
        { name: "เครื่องจักร/เครื่องมือ", amount: equipmentPaid, pendingAmount: equipmentPending, percent: (equipmentPaid / total) * 100, color: "bg-sky-600", text: "text-sky-900 font-semibold", lightBg: "bg-sky-50 border-sky-200" },
        { name: "หมวดอื่นๆ", amount: otherPaid, pendingAmount: otherPending, percent: (otherPaid / total) * 100, color: "bg-slate-600", text: "text-slate-900 font-semibold", lightBg: "bg-slate-50 border-slate-200" },
      ].filter(item => item.amount > 0);
    } else {
      if (total <= 0) return [];
      return [
        { name: "ค่าแรง/พนักงาน", amount: laborPending, pendingAmount: laborPending, percent: (laborPending / total) * 100, color: "bg-amber-700", text: "text-amber-950 font-semibold", lightBg: "bg-amber-50 border-amber-300" },
        { name: "ค่าของ/วัสดุ", amount: materialPending, pendingAmount: materialPending, percent: (materialPending / total) * 100, color: "bg-amber-500", text: "text-amber-950 font-semibold", lightBg: "bg-amber-50 border-amber-300" },
        { name: "น้ำมัน/ซ่อมรถ", amount: fleetPending, pendingAmount: fleetPending, percent: (fleetPending / total) * 100, color: "bg-orange-500", text: "text-orange-950 font-semibold", lightBg: "bg-orange-50 border-orange-300" },
        { name: "เครื่องจักร/เครื่องมือ", amount: equipmentPending, pendingAmount: equipmentPending, percent: (equipmentPending / total) * 100, color: "bg-yellow-600", text: "text-yellow-950 font-semibold", lightBg: "bg-yellow-50 border-yellow-300" },
        { name: "หมวดอื่นๆ", amount: otherPending, pendingAmount: otherPending, percent: (otherPending / total) * 100, color: "bg-stone-500", text: "text-stone-900 font-semibold", lightBg: "bg-stone-50 border-stone-300" },
      ].filter(item => item.amount > 0);
    }
  }, [summary, costBreakdownTab]);

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3 p-2 sm:p-3 max-w-[1600px] mx-auto font-sans text-slate-800 antialiased pb-8">
      
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE FILTER & DATE CONTROLS                                       */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Title & Preset Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0b3531] to-[#041d1a] text-[#34d399] flex items-center justify-center shrink-0 shadow-xs ring-1 ring-emerald-800/30">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
                  แดชบอร์ดภาพรวมการเงิน
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0 shadow-2xs">
                  {presetLabels[preset]}
                </span>
              </div>
            </div>
          </div>

          {/* Presets & Actions inline */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 text-xs">
            {(
              [
                ["all", "ทั้งหมด"],
                ["today", "วันนี้"],
                ["yesterday", "เมื่อวาน"],
                ["month", "เดือนนี้"],
                ["previousMonth", "เดือนก่อน"],
              ] as const
            ).map(([key, label]) => {
              const isActive = preset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setPreset(key as Preset);
                    setShowCustomDate(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition cursor-pointer active:scale-95 ${
                    isActive
                      ? "bg-[#0b3531] text-white shadow-xs ring-1 ring-[#0b3531]"
                      : "bg-slate-50 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 shadow-2xs"
                  }`}
                >
                  {label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowCustomDate(!showCustomDate)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer shrink-0 active:scale-95 shadow-2xs ${
                preset === "custom" || showCustomDate
                  ? "bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-300"
                  : "bg-slate-50 border-slate-200/90 hover:bg-white text-slate-700 hover:text-slate-900"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">ระบุวัน</span>
            </button>

            <button
              type="button"
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#0b3531] hover:bg-[#072421] text-white font-semibold rounded-lg text-xs transition cursor-pointer shrink-0 active:scale-95 disabled:opacity-70 shadow-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">{refreshing ? "..." : "รีเฟรช"}</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {(showCustomDate || preset === "custom") && (
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-700 font-semibold text-xs shrink-0 pl-1">จาก:</span>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPreset("custom");
                }}
                className="w-full bg-white text-slate-900 font-medium text-xs px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-700 font-semibold text-xs shrink-0 pl-1">ถึง:</span>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPreset("custom");
                }}
                className="w-full bg-white text-slate-900 font-medium text-xs px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE KPI CARDS (Differentiated Color Tones & High Legibility)     */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        
        {/* Card 1: Actual Paid / เบิกจ่ายจริง (Indigo / Emerald Accent with Pending Indicator) */}
        <div className="bg-gradient-to-br from-white via-indigo-50/25 to-indigo-100/40 rounded-xl p-2.5 sm:p-3 border border-indigo-200/90 shadow-2xs flex flex-col justify-between hover:shadow-sm hover:border-indigo-300 transition-all group">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-700 truncate">
                ยอดเบิกจ่ายจริง
              </span>
            </div>
            <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
              summary.pendingCount > 0
                ? "text-amber-800 bg-amber-100/80 border-amber-300"
                : "text-indigo-800 bg-indigo-100/80 border-indigo-200"
            }`}>
              {summary.paidCount > 0 ? `จ่ายแล้ว ${summary.paidCount} บิล` : `รอเบิก ${summary.pendingCount} บิล`}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-indigo-700 tracking-tight truncate">
              ฿{money(summary.cashPaid)}
            </div>
            {summary.pendingAP > 0 ? (
              <div className="text-[11px] font-semibold text-amber-600 truncate mt-0.5">
                (รอเบิก ฿{money(summary.pendingAP)})
              </div>
            ) : (
              <div className="text-[11px] font-medium text-slate-400 truncate mt-0.5">
                จ่ายครบแล้วทุกรายการ
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Revenue (Fresh Emerald Accent) */}
        <div className="bg-gradient-to-br from-white via-emerald-50/20 to-emerald-100/40 rounded-xl p-2.5 sm:p-3 border border-emerald-200/90 shadow-2xs flex flex-col justify-between hover:shadow-sm hover:border-emerald-300 transition-all group">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-700 truncate">
                ยอดงานรวมภาษี
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
              {summary.projectCount} โครงการ
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight truncate">
              ฿{money(summary.revenue)}
            </div>
          </div>
        </div>

        {/* Card 3: Net Profit (Dynamic Teal/Amber Alert Accent) */}
        <div className={`rounded-xl p-2.5 sm:p-3 border shadow-2xs flex flex-col justify-between hover:shadow-sm transition-all group ${
          summary.profit >= 0
            ? "bg-gradient-to-br from-white via-emerald-50/25 to-teal-100/35 border-emerald-200/90 hover:border-emerald-300"
            : "bg-gradient-to-br from-white via-amber-50/25 to-rose-100/35 border-amber-200/90 hover:border-rose-300"
        }`}>
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs text-white ${
                summary.profit >= 0 ? "bg-teal-600" : "bg-amber-600"
              }`}>
                <Coins className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-700 truncate">
                กำไรสุทธิ (Profit)
              </span>
            </div>
            <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
              summary.profitPercent >= 0
                ? "bg-emerald-100/80 text-emerald-800 border-emerald-200"
                : "bg-rose-100/80 text-rose-700 border-rose-200"
            }`}>
              {summary.profitPercent >= 0 ? "+" : ""}{summary.profitPercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2">
            <div className={`text-xl sm:text-2xl font-black tracking-tight truncate ${summary.profit >= 0 ? "text-teal-700" : "text-rose-600"}`}>
              ฿{money(summary.profit)}
            </div>
            {summary.pendingAP > 0 ? (
              <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                หักรอเบิกแล้ว (เงินสดคงเหลือ ฿{money(summary.cashProfit)})
              </div>
            ) : (
              <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                ตามกระแสเงินสดจริง
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Project Status (Cool Indigo Accent with Status Indicators) */}
        <div className="bg-gradient-to-br from-white via-indigo-50/20 to-indigo-100/40 rounded-xl p-2.5 sm:p-3 border border-indigo-200/90 shadow-2xs flex flex-col justify-between hover:shadow-sm hover:border-indigo-300 transition-all group">
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FolderKanban className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-700 truncate">
                สถานะโครงการ
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-indigo-900 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
              รวม {summary.activeProjects + summary.completeProjects}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex-1 flex items-center justify-between px-2 py-1 rounded-lg bg-white/85 border border-emerald-200/90 shadow-2xs">
              <div className="flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-semibold text-slate-700">ทำอยู่</span>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-emerald-700">{summary.activeProjects}</span>
            </div>
            <div className="flex-1 flex items-center justify-between px-2 py-1 rounded-lg bg-white/85 border border-slate-200/90 shadow-2xs">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                <span className="text-[11px] font-semibold text-slate-700">เสร็จ</span>
              </div>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800">{summary.completeProjects}</span>
            </div>
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 3. COST STRUCTURE / EXPENSE DISTRIBUTION BAR                              */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center border shadow-2xs ${
              costBreakdownTab === "paid"
                ? "bg-indigo-50 text-indigo-700 border-indigo-200/70"
                : "bg-amber-50 text-amber-700 border-amber-200/70"
            }`}>
              <PieChart className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900">สัดส่วนค่าใช้จ่ายตามหมวดหมู่</span>

            {/* Mode Selector Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-[11px]">
              <button
                type="button"
                onClick={() => setCostBreakdownTab("paid")}
                className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                  costBreakdownTab === "paid"
                    ? "bg-white text-indigo-800 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                เบิกจ่ายจริง (฿{money(summary.cashPaid)})
              </button>
              {summary.pendingAP > 0 && (
                <button
                  type="button"
                  onClick={() => setCostBreakdownTab("pending")}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer flex items-center gap-1 ${
                    costBreakdownTab === "pending"
                      ? "bg-amber-100 text-amber-900 shadow-xs border border-amber-300"
                      : "text-amber-700 hover:text-amber-900"
                  }`}
                >
                  <span>รอเบิก (฿{money(summary.pendingAP)})</span>
                </button>
              )}
            </div>
          </div>

          <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
            {costBreakdownTab === "paid" ? (
              <>
                ยอดเบิกจ่ายจริง <strong className="text-indigo-950 font-black">฿{money(summary.cashPaid)}</strong>
                {summary.pendingAP > 0 && (
                  <span className="text-amber-600 ml-1 font-semibold">
                    (รอเบิก ฿{money(summary.pendingAP)})
                  </span>
                )}
              </>
            ) : (
              <>
                ยอดอยู่ระหว่างรอเบิก <strong className="text-amber-900 font-black">฿{money(summary.pendingAP)}</strong>
                <span className="text-slate-500 ml-1 font-medium">(ยังไม่โอนเงินจริง)</span>
              </>
            )}
          </span>
        </div>

        {/* Visual Progress Bar or Empty/Placeholder state */}
        {costBreakdownTab === "paid" && summary.cashPaid <= 0 ? (
          <div className="w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
              <span className="font-semibold text-slate-700">ยังไม่มีรายการที่เบิกจ่ายเงินจริง (฿0.00)</span>
              {summary.pendingAP > 0 && (
                <span className="text-amber-700 font-medium hidden xs:inline">
                  • มียอดรอเบิกจ่าย ฿{money(summary.pendingAP)} ({summary.pendingCount} บิล)
                </span>
              )}
            </div>
            {summary.pendingAP > 0 && (
              <button
                type="button"
                onClick={() => setCostBreakdownTab("pending")}
                className="text-[11px] font-bold text-amber-800 bg-amber-100/90 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 transition cursor-pointer shrink-0 shadow-2xs"
              >
                ดูสัดส่วนยอดรอเบิก ฿{money(summary.pendingAP)} →
              </button>
            )}
          </div>
        ) : (
          <div className="w-full h-5 sm:h-5.5 rounded-xl overflow-hidden flex bg-slate-100 border border-slate-200/90 p-0.5 gap-0.5 shadow-inner">
            {costBreakdown.length > 0 ? (
              costBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className={`h-full rounded-lg ${item.color} transition-all duration-500 hover:brightness-105 flex items-center justify-center overflow-hidden relative shadow-2xs`}
                  style={{ width: `${Math.max(3, item.percent)}%` }}
                  title={`${item.name}: ${item.percent.toFixed(1)}% (฿${money(item.amount)})`}
                >
                  {item.percent >= 8 && (
                    <span className="text-[10px] font-black text-white px-1 truncate select-none drop-shadow-xs">
                      {item.percent.toFixed(1)}%
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="w-full h-full bg-slate-200 rounded-lg" />
            )}
          </div>
        )}

        {/* Breakdown Chips */}
        {costBreakdown.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {costBreakdown.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${item.lightBg} shadow-2xs hover:scale-[1.01] transition cursor-default`}
              >
                <span className={`w-2 h-2 rounded-full ${item.color} shadow-xs shrink-0`} />
                <span className="text-slate-800 font-semibold">{item.name}</span>
                {costBreakdownTab === "pending" && (
                  <span className="text-[10px] bg-amber-200/70 text-amber-900 px-1 py-0.2 rounded font-semibold">รอเบิก</span>
                )}
                <span className={`${item.text} font-black`}>{item.percent.toFixed(1)}%</span>
                <span className="text-slate-600 font-normal">
                  ({money(item.amount)} ฿)
                </span>
                {costBreakdownTab === "paid" && (item as any).pendingAmount > 0 && (
                  <span className="text-amber-600 font-medium text-[11px]">
                    [รอเบิก {money((item as any).pendingAmount)}]
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 4. BILL FOLLOW-UP QUICK ACTION CARDS (Color-Coded & Dynamic Status)       */}
      {/* ========================================================================= */}
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Clock3 className="w-3.5 h-3.5 text-slate-700" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">สถานะงานที่ต้องติดตาม (Follow-up)</h2>
            {summary.pendingCount > 0 && (
              <Link
                href="/withdraw-request"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition"
              >
                <span>บิลรอตั้งเบิก/รอจ่าย {summary.pendingCount} รายการ (฿{money(summary.pendingAP)})</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">แตะเพื่อเข้าดูรายการบิล</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 text-xs">
          
          {/* VAT Follow (Sky Theme) */}
          <Link
            href="/bill-follow?tab=vat"
            className={`p-2.5 sm:p-3 rounded-xl border transition-all active:scale-[0.99] group flex items-center justify-between ${
              summary.vatCount > 0
                ? "bg-gradient-to-br from-white via-sky-50/40 to-sky-100/50 border-sky-300/90 shadow-xs ring-1 ring-sky-200/70 hover:border-sky-400"
                : "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                summary.vatCount > 0 ? "bg-sky-500 text-white shadow-xs" : "bg-slate-100 text-slate-500"
              }`}>
                <FileCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-600 text-xs font-semibold truncate">ตาม VAT (รอได้บิล)</div>
                <div className="text-slate-900 text-xs sm:text-sm font-extrabold truncate mt-0.5">
                  {summary.vatCount} <span className="text-[11px] font-normal text-slate-500">บิล</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {summary.vatCount > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-300">
                  รอใบเสร็จ
                </span>
              ) : null}
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Natural 3% Follow (Purple Theme - Active Highlight when > 0!) */}
          <Link
            href="/bill-follow?tab=natural"
            className={`p-2.5 sm:p-3 rounded-xl border transition-all active:scale-[0.99] group flex items-center justify-between ${
              summary.naturalDeductCount > 0
                ? "bg-gradient-to-br from-white via-purple-50/50 to-purple-100/60 border-purple-300 shadow-xs ring-1 ring-purple-300/80 hover:border-purple-400"
                : "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                summary.naturalDeductCount > 0 ? "bg-purple-600 text-white shadow-xs" : "bg-slate-100 text-slate-500"
              }`}>
                <UserCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-600 text-xs font-semibold truncate">ตาม หัก 3% บุคคล</div>
                <div className="text-slate-900 text-xs sm:text-sm font-extrabold truncate mt-0.5">
                  {summary.naturalDeductCount} <span className="text-[11px] font-normal text-slate-500">บิล</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {summary.naturalDeductCount > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 animate-pulse">
                  รอออก 3%
                </span>
              ) : null}
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Company 3% Follow (Blue Theme) */}
          <Link
            href="/bill-follow?tab=company"
            className={`p-2.5 sm:p-3 rounded-xl border transition-all active:scale-[0.99] group flex items-center justify-between ${
              summary.companyDeductCount > 0
                ? "bg-gradient-to-br from-white via-blue-50/50 to-blue-100/60 border-blue-300 shadow-xs ring-1 ring-blue-300/80 hover:border-blue-400"
                : "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                summary.companyDeductCount > 0 ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-500"
              }`}>
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-600 text-xs font-semibold truncate">ตาม หัก 3% บริษัท</div>
                <div className="text-slate-900 text-xs sm:text-sm font-extrabold truncate mt-0.5">
                  {summary.companyDeductCount} <span className="text-[11px] font-normal text-slate-500">บิล</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {summary.companyDeductCount > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300">
                  รอออก 3%
                </span>
              ) : null}
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

          {/* Credit Follow (Amber Theme) */}
          <Link
            href="/bill-follow?tab=credit"
            className={`p-2.5 sm:p-3 rounded-xl border transition-all active:scale-[0.99] group flex items-center justify-between ${
              summary.creditCount > 0
                ? "bg-gradient-to-br from-white via-amber-50/50 to-amber-100/60 border-amber-300 shadow-xs ring-1 ring-amber-300/80 hover:border-amber-400"
                : "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                summary.creditCount > 0 ? "bg-amber-600 text-white shadow-xs" : "bg-slate-100 text-slate-500"
              }`}>
                <Clock3 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-600 text-xs font-semibold truncate">ตาม เครดิต (รอจ่าย)</div>
                <div className="text-slate-900 text-xs sm:text-sm font-extrabold truncate mt-0.5">
                  {summary.creditCount} <span className="text-[11px] font-normal text-slate-500">บิล</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {summary.creditCount > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  รอจ่าย
                </span>
              ) : null}
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. TABBED BREAKDOWN REPORTS                                                */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
        
        {/* Tab Controls Bar */}
        <div className="p-2 sm:p-2.5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-2 bg-gradient-to-b from-slate-50/90 to-slate-50/40">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar whitespace-nowrap text-xs p-1 bg-slate-200/60 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("vat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                activeTab === "vat"
                  ? "bg-[#0b3531] text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>บิลมีภาษี & VAT</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "vat"
                  ? "bg-white/20 text-white"
                  : summary.main3PaidGrandTotal > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : summary.main3PendingGrandTotal > 0
                  ? "bg-amber-100 text-amber-900 font-extrabold border border-amber-300"
                  : "bg-slate-200 text-slate-500"
              }`}>
                {summary.main3PaidGrandTotal > 0
                  ? `฿${money(summary.main3PaidGrandTotal)}`
                  : summary.main3PendingGrandTotal > 0
                  ? `รอเบิก ฿${money(summary.main3PendingGrandTotal)}`
                  : "฿0.00"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("natural")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                activeTab === "natural"
                  ? "bg-[#0b3531] text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>บิลทั่วไป / ไม่มี VAT (ค่าของ/แรงบุคคล)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "natural"
                  ? "bg-white/20 text-white"
                  : summary.main4PaidTotal > 0
                  ? "bg-emerald-100 text-emerald-800 font-extrabold"
                  : summary.main4PendingTotal > 0
                  ? "bg-amber-100 text-amber-900 font-extrabold border border-amber-300"
                  : "bg-slate-200 text-slate-500"
              }`}>
                {summary.main4PaidTotal > 0
                  ? `฿${money(summary.main4PaidTotal)}`
                  : summary.main4PendingTotal > 0
                  ? `รอเบิก ฿${money(summary.main4PendingTotal)}`
                  : "฿0.00"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("equipment")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                activeTab === "equipment"
                  ? "bg-[#0b3531] text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>เครื่องจักร เครื่องมือ & อื่นๆ</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === "equipment"
                  ? "bg-white/20 text-white"
                  : summary.main5PaidTotalAll > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : summary.main5PendingTotalAll > 0
                  ? "bg-amber-100 text-amber-900 font-extrabold border border-amber-300"
                  : "bg-slate-200 text-slate-500"
              }`}>
                {summary.main5PaidTotalAll > 0
                  ? `฿${money(summary.main5PaidTotalAll)}`
                  : summary.main5PendingTotalAll > 0
                  ? `รอเบิก ฿${money(summary.main5PendingTotalAll)}`
                  : "฿0.00"}
              </span>
            </button>
          </div>

          {/* View Mode Switcher (Card View vs Table View) */}
          <div className="flex items-center justify-end gap-1.5 shrink-0 self-end md:self-auto">
            <span className="text-[11px] text-slate-500 font-medium mr-0.5 hidden sm:inline">มุมมอง:</span>
            <div className="bg-slate-200/60 p-0.5 rounded-lg flex items-center gap-1 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  viewMode === "cards" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>การ์ด</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TableProperties className="w-3 h-3" />
                <span>ตาราง</span>
              </button>
            </div>
          </div>

        </div>

        {/* Tab Content Container */}
        <div className="p-2.5 sm:p-3">
          
          {/* =================================================================== */}
          {/* TAB 1: บิลมีภาษี & VAT                                               */}
          {/* =================================================================== */}
          {activeTab === "vat" && (
            <div className="space-y-2.5">

              {/* Zero VAT Guidance Banner */}
              {summary.main3PaidGrandTotal === 0 && summary.main3PendingGrandTotal === 0 && (
                <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span>
                      ไม่มีรายการบิลมีภาษี VAT ในช่วงเวลานี้
                      {(summary.main4PaidTotal > 0 || summary.main4PendingTotal > 0) && (
                        <span className="font-bold text-amber-950 ml-1">
                          (พบรายการบิลไม่มี VAT จำนวน {summary.dataCount} บิล {summary.main4PaidTotal > 0 ? `จ่ายแล้ว ฿${money(summary.main4PaidTotal)}` : `รอเบิก ฿${money(summary.main4PendingTotal)}`} ในแท็บ &quot;บิลทั่วไป / ไม่มี VAT&quot;)
                        </span>
                      )}
                    </span>
                  </div>
                  {(summary.main4PaidTotal > 0 || summary.main4PendingTotal > 0) && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("natural")}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition text-xs shrink-0 self-start sm:self-auto cursor-pointer shadow-xs active:scale-95"
                    >
                      สลับไปดูบิลไม่มี VAT ({summary.main4PaidTotal > 0 ? `฿${money(summary.main4PaidTotal)}` : `รอเบิก ฿${money(summary.main4PendingTotal)}`}) &rarr;
                    </button>
                  )}
                </div>
              )}
              
              {/* Summary Highlight Strip (Streamlined Compact & Crisp) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-600">ก่อน VAT รวม (จ่ายจริง)</span>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">฿{money(summary.main3PaidBeforeVatTotal)}</span>
                    {summary.main3PendingBeforeVatTotal > 0 && (
                      <div className="text-[10px] text-amber-600 font-semibold">
                        (รอเบิก ฿{money(summary.main3PendingBeforeVatTotal)})
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-800">ภาษี / VAT รวม</span>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-extrabold text-emerald-700">฿{money(summary.main3PaidVatTotal)}</span>
                    {summary.main3PendingVatTotal > 0 && (
                      <div className="text-[10px] text-amber-600 font-semibold">
                        (รอเบิก ฿{money(summary.main3PendingVatTotal)})
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50/70 border border-indigo-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-indigo-800">ยอดรวมสุทธิ (จ่ายจริง)</span>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-indigo-950">฿{money(summary.main3PaidGrandTotal)}</span>
                    {summary.main3PendingGrandTotal > 0 && (
                      <div className="text-[10px] text-amber-600 font-semibold">
                        (รอเบิก ฿{money(summary.main3PendingGrandTotal)})
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* View Mode 1: Mobile Cards View */}
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
                  
                  {/* Card 1: ค่าแรงบริษัท */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200/60 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">ค่าแรงบริษัท</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70">หัก 3%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-50/90 border border-slate-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-slate-500">ก่อน VAT (จ่ายจริง)</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate">{money(summary.main3Paid.laborBeforeVat)}</div>
                        {summary.main3Pending.laborBeforeVat > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main3Pending.laborBeforeVat)})</div>
                        )}
                      </div>
                      <div className="bg-emerald-50/60 border border-emerald-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-emerald-700">ภาษี 3%</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5 truncate">{money(summary.main3Paid.laborVat)}</div>
                      </div>
                      <div className="bg-indigo-50/60 border border-indigo-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-indigo-800">รวมสุทธิ</div>
                        <div className="text-xs sm:text-sm font-black text-indigo-950 mt-0.5 truncate">{money(summary.main3Paid.laborBeforeVat)}</div>
                      </div>
                    </div>
                    {(summary.main3Paid.laborBeforeVat > 0 || summary.main3Pending.laborBeforeVat > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main3Paid.laborBeforeVat > 0 ? `จ่ายแล้ว ฿${money(summary.main3Paid.laborBeforeVat)} | ` : ""}
                          {summary.main3Pending.laborBeforeVat > 0 ? `รอเบิก ฿${money(summary.main3Pending.laborBeforeVat)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 2: ค่าของ (มี VAT) */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <Hammer className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">ค่าของ (มี VAT)</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/70">VAT 7%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-50/90 border border-slate-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-slate-500">ก่อน VAT (จ่ายจริง)</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate">{money(summary.main3Paid.materialBeforeVat)}</div>
                        {summary.main3Pending.materialBeforeVat > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main3Pending.materialBeforeVat)})</div>
                        )}
                      </div>
                      <div className="bg-emerald-50/60 border border-emerald-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-emerald-700">VAT 7%</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5 truncate">{money(summary.main3Paid.materialVat)}</div>
                      </div>
                      <div className="bg-indigo-50/60 border border-indigo-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-indigo-800">รวมสุทธิ</div>
                        <div className="text-xs sm:text-sm font-black text-indigo-950 mt-0.5 truncate">{money(summary.main3Paid.materialBeforeVat + summary.main3Paid.materialVat)}</div>
                        {(summary.main3Pending.materialBeforeVat + summary.main3Pending.materialVat) > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main3Pending.materialBeforeVat + summary.main3Pending.materialVat)})</div>
                        )}
                      </div>
                    </div>
                    {(summary.main3Paid.materialBeforeVat > 0 || summary.main3Pending.materialBeforeVat > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main3Paid.materialBeforeVat > 0 ? `จ่ายแล้ว ฿${money(summary.main3Paid.materialBeforeVat + summary.main3Paid.materialVat)} | ` : ""}
                          {summary.main3Pending.materialBeforeVat > 0 ? `รอเบิก ฿${money(summary.main3Pending.materialBeforeVat + summary.main3Pending.materialVat)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 3: น้ำมัน (มี VAT) */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-amber-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <Fuel className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">น้ำมัน (มี VAT)</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/70">VAT 7%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-50/90 border border-slate-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-slate-500">ก่อน VAT (จ่ายจริง)</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate">{money(summary.main3Paid.fuelBeforeVat)}</div>
                        {summary.main3Pending.fuelBeforeVat > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main3Pending.fuelBeforeVat)})</div>
                        )}
                      </div>
                      <div className="bg-emerald-50/60 border border-emerald-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-emerald-700">VAT 7%</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5 truncate">{money(summary.main3Paid.fuelVat)}</div>
                      </div>
                      <div className="bg-indigo-50/60 border border-indigo-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-indigo-800">รวมสุทธิ</div>
                        <div className="text-xs sm:text-sm font-black text-indigo-950 mt-0.5 truncate">{money(summary.main3Paid.fuelBeforeVat + summary.main3Paid.fuelVat)}</div>
                        {(summary.main3Pending.fuelBeforeVat + summary.main3Pending.fuelVat) > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main3Pending.fuelBeforeVat + summary.main3Pending.fuelVat)})</div>
                        )}
                      </div>
                    </div>
                    {(summary.main3Paid.fuelBeforeVat > 0 || summary.main3Pending.fuelBeforeVat > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main3Paid.fuelBeforeVat > 0 ? `จ่ายแล้ว ฿${money(summary.main3Paid.fuelBeforeVat + summary.main3Paid.fuelVat)} | ` : ""}
                          {summary.main3Pending.fuelBeforeVat > 0 ? `รอเบิก ฿${money(summary.main3Pending.fuelBeforeVat + summary.main3Pending.fuelVat)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 4: ซ่อมรถ (มี VAT) */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-rose-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">ซ่อมรถ (มี VAT)</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/70">VAT 7%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-50/90 border border-slate-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-slate-500">ก่อน VAT (จ่ายจริง)</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate">{money(summary.main3Paid.repairBeforeVat)}</div>
                        {summary.main3Pending.repairBeforeVat > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main3Pending.repairBeforeVat)})</div>
                        )}
                      </div>
                      <div className="bg-emerald-50/60 border border-emerald-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-emerald-700">VAT 7%</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5 truncate">{money(summary.main3Paid.repairVat)}</div>
                      </div>
                      <div className="bg-indigo-50/60 border border-indigo-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-indigo-800">รวมสุทธิ</div>
                        <div className="text-xs sm:text-sm font-black text-indigo-950 mt-0.5 truncate">{money(summary.main3Paid.repairBeforeVat + summary.main3Paid.repairVat)}</div>
                        {(summary.main3Pending.repairBeforeVat + summary.main3Pending.repairVat) > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main3Pending.repairBeforeVat + summary.main3Pending.repairVat)})</div>
                        )}
                      </div>
                    </div>
                    {(summary.main3Paid.repairBeforeVat > 0 || summary.main3Pending.repairBeforeVat > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main3Paid.repairBeforeVat > 0 ? `จ่ายแล้ว ฿${money(summary.main3Paid.repairBeforeVat + summary.main3Paid.repairVat)} | ` : ""}
                          {summary.main3Pending.repairBeforeVat > 0 ? `รอเบิก ฿${money(summary.main3Pending.repairBeforeVat + summary.main3Pending.repairVat)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* View Mode 2: Full Data Table */
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2 px-3 border-r border-slate-200">รายการ</th>
                        <th className="py-2 px-3 border-r border-slate-200 text-right">ก่อน VAT (จ่ายจริง)</th>
                        <th className="py-2 px-3 border-r border-slate-200 text-right">คำนวณ VAT / ภาษี (บาท)</th>
                        <th className="py-2 px-3 text-right">ยอดรวมสุทธิ (โอนจริง)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-normal text-slate-800">
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">ค่าแรงบริษัท</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div className="font-bold text-slate-900">{money(summary.main3Paid.laborBeforeVat)}</div>
                          {summary.main3Pending.laborBeforeVat > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main3Pending.laborBeforeVat)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-emerald-700 font-bold">{money(summary.main3Paid.laborVat)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          <div>{money(summary.main3Paid.laborBeforeVat)}</div>
                          {summary.main3Pending.laborBeforeVat > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main3Pending.laborBeforeVat)})</div>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">ค่าของ (มี VAT)</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div className="font-bold text-slate-900">{money(summary.main3Paid.materialBeforeVat)}</div>
                          {summary.main3Pending.materialBeforeVat > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main3Pending.materialBeforeVat)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-emerald-700 font-bold">{money(summary.main3Paid.materialVat)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          <div>{money(summary.main3Paid.materialBeforeVat + summary.main3Paid.materialVat)}</div>
                          {(summary.main3Pending.materialBeforeVat + summary.main3Pending.materialVat) > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main3Pending.materialBeforeVat + summary.main3Pending.materialVat)})</div>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">น้ำมัน (มี VAT)</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div className="font-bold text-slate-900">{money(summary.main3Paid.fuelBeforeVat)}</div>
                          {summary.main3Pending.fuelBeforeVat > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main3Pending.fuelBeforeVat)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-emerald-700 font-bold">{money(summary.main3Paid.fuelVat)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          <div>{money(summary.main3Paid.fuelBeforeVat + summary.main3Paid.fuelVat)}</div>
                          {(summary.main3Pending.fuelBeforeVat + summary.main3Pending.fuelVat) > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main3Pending.fuelBeforeVat + summary.main3Pending.fuelVat)})</div>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">ซ่อมรถ (มี VAT)</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div className="font-bold text-slate-900">{money(summary.main3Paid.repairBeforeVat)}</div>
                          {summary.main3Pending.repairBeforeVat > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main3Pending.repairBeforeVat)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-emerald-700 font-bold">{money(summary.main3Paid.repairVat)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          <div>{money(summary.main3Paid.repairBeforeVat + summary.main3Paid.repairVat)}</div>
                          {(summary.main3Pending.repairBeforeVat + summary.main3Pending.repairVat) > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main3Pending.repairBeforeVat + summary.main3Pending.repairVat)})</div>
                          )}
                        </td>
                      </tr>
                      <tr className="bg-slate-100/90 text-slate-900 border-t-2 border-slate-300 font-extrabold">
                        <td className="py-2 px-3 border-r border-slate-200">รวมทั้งสิ้น (จ่ายจริง)</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div>{money(summary.main3PaidBeforeVatTotal)}</div>
                          {summary.main3PendingBeforeVatTotal > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main3PendingBeforeVatTotal)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-emerald-700">{money(summary.main3PaidVatTotal)}</td>
                        <td className="py-2 px-3 text-right text-indigo-950 font-black">
                          <div>{money(summary.main3PaidGrandTotal)}</div>
                          {summary.main3PendingGrandTotal > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main3PendingGrandTotal)})</div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 2: ค่าแรงบุคคล & ดำเนินงาน                                         */}
          {/* =================================================================== */}
          {activeTab === "natural" && (
            <div className="space-y-2.5">
              
              {/* Summary Highlight Strip (Streamlined Compact & Crisp) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-600">รวมค่าใช้จ่าย (จ่ายจริง)</span>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">฿{money(summary.main4PaidTotal)}</span>
                    {summary.main4PendingTotal > 0 && (
                      <div className="text-[10px] text-amber-600 font-semibold">
                        (รอเบิก ฿{money(summary.main4PendingTotal)})
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-amber-800">รวมหัก ณ ที่จ่าย</span>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-extrabold text-amber-700">฿{money(summary.main4PaidDeductTotal)}</span>
                    {summary.main4PendingDeductTotal > 0 && (
                      <div className="text-[10px] text-amber-600 font-semibold">
                        (รอหัก ฿{money(summary.main4PendingDeductTotal)})
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-800">รวมยอดโอนสุทธิ (โอนจริง)</span>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-emerald-700">฿{money(summary.main4PaidNetTotal)}</span>
                    {summary.main4PendingNetTotal > 0 && (
                      <div className="text-[10px] text-amber-600 font-semibold">
                        (รอโอน ฿{money(summary.main4PendingNetTotal)})
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* View Mode 1: Mobile Cards View */}
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                  
                  {/* Card 1: ค่าแรงบุคคล */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-200/60 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">ค่าแรงบุคคล</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/70">หมวดแรงงาน</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-50/90 border border-slate-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-slate-500">จ่ายจริง</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate">{money(summary.main4Paid.naturalLabor)}</div>
                        {summary.main4Pending.naturalLabor > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main4Pending.naturalLabor)})</div>
                        )}
                      </div>
                      <div className="bg-amber-50/60 border border-amber-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-amber-700">หัก ณ ที่จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-amber-700 mt-0.5 truncate">{money(summary.main4Paid.naturalLaborDeduct)}</div>
                        {summary.main4Pending.naturalLaborDeduct > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอหัก {money(summary.main4Pending.naturalLaborDeduct)})</div>
                        )}
                      </div>
                      <div className="bg-emerald-50/60 border border-emerald-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-emerald-800">โอนแล้วจริง</div>
                        <div className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5 truncate">{money(summary.main4Paid.naturalLabor - summary.main4Paid.naturalLaborDeduct)}</div>
                        {(summary.main4Pending.naturalLabor - summary.main4Pending.naturalLaborDeduct) > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอโอน {money(summary.main4Pending.naturalLabor - summary.main4Pending.naturalLaborDeduct)})</div>
                        )}
                      </div>
                    </div>
                    {(summary.main4LaborPaid > 0 || summary.main4LaborPending > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main4LaborPaid > 0 ? `จ่ายแล้ว ฿${money(summary.main4LaborPaid)} | ` : ""}
                          {summary.main4LaborPending > 0 ? `รอเบิก ฿${money(summary.main4LaborPending)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 2: พนักงาน */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-sky-50 border border-sky-200/60 text-sky-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">พนักงาน</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/70">เงินเดือน/เบี้ยเลี้ยง</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-50/90 border border-slate-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-slate-500">จ่ายจริง</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate">{money(summary.main4Paid.staff)}</div>
                        {summary.main4Pending.staff > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main4Pending.staff)})</div>
                        )}
                      </div>
                      <div className="bg-amber-50/60 border border-amber-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-amber-700">หัก ณ ที่จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-amber-700 mt-0.5 truncate">{money(summary.main4Paid.staffDeduct)}</div>
                        {summary.main4Pending.staffDeduct > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอหัก {money(summary.main4Pending.staffDeduct)})</div>
                        )}
                      </div>
                      <div className="bg-emerald-50/60 border border-emerald-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-emerald-800">โอนแล้วจริง</div>
                        <div className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5 truncate">{money(summary.main4Paid.staff - summary.main4Paid.staffDeduct)}</div>
                        {(summary.main4Pending.staff - summary.main4Pending.staffDeduct) > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอโอน {money(summary.main4Pending.staff - summary.main4Pending.staffDeduct)})</div>
                        )}
                      </div>
                    </div>
                    {(summary.main4StaffPaid > 0 || summary.main4StaffPending > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main4StaffPaid > 0 ? `จ่ายแล้ว ฿${money(summary.main4StaffPaid)} | ` : ""}
                          {summary.main4StaffPending > 0 ? `รอเบิก ฿${money(summary.main4StaffPending)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 3: ค่าของ (ไม่มี VAT) */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <Hammer className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">ค่าของ (ไม่มี VAT)</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70">วัสดุอุปกรณ์</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-50/90 border border-slate-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-slate-500">จ่ายจริง</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate">{money(summary.main4Paid.material)}</div>
                        {summary.main4Pending.material > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main4Pending.material)})</div>
                        )}
                      </div>
                      <div className="bg-amber-50/60 border border-amber-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-amber-700">หัก ณ ที่จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-amber-700 mt-0.5 truncate">{money(summary.main4Paid.materialDeduct)}</div>
                        {summary.main4Pending.materialDeduct > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอหัก {money(summary.main4Pending.materialDeduct)})</div>
                        )}
                      </div>
                      <div className="bg-emerald-50/60 border border-emerald-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-emerald-800">โอนแล้วจริง</div>
                        <div className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5 truncate">{money(summary.main4Paid.material - summary.main4Paid.materialDeduct)}</div>
                        {(summary.main4Pending.material - summary.main4Pending.materialDeduct) > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอโอน {money(summary.main4Pending.material - summary.main4Pending.materialDeduct)})</div>
                        )}
                      </div>
                    </div>
                    {(summary.main4MaterialPaid > 0 || summary.main4MaterialPending > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main4MaterialPaid > 0 ? `จ่ายแล้ว ฿${money(summary.main4MaterialPaid)} | ` : ""}
                          {summary.main4MaterialPending > 0 ? `รอเบิกทั้งสิ้น ฿${money(summary.main4MaterialPending)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 4: น้ำมัน (ไม่มี VAT) */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-amber-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <Fuel className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">น้ำมัน (ไม่มี VAT)</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70">เชื้อเพลิง</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-50/90 border border-slate-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-slate-500">จ่ายจริง</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate">{money(summary.main4Paid.fuel)}</div>
                        {summary.main4Pending.fuel > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main4Pending.fuel)})</div>
                        )}
                      </div>
                      <div className="bg-amber-50/60 border border-amber-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-amber-700">หัก ณ ที่จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-amber-700 mt-0.5 truncate">{money(summary.main4Paid.fuelDeduct)}</div>
                        {summary.main4Pending.fuelDeduct > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอหัก {money(summary.main4Pending.fuelDeduct)})</div>
                        )}
                      </div>
                      <div className="bg-emerald-50/60 border border-emerald-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-emerald-800">โอนแล้วจริง</div>
                        <div className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5 truncate">{money(summary.main4Paid.fuel - summary.main4Paid.fuelDeduct)}</div>
                        {(summary.main4Pending.fuel - summary.main4Pending.fuelDeduct) > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอโอน {money(summary.main4Pending.fuel - summary.main4Pending.fuelDeduct)})</div>
                        )}
                      </div>
                    </div>
                    {(summary.main4FuelPaid > 0 || summary.main4FuelPending > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main4FuelPaid > 0 ? `จ่ายแล้ว ฿${money(summary.main4FuelPaid)} | ` : ""}
                          {summary.main4FuelPending > 0 ? `รอเบิก ฿${money(summary.main4FuelPending)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 5: ซ่อมรถ (ไม่มี VAT) */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-rose-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">ซ่อมรถ (ไม่มี VAT)</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70">ซ่อมบำรุง</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-50/90 border border-slate-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-slate-500">จ่ายจริง</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 truncate">{money(summary.main4Paid.repair)}</div>
                        {summary.main4Pending.repair > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอเบิก {money(summary.main4Pending.repair)})</div>
                        )}
                      </div>
                      <div className="bg-amber-50/60 border border-amber-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-amber-700">หัก ณ ที่จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-amber-700 mt-0.5 truncate">{money(summary.main4Paid.repairDeduct)}</div>
                        {summary.main4Pending.repairDeduct > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอหัก {money(summary.main4Pending.repairDeduct)})</div>
                        )}
                      </div>
                      <div className="bg-emerald-50/60 border border-emerald-200/60 p-1.5 rounded-lg text-center">
                        <div className="text-[10px] font-semibold text-emerald-800">โอนแล้วจริง</div>
                        <div className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5 truncate">{money(summary.main4Paid.repair - summary.main4Paid.repairDeduct)}</div>
                        {(summary.main4Pending.repair - summary.main4Pending.repairDeduct) > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold truncate">(รอโอน {money(summary.main4Pending.repair - summary.main4Pending.repairDeduct)})</div>
                        )}
                      </div>
                    </div>
                    {(summary.main4RepairPaid > 0 || summary.main4RepairPending > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main4RepairPaid > 0 ? `จ่ายแล้ว ฿${money(summary.main4RepairPaid)} | ` : ""}
                          {summary.main4RepairPending > 0 ? `รอเบิก ฿${money(summary.main4RepairPending)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* View Mode 2: Full Data Table */
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2 px-3 border-r border-slate-200">รายการ</th>
                        <th className="py-2 px-3 border-r border-slate-200 text-right">ยอดรวมค่าใช้จ่าย (จ่ายจริง)</th>
                        <th className="py-2 px-3 border-r border-slate-200 text-right">หัก ณ ที่จ่าย (บาท)</th>
                        <th className="py-2 px-3 text-right">ยอดโอนสุทธิ (โอนจริง)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-normal text-slate-800">
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>ค่าแรง</span>
                            {summary.main4LaborPending > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                รอเบิก ฿{money(summary.main4LaborPending)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div className="font-bold text-slate-900">{money(summary.main4Paid.naturalLabor)}</div>
                          {summary.main4Pending.naturalLabor > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main4Pending.naturalLabor)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-amber-700 font-bold">{money(summary.main4Paid.naturalLaborDeduct)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          <div>{money(summary.main4Paid.naturalLabor - summary.main4Paid.naturalLaborDeduct)}</div>
                          {(summary.main4Pending.naturalLabor - summary.main4Pending.naturalLaborDeduct) > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอโอน {money(summary.main4Pending.naturalLabor - summary.main4Pending.naturalLaborDeduct)})</div>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>พนักงาน</span>
                            {summary.main4StaffPending > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                รอเบิก ฿{money(summary.main4StaffPending)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div className="font-bold text-slate-900">{money(summary.main4Paid.staff)}</div>
                          {summary.main4Pending.staff > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main4Pending.staff)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-amber-700 font-bold">{money(summary.main4Paid.staffDeduct)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          <div>{money(summary.main4Paid.staff - summary.main4Paid.staffDeduct)}</div>
                          {(summary.main4Pending.staff - summary.main4Pending.staffDeduct) > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอโอน {money(summary.main4Pending.staff - summary.main4Pending.staffDeduct)})</div>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>ค่าของ</span>
                            {summary.main4MaterialPending > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                รอเบิก ฿{money(summary.main4MaterialPending)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div className="font-bold text-slate-900">{money(summary.main4Paid.material)}</div>
                          {summary.main4Pending.material > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main4Pending.material)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-amber-700 font-bold">{money(summary.main4Paid.materialDeduct)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          <div>{money(summary.main4Paid.material - summary.main4Paid.materialDeduct)}</div>
                          {(summary.main4Pending.material - summary.main4Pending.materialDeduct) > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอโอน {money(summary.main4Pending.material - summary.main4Pending.materialDeduct)})</div>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>น้ำมัน</span>
                            {summary.main4FuelPending > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                รอเบิก ฿{money(summary.main4FuelPending)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div className="font-bold text-slate-900">{money(summary.main4Paid.fuel)}</div>
                          {summary.main4Pending.fuel > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main4Pending.fuel)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-amber-700 font-bold">{money(summary.main4Paid.fuelDeduct)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          <div>{money(summary.main4Paid.fuel - summary.main4Paid.fuelDeduct)}</div>
                          {(summary.main4Pending.fuel - summary.main4Pending.fuelDeduct) > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอโอน {money(summary.main4Pending.fuel - summary.main4Pending.fuelDeduct)})</div>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>ซ่อมรถ</span>
                            {summary.main4RepairPending > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                รอเบิก ฿{money(summary.main4RepairPending)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div className="font-bold text-slate-900">{money(summary.main4Paid.repair)}</div>
                          {summary.main4Pending.repair > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main4Pending.repair)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-amber-700 font-bold">{money(summary.main4Paid.repairDeduct)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          <div>{money(summary.main4Paid.repair - summary.main4Paid.repairDeduct)}</div>
                          {(summary.main4Pending.repair - summary.main4Pending.repairDeduct) > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอโอน {money(summary.main4Pending.repair - summary.main4Pending.repairDeduct)})</div>
                          )}
                        </td>
                      </tr>
                      <tr className="bg-slate-100/90 text-slate-900 border-t-2 border-slate-300 font-extrabold">
                        <td className="py-2 px-3 border-r border-slate-200">รวมทั้งสิ้น (จ่ายจริง)</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div className="text-slate-900">{money(summary.main4PaidTotal)}</div>
                          {summary.main4PendingTotal > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก ฿{money(summary.main4PendingTotal)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-amber-700">{money(summary.main4PaidDeductTotal)}</td>
                        <td className="py-2 px-3 text-right text-emerald-700 font-black">
                          <div>{money(summary.main4PaidNetTotal)}</div>
                          {summary.main4PendingNetTotal > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอโอน ฿{money(summary.main4PendingNetTotal)})</div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: เครื่องจักร เครื่องมือ & อื่นๆ                                    */}
          {/* =================================================================== */}
          {activeTab === "equipment" && (
            <div className="space-y-2.5">
              
              {/* Summary Highlight Strip (Streamlined Compact & Crisp) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-sky-50/70 border border-sky-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-sky-800">รวมเครื่องจักร (จ่ายจริง)</span>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-extrabold text-sky-900">฿{money(summary.main5PaidMachineTotal)}</span>
                    {summary.main5PendingMachineTotal > 0 && (
                      <div className="text-[10px] text-amber-600 font-semibold">
                        (รอเบิก ฿{money(summary.main5PendingMachineTotal)})
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-amber-800">รวมเครื่องมือ (จ่ายจริง)</span>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-extrabold text-amber-900">฿{money(summary.main5PaidToolTotal)}</span>
                    {summary.main5PendingToolTotal > 0 && (
                      <div className="text-[10px] text-amber-600 font-semibold">
                        (รอเบิก ฿{money(summary.main5PendingToolTotal)})
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-50/70 border border-purple-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-purple-800">รวมอื่นๆ (จ่ายจริง)</span>
                  <div className="text-right">
                    <span className="text-sm sm:text-base font-black text-purple-950">฿{money(summary.main5PaidOtherTotal)}</span>
                    {summary.main5PendingOtherTotal > 0 && (
                      <div className="text-[10px] text-amber-600 font-semibold">
                        (รอเบิก ฿{money(summary.main5PendingOtherTotal)})
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* View Mode 1: Mobile Cards View */}
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5">
                  
                  {/* Card 1: เครื่องจักร */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-sky-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-sky-50 border border-sky-200/60 text-sky-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">เครื่องจักร</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200/70">฿{money(summary.main5PaidMachineTotal)}</span>
                        {summary.main5PendingMachineTotal > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">(รอเบิก ฿{money(summary.main5PendingMachineTotal)})</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs bg-slate-50/70 p-2 rounded-lg border border-slate-200/60 divide-y divide-slate-100">
                      <div className="flex items-center justify-between text-slate-600 pt-0.5 first:pt-0">
                        <span className="font-medium">ก่อน VAT:</span>
                        <span className="text-slate-900 font-bold">{money(summary.main5Paid.machineBeforeVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 pt-1">
                        <span className="font-medium">คำนวณ VAT (7%):</span>
                        <span className="text-emerald-700 font-bold">{money(summary.main5Paid.machineVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 pt-1">
                        <span className="font-medium">ไม่มี VAT:</span>
                        <span className="text-slate-900 font-bold">{money(summary.main5Paid.machineNoVat)}</span>
                      </div>
                    </div>
                    {(summary.main5PaidMachineTotal > 0 || summary.main5PendingMachineTotal > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main5PaidMachineTotal > 0 ? `จ่ายแล้ว ฿${money(summary.main5PaidMachineTotal)} | ` : ""}
                          {summary.main5PendingMachineTotal > 0 ? `รอเบิก ฿${money(summary.main5PendingMachineTotal)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 2: เครื่องมือ */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-amber-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <Hammer className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">เครื่องมือ</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/70">฿{money(summary.main5PaidToolTotal)}</span>
                        {summary.main5PendingToolTotal > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">(รอเบิก ฿{money(summary.main5PendingToolTotal)})</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs bg-slate-50/70 p-2 rounded-lg border border-slate-200/60 divide-y divide-slate-100">
                      <div className="flex items-center justify-between text-slate-600 pt-0.5 first:pt-0">
                        <span className="font-medium">ก่อน VAT:</span>
                        <span className="text-slate-900 font-bold">{money(summary.main5Paid.toolBeforeVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 pt-1">
                        <span className="font-medium">คำนวณ VAT (7%):</span>
                        <span className="text-emerald-700 font-bold">{money(summary.main5Paid.toolVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 pt-1">
                        <span className="font-medium">ไม่มี VAT:</span>
                        <span className="text-slate-900 font-bold">{money(summary.main5Paid.toolNoVat)}</span>
                      </div>
                    </div>
                    {(summary.main5PaidToolTotal > 0 || summary.main5PendingToolTotal > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main5PaidToolTotal > 0 ? `จ่ายแล้ว ฿${money(summary.main5PaidToolTotal)} | ` : ""}
                          {summary.main5PendingToolTotal > 0 ? `รอเบิก ฿${money(summary.main5PendingToolTotal)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card 3: อื่นๆ */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-purple-50 border border-purple-200/60 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">อื่นๆ</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/70">฿{money(summary.main5PaidOtherTotal)}</span>
                        {summary.main5PendingOtherTotal > 0 && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">(รอเบิก ฿{money(summary.main5PendingOtherTotal)})</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs bg-slate-50/70 p-2 rounded-lg border border-slate-200/60 divide-y divide-slate-100">
                      <div className="flex items-center justify-between text-slate-600 pt-0.5 first:pt-0">
                        <span className="font-medium">ก่อน VAT:</span>
                        <span className="text-slate-900 font-bold">{money(summary.main5Paid.otherBeforeVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 pt-1">
                        <span className="font-medium">คำนวณ VAT (7%):</span>
                        <span className="text-emerald-700 font-bold">{money(summary.main5Paid.otherVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 pt-1">
                        <span className="font-medium">ไม่มี VAT:</span>
                        <span className="text-slate-900 font-bold">{money(summary.main5Paid.otherNoVat)}</span>
                      </div>
                    </div>
                    {(summary.main5PaidOtherTotal > 0 || summary.main5PendingOtherTotal > 0) && (
                      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-800">
                        <span className="font-medium">สถานะการเบิกจ่าย:</span>
                        <span className="font-extrabold">
                          {summary.main5PaidOtherTotal > 0 ? `จ่ายแล้ว ฿${money(summary.main5PaidOtherTotal)} | ` : ""}
                          {summary.main5PendingOtherTotal > 0 ? `รอเบิก ฿${money(summary.main5PendingOtherTotal)} (ยังไม่โอนเงิน)` : "จ่ายครบแล้ว"}
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* View Mode 2: Full Data Table */
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2 px-3 border-r border-slate-200">รายการ</th>
                        <th className="py-2 px-3 border-r border-slate-200 text-right">เครื่องจักร (จ่ายจริง)</th>
                        <th className="py-2 px-3 border-r border-slate-200 text-right">เครื่องมือ (จ่ายจริง)</th>
                        <th className="py-2 px-3 text-right">อื่นๆ (จ่ายจริง)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-normal text-slate-800">
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">ก่อน VAT</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div>{money(summary.main5Paid.machineBeforeVat)}</div>
                          {summary.main5Pending.machineBeforeVat > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main5Pending.machineBeforeVat)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div>{money(summary.main5Paid.toolBeforeVat)}</div>
                          {summary.main5Pending.toolBeforeVat > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main5Pending.toolBeforeVat)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                          <div>{money(summary.main5Paid.otherBeforeVat)}</div>
                          {summary.main5Pending.otherBeforeVat > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main5Pending.otherBeforeVat)})</div>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">คำนวณ VAT (7%)</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-emerald-700 font-bold">{money(summary.main5Paid.machineVat)}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-emerald-700 font-bold">{money(summary.main5Paid.toolVat)}</td>
                        <td className="py-2 px-3 text-right text-emerald-700 font-bold">{money(summary.main5Paid.otherVat)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-900 font-semibold">ไม่มี VAT</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div>{money(summary.main5Paid.machineNoVat)}</div>
                          {summary.main5Pending.machineNoVat > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main5Pending.machineNoVat)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right">
                          <div>{money(summary.main5Paid.toolNoVat)}</div>
                          {summary.main5Pending.toolNoVat > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main5Pending.toolNoVat)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900">
                          <div>{money(summary.main5Paid.otherNoVat)}</div>
                          {summary.main5Pending.otherNoVat > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก {money(summary.main5Pending.otherNoVat)})</div>
                          )}
                        </td>
                      </tr>
                      <tr className="bg-slate-100/90 text-slate-900 border-t-2 border-slate-300 font-extrabold">
                        <td className="py-2 px-3 border-r border-slate-200">ยอดรวมทั้งสิ้น (จ่ายจริง)</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-sky-800">
                          <div>{money(summary.main5PaidMachineTotal)}</div>
                          {summary.main5PendingMachineTotal > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก ฿{money(summary.main5PendingMachineTotal)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right text-amber-800">
                          <div>{money(summary.main5PaidToolTotal)}</div>
                          {summary.main5PendingToolTotal > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก ฿{money(summary.main5PendingToolTotal)})</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-purple-900 font-black">
                          <div>{money(summary.main5PaidOtherTotal)}</div>
                          {summary.main5PendingOtherTotal > 0 && (
                            <div className="text-[10px] text-amber-600 font-semibold">(รอเบิก ฿{money(summary.main5PendingOtherTotal)})</div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

        </div>
      </section>

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

function sumCategoryPaidRows(rows: SheetRow[], categoryKeyword: string): number {
  return rows.filter(isPaidBill).reduce((sum, row) => sum + getCategoryAmount(row, categoryKeyword), 0);
}

function sumCategoryPendingRows(rows: SheetRow[], categoryKeyword: string): number {
  return rows.filter(r => !isPaidBill(r)).reduce((sum, row) => sum + getCategoryAmount(row, categoryKeyword), 0);
}

function sumCategoryPaidDeductRows(rows: SheetRow[], categoryKeyword: string): number {
  return rows.filter(isPaidBill).reduce((sum, row) => sum + getCategoryDeductAmount(row, categoryKeyword), 0);
}

function sumCategoryPendingDeductRows(rows: SheetRow[], categoryKeyword: string): number {
  return rows.filter(r => !isPaidBill(r)).reduce((sum, row) => sum + getCategoryDeductAmount(row, categoryKeyword), 0);
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

  const companyPaidRows = companyRows.filter(isPaidBill);
  const companyPendingRows = companyRows.filter(r => !isPaidBill(r));
  const vatPaidRows = vatRows.filter(isPaidBill);
  const vatPendingRows = vatRows.filter(r => !isPaidBill(r));
  const noVatPaidRows = noVatRows.filter(isPaidBill);
  const noVatPendingRows = noVatRows.filter(r => !isPaidBill(r));

  const matVatTot = sumCategoryRows(vatRows, "ค่าของ");
  const fuelVatTot = sumCategoryRows(vatRows, "น้ำมัน");
  const repVatTot = sumCategoryRows(vatRows, "ซ่อมรถ");

  const matVatPaidTot = sumCategoryRows(vatPaidRows, "ค่าของ");
  const fuelVatPaidTot = sumCategoryRows(vatPaidRows, "น้ำมัน");
  const repVatPaidTot = sumCategoryRows(vatPaidRows, "ซ่อมรถ");

  const matVatPendingTot = sumCategoryRows(vatPendingRows, "ค่าของ");
  const fuelVatPendingTot = sumCategoryRows(vatPendingRows, "น้ำมัน");
  const repVatPendingTot = sumCategoryRows(vatPendingRows, "ซ่อมรถ");

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

  const main3Paid = {
    laborBeforeVat: sumCategoryRows(companyPaidRows, "ค่าแรง"),
    materialBeforeVat: matVatPaidTot > 0 ? matVatPaidTot / 1.07 : 0,
    fuelBeforeVat: fuelVatPaidTot > 0 ? fuelVatPaidTot / 1.07 : 0,
    repairBeforeVat: repVatPaidTot > 0 ? repVatPaidTot / 1.07 : 0,
    laborVat: sumCategoryRows(companyPaidRows, "ค่าแรง") * 0.03,
    materialVat: matVatPaidTot > 0 ? matVatPaidTot - (matVatPaidTot / 1.07) : 0,
    fuelVat: fuelVatPaidTot > 0 ? fuelVatPaidTot - (fuelVatPaidTot / 1.07) : 0,
    repairVat: repVatPaidTot > 0 ? repVatPaidTot - (repVatPaidTot / 1.07) : 0
  };
  const main3PaidBeforeVatTotal = main3Paid.laborBeforeVat + main3Paid.materialBeforeVat + main3Paid.fuelBeforeVat + main3Paid.repairBeforeVat;
  const main3PaidVatTotal = main3Paid.laborVat + main3Paid.materialVat + main3Paid.fuelVat + main3Paid.repairVat;
  const main3PaidGrandTotal = main3PaidBeforeVatTotal + main3PaidVatTotal;

  const main3Pending = {
    laborBeforeVat: sumCategoryRows(companyPendingRows, "ค่าแรง"),
    materialBeforeVat: matVatPendingTot > 0 ? matVatPendingTot / 1.07 : 0,
    fuelBeforeVat: fuelVatPendingTot > 0 ? fuelVatPendingTot / 1.07 : 0,
    repairBeforeVat: repVatPendingTot > 0 ? repVatPendingTot / 1.07 : 0,
    laborVat: sumCategoryRows(companyPendingRows, "ค่าแรง") * 0.03,
    materialVat: matVatPendingTot > 0 ? matVatPendingTot - (matVatPendingTot / 1.07) : 0,
    fuelVat: fuelVatPendingTot > 0 ? fuelVatPendingTot - (fuelVatPendingTot / 1.07) : 0,
    repairVat: repVatPendingTot > 0 ? repVatPendingTot - (repVatPendingTot / 1.07) : 0
  };
  const main3PendingBeforeVatTotal = main3Pending.laborBeforeVat + main3Pending.materialBeforeVat + main3Pending.fuelBeforeVat + main3Pending.repairBeforeVat;
  const main3PendingVatTotal = main3Pending.laborVat + main3Pending.materialVat + main3Pending.fuelVat + main3Pending.repairVat;
  const main3PendingGrandTotal = main3PendingBeforeVatTotal + main3PendingVatTotal;

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

  const main4Paid = {
    naturalLabor: sumCategoryPaidRows(naturalRows, "ค่าแรง"),
    naturalLaborDeduct: sumCategoryPaidDeductRows(naturalRows, "ค่าแรง"),
    staff: sumCategoryPaidRows(dataRows, "พนักงาน"),
    staffDeduct: sumCategoryPaidDeductRows(dataRows, "พนักงาน"),
    material: sumCategoryPaidRows(noVatRows, "ค่าของ"),
    materialDeduct: sumCategoryPaidDeductRows(noVatRows, "ค่าของ"),
    fuel: sumCategoryPaidRows(noVatRows, "น้ำมัน"),
    fuelDeduct: sumCategoryPaidDeductRows(noVatRows, "น้ำมัน"),
    repair: sumCategoryPaidRows(noVatRows, "ซ่อมรถ"),
    repairDeduct: sumCategoryPaidDeductRows(noVatRows, "ซ่อมรถ"),
  };

  const main4Pending = {
    naturalLabor: sumCategoryPendingRows(naturalRows, "ค่าแรง"),
    naturalLaborDeduct: sumCategoryPendingDeductRows(naturalRows, "ค่าแรง"),
    staff: sumCategoryPendingRows(dataRows, "พนักงาน"),
    staffDeduct: sumCategoryPendingDeductRows(dataRows, "พนักงาน"),
    material: sumCategoryPendingRows(noVatRows, "ค่าของ"),
    materialDeduct: sumCategoryPendingDeductRows(noVatRows, "ค่าของ"),
    fuel: sumCategoryPendingRows(noVatRows, "น้ำมัน"),
    fuelDeduct: sumCategoryPendingDeductRows(noVatRows, "น้ำมัน"),
    repair: sumCategoryPendingRows(noVatRows, "ซ่อมรถ"),
    repairDeduct: sumCategoryPendingDeductRows(noVatRows, "ซ่อมรถ"),
  };

  const main4LaborPaid = main4Paid.naturalLabor;
  const main4LaborPending = main4Pending.naturalLabor;
  const main4StaffPaid = main4Paid.staff;
  const main4StaffPending = main4Pending.staff;
  const main4MaterialPaid = main4Paid.material;
  const main4MaterialPending = main4Pending.material;
  const main4FuelPaid = main4Paid.fuel;
  const main4FuelPending = main4Pending.fuel;
  const main4RepairPaid = main4Paid.repair;
  const main4RepairPending = main4Pending.repair;

  const main4PaidTotal = main4Paid.naturalLabor + main4Paid.staff + main4Paid.material + main4Paid.fuel + main4Paid.repair;
  const main4PaidDeductTotal = main4Paid.naturalLaborDeduct + main4Paid.staffDeduct + main4Paid.materialDeduct + main4Paid.fuelDeduct + main4Paid.repairDeduct;
  const main4PaidNetTotal = main4PaidTotal - main4PaidDeductTotal;

  const main4PendingTotal = main4Pending.naturalLabor + main4Pending.staff + main4Pending.material + main4Pending.fuel + main4Pending.repair;
  const main4PendingDeductTotal = main4Pending.naturalLaborDeduct + main4Pending.staffDeduct + main4Pending.materialDeduct + main4Pending.fuelDeduct + main4Pending.repairDeduct;
  const main4PendingNetTotal = main4PendingTotal - main4PendingDeductTotal;

  const machVatTot = sumCategoryRows(vatRows, "เครื่องจักร");
  const toolVatTot = sumCategoryRows(vatRows, "เครื่องมือ");
  const othVatTot = sumCategoryRows(vatRows, "อื่นๆ");

  const machVatPaidTot = sumCategoryRows(vatPaidRows, "เครื่องจักร");
  const toolVatPaidTot = sumCategoryRows(vatPaidRows, "เครื่องมือ");
  const othVatPaidTot = sumCategoryRows(vatPaidRows, "อื่นๆ");

  const machVatPendingTot = sumCategoryRows(vatPendingRows, "เครื่องจักร");
  const toolVatPendingTot = sumCategoryRows(vatPendingRows, "เครื่องมือ");
  const othVatPendingTot = sumCategoryRows(vatPendingRows, "อื่นๆ");

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

  const main5Paid = {
    machineBeforeVat: machVatPaidTot > 0 ? machVatPaidTot / 1.07 : 0,
    toolBeforeVat: toolVatPaidTot > 0 ? toolVatPaidTot / 1.07 : 0,
    otherBeforeVat: othVatPaidTot > 0 ? othVatPaidTot / 1.07 : 0,
    machineVat: machVatPaidTot > 0 ? machVatPaidTot - (machVatPaidTot / 1.07) : 0,
    toolVat: toolVatPaidTot > 0 ? toolVatPaidTot - (toolVatPaidTot / 1.07) : 0,
    otherVat: othVatPaidTot > 0 ? othVatPaidTot - (othVatPaidTot / 1.07) : 0,
    machineNoVat: sumCategoryRows(noVatPaidRows, "เครื่องจักร"),
    toolNoVat: sumCategoryRows(noVatPaidRows, "เครื่องมือ"),
    otherNoVat: sumCategoryRows(noVatPaidRows, "อื่นๆ")
  };
  const main5PaidMachineTotal = main5Paid.machineBeforeVat + main5Paid.machineVat + main5Paid.machineNoVat;
  const main5PaidToolTotal = main5Paid.toolBeforeVat + main5Paid.toolVat + main5Paid.toolNoVat;
  const main5PaidOtherTotal = main5Paid.otherBeforeVat + main5Paid.otherVat + main5Paid.otherNoVat;
  const main5PaidTotalAll = main5PaidMachineTotal + main5PaidToolTotal + main5PaidOtherTotal;

  const main5Pending = {
    machineBeforeVat: machVatPendingTot > 0 ? machVatPendingTot / 1.07 : 0,
    toolBeforeVat: toolVatPendingTot > 0 ? toolVatPendingTot / 1.07 : 0,
    otherBeforeVat: othVatPendingTot > 0 ? othVatPendingTot / 1.07 : 0,
    machineVat: machVatPendingTot > 0 ? machVatPendingTot - (machVatPendingTot / 1.07) : 0,
    toolVat: toolVatPendingTot > 0 ? toolVatPendingTot - (toolVatPendingTot / 1.07) : 0,
    otherVat: othVatPendingTot > 0 ? othVatPendingTot - (othVatPendingTot / 1.07) : 0,
    machineNoVat: sumCategoryRows(noVatPendingRows, "เครื่องจักร"),
    toolNoVat: sumCategoryRows(noVatPendingRows, "เครื่องมือ"),
    otherNoVat: sumCategoryRows(noVatPendingRows, "อื่นๆ")
  };
  const main5PendingMachineTotal = main5Pending.machineBeforeVat + main5Pending.machineVat + main5Pending.machineNoVat;
  const main5PendingToolTotal = main5Pending.toolBeforeVat + main5Pending.toolVat + main5Pending.toolNoVat;
  const main5PendingOtherTotal = main5Pending.otherBeforeVat + main5Pending.otherVat + main5Pending.otherNoVat;
  const main5PendingTotalAll = main5PendingMachineTotal + main5PendingToolTotal + main5PendingOtherTotal;

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
  const main5TotalAll = main5MachineTotal + main5ToolTotal + main5OtherTotal;

  const revenue = projectRows.reduce((sum, row) => {
    const vatTotal = toNumber(row["ยอดรวม vat"] || row["ยอดรวม VAT"]);
    if (vatTotal > 0) return sum + vatTotal;
    const workAmt = toNumber(row["ยอดงาน"]);
    if (workAmt > 0) return sum + (workAmt * 1.07);
    return sum;
  }, 0);
  const investment = total;
  const operating = sumRowsTotal(operatingRows);
  const profit = revenue - investment;
  const profitPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
  const profitHealth = getProfitHealthStatus(profitPercent);
  const cashFlow = computeCashFlowBreakdown(dataRows);

  const paidBills = dataRows.filter(isPaidBill);
  const pendingBills = dataRows.filter(r => isCommittedBill(r) && !isPaidBill(r));
  const paidCount = paidBills.length;
  const pendingCount = pendingBills.length;
  const cashProfit = revenue - cashFlow.actualPaid;
  const cashProfitPercent = revenue > 0 ? (cashProfit / revenue) * 100 : 0;

  return {
    filterLabel: "ข้อมูลทั้งหมด",
    dataCount: dataRows.length,
    projectCount: projectRows.length,
    paidCount,
    pendingCount,
    total,
    cashPaid: cashFlow.actualPaid,
    pendingAP: cashFlow.pendingPayables,
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
    profitHealth,
    cashProfit,
    cashProfitPercent,
    main3,
    main3Paid,
    main3Pending,
    main3BeforeVatTotal,
    main3VatTotal,
    main3GrandTotal,
    main3PaidBeforeVatTotal,
    main3PendingBeforeVatTotal,
    main3PaidVatTotal,
    main3PendingVatTotal,
    main3PaidGrandTotal,
    main3PendingGrandTotal,
    main3Total,
    main4,
    main4Paid,
    main4Pending,
    main4Total,
    main4DeductTotal,
    main4NetTotal,
    main4PaidTotal,
    main4PaidDeductTotal,
    main4PaidNetTotal,
    main4PendingTotal,
    main4PendingDeductTotal,
    main4PendingNetTotal,
    main4OperatingTotal,
    main4MaterialPaid,
    main4MaterialPending,
    main4LaborPaid,
    main4LaborPending,
    main4StaffPaid,
    main4StaffPending,
    main4FuelPaid,
    main4FuelPending,
    main4RepairPaid,
    main4RepairPending,
    main5,
    main5Paid,
    main5Pending,
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
    main5OtherTotal,
    main5TotalAll,
    main5PaidMachineTotal,
    main5PendingMachineTotal,
    main5PaidToolTotal,
    main5PendingToolTotal,
    main5PaidOtherTotal,
    main5PendingOtherTotal,
    main5PaidTotalAll,
    main5PendingTotalAll,
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
