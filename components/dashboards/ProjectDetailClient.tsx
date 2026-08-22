"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { ProjectDetailEditor } from "@/components/ProjectDetailEditor";
import { getProjectColorInfo } from "@/components/dashboards/WorkStatusDashboardClient";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";

type ProjectDetailClientProps = {
  projectId: string;
  projectName: string;
  hydratedProject: SheetRow;
  customerDisplay?: string;
  companyDisplay?: string;
  totals: {
    workTotal: number;
    totalVat: number;
    budget: number;
    totalAll: number;
    billCount: number;
    remaining: number;
  };
  summaryRows: SheetRow[];
  expenseBreakdown: Record<string, number>;
  detailFields: string[];
  relatedColumns: string[];
  expenseCategories: string[];
};

const PRODUCT_BUDGET_FIELDS: { name: string; field: string }[] = [
  { name: "เหล็กเส้น", field: "งบไม่เกินเหล็กเส้น" },
  { name: "เหล็กรูปพรรณ", field: "งบไม่เกินรูปพรรณ" },
  { name: "คอนกรีต", field: "งบไม่เกินคอนกรีต" },
  { name: "ไม้แบบ", field: "งบไม่เกินไม้แบบ" },
  { name: "วัสดุมุง", field: "งบไม่เกินวัสดุมุง" },
  { name: "ฝ้าผนัง", field: "งบไม่เกินฝ้าผนัง" },
  { name: "ปูพื้น", field: "งบไม่เกินปูพื้น" },
  { name: "กระจก", field: "งบไม่เกินกระจก" },
  { name: "ไฟฟ้า", field: "งบไม่เกินไฟฟ้า" },
  { name: "ประปา", field: "งบไม่เกินประปา" },
  { name: "อื่นๆ (วัสดุ)", field: "งบไม่เกินอื่นๆ" },
  { name: "สีเคมี", field: "งบไม่เกินสีเคมี" },
  { name: "สุขภัณฑ์", field: "งบไม่เกินสุขภัณฑ์" },
  { name: "บิวท์อิน", field: "งบไม่เกินบิวอิน" },
  { name: "แอร์", field: "งบไม่เกินแอร์" },
  { name: "ดิน", field: "งบไม่เกินดิน" },
  { name: "หินทราย", field: "งบไม่เกินหินทราย" },
  { name: "เตรียมงาน", field: "งบไม่เกินเตรียมงาน" },
];

export function ProjectDetailClient({
  projectId,
  projectName,
  hydratedProject,
  customerDisplay,
  companyDisplay,
  totals,
  summaryRows,
  expenseBreakdown,
  detailFields,
  relatedColumns,
  expenseCategories,
}: ProjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<"bills" | "expenses" | "products" | "edit">("bills");

  const colorInfo = getProjectColorInfo(hydratedProject.color);

  // Financial calculations
  const percentUsed = totals.budget > 0 ? Math.min(100, Math.round((totals.totalAll / totals.budget) * 100)) : 0;

  const customer = customerDisplay || String(hydratedProject["ชื่อลูกค้า"] || hydratedProject["ลูกค้า"] || "-");
  const company = companyDisplay || String(hydratedProject["บริษัท"] || hydratedProject["บริษัทรับงาน"] || "-");
  const owner = String(hydratedProject["รับผิดชอบ"] || "-");
  const date = formatDateThai(hydratedProject["วันที่"]);
  const location = String(hydratedProject["สถานที่"] || "-");

  // Product Budget Control calculations
  const productSpendingMap = useMemo(() => {
    const map: Record<string, { spent: number; count: number }> = {};
    summaryRows.forEach(row => {
      const itemRaw = String(row["สินค้า/ทำงาน"] || row["สินค้า"] || row["รายการ"] || "อื่นๆ").trim();
      if (!itemRaw) return;
      const amt = toNumber(row["ยอดเงิน"]);
      if (!map[itemRaw]) {
        map[itemRaw] = { spent: 0, count: 0 };
      }
      map[itemRaw].spent += amt;
      map[itemRaw].count += 1;
    });
    return map;
  }, [summaryRows]);

  const productControlRows = useMemo(() => {
    const list: {
      name: string;
      budget: number;
      spent: number;
      billCount: number;
    }[] = [];

    const processedItemNames = new Set<string>();

    PRODUCT_BUDGET_FIELDS.forEach(p => {
      const budget = toNumber(hydratedProject[p.field]);
      let spent = 0;
      let count = 0;
      Object.entries(productSpendingMap).forEach(([itemName, data]) => {
        if (itemName.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(itemName.toLowerCase())) {
          spent += data.spent;
          count += data.count;
          processedItemNames.add(itemName);
        }
      });
      if (budget > 0 || spent > 0) {
        list.push({ name: p.name, budget, spent, billCount: count });
      }
    });

    Object.entries(productSpendingMap).forEach(([itemName, data]) => {
      if (!processedItemNames.has(itemName)) {
        list.push({
          name: itemName,
          budget: 0,
          spent: data.spent,
          billCount: data.count
        });
      }
    });

    return list;
  }, [hydratedProject, productSpendingMap]);

  return (
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 max-w-[1400px] mx-auto font-sans text-sm text-slate-800">
      {/* 1. HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/work-status"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft size={14} />
            <span>รายการสถานะงาน</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-xs text-slate-700">#{projectId}</span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs ${colorInfo.badgeClass}`}
          >
            <span>{colorInfo.label}</span>
          </span>
        </div>
      </div>

      {/* 2. TITLE & META */}
      <div>
        <h1 className="text-lg text-slate-900">{projectName}</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          ลูกค้า: <span className="text-slate-700">{customer}</span> · บริษัท: <span className="text-slate-700">{company}</span> · ผู้รับผิดชอบ: <span className="text-slate-700">{owner}</span>
        </p>
      </div>

      {/* 3. FINANCIAL SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="border border-slate-200 rounded-xl md:rounded-md p-3 sm:p-4 bg-white shadow-2xs">
          <div className="text-xs text-slate-400 font-medium mb-0.5">งบประมาณ</div>
          <div className="text-base sm:text-lg text-slate-900">{money(totals.budget)}</div>
        </div>

        <div className="border border-slate-200 rounded-xl md:rounded-md p-3 sm:p-4 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-0.5">
            <span>เบิกจ่ายรวม</span>
            <span className="text-indigo-700">{percentUsed}%</span>
          </div>
          <div className="text-base sm:text-lg text-indigo-700">{money(totals.totalAll)}</div>
          {totals.budget > 0 && (
            <div className="mt-1.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  percentUsed > 90 ? "bg-rose-500" : percentUsed > 75 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
          )}
        </div>

        <div className="border border-slate-200 rounded-xl md:rounded-md p-3 sm:p-4 bg-white shadow-2xs">
          <div className="text-xs text-slate-400 font-medium mb-0.5">ยอดคงเหลือ</div>
          <div className={`text-base sm:text-lg ${totals.remaining < 0 ? "text-rose-600" : "text-emerald-700"}`}>
            {money(totals.remaining)}
            {totals.remaining < 0 && <span className="text-xs text-rose-500 ml-1">เกินงบ</span>}
          </div>
        </div>
      </div>

      {/* 4. WORKSPACE TABS (Scrollable on mobile) */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab("bills")}
          className={`px-3 py-2 border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === "bills"
              ? "border-slate-900 text-slate-900 "
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          รายการบิลเบิกจ่าย ({totals.billCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`px-3 py-2 border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === "expenses"
              ? "border-slate-900 text-slate-900 "
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          สรุปหมวดหมู่ค่าใช้จ่าย
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`px-3 py-2 border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === "products"
              ? "border-slate-900 text-slate-900 "
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          คุมงบรายสินค้า ({productControlRows.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          className={`px-3 py-2 border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === "edit"
              ? "border-slate-900 text-slate-900 "
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          รายละเอียด & แก้ไขข้อมูล
        </button>
      </div>

      {/* 5. TABBED CONTENT PANELS */}
      {activeTab === "bills" && (
        <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
          <DataTable
            columns={relatedColumns}
            rows={summaryRows}
            limit={100}
            title="รายการบิลเบิกจ่ายที่เกี่ยวข้อง"
            subtitle={`ทั้งหมด ${summaryRows.length} รายการ`}
            showSearch
            detailBasePath="/bills"
            detailKeyColumn="ลำดับ"
            cellFormatters={{
              "ว/ด/ป": (v) => formatDateThai(v),
              "วันที่": (v) => formatDateThai(v),
            }}
          />
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xs text-slate-700">ยอดสรุปค่าใช้จ่ายจำแนกตามประเภท</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 text-xs">
            {expenseCategories.map((cat) => {
              const amount = expenseBreakdown[cat] || 0;
              return (
                <div key={cat} className="p-3 bg-slate-50 rounded-md border border-slate-200">
                  <div className="text-slate-400 font-medium text-xs mb-0.5">{cat}</div>
                  <div className="text-slate-900 text-sm">{money(amount)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "products" && (
        <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-xs text-slate-800">คุมงบประมาณรายสินค้า / หมวดงาน (Product Budget Control Matrix)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                เปรียบเทียบวงเงินจัดสรรรายหมวด กับยอดเงินเบิกจ่ายจริงตามบิล ({productControlRows.length} รายการ)
              </p>
            </div>
            <div className="text-xs text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              รวมเบิกจ่าย: <span className="text-indigo-700 ">{money(productControlRows.reduce((sum, r) => sum + r.spent, 0))}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-xs">
                  <th className="py-2.5 px-4">รายการสินค้า / หมวดงาน</th>
                  <th className="py-2.5 px-4 text-right">วงเงินงบประมาณ</th>
                  <th className="py-2.5 px-4 text-right">เบิกจ่ายแล้ว</th>
                  <th className="py-2.5 px-4 text-right">คงเหลือวงเงิน</th>
                  <th className="py-2.5 px-4 text-center">สัดส่วนการใช้งบ</th>
                  <th className="py-2.5 px-4 text-center">จำนวนบิล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productControlRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      ยังไม่มีการตั้งวงเงิน หรือเบิกจ่ายสินค้าในโครงการนี้
                    </td>
                  </tr>
                ) : (
                  productControlRows.map((item, idx) => {
                    const remaining = item.budget > 0 ? item.budget - item.spent : 0;
                    const percent = item.budget > 0 ? Math.min(100, Math.round((item.spent / item.budget) * 100)) : 0;
                    const isOver = item.budget > 0 && remaining < 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-4 text-slate-800">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-slate-600">
                          {item.budget > 0 ? money(item.budget) : <span className="text-slate-400 text-xs">-</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right text-indigo-700">
                          {money(item.spent)}
                        </td>
                        <td className={`py-2.5 px-4 text-right ${isOver ? "text-rose-600" : item.budget > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                          {item.budget > 0 ? money(remaining) : <span className="text-slate-400 text-xs">-</span>}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {item.budget > 0 ? (
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isOver ? "bg-rose-500" : percent > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className={`text-xs ${isOver ? "text-rose-600" : "text-slate-600"}`}>{percent}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">ไม่ได้คุมงบ</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
                            {item.billCount} บิล
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "edit" && (
        <div className="border border-slate-200 rounded-md bg-white p-4">
          <ProjectDetailEditor
            fields={detailFields}
            project={hydratedProject}
            customerDisplay={customer}
            companyDisplay={company}
          />
        </div>
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

