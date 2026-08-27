"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
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
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showCustomDate, setShowCustomDate] = useState(false);

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

  // Realtime live sync from Supabase PostgreSQL
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel("main_dashboard_live_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "bills" }, () => {
        refreshData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        refreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const presetLabels: Record<Preset, string> = {
    all: "ข้อมูลทั้งหมด",
    today: "วันนี้",
    yesterday: "เมื่อวาน",
    month: "เดือนนี้",
    previousMonth: "เดือนก่อน",
    custom: "ช่วงวันที่กำหนด",
  };

  // Cost proportions for quick executive chart
  const costBreakdown = useMemo(() => {
    const total = summary.total > 0 ? summary.total : 1;
    const labor = summary.main3.laborBeforeVat + summary.main4.naturalLabor + summary.main4.staff;
    const material = (summary.main3.materialBeforeVat + summary.main3.materialVat) + summary.main4.material;
    const fleet = (summary.main3.fuelBeforeVat + summary.main3.fuelVat + summary.main3.repairBeforeVat + summary.main3.repairVat) + summary.main4.fuel + summary.main4.repair;
    const equipment = summary.main5MachineTotal + summary.main5ToolTotal;
    const other = summary.main5OtherTotal;

    return [
      { name: "ค่าแรง/พนักงาน", amount: labor, percent: (labor / total) * 100, color: "bg-indigo-600", text: "text-indigo-950 font-bold", lightBg: "bg-indigo-50/90 border-indigo-200" },
      { name: "ค่าของ/วัสดุ", amount: material, percent: (material / total) * 100, color: "bg-emerald-600", text: "text-emerald-950 font-bold", lightBg: "bg-emerald-50/90 border-emerald-200" },
      { name: "น้ำมัน/ซ่อมรถ", amount: fleet, percent: (fleet / total) * 100, color: "bg-amber-600", text: "text-amber-950 font-bold", lightBg: "bg-amber-50/90 border-amber-200" },
      { name: "เครื่องจักร/เครื่องมือ", amount: equipment, percent: (equipment / total) * 100, color: "bg-sky-600", text: "text-sky-950 font-bold", lightBg: "bg-sky-50/90 border-sky-200" },
      { name: "หมวดอื่นๆ", amount: other, percent: (other / total) * 100, color: "bg-slate-600", text: "text-slate-950 font-bold", lightBg: "bg-slate-100 border-slate-300" },
    ].filter(item => item.amount > 0);
  }, [summary]);

  return (
    <div className="w-full flex flex-col gap-3 sm:gap-4 p-2.5 sm:p-4 max-w-[1600px] mx-auto font-sans text-slate-900 antialiased pb-12 font-normal">
      
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE FILTER & DATE CONTROLS                                       */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Title & Preset Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0b3531] text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-950 tracking-tight truncate">แดชบอร์ดภาพรวมการเงิน</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                  {presetLabels[preset]}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium truncate hidden sm:block">สรุปรายได้ ค่าใช้จ่าย กำไร และภาษีทั้งระบบ</p>
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 whitespace-nowrap transition cursor-pointer active:scale-95 ${
                    isActive
                      ? "bg-[#0b3531] text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowCustomDate(!showCustomDate)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer shrink-0 active:scale-95 ${
                preset === "custom" || showCustomDate
                  ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-xs hidden xs:inline">ระบุวัน</span>
            </button>

            <button
              type="button"
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b3531] hover:bg-[#062e2b] text-white font-bold rounded-lg text-xs transition cursor-pointer shrink-0 active:scale-95 disabled:opacity-70 shadow-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">{refreshing ? "..." : "รีเฟรช"}</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {(showCustomDate || preset === "custom") && (
          <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-slate-800 font-bold text-xs shrink-0 pl-1">จาก:</span>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPreset("custom");
                }}
                className="w-full bg-white text-slate-950 font-semibold text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-slate-800 font-bold text-xs shrink-0 pl-1">ถึง:</span>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPreset("custom");
                }}
                className="w-full bg-white text-slate-950 font-semibold text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE KPI CARDS                                                    */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        
        {/* Card 1: Total Expenses */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[110px] hover:border-rose-400 hover:shadow-xs transition">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
              ค่าใช้จ่ายรวม
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-2xl lg:text-2xl font-black text-rose-700 tracking-tight truncate leading-none">
              ฿{money(summary.total)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-slate-600 truncate">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>รวม <strong className="text-slate-900">{summary.dataCount}</strong> บิล</span>
            </div>
          </div>
        </div>

        {/* Card 2: Revenue */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[110px] hover:border-emerald-400 hover:shadow-xs transition">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
              ยอดงานรวมภาษี
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-2xl lg:text-2xl font-black text-emerald-800 tracking-tight truncate leading-none">
              ฿{money(summary.revenue)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold text-slate-600 truncate">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <span>รวม <strong className="text-slate-900">{summary.projectCount}</strong> โครงการ</span>
            </div>
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[110px] hover:border-amber-400 hover:shadow-xs transition">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
              กำไรสุทธิ (Profit)
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className={`text-lg sm:text-2xl lg:text-2xl font-black tracking-tight truncate leading-none ${summary.profit >= 0 ? "text-slate-950" : "text-rose-700"}`}>
              ฿{money(summary.profit)}
            </div>
            <div className="space-y-1 mt-1.5">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-500 ${summary.profit >= 0 ? "bg-amber-500" : "bg-rose-500"}`}
                  style={{ width: `${Math.max(5, Math.min(100, Math.abs(summary.profitPercent)))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>อัตรากำไร:</span>
                <span className={`font-black ${summary.profitPercent >= 0 ? "text-emerald-800" : "text-rose-700"}`}>
                  {summary.profitPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Project Status */}
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[110px] hover:border-indigo-400 hover:shadow-xs transition">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
              สถานะโครงการ
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100">
                <div className="text-[11px] font-bold text-indigo-950 truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  กำลังทำ
                </div>
                <div className="text-sm sm:text-base font-black text-indigo-950 mt-0.5">{summary.activeProjects}</div>
              </div>
              <div className="flex-1 min-w-0 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <div className="text-[11px] font-bold text-slate-800 truncate flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                  เสร็จสิ้น
                </div>
                <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">{summary.completeProjects}</div>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-1 truncate text-right">
              รวม <strong className="text-slate-800">{summary.activeProjects + summary.completeProjects}</strong> โครงการ
            </div>
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 3. COST STRUCTURE / EXPENSE DISTRIBUTION BAR                              */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-slate-700" />
            <span className="text-xs sm:text-sm font-bold text-slate-950">สัดส่วนค่าใช้จ่ายตามหมวดหมู่</span>
          </div>
          <span className="text-xs font-bold text-slate-700">ยอดรวม <strong className="text-slate-950">฿{money(summary.total)}</strong></span>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-100 border border-slate-200 p-0.5 gap-0.5">
          {costBreakdown.length > 0 ? (
            costBreakdown.map((item, idx) => (
              <div
                key={idx}
                className={`h-full rounded-xs ${item.color} transition-all duration-500`}
                style={{ width: `${Math.max(3, item.percent)}%` }}
                title={`${item.name}: ${item.percent.toFixed(1)}% (฿${money(item.amount)})`}
              />
            ))
          ) : (
            <div className="w-full h-full bg-slate-200/50 rounded-xs" />
          )}
        </div>

        {/* Breakdown Chips */}
        {costBreakdown.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
            {costBreakdown.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 shadow-2xs ${item.lightBg}`}
              >
                <span className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-slate-900 font-bold">{item.name}</span>
                <span className={item.text}>{item.percent.toFixed(1)}%</span>
                <span className="text-slate-600">({money(item.amount)})</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 4. BILL FOLLOW-UP QUICK ACTION CARDS                                      */}
      {/* ========================================================================= */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-slate-700" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-950">สถานะงานที่ต้องติดตาม (Follow-up)</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">แตะเพื่อดูบิล</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          
          {/* VAT Follow */}
          <Link
            href="/bill-follow?tab=vat"
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between hover:border-sky-400 hover:shadow-xs transition active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                <FileCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-700 text-xs font-bold truncate">ตาม VAT (รอได้บิล)</div>
                <div className="text-slate-950 text-sm sm:text-base font-black truncate">
                  {summary.vatCount} <span className="text-xs font-semibold text-slate-500">บิล</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-700 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
          </Link>

          {/* Natural 3% Follow */}
          <Link
            href="/bill-follow?tab=natural"
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between hover:border-purple-400 hover:shadow-xs transition active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-700 text-xs font-bold truncate">ตาม หัก 3% บุคคล</div>
                <div className="text-slate-950 text-sm sm:text-base font-black truncate">
                  {summary.naturalDeductCount} <span className="text-xs font-semibold text-slate-500">บิล</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
          </Link>

          {/* Company 3% Follow */}
          <Link
            href="/bill-follow?tab=company"
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between hover:border-blue-400 hover:shadow-xs transition active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-700 text-xs font-bold truncate">ตาม หัก 3% บริษัท</div>
                <div className="text-slate-950 text-sm sm:text-base font-black truncate">
                  {summary.companyDeductCount} <span className="text-xs font-semibold text-slate-500">บิล</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
          </Link>

          {/* Credit Follow */}
          <Link
            href="/bill-follow?tab=credit"
            className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between hover:border-orange-400 hover:shadow-xs transition active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center shrink-0">
                <Clock3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-700 text-xs font-bold truncate">ตาม เครดิต (รอจ่าย)</div>
                <div className="text-slate-950 text-sm sm:text-base font-black truncate">
                  {summary.creditCount} <span className="text-xs font-semibold text-slate-500">บิล</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-700 group-hover:translate-x-0.5 transition shrink-0 ml-1" />
          </Link>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. TABBED BREAKDOWN REPORTS                                                */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
        
        {/* Tab Controls Bar */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-50/70">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("vat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                activeTab === "vat"
                  ? "bg-[#0b3531] text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>ค่าแรงบริษัท & ภาษี VAT</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("natural")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                activeTab === "natural"
                  ? "bg-[#0b3531] text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ค่าแรงบุคคล & ดำเนินงาน</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("equipment")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 ${
                activeTab === "equipment"
                  ? "bg-[#0b3531] text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>เครื่องจักร เครื่องมือ & อื่นๆ</span>
            </button>
          </div>

          {/* View Mode Switcher (Card View vs Table View) */}
          <div className="flex items-center justify-end gap-1.5 shrink-0 self-end md:self-auto">
            <span className="text-xs font-semibold text-slate-600 mr-1 hidden sm:inline">มุมมอง:</span>
            <div className="bg-slate-200/80 p-0.5 rounded-lg flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === "cards" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-700 hover:text-slate-950"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>การ์ด</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === "table" ? "bg-white text-slate-950 shadow-2xs" : "text-slate-700 hover:text-slate-950"
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                <span>ตาราง</span>
              </button>
            </div>
          </div>

        </div>

        {/* Tab Content Container */}
        <div className="p-3 sm:p-4">
          
          {/* =================================================================== */}
          {/* TAB 1: ค่าแรงบริษัท & ภาษี VAT                                        */}
          {/* =================================================================== */}
          {activeTab === "vat" && (
            <div className="space-y-3">
              
              {/* Summary Highlight Strip */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/90 rounded-xl border border-slate-200">
                <div className="text-center sm:text-left pl-1">
                  <div className="text-xs font-bold text-slate-700 uppercase truncate">ก่อน VAT รวม</div>
                  <div className="text-sm sm:text-lg lg:text-xl font-black text-slate-950 truncate mt-0.5">฿{money(summary.main3BeforeVatTotal)}</div>
                </div>
                <div className="text-center sm:text-left border-x border-slate-200 px-2">
                  <div className="text-xs font-bold text-slate-700 uppercase truncate">ภาษี / VAT รวม</div>
                  <div className="text-sm sm:text-lg lg:text-xl font-black text-emerald-800 truncate mt-0.5">฿{money(summary.main3VatTotal)}</div>
                </div>
                <div className="text-center sm:text-left pl-1">
                  <div className="text-xs font-bold text-slate-700 uppercase truncate">ยอดรวมสุทธิ</div>
                  <div className="text-sm sm:text-lg lg:text-xl font-black text-indigo-950 truncate mt-0.5">฿{money(summary.main3GrandTotal)}</div>
                </div>
              </div>

              {/* View Mode 1: Mobile Cards View */}
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
                  
                  {/* Card 1: ค่าแรงบริษัท */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">ค่าแรงบริษัท</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200">หัก 3%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ก่อน VAT</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-950 mt-0.5">{money(summary.main3.laborBeforeVat)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ภาษี 3%</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5">{money(summary.main3.laborVat)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">รวมสุทธิ</div>
                        <div className="text-xs sm:text-sm font-bold text-indigo-950 mt-0.5">{money(summary.main3.laborBeforeVat)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: ค่าของ (มี VAT) */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                          <Hammer className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">ค่าของ (มี VAT)</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200">VAT 7%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ก่อน VAT</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-950 mt-0.5">{money(summary.main3.materialBeforeVat)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">VAT 7%</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5">{money(summary.main3.materialVat)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">รวมสุทธิ</div>
                        <div className="text-xs sm:text-sm font-bold text-indigo-950 mt-0.5">{money(summary.main3.materialBeforeVat + summary.main3.materialVat)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: น้ำมัน (มี VAT) */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                          <Fuel className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">น้ำมัน (มี VAT)</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">VAT 7%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ก่อน VAT</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-950 mt-0.5">{money(summary.main3.fuelBeforeVat)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">VAT 7%</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5">{money(summary.main3.fuelVat)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">รวมสุทธิ</div>
                        <div className="text-xs sm:text-sm font-bold text-indigo-950 mt-0.5">{money(summary.main3.fuelBeforeVat + summary.main3.fuelVat)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: ซ่อมรถ (มี VAT) */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
                          <Truck className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">ซ่อมรถ (มี VAT)</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-900 border border-rose-200">VAT 7%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ก่อน VAT</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-950 mt-0.5">{money(summary.main3.repairBeforeVat)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">VAT 7%</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5">{money(summary.main3.repairVat)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">รวมสุทธิ</div>
                        <div className="text-xs sm:text-sm font-bold text-indigo-950 mt-0.5">{money(summary.main3.repairBeforeVat + summary.main3.repairVat)}</div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* View Mode 2: Full Data Table */
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3.5 border-r border-slate-200">รายการ</th>
                        <th className="py-2.5 px-3.5 border-r border-slate-200 text-right">ก่อน VAT (บาท)</th>
                        <th className="py-2.5 px-3.5 border-r border-slate-200 text-right">คำนวณ VAT / ภาษี (บาท)</th>
                        <th className="py-2.5 px-3.5 text-right">ยอดรวมสุทธิ (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-semibold text-slate-900">
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">ค่าแรงบริษัท</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main3.laborBeforeVat)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right text-emerald-800 font-mono font-bold">{money(summary.main3.laborVat)}</td>
                        <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-950">{money(summary.main3.laborBeforeVat)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">ค่าของ (มี VAT)</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main3.materialBeforeVat)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right text-emerald-800 font-mono font-bold">{money(summary.main3.materialVat)}</td>
                        <td className="py-2 px-3.5 text-right font-mono font-bold text-indigo-950">{money(summary.main3.materialBeforeVat + summary.main3.materialVat)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">น้ำมัน (มี VAT)</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main3.fuelBeforeVat)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right text-emerald-800 font-mono font-bold">{money(summary.main3.fuelVat)}</td>
                        <td className="py-2 px-3.5 text-right font-mono font-bold text-indigo-950">{money(summary.main3.fuelBeforeVat + summary.main3.fuelVat)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">ซ่อมรถ (มี VAT)</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main3.repairBeforeVat)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right text-emerald-800 font-mono font-bold">{money(summary.main3.repairVat)}</td>
                        <td className="py-2 px-3.5 text-right font-mono font-bold text-indigo-950">{money(summary.main3.repairBeforeVat + summary.main3.repairVat)}</td>
                      </tr>
                      <tr className="bg-slate-50 text-slate-950 border-t border-slate-300 font-black">
                        <td className="py-2.5 px-3.5 border-r border-slate-200">รวมทั้งสิ้น</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main3BeforeVatTotal)}</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-200 text-right text-emerald-800 font-mono">{money(summary.main3VatTotal)}</td>
                        <td className="py-2.5 px-3.5 text-right text-indigo-950 font-mono">{money(summary.main3GrandTotal)}</td>
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
            <div className="space-y-3">
              
              {/* Summary Highlight Strip */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/90 rounded-xl border border-slate-200">
                <div className="text-center sm:text-left pl-1">
                  <div className="text-xs font-bold text-slate-700 uppercase truncate">รวมค่าใช้จ่าย</div>
                  <div className="text-sm sm:text-lg lg:text-xl font-black text-slate-950 truncate mt-0.5">฿{money(summary.main4Total)}</div>
                </div>
                <div className="text-center sm:text-left border-x border-slate-200 px-2">
                  <div className="text-xs font-bold text-slate-700 uppercase truncate">รวมหัก ณ ที่จ่าย</div>
                  <div className="text-sm sm:text-lg lg:text-xl font-black text-amber-800 truncate mt-0.5">฿{money(summary.main4DeductTotal)}</div>
                </div>
                <div className="text-center sm:text-left pl-1">
                  <div className="text-xs font-bold text-slate-700 uppercase truncate">รวมยอดโอนสุทธิ</div>
                  <div className="text-sm sm:text-lg lg:text-xl font-black text-emerald-800 truncate mt-0.5">฿{money(summary.main4NetTotal)}</div>
                </div>
              </div>

              {/* View Mode 1: Mobile Cards View */}
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
                  
                  {/* Card 1: ค่าแรง */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">ค่าแรงบุคคล</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">หมวดแรงงาน</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ค่าใช้จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-950 mt-0.5">{money(summary.main4.naturalLabor)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">หัก ณ ที่จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-amber-800 mt-0.5">{money(summary.main4.naturalLaborDeduct)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ยอดโอนสุทธิ</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5">{money(summary.main4.naturalLabor - summary.main4.naturalLaborDeduct)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: พนักงาน */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">พนักงาน</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-900 border border-sky-200">เงินเดือน/เบี้ยเลี้ยง</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ค่าใช้จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-950 mt-0.5">{money(summary.main4.staff)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">หัก ณ ที่จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-amber-800 mt-0.5">{money(summary.main4.staffDeduct)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ยอดโอนสุทธิ</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5">{money(summary.main4.staff - summary.main4.staffDeduct)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: ค่าของ */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                          <Hammer className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">ค่าของ (ไม่มี VAT)</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">วัสดุอุปกรณ์</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ค่าใช้จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-950 mt-0.5">{money(summary.main4.material)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">หัก ณ ที่จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-amber-800 mt-0.5">{money(summary.main4.materialDeduct)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ยอดโอนสุทธิ</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5">{money(summary.main4.material - summary.main4.materialDeduct)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: น้ำมัน */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                          <Fuel className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">น้ำมัน (ไม่มี VAT)</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">เชื้อเพลิง</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ค่าใช้จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-950 mt-0.5">{money(summary.main4.fuel)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">หัก ณ ที่จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-amber-800 mt-0.5">{money(summary.main4.fuelDeduct)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ยอดโอนสุทธิ</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5">{money(summary.main4.fuel - summary.main4.fuelDeduct)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card 5: ซ่อมรถ */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
                          <Truck className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">ซ่อมรถ (ไม่มี VAT)</span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">ซ่อมบำรุง</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-center">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ค่าใช้จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-950 mt-0.5">{money(summary.main4.repair)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">หัก ณ ที่จ่าย</div>
                        <div className="text-xs sm:text-sm font-bold text-amber-800 mt-0.5">{money(summary.main4.repairDeduct)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-700">ยอดโอนสุทธิ</div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-800 mt-0.5">{money(summary.main4.repair - summary.main4.repairDeduct)}</div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* View Mode 2: Full Data Table */
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3.5 border-r border-slate-200">รายการ</th>
                        <th className="py-2.5 px-3.5 border-r border-slate-200 text-right">ยอดรวมค่าใช้จ่าย (บาท)</th>
                        <th className="py-2.5 px-3.5 border-r border-slate-200 text-right">หัก ณ ที่จ่าย (บาท)</th>
                        <th className="py-2.5 px-3.5 text-right">ยอดโอนสุทธิ (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-semibold text-slate-900">
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">ค่าแรง</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main4.naturalLabor)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right text-amber-800 font-mono font-bold">{money(summary.main4.naturalLaborDeduct)}</td>
                        <td className="py-2 px-3.5 text-right font-mono font-bold text-emerald-800">{money(summary.main4.naturalLabor - summary.main4.naturalLaborDeduct)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">พนักงาน</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main4.staff)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right text-amber-800 font-mono font-bold">{money(summary.main4.staffDeduct)}</td>
                        <td className="py-2 px-3.5 text-right font-mono font-bold text-emerald-800">{money(summary.main4.staff - summary.main4.staffDeduct)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">ค่าของ</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main4.material)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right text-amber-800 font-mono font-bold">{money(summary.main4.materialDeduct)}</td>
                        <td className="py-2 px-3.5 text-right font-mono font-bold text-emerald-800">{money(summary.main4.material - summary.main4.materialDeduct)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">น้ำมัน</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main4.fuel)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right text-amber-800 font-mono font-bold">{money(summary.main4.fuelDeduct)}</td>
                        <td className="py-2 px-3.5 text-right font-mono font-bold text-emerald-800">{money(summary.main4.fuel - summary.main4.fuelDeduct)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">ซ่อมรถ</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main4.repair)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right text-amber-800 font-mono font-bold">{money(summary.main4.repairDeduct)}</td>
                        <td className="py-2 px-3.5 text-right font-mono font-bold text-emerald-800">{money(summary.main4.repair - summary.main4.repairDeduct)}</td>
                      </tr>
                      <tr className="bg-slate-50 text-slate-950 border-t border-slate-300 font-black">
                        <td className="py-2.5 px-3.5 border-r border-slate-200">รวมทั้งสิ้น</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main4Total)}</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-200 text-right text-amber-800 font-mono">{money(summary.main4DeductTotal)}</td>
                        <td className="py-2.5 px-3.5 text-right text-emerald-800 font-mono">{money(summary.main4NetTotal)}</td>
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
            <div className="space-y-3">
              
              {/* Summary Highlight Strip */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/90 rounded-xl border border-slate-200">
                <div className="text-center sm:text-left pl-1">
                  <div className="text-xs font-bold text-slate-700 uppercase truncate">รวมเครื่องจักร</div>
                  <div className="text-sm sm:text-lg lg:text-xl font-black text-slate-950 truncate mt-0.5">฿{money(summary.main5MachineTotal)}</div>
                </div>
                <div className="text-center sm:text-left border-x border-slate-200 px-2">
                  <div className="text-xs font-bold text-slate-700 uppercase truncate">รวมเครื่องมือ</div>
                  <div className="text-sm sm:text-lg lg:text-xl font-black text-sky-800 truncate mt-0.5">฿{money(summary.main5ToolTotal)}</div>
                </div>
                <div className="text-center sm:text-left pl-1">
                  <div className="text-xs font-bold text-slate-700 uppercase truncate">รวมอื่นๆ</div>
                  <div className="text-sm sm:text-lg lg:text-xl font-black text-indigo-950 truncate mt-0.5">฿{money(summary.main5OtherTotal)}</div>
                </div>
              </div>

              {/* View Mode 1: Mobile Cards View */}
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5">
                  
                  {/* Card 1: เครื่องจักร */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">เครื่องจักร</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-sky-800">฿{money(summary.main5MachineTotal)}</span>
                    </div>
                    
                    <div className="space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-semibold">
                      <div className="flex items-center justify-between text-slate-700">
                        <span>ก่อน VAT:</span>
                        <span className="text-slate-950 font-bold font-mono">{money(summary.main5.machineBeforeVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>คำนวณ VAT (7%):</span>
                        <span className="text-emerald-800 font-bold font-mono">{money(summary.main5.machineVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>ไม่มี VAT:</span>
                        <span className="text-slate-950 font-bold font-mono">{money(summary.main5.machineNoVat)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: เครื่องมือ */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                          <Hammer className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">เครื่องมือ</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-amber-800">฿{money(summary.main5ToolTotal)}</span>
                    </div>
                    
                    <div className="space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-semibold">
                      <div className="flex items-center justify-between text-slate-700">
                        <span>ก่อน VAT:</span>
                        <span className="text-slate-950 font-bold font-mono">{money(summary.main5.toolBeforeVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>คำนวณ VAT (7%):</span>
                        <span className="text-emerald-800 font-bold font-mono">{money(summary.main5.toolVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>ไม่มี VAT:</span>
                        <span className="text-slate-950 font-bold font-mono">{money(summary.main5.toolNoVat)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: อื่นๆ */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-950">อื่นๆ</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-purple-800">฿{money(summary.main5OtherTotal)}</span>
                    </div>
                    
                    <div className="space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-semibold">
                      <div className="flex items-center justify-between text-slate-700">
                        <span>ก่อน VAT:</span>
                        <span className="text-slate-950 font-bold font-mono">{money(summary.main5.otherBeforeVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>คำนวณ VAT (7%):</span>
                        <span className="text-emerald-800 font-bold font-mono">{money(summary.main5.otherVat)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>ไม่มี VAT:</span>
                        <span className="text-slate-950 font-bold font-mono">{money(summary.main5.otherNoVat)}</span>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* View Mode 2: Full Data Table */
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3.5 border-r border-slate-200">รายการ</th>
                        <th className="py-2.5 px-3.5 border-r border-slate-200 text-right">เครื่องจักร (บาท)</th>
                        <th className="py-2.5 px-3.5 border-r border-slate-200 text-right">เครื่องมือ (บาท)</th>
                        <th className="py-2.5 px-3.5 text-right">อื่นๆ (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white font-semibold text-slate-900">
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">ก่อน VAT</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main5.machineBeforeVat)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main5.toolBeforeVat)}</td>
                        <td className="py-2 px-3.5 text-right font-mono">{money(summary.main5.otherBeforeVat)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">คำนวณ VAT (7%)</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right text-emerald-800 font-mono font-bold">{money(summary.main5.machineVat)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right text-emerald-800 font-mono font-bold">{money(summary.main5.toolVat)}</td>
                        <td className="py-2 px-3.5 text-right font-mono text-emerald-800 font-bold">{money(summary.main5.otherVat)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3.5 border-r border-slate-200 text-slate-950 font-bold">ไม่มี VAT</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main5.machineNoVat)}</td>
                        <td className="py-2 px-3.5 border-r border-slate-200 text-right font-mono">{money(summary.main5.toolNoVat)}</td>
                        <td className="py-2 px-3.5 text-right font-mono">{money(summary.main5.otherNoVat)}</td>
                      </tr>
                      <tr className="bg-slate-50 text-slate-950 border-t border-slate-300 font-black">
                        <td className="py-2.5 px-3.5 border-r border-slate-200">ยอดรวมทั้งสิ้น</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-200 text-right text-sky-800 font-mono">{money(summary.main5MachineTotal)}</td>
                        <td className="py-2.5 px-3.5 border-r border-slate-200 text-right text-amber-800 font-mono">{money(summary.main5ToolTotal)}</td>
                        <td className="py-2.5 px-3.5 text-right text-purple-800 font-mono">{money(summary.main5OtherTotal)}</td>
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

  return {
    filterLabel: "ข้อมูลทั้งหมด",
    dataCount: dataRows.length,
    projectCount: projectRows.length,
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
