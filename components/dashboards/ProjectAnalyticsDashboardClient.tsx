"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Coins,
  Layers,
  Filter,
  PieChart,
  Search,
  X,
  TrendingUp,
  Building2,
  PieChart as PieIcon,
  BarChart2,
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Receipt,
  FileSpreadsheet,
  Grid,
  TrendingDown,
  Briefcase
} from "lucide-react";
import { money } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";
import {
  filterBillsByProject,
  getRowAmount,
  getRowCategory,
  getRowTransferAmount,
} from "@/lib/reports";
import { hydrateProjectRowsForList } from "@/lib/project-summary";
import { ProjectBudgetControlMatrix } from "@/components/dashboards/ProjectBudgetControlMatrix";

type ProjectAnalyticsDashboardClientProps = {
  initialDataRows: SheetRow[];
  initialProjectRows: SheetRow[];
  initialStoreRows: SheetRow[];
  initialContractorRows: SheetRow[];
  initialPeopleRows: SheetRow[];
};

type AnalyticsTab = "budget_vs_actual" | "category_pie" | "monthly_trend" | "labor_vs_material" | "variance_table" | "budget_matrix";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const CATEGORY_COLORS: Record<string, { hex: string; bg: string; text: string }> = {
  "1.ค่าของ": { hex: "#059669", bg: "bg-emerald-600", text: "text-emerald-700" },
  "2.ค่าแรง": { hex: "#4f46e5", bg: "bg-indigo-600", text: "text-indigo-700" },
  "3.พนักงาน": { hex: "#9333ea", bg: "bg-purple-600", text: "text-purple-700" },
  "4.น้ำมัน": { hex: "#d97706", bg: "bg-amber-600", text: "text-amber-700" },
  "5.ซ่อมรถ": { hex: "#ea580c", bg: "bg-orange-600", text: "text-orange-700" },
  "6.เครื่องจักร": { hex: "#2563eb", bg: "bg-blue-600", text: "text-blue-700" },
  "7.เครื่องมือ": { hex: "#0891b2", bg: "bg-cyan-600", text: "text-cyan-700" },
  "8.อื่นๆ": { hex: "#e11d48", bg: "bg-rose-600", text: "text-rose-700" },
};

const PALETTE = [
  "#059669", "#4f46e5", "#9333ea", "#d97706", "#ea580c",
  "#2563eb", "#0891b2", "#e11d48", "#65a30d", "#db2777",
  "#475569", "#0d9488", "#0284c7"
];

function formatDateThai(dateVal: unknown): string {
  if (!dateVal) return "-";
  const str = String(dateVal).trim();
  if (!str) return "-";
  const matchISO = str.match(/^(\d{4})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])$/);
  if (matchISO) {
    const [, y, m, d] = matchISO;
    const dayNum = parseInt(d, 10);
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) return `${dayNum} ${THAI_MONTHS_SHORT[monthIdx]} ${y}`;
  }
  return str;
}

export function ProjectAnalyticsDashboardClient({
  initialDataRows,
  initialProjectRows,
  initialPeopleRows,
}: ProjectAnalyticsDashboardClientProps) {
  const [dataRows] = useState<SheetRow[]>(initialDataRows);
  const [rawProjectRows] = useState<SheetRow[]>(initialProjectRows);

  // Active Tab
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("budget_vs_actual");

  // Filters State
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Debounce search input by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Drilldown Modal
  const [drilldownModal, setDrilldownModal] = useState<{
    title: string;
    subtitle?: string;
    rows: SheetRow[];
  } | null>(null);

  // People Map
  const peopleMap = useMemo(() => {
    const map: Record<string, string> = {};
    (initialPeopleRows || []).forEach((r) => {
      const code = String(r["รหัสพนักงาน"] || r["รหัส"] || r["ID"] || "").trim().toLowerCase();
      const nickname = String(r["ชื่อเล่น"] || "").trim();
      const fullName = String(r["ชื่อ-นามสกุล"] || r["ชื่อ"] || "").trim();
      const displayName = nickname || fullName;
      if (code && displayName) map[code] = displayName;
    });
    return map;
  }, [initialPeopleRows]);

  function getRequesterDisplayName(raw: unknown): string {
    const val = String(raw || "").trim();
    if (!val) return "-";
    return peopleMap[val.toLowerCase()] || val;
  }

  // Hydrate Project Rows with unified budget cap logic
  const hydratedProjects = useMemo(() => {
    return hydrateProjectRowsForList(rawProjectRows, dataRows);
  }, [rawProjectRows, dataRows]);

  // Projects list for dropdown selector
  const projectsList = useMemo(() => {
    return hydratedProjects
      .map((p) => {
        const id = String(p["ID Project"] || p.id || "").trim();
        const name = String(p["ชื่อ Project"] || p.name || "").trim();
        return { id, name, label: id && name ? `${id} - ${name}` : id || name, row: p };
      })
      .filter((p) => p.id || p.name);
  }, [hydratedProjects]);

  // Filtered Data Rows based on Project & Category & Search
  const filteredDataRows = useMemo(() => {
    let rows = dataRows;
    if (selectedProjectId !== "all") {
      rows = filterBillsByProject(rows, selectedProjectId);
    }
    if (selectedCategory !== "all") {
      rows = rows.filter((r) => getRowCategory(r).includes(selectedCategory));
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      rows = rows.filter((r) => {
        const reqName = getRequesterDisplayName(r["ผู้เบิก"]);
        return (
          String(r["ID Project"] || "").toLowerCase().includes(q) ||
          String(r["ร้าน/บุคคล"] || "").toLowerCase().includes(q) ||
          String(r["สินค้า/ทำงาน"] || "").toLowerCase().includes(q) ||
          String(r["รายละเอียดงาน"] || "").toLowerCase().includes(q) ||
          String(r["ประเภท"] || "").toLowerCase().includes(q) ||
          String(r["ผู้เบิก"] || "").toLowerCase().includes(q) ||
          reqName.toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [dataRows, selectedProjectId, selectedCategory, debouncedSearch, peopleMap]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const activeProjects = selectedProjectId === "all"
      ? hydratedProjects
      : hydratedProjects.filter(p => String(p["ID Project"] || p.id || "").trim() === selectedProjectId);

    const totalBudget = activeProjects.reduce((sum, p) => sum + (Number(p["งบไม่เกิน"]) || 0), 0);
    const totalSpent = filteredDataRows.reduce((sum, r) => sum + getRowAmount(r), 0);
    const totalTransfer = filteredDataRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
    const remainingBudget = totalBudget - totalSpent;
    const burnRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const materialSpent = filteredDataRows.filter(r => getRowCategory(r).includes("ค่าของ")).reduce((sum, r) => sum + getRowAmount(r), 0);
    const laborSpent = filteredDataRows.filter(r => getRowCategory(r).includes("ค่าแรง")).reduce((sum, r) => sum + getRowAmount(r), 0);
    const otherSpent = totalSpent - (materialSpent + laborSpent);

    return {
      totalBudget,
      totalSpent,
      totalTransfer,
      remainingBudget,
      burnRate,
      materialSpent,
      laborSpent,
      otherSpent,
      billCount: filteredDataRows.length,
      projectCount: activeProjects.length,
    };
  }, [hydratedProjects, filteredDataRows, selectedProjectId]);

  // Per-Project Breakdown Data
  const projectBreakdown = useMemo(() => {
    return hydratedProjects.map(p => {
      const id = String(p["ID Project"] || p.id || "").trim();
      const name = String(p["ชื่อ Project"] || p.name || "").trim();
      const pRows = dataRows.filter(r => String(r["ID Project"] || "").trim() === id);

      const budgetCap = Number(p["งบไม่เกิน"]) || 0;
      const spent = pRows.reduce((sum, r) => sum + getRowAmount(r), 0);
      const transfer = pRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
      const remaining = budgetCap - spent;
      const burnRate = budgetCap > 0 ? (spent / budgetCap) * 100 : 0;

      const mat = pRows.filter(r => getRowCategory(r).includes("ค่าของ")).reduce((sum, r) => sum + getRowAmount(r), 0);
      const lab = pRows.filter(r => getRowCategory(r).includes("ค่าแรง")).reduce((sum, r) => sum + getRowAmount(r), 0);
      const oth = spent - (mat + lab);

      return {
        id,
        name,
        displayName: name ? `${id} - ${name}` : id,
        budgetCap,
        spent,
        transfer,
        remaining,
        burnRate,
        mat,
        lab,
        oth,
        billCount: pRows.length,
        rows: pRows,
      };
    }).sort((a, b) => b.budgetCap - a.budgetCap);
  }, [hydratedProjects, dataRows]);

  // Category Breakdown Data
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number; rows: SheetRow[] }> = {};
    filteredDataRows.forEach(r => {
      const cat = getRowCategory(r) || "8.อื่นๆ";
      if (!map[cat]) map[cat] = { amount: 0, count: 0, rows: [] };
      map[cat].amount += getRowAmount(r);
      map[cat].count += 1;
      map[cat].rows.push(r);
    });

    const total = Object.values(map).reduce((sum, c) => sum + c.amount, 0);

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        percent: total > 0 ? (data.amount / total) * 100 : 0,
        color: CATEGORY_COLORS[name]?.hex || PALETTE[0],
        rows: data.rows,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredDataRows]);

  // Monthly Spending Trend Data
  const monthlyTrend = useMemo(() => {
    const monthsMap: Record<string, { label: string; yearMonth: string; amount: number; transfer: number; rows: SheetRow[] }> = {};

    filteredDataRows.forEach(r => {
      const dateStr = String(r["ว/ด/ป"] || r["วันที่"] || "").trim();
      let ymKey = "Unspecified";
      let displayLabel = "ไม่ระบุ";

      const match = dateStr.match(/^(\d{4})[-/.](0?[1-9]|1[0-2])/);
      if (match) {
        const y = match[1];
        const mIdx = parseInt(match[2], 10) - 1;
        ymKey = `${y}-${match[2].padStart(2, "0")}`;
        displayLabel = `${THAI_MONTHS_SHORT[mIdx]} ${y}`;
      } else {
        const matchThai = dateStr.match(/(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(20\d\d|25\d\d|\d\d)?/);
        if (matchThai) {
          displayLabel = matchThai[0];
          ymKey = matchThai[0];
        }
      }

      if (!monthsMap[ymKey]) {
        monthsMap[ymKey] = { label: displayLabel, yearMonth: ymKey, amount: 0, transfer: 0, rows: [] };
      }
      monthsMap[ymKey].amount += getRowAmount(r);
      monthsMap[ymKey].transfer += getRowTransferAmount(r);
      monthsMap[ymKey].rows.push(r);
    });

    return Object.values(monthsMap).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  }, [filteredDataRows]);

  // SVG Donut Paths
  const donutPaths = useMemo(() => {
    let accumulatedAngle = 0;
    const radius = 75;
    const circumference = 2 * Math.PI * radius;

    return categoryBreakdown.map((item) => {
      const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((accumulatedAngle / 100) * circumference);
      accumulatedAngle += item.percent;
      return {
        ...item,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [categoryBreakdown]);

  return (
    <div className="space-y-5 font-sans antialiased text-slate-800 pb-16 bg-slate-50/50 p-2 sm:p-4 rounded-2xl font-normal">
      {/* 1. PROFESSIONAL ENTERPRISE HEADER */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-2xs border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-2xs">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-normal text-slate-900 tracking-normal flex items-center gap-2">
                ศูนย์วิเคราะห์และควบคุมต้นทุนโครงการ
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-normal">
                  Cost Control ERP
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                ระบบวิเคราะห์ผลต่างงบประมาณ (Variance) สัดส่วนต้นทุน และแนวโน้มเบิกจ่ายสำหรับบริหารงานก่อสร้าง
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
            <Building2 size={15} className="text-slate-500" />
            <span className="font-normal text-slate-700">โครงการ:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-white text-slate-900 font-normal px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs"
            >
              <option value="all">ทุกโครงการ ({projectsList.length} โครงการ)</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
            <Filter size={15} className="text-slate-500" />
            <span className="font-normal text-slate-700">หมวดหมู่:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white text-slate-900 font-normal px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs"
            >
              <option value="all">ทุกหมวดหมู่ต้นทุน</option>
              {Object.keys(CATEGORY_COLORS).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Budget */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-normal uppercase tracking-wide">
            <span>งบประมาณรวม</span>
            <Briefcase size={16} className="text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-normal text-slate-900 tracking-normal">
            {money(summaryMetrics.totalBudget)} <span className="text-xs font-normal text-slate-500">บาท</span>
          </div>
          <div className="text-xs text-slate-500 font-normal">
            {summaryMetrics.projectCount} โครงการเปิดดำเนินการ
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-normal uppercase tracking-wide">
            <span>เบิกจ่ายสะสมจริง</span>
            <Receipt size={16} className="text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-normal text-slate-900 tracking-normal">
            {money(summaryMetrics.totalSpent)} <span className="text-xs font-normal text-slate-500">บาท</span>
          </div>
          <div className="text-xs text-emerald-700 font-normal">
            โอนเงินสุทธิ: {money(summaryMetrics.totalTransfer)} บาท
          </div>
        </div>

        {/* Remaining Budget Variance */}
        <div className={`p-4 rounded-xl border shadow-2xs space-y-1.5 ${
          summaryMetrics.remainingBudget >= 0
            ? "bg-emerald-50/60 border-emerald-200"
            : "bg-rose-50/60 border-rose-200"
        }`}>
          <div className="flex items-center justify-between text-xs font-normal uppercase tracking-wide">
            <span className={summaryMetrics.remainingBudget >= 0 ? "text-emerald-900" : "text-rose-900"}>
              งบคงเหลือ / ส่วนต่าง
            </span>
            {summaryMetrics.remainingBudget >= 0 ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={16} className="text-rose-600" />
            )}
          </div>
          <div className={`text-xl sm:text-2xl font-normal tracking-normal ${
            summaryMetrics.remainingBudget >= 0 ? "text-emerald-700" : "text-rose-600"
          }`}>
            {money(summaryMetrics.remainingBudget)} <span className="text-xs font-normal">บาท</span>
          </div>
          <div className={`text-xs font-normal ${
            summaryMetrics.remainingBudget >= 0 ? "text-emerald-700" : "text-rose-700"
          }`}>
            {summaryMetrics.remainingBudget >= 0 ? "อยู่ในงบประมาณที่กำหนด" : "เกินงบประมาณตั้งไว้"}
          </div>
        </div>

        {/* Burn Rate Gauge */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-normal uppercase tracking-wide">
            <span>อัตราใช้างบ (Burn Rate)</span>
            <TrendingUp size={16} className="text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl sm:text-2xl font-normal tracking-normal ${
              summaryMetrics.burnRate > 100 ? "text-rose-600" : summaryMetrics.burnRate > 85 ? "text-amber-600" : "text-slate-900"
            }`}>
              {summaryMetrics.burnRate.toFixed(1)}%
            </span>
            <span className="text-xs font-normal text-slate-500">ของงบรวม</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summaryMetrics.burnRate > 100 ? "bg-rose-600" : summaryMetrics.burnRate > 85 ? "bg-amber-500" : "bg-emerald-600"
              }`}
              style={{ width: `${Math.min(summaryMetrics.burnRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Labor vs Material Ratio */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-normal uppercase tracking-wide">
            <span>สัดส่วน ของ vs แรง</span>
            <Coins size={16} className="text-slate-400" />
          </div>
          <div className="flex items-center justify-between text-xs font-normal pt-0.5">
            <span className="text-emerald-700">ของ: {money(summaryMetrics.materialSpent)}</span>
            <span className="text-indigo-700">แรง: {money(summaryMetrics.laborSpent)}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden">
            <div
              className="bg-emerald-600 h-full"
              style={{ width: `${summaryMetrics.totalSpent > 0 ? (summaryMetrics.materialSpent / summaryMetrics.totalSpent) * 100 : 50}%` }}
            />
            <div
              className="bg-indigo-600 h-full"
              style={{ width: `${summaryMetrics.totalSpent > 0 ? (summaryMetrics.laborSpent / summaryMetrics.totalSpent) * 100 : 50}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      <div className="bg-white border border-slate-200 p-1.5 rounded-xl flex items-center gap-1.5 overflow-x-auto text-xs font-normal shadow-2xs">
        <button
          onClick={() => setActiveTab("budget_vs_actual")}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "budget_vs_actual"
              ? "bg-slate-900 text-white shadow-2xs"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <BarChart2 size={16} />
          <span>เปรียบเทียบ งบ vs จ่ายจริง</span>
        </button>

        <button
          onClick={() => setActiveTab("category_pie")}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === "category_pie"
              ? "bg-slate-900 text-white shadow-2xs"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <PieIcon size={16} />
          <span>สัดส่วนหมวดหมู่ต้นทุน (Donut Chart)</span>
        </button>

        <button
          onClick={() => setActiveTab("monthly_trend")}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === "monthly_trend"
              ? "bg-slate-900 text-white shadow-2xs"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <TrendingUp size={16} />
          <span>แนวโน้มเบิกจ่ายรายเดือน</span>
        </button>

        <button
          onClick={() => setActiveTab("labor_vs_material")}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === "labor_vs_material"
              ? "bg-slate-900 text-white shadow-2xs"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Coins size={16} />
          <span>สัดส่วน ค่าแรง vs ค่าของ</span>
        </button>

        <button
          onClick={() => setActiveTab("variance_table")}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === "variance_table"
              ? "bg-slate-900 text-white shadow-2xs"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <FileSpreadsheet size={16} />
          <span>ตารางวิเคราะห์ต้นทุนเชิงลึก</span>
        </button>

        <button
          onClick={() => setActiveTab("budget_matrix")}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === "budget_matrix"
              ? "bg-slate-900 text-white shadow-2xs"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Grid size={16} />
          <span>เมตริกซ์ควบคุมงบรายหมวด</span>
        </button>
      </div>

      {/* 4. TAB PANELS */}

      {/* MODE 1: BUDGET VS ACTUAL DUAL-TRACK BAR CHART */}
      {activeTab === "budget_vs_actual" && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-normal text-slate-900 flex items-center gap-2">
                <BarChart2 className="text-slate-800" size={18} />
                เปรียบเทียบงบประมาณตั้งไว้ vs จ่ายจริงสะสม (Budget vs Actual Variance)
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                วิเคราะห์ผลต่างงบประมาณแยกตามรายโครงการเพื่อควบคุมต้นทุน
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-normal text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block" />
                งบไม่เกินที่ตั้งไว้
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block" />
                เบิกจ่ายจริง (ปกติ)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-rose-600 inline-block" />
                เบิกจ่ายจริง (เกินงบ)
              </span>
            </div>
          </div>

          {/* Individual Project Variance Bars */}
          <div className="space-y-4 pt-1">
            {projectBreakdown.map((p) => {
              const maxVal = Math.max(p.budgetCap, p.spent, 1);
              const budgetPercent = (p.budgetCap / maxVal) * 100;
              const spentPercent = (p.spent / maxVal) * 100;

              return (
                <div key={p.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  {/* Project Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-normal text-xs bg-slate-900 text-white px-2 py-0.5 rounded tracking-wide">
                        {p.id}
                      </span>
                      <span className="font-normal text-sm text-slate-900">{p.name || p.id}</span>
                      <span className="text-xs text-slate-500 font-normal">({p.billCount} รายการบิล)</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-normal ${
                        p.burnRate > 100
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : p.burnRate > 85
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      }`}>
                        Burn Rate: {p.burnRate.toFixed(1)}%
                      </span>

                      <button
                        onClick={() => setDrilldownModal({ title: `รายการเบิกจ่าย - ${p.displayName}`, rows: p.rows })}
                        className="text-xs text-indigo-700 hover:text-indigo-900 font-normal flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-300 shadow-2xs hover:bg-slate-50 transition"
                      >
                        ดูรายการ <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Dual Bar Track with External Number Display (Slim Minimal Focus) */}
                  <div className="space-y-2.5 pt-1">
                    {/* Budget Bar */}
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-xs font-normal text-slate-600 shrink-0">งบไม่เกินตั้งไว้:</span>
                      <div className="flex-1 bg-slate-200/80 rounded-full h-2 relative overflow-hidden flex items-center">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(budgetPercent, 1)}%` }}
                        />
                      </div>
                      <span className="w-32 text-right text-xs font-normal text-slate-800 shrink-0">
                        {p.budgetCap > 0 ? `${money(p.budgetCap)} ฿` : "ไม่ได้ตั้งงบ"}
                      </span>
                    </div>

                    {/* Actual Spent Bar */}
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-xs font-normal text-slate-600 shrink-0">เบิกจ่ายจริงสะสม:</span>
                      <div className="flex-1 bg-slate-200/80 rounded-full h-2 relative overflow-hidden flex items-center">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            p.burnRate > 100 ? "bg-rose-600" : p.burnRate > 85 ? "bg-amber-500" : "bg-emerald-600"
                          }`}
                          style={{ width: `${Math.max(spentPercent, 1)}%` }}
                        />
                      </div>
                      <span className={`w-32 text-right text-xs font-normal shrink-0 ${
                        p.burnRate > 100 ? "text-rose-600" : "text-emerald-700"
                      }`}>
                        {money(p.spent)} ฿
                      </span>
                    </div>
                  </div>

                  {/* Summary Variance Line */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/70 font-normal text-slate-700">
                    <div>
                      <span>งบคงเหลือส่วนต่าง: </span>
                      <span className={`font-normal text-xs ${p.remaining >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                        {money(p.remaining)} ฿
                      </span>
                    </div>
                    <div>
                      <span>โอนจ่ายรวมสุทธิ: </span>
                      <span className="font-normal text-slate-900">{money(p.transfer)} ฿</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 2: CATEGORY DONUT CHART */}
      {activeTab === "category_pie" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-normal text-slate-900 flex items-center gap-2">
                <PieIcon className="text-slate-800" size={18} />
                สัดส่วนหมวดหมู่ต้นทุน (Cost Categories Breakdown)
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                สัดส่วนการเบิกจ่ายแบ่งตาม 8 หมวดหมู่หลัก
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
              <div className="relative w-52 h-52 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                  {donutPaths.map((item, idx) => (
                    <circle
                      key={idx}
                      cx="100"
                      cy="100"
                      r="75"
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth="28"
                      strokeDasharray={item.strokeDasharray}
                      strokeDashoffset={item.strokeDashoffset}
                      className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                      onClick={() => setDrilldownModal({ title: `หมวดหมู่: ${item.name}`, rows: item.rows })}
                    />
                  ))}
                </svg>

                <div className="absolute text-center">
                  <span className="text-xs font-normal text-slate-500 block">ยอดรวมเบิกจ่าย</span>
                  <span className="text-base font-normal text-slate-900 font-mono block">{money(summaryMetrics.totalSpent)}</span>
                  <span className="text-xs text-slate-500 font-normal">{summaryMetrics.billCount} บิล</span>
                </div>
              </div>

              <div className="flex-1 space-y-2 w-full">
                {categoryBreakdown.map((item) => (
                  <div
                    key={item.name}
                    onClick={() => setDrilldownModal({ title: `รายการหมวดหมู่ - ${item.name}`, rows: item.rows })}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition cursor-pointer border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-normal text-slate-900">{item.name}</span>
                    </div>

                    <div className="text-right">
                      <div className="font-normal font-mono text-slate-900">{money(item.amount)} ฿</div>
                      <div className="text-xs text-slate-500 font-normal">{item.percent.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-base font-normal text-slate-900 flex items-center gap-2">
                <Layers className="text-slate-800" size={18} />
                สรุปสัดส่วนการใช้งบรายหมวด
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                เปรียบเทียบสัดส่วนของแต่ละหมวดเทียบกับมูลค่ารวมทั้งหมด
              </p>
            </div>

            <div className="space-y-3.5 pt-1">
              {categoryBreakdown.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-normal">
                    <span className="text-slate-900">{item.name}</span>
                    <span className="font-mono text-slate-900">{money(item.amount)} ฿ ({item.percent.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: MONTHLY SPENDING TREND CHART */}
      {activeTab === "monthly_trend" && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-5">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-normal text-slate-900 flex items-center gap-2">
                <TrendingUp className="text-slate-800" size={18} />
                แนวโน้มการเบิกจ่ายรายเดือน (Monthly Spending Trend)
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                วิเคราะห์กระแสเงินสดและการเบิกจ่ายสะสมแยกตามงวดเดือน
              </p>
            </div>
            <div className="text-xs font-normal text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              เบิกจ่ายเฉลี่ยต่อเดือน: <span className="font-mono">{monthlyTrend.length > 0 ? money(summaryMetrics.totalSpent / monthlyTrend.length) : 0} ฿</span>
            </div>
          </div>

          <div className="pt-2">
            {monthlyTrend.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-normal">
                ไม่พบข้อมูลการเบิกจ่ายย้อนหลังตามเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="space-y-5">
                <div className="h-64 flex items-end justify-between gap-3 border-b border-slate-200 pb-3 px-2">
                  {monthlyTrend.map((m) => {
                    const maxAmt = Math.max(...monthlyTrend.map(t => t.amount), 1);
                    const heightPercent = (m.amount / maxAmt) * 100;

                    return (
                      <div
                        key={m.yearMonth}
                        onClick={() => setDrilldownModal({ title: `รายการเดือน: ${m.label}`, rows: m.rows })}
                        className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                      >
                        <span className="text-xs font-normal font-sans text-slate-900 opacity-90">
                          {money(m.amount)}
                        </span>

                        <div className="w-full bg-slate-100 rounded-t-lg h-48 flex items-end p-1 relative overflow-hidden">
                          <div
                            className="w-full bg-slate-800 rounded-t transition-all duration-300 group-hover:bg-indigo-600"
                            style={{ height: `${Math.max(heightPercent, 4)}%` }}
                          />
                        </div>

                        <span className="text-xs font-normal text-slate-700 truncate max-w-full">
                          {m.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {monthlyTrend.map((m) => (
                    <div
                      key={m.yearMonth}
                      onClick={() => setDrilldownModal({ title: `รายการเดือน: ${m.label}`, rows: m.rows })}
                      className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs hover:bg-slate-100 transition cursor-pointer"
                    >
                      <div className="font-normal text-slate-700">{m.label}</div>
                      <div className="font-normal font-sans text-slate-900 text-sm mt-0.5">{money(m.amount)} ฿</div>
                      <div className="text-xs text-slate-500 font-normal mt-0.5">{m.rows.length} รายการบิล</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 4: LABOR VS MATERIAL STACKED BAR CHART */}
      {activeTab === "labor_vs_material" && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-normal text-slate-900 flex items-center gap-2">
                <Coins className="text-slate-800" size={18} />
                สัดส่วน ค่าแรง vs ค่าของ แยกตามโครงการ (Material vs Labor Split)
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                เปรียบเทียบสัดส่วนเงินจ้างค่าแรงงานช่างรับเหมา เทียบกับ ค่าวัสดุอุปกรณ์ก่อสร้าง
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-normal text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block" />
                1. ค่าของ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-indigo-600 inline-block" />
                2. ค่าแรง
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-400 inline-block" />
                อื่นๆ
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            {projectBreakdown.map((p) => {
              const total = p.spent || 1;
              const matPct = (p.mat / total) * 100;
              const labPct = (p.lab / total) * 100;
              const othPct = (p.oth / total) * 100;

              return (
                <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-normal">
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-normal bg-slate-900 text-white px-2 py-0.5 rounded tracking-wide">
                        {p.id}
                      </span>
                      <span className="text-slate-900 text-sm">{p.name || p.id}</span>
                    </div>

                    <div className="text-slate-900 text-xs">
                      รวมจ่ายจริง: <span className="font-normal font-sans text-sm">{money(p.spent)} ฿</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2.5 flex overflow-hidden shadow-2xs">
                    {matPct > 0 && (
                      <div
                        className="bg-emerald-600 h-full transition-all duration-500 flex items-center justify-center text-xs text-white font-normal"
                        style={{ width: `${matPct}%` }}
                        title={`ค่าของ: ${money(p.mat)} ฿ (${matPct.toFixed(1)}%)`}
                      />
                    )}
                    {labPct > 0 && (
                      <div
                        className="bg-indigo-600 h-full transition-all duration-500 flex items-center justify-center text-xs text-white font-normal"
                        style={{ width: `${labPct}%` }}
                        title={`ค่าแรง: ${money(p.lab)} ฿ (${labPct.toFixed(1)}%)`}
                      />
                    )}
                    {othPct > 0 && (
                      <div
                        className="bg-slate-400 h-full transition-all duration-500 flex items-center justify-center text-xs text-white font-normal"
                        style={{ width: `${othPct}%` }}
                        title={`อื่นๆ: ${money(p.oth)} ฿ (${othPct.toFixed(1)}%)`}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-normal pt-0.5">
                    <span className="text-emerald-700">ค่าของ: {money(p.mat)} ฿</span>
                    <span className="text-indigo-700">ค่าแรง: {money(p.lab)} ฿</span>
                    <span className="text-slate-600">อื่นๆ: {money(p.oth)} ฿</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 5: DETAILED COST VARIANCE TABLE (LIGHT THEME) */}
      {activeTab === "variance_table" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs font-sans">
          <div className="p-4 bg-slate-100/90 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-normal text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-600" size={18} />
                ตารางวิเคราะห์เปรียบเทียบต้นทุนเชิงลึก (Cost Control Variance Matrix)
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                สรุปผลต่างงบประมาณ เบิกจ่ายจริง และสถานะควบคุมต้นทุนทุกโครงการ
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโครงการ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white text-slate-900 placeholder-slate-400 text-xs pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-500 font-normal shadow-2xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/90 text-slate-800 font-normal border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3.5 border-r border-slate-200">รหัสโครงการ</th>
                  <th className="py-2.5 px-3.5 border-r border-slate-200">ชื่อโครงการ</th>
                  <th className="py-2.5 px-3.5 text-right border-r border-slate-200">งบไม่เกินตั้งไว้</th>
                  <th className="py-2.5 px-3.5 text-right border-r border-slate-200 text-emerald-900 bg-emerald-50/70">ค่าของ</th>
                  <th className="py-2.5 px-3.5 text-right border-r border-slate-200 text-indigo-900 bg-indigo-50/70">ค่าแรง</th>
                  <th className="py-2.5 px-3.5 text-right border-r border-slate-200">เบิกจ่ายรวม</th>
                  <th className="py-2.5 px-3.5 text-right border-r border-slate-200">งบคงเหลือ</th>
                  <th className="py-2.5 px-3.5 text-center border-r border-slate-200">% Burn Rate</th>
                  <th className="py-2.5 px-3.5 text-center border-r border-slate-200">สถานะ</th>
                  <th className="py-2.5 px-3.5 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {projectBreakdown.map((p) => (
                  <tr key={p.id} className="hover:bg-amber-50/50 transition">
                    <td className="py-2.5 px-3.5 font-normal text-slate-800 border-r border-slate-200">{p.id}</td>
                    <td className="py-2.5 px-3.5 font-normal text-slate-900 border-r border-slate-200">{p.name || p.id}</td>
                    <td className="py-2.5 px-3.5 text-right font-normal text-slate-800 border-r border-slate-200">
                      {p.budgetCap > 0 ? money(p.budgetCap) : "-"}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-normal text-emerald-800 border-r border-slate-200 bg-emerald-50/30">
                      {money(p.mat)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-normal text-indigo-800 border-r border-slate-200 bg-indigo-50/30">
                      {money(p.lab)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-normal text-slate-900 border-r border-slate-200">
                      {money(p.spent)}
                    </td>
                    <td className={`py-2.5 px-3.5 text-right font-normal border-r border-slate-200 ${
                      p.remaining >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}>
                      {money(p.remaining)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-normal border-r border-slate-200">
                      {p.burnRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3.5 text-center border-r border-slate-200">
                      {p.burnRate > 100 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-normal bg-rose-100 text-rose-800 border border-rose-300">
                          เกินงบ
                        </span>
                      ) : p.burnRate > 85 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-normal bg-amber-100 text-amber-800 border border-amber-300">
                          เฝ้าระวัง
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-normal bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ปกติ
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        onClick={() => setDrilldownModal({ title: `รายการเบิกจ่าย - ${p.displayName}`, rows: p.rows })}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-normal text-xs border border-slate-300 shadow-2xs transition flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        ดูรายการ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/90 text-slate-900 font-normal text-xs border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="py-3 px-3.5 border-r border-slate-300 font-normal text-slate-900">
                    รวมสุทธิทั้งสิ้น ({projectBreakdown.length} โครงการ)
                  </td>
                  <td className="py-3 px-3.5 text-right border-r border-slate-300 text-slate-900 font-normal">
                    {money(summaryMetrics.totalBudget)}
                  </td>
                  <td className="py-3 px-3.5 text-right border-r border-slate-300 text-emerald-800 font-normal">
                    {money(summaryMetrics.materialSpent)}
                  </td>
                  <td className="py-3 px-3.5 text-right border-r border-slate-300 text-indigo-800 font-normal">
                    {money(summaryMetrics.laborSpent)}
                  </td>
                  <td className="py-3 px-3.5 text-right border-r border-slate-300 text-slate-900 font-normal">
                    {money(summaryMetrics.totalSpent)}
                  </td>
                  <td className={`py-3 px-3.5 text-right border-r border-slate-300 font-normal ${
                    summaryMetrics.remainingBudget >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}>
                    {money(summaryMetrics.remainingBudget)}
                  </td>
                  <td className="py-3 px-3.5 text-center border-r border-slate-300 text-slate-900 font-normal">
                    {summaryMetrics.burnRate.toFixed(1)}%
                  </td>
                  <td colSpan={2} className="py-3 px-3.5 text-center">
                    -
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MODE 6: BUDGET MATRIX */}
      {activeTab === "budget_matrix" && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-normal text-slate-900 flex items-center gap-2">
              <Grid className="text-slate-800" size={18} />
              ตารางเมตริกซ์ควบคุมงบรายหมวดหมู่ (Project Budget Control Matrix)
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              ควบคุมและจัดสรรงบประมาณย่อยใน 8 หมวดหมู่ต้นทุนหลักแยกตามรายโครงการ
            </p>
          </div>

          <ProjectBudgetControlMatrix
            projectRows={hydratedProjects}
            dataRows={dataRows}
            selectedProjectId={selectedProjectId}
          />
        </div>
      )}

      {/* 5. ITEM DRILLDOWN MODAL (LIGHT THEME) */}
      {drilldownModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-slate-100 text-slate-900 flex items-center justify-between border-b border-slate-200">
              <div>
                <h3 className="font-normal text-base text-slate-900">{drilldownModal.title}</h3>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  พบทั้งสิ้น {drilldownModal.rows.length} รายการ | รวมเบิกจ่าย: {money(drilldownModal.rows.reduce((s, r) => s + getRowAmount(r), 0))} บาท
                </p>
              </div>
              <button
                onClick={() => setDrilldownModal(null)}
                className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-auto p-4 flex-1">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="sticky top-0 bg-slate-100 text-slate-800 font-normal border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">ลำดับ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">ผู้เบิก</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">ร้านค้า/ผู้รับเหมา</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">รายละเอียดงาน</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">ประเภท</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-200">ยอดเงิน</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-200 text-emerald-900 bg-emerald-50">โอนจริง</th>
                    <th className="py-2.5 px-3 text-center">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-normal">
                  {drilldownModal.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-center font-normal text-slate-600">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2.5 px-3 font-normal text-slate-900">{getRequesterDisplayName(r["ผู้เบิก"])}</td>
                      <td className="py-2.5 px-3 font-normal text-slate-800">
                        {r["ร้านค้า"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{r["รายละเอียดงาน"] || r["สินค้า/ทำงาน"] || "-"}</td>
                      <td className="py-2.5 px-3 font-normal text-emerald-800">{getRowCategory(r) || "-"}</td>
                      <td className="py-2.5 px-3 text-right font-normal text-slate-900">{money(getRowAmount(r))}</td>
                      <td className="py-2.5 px-3 text-right font-normal text-emerald-800 bg-emerald-50/50">
                        {money(getRowTransferAmount(r))}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDrilldownModal(null)}
                className="px-5 py-2 rounded-lg bg-slate-800 text-white font-normal text-xs hover:bg-slate-900 transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
