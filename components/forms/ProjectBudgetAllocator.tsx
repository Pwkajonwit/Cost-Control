"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Layers,
  PieChart,
  ShieldAlert,
  SlidersHorizontal,
  Package,
  Building2,
  Home,
  Zap,
  Truck,
  FolderKanban
} from "lucide-react";
import { money, toNumber } from "@/lib/numbers";

export type ProjectBudgetAllocatorProps = {
  values: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  defaultExpanded?: boolean;
};

type CategoryItem = {
  field: string;
  label: string;
  group?: string;
};

const DEFAULT_PRODUCT_CATEGORIES: CategoryItem[] = [
  { field: "งบไม่เกินเหล็กเส้น", label: "1. เหล็กเส้น", group: "หมวดงานโครงสร้าง" },
  { field: "งบไม่เกินรูปพรรณ", label: "2. เหล็กรูปพรรณ", group: "หมวดงานโครงสร้าง" },
  { field: "งบไม่เกินคอนกรีต", label: "3. คอนกรีต", group: "หมวดงานโครงสร้าง" },
  { field: "งบไม่เกินไม้แบบ", label: "4. ไม้แบบ", group: "หมวดงานโครงสร้าง" },
  { field: "งบไม่เกินวัสดุมุง", label: "5. วัสดุมุง", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง" },
  { field: "งบไม่เกินฝ้าผนัง", label: "6. ฝ้าผนัง", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง" },
  { field: "งบไม่เกินปูพื้น", label: "7. ปูพื้น", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง" },
  { field: "งบไม่เกินกระจก", label: "8. กระจก", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง" },
  { field: "งบไม่เกินไฟฟ้า", label: "9. ไฟฟ้า", group: "หมวดงานระบบ M&E" },
  { field: "งบไม่เกินประปา", label: "10. ประปา", group: "หมวดงานระบบ M&E" },
  { field: "งบไม่เกินอื่นๆ", label: "11. อื่นๆ (วัสดุ)", group: "หมวดงานทั่วไป & ดำเนินการ" },
  { field: "งบไม่เกินสีเคมี", label: "12. สีเคมี", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง" },
  { field: "งบไม่เกินสุขภัณฑ์", label: "13. สุขภัณฑ์", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง" },
  { field: "งบไม่เกินบิวอิน", label: "14. บิวท์อิน", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง" },
  { field: "งบไม่เกินแอร์", label: "15. แอร์", group: "หมวดงานระบบ M&E" },
  { field: "งบไม่เกินดิน", label: "16. ดิน", group: "หมวดงานเตรียมดิน & โลจิสติกส์" },
  { field: "งบไม่เกินหินทราย", label: "17. หินทราย", group: "หมวดงานเตรียมดิน & โลจิสติกส์" },
  { field: "งบไม่เกินเตรียมงาน", label: "18. เตรียมงาน", group: "หมวดงานเตรียมดิน & โลจิสติกส์" },
];

const MAIN_CATEGORIES: CategoryItem[] = [
  { field: "งบไม่เกินค่าของ", label: "1. ค่าของ (ภาพรวม)", group: "ภาพรวมต้นทุนโครงการ" },
  { field: "งบไม่เกินค่าแรง", label: "2. ค่าแรง (เปิดจ้างผู้รับเหมา)", group: "ภาพรวมต้นทุนโครงการ" },
  { field: "งบไม่เกินพนักงาน", label: "3. พนักงาน", group: "ค่าใช้จ่ายดำเนินงาน" },
  { field: "งบไม่เกินน้ำมัน", label: "4. น้ำมัน", group: "ค่าใช้จ่ายดำเนินงาน" },
  { field: "งบไม่เกินซ่อมรถ", label: "5. ซ่อมรถ", group: "ค่าใช้จ่ายดำเนินงาน" },
  { field: "งบไม่เกินเครื่องจักร", label: "6. เครื่องจักร", group: "ค่าใช้จ่ายดำเนินงาน" },
  { field: "งบไม่เกินเครื่องมือ", label: "7. เครื่องมือ", group: "ค่าใช้จ่ายดำเนินงาน" },
];

const KNOWN_FIELD_MAP: Record<string, string> = {
  "เหล็กเส้น": "งบไม่เกินเหล็กเส้น",
  "เหล็กรูปพรรณ": "งบไม่เกินรูปพรรณ",
  "คอนกรีต": "งบไม่เกินคอนกรีต",
  "ไม้แบบ": "งบไม่เกินไม้แบบ",
  "วัสดุมุง": "งบไม่เกินวัสดุมุง",
  "ฝ้าผนัง": "งบไม่เกินฝ้าผนัง",
  "ปูพื้น": "งบไม่เกินปูพื้น",
  "กระจก": "งบไม่เกินกระจก",
  "ไฟฟ้า": "งบไม่เกินไฟฟ้า",
  "ประปา": "งบไม่เกินประปา",
  "อื่นๆ(วัสดุ)": "งบไม่เกินอื่นๆ",
  "สีเคมี": "งบไม่เกินสีเคมี",
  "สุขภัณฑ์": "งบไม่เกินสุขภัณฑ์",
  "บิวอิน": "งบไม่เกินบิวอิน",
  "แอร์": "งบไม่เกินแอร์",
  "ดิน": "งบไม่เกินดิน",
  "หินทราย": "งบไม่เกินหินทราย",
  "เตรียมงาน": "งบไม่เกินเตรียมงาน",
  "น้ำมัน": "งบไม่เกินน้ำมัน",
  "เครื่องจักร": "งบไม่เกินเครื่องจักร",
};

function getGroupIcon(groupName: string) {
  if (groupName.includes("โครงสร้าง")) return <Building2 size={14} className="text-amber-600 shrink-0" />;
  if (groupName.includes("สถาปัตยกรรม")) return <Home size={14} className="text-indigo-600 shrink-0" />;
  if (groupName.includes("ระบบ")) return <Zap size={14} className="text-cyan-600 shrink-0" />;
  if (groupName.includes("เตรียมดิน") || groupName.includes("โลจิสติกส์")) return <Truck size={14} className="text-emerald-600 shrink-0" />;
  if (groupName.includes("ภาพรวม")) return <PieChart size={14} className="text-emerald-700 shrink-0" />;
  return <Package size={14} className="text-slate-600 shrink-0" />;
}

export function ProjectBudgetAllocator({
  values,
  onChange,
  defaultExpanded = false
}: ProjectBudgetAllocatorProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [productCategories, setProductCategories] = useState<CategoryItem[]>(DEFAULT_PRODUCT_CATEGORIES);

  const currentMode = String(values["คุมงบประเภทงาน"] || "คุมงบรายสินค้า (18 หมวด)");
  const workAmount = toNumber(values["ยอดงาน"]);
  const budgetCap = toNumber(values["งบไม่เกิน"]);
  const totalProjectBudget = workAmount > 0 ? workAmount : budgetCap;

  // Dynamically load category master data from /settings/product-categories options
  useEffect(() => {
    async function loadCategoryOptions() {
      try {
        const res = await fetch("/api/system-options");
        const json = await res.json();
        if (json.success && json.options) {
          if (Array.isArray(json.options["PRODUCT_MASTER_DATA"]) && json.options["PRODUCT_MASTER_DATA"].length > 0) {
            const masterList = json.options["PRODUCT_MASTER_DATA"];
            const dynamicList: CategoryItem[] = masterList.map((item: any) => {
              const code = item.code || "";
              const name = item.name || "";
              const group = (item.group || "").replace(/^[\p{Emoji}\s]+/gu, "").trim() || "หมวดงานทั่วไป & ดำเนินการ";
              const fieldName = KNOWN_FIELD_MAP[name] || `งบไม่เกิน${name.replace(/[^a-zA-Z0-9ก-๙]/g, "")}`;
              return {
                field: fieldName,
                label: `${code ? code + ". " : ""}${name}`,
                group
              };
            });
            setProductCategories(dynamicList);
          } else if (Array.isArray(json.options["สินค้า"]) && json.options["สินค้า"].length > 0) {
            const rawStrings: string[] = json.options["สินค้า"];
            const dynamicList: CategoryItem[] = rawStrings.map(str => {
              const match = str.match(/^(\d+)\s+(.+)$/);
              const code = match ? match[1] : "";
              const name = match ? match[2] : str;
              const defaultMatch = DEFAULT_PRODUCT_CATEGORIES.find(d => d.label.includes(name));
              const fieldName = KNOWN_FIELD_MAP[name] || `งบไม่เกิน${name.replace(/[^a-zA-Z0-9ก-๙]/g, "")}`;
              return {
                field: fieldName,
                label: `${code ? code + ". " : ""}${name}`,
                group: defaultMatch?.group || "หมวดงานทั่วไป & ดำเนินการ"
              };
            });
            setProductCategories(dynamicList);
          }
        }
      } catch (err) {
        console.error("Failed to load dynamic budget categories:", err);
      }
    }
    loadCategoryOptions();
  }, []);

  // Active fields based on selected mode (deduplicated by field to guarantee unique keys)
  const activeCategories = useMemo(() => {
    let rawList: CategoryItem[] = [];
    if (currentMode.includes("8 หมวดหลัก") || currentMode.includes("รวมจ่ายเงิน")) {
      rawList = MAIN_CATEGORIES;
    } else if (currentMode.includes("คละหมวด") || currentMode.includes("กำหนดเอง")) {
      rawList = [...MAIN_CATEGORIES, ...productCategories];
    } else {
      // Mode: คุมงบรายสินค้า -> รวม งบไม่เกินค่าของ + งบไม่เกินค่าแรง + หมวดสินค้าจาก Master Data
      rawList = [MAIN_CATEGORIES[0], MAIN_CATEGORIES[1], ...productCategories];
    }

    // Filter out duplicates by field key
    const seen = new Set<string>();
    return rawList.filter(cat => {
      if (seen.has(cat.field)) return false;
      seen.add(cat.field);
      return true;
    });
  }, [currentMode, productCategories]);

  // Group active categories by Work Group Name
  const groupedCategories = useMemo(() => {
    const groupsMap: Record<string, CategoryItem[]> = {};
    activeCategories.forEach(cat => {
      const g = cat.group || "หมวดงานทั่วไป & ดำเนินการ";
      if (!groupsMap[g]) groupsMap[g] = [];
      groupsMap[g].push(cat);
    });
    return groupsMap;
  }, [activeCategories]);

  // Total allocated sum across active categories
  const totalAllocated = useMemo(() => {
    return activeCategories.reduce((sum, cat) => sum + toNumber(values[cat.field] || 0), 0);
  }, [activeCategories, values]);

  // Unallocated or over-allocated balance
  const remainingBudget = totalProjectBudget - totalAllocated;
  const allocatedPercent = totalProjectBudget > 0 ? (totalAllocated / totalProjectBudget) * 100 : 0;
  const remainingPercent = totalProjectBudget > 0 ? (remainingBudget / totalProjectBudget) * 100 : 0;

  const modeOptions = [
    { key: "คุมงบรายสินค้า (18 หมวด)", label: `คุมงบรายสินค้า (${productCategories.length} หมวด)` },
    { key: "คุมงบ 8 หมวดหลัก", label: "8 หมวดหลัก" },
    { key: "กำหนดเอง (Custom Matrix)", label: "กำหนดเอง" },
  ];

  return (
    <div className="col-span-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all shadow-2xs my-2 font-sans">
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full px-4 py-3 bg-white hover:bg-slate-50 flex items-center justify-between transition border-b border-slate-200/80 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200">
            <PieChart size={16} />
          </div>
          <div className="text-left">
            <h4 className="text-xs text-slate-800 flex items-center gap-2">
              <span>จัดสรรงบประมาณรายหมวดงาน (Category Budget Matrix)</span>
              {totalAllocated > 0 && (
                <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium">
                  จัดสรรแล้ว {money(totalAllocated)} ฿ ({allocatedPercent.toFixed(1)}%)
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-500">
              {expanded ? "คลิกเพื่อซ่อนฟอร์มจัดสรรงบประมาณ" : "คลิกเพื่อเปิดระบุวงเงินคุมงบแยกตามกลุ่มหมวดงานหลัก"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
          <span>{expanded ? "ซ่อนรายละเอียด" : "ตั้งค่าวงเงินหมวดงาน"}</span>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 space-y-4 bg-slate-50/70">
          {/* Top Bar: Mode Selector & Quick Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            {/* Segmented Mode Selector */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500 block uppercase tracking-wider">โหมดการคุมงบ:</span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs ">
                {modeOptions.map(mode => {
                  const isSelected = currentMode === mode.key;
                  return (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => onChange("คุมงบประเภทงาน", mode.key)}
                      className={`px-3 py-1 rounded-md transition cursor-pointer text-xs ${
                        isSelected
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3 flex-wrap">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">งบรวมโครงการ:</span>
                <span className="text-slate-900 font-semibold">{money(totalProjectBudget)} ฿</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">จัดสรรแล้ว:</span>
                <span className="text-slate-700 font-medium">
                  {money(totalAllocated)} ฿ <span className="text-slate-500 font-normal">({allocatedPercent.toFixed(1)}%)</span>
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">คงเหลือจัดสรร:</span>
                <span className={`font-semibold ${remainingBudget < 0 ? "text-rose-600 animate-pulse" : "text-emerald-700"}`}>
                  {money(remainingBudget)} ฿ <span className="font-normal text-xs">({remainingPercent.toFixed(1)}%)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Grouped Category Input Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 px-0.5">
              <span>จัดสรรวงเงินงบประมาณแยกตามหมวดงาน (Master Data):</span>
              <span className="text-xs text-slate-400 font-mono">({Object.keys(groupedCategories).length} กลุ่มงาน / {activeCategories.length} รายการ)</span>
            </div>

            {Object.entries(groupedCategories).map(([groupName, items]) => {
              const groupSum = items.reduce((sum, item) => sum + toNumber(values[item.field] || 0), 0);
              const groupPercent = totalProjectBudget > 0 && groupSum > 0 ? (groupSum / totalProjectBudget) * 100 : 0;

              return (
                <div key={groupName} className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
                  {/* Group Header Banner */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-800">
                      {getGroupIcon(groupName)}
                      <span>{groupName}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        ({items.length} รายการ)
                      </span>
                    </div>
                    {groupSum > 0 && (
                      <span className="text-xs text-emerald-700 font-mono flex items-center gap-1.5">
                        <span>รวมงบหมวดนี้: {money(groupSum)} ฿</span>
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          {groupPercent.toFixed(1)}% ของงบรวม
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Items Input Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-0.5">
                    {items.map((cat, idx) => {
                      const val = values[cat.field] !== undefined ? values[cat.field] : "";
                      const numVal = toNumber(val);
                      const itemPercent = totalProjectBudget > 0 && numVal > 0 ? (numVal / totalProjectBudget) * 100 : 0;

                      return (
                        <div
                          key={`${cat.field}-${idx}`}
                          className="bg-slate-50/60 border border-slate-200/80 hover:border-emerald-300 hover:bg-white rounded-lg p-2 transition flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1.5 truncate min-w-0">
                            <Layers size={13} className="text-emerald-600 shrink-0" />
                            <span className="text-xs text-slate-700 truncate">{cat.label}</span>
                            {itemPercent > 0 && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded font-mono font-medium shrink-0" title={`คิดเป็น ${itemPercent.toFixed(1)}% ของงบรวมโครงการ`}>
                                {itemPercent.toFixed(1)}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 w-28">
                            <input
                              type="number"
                              value={val}
                              onChange={e => onChange(cat.field, e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded px-2 py-1 text-xs text-right font-mono text-slate-800 focus:outline-none"
                            />
                            <span className="text-xs text-slate-400 ">฿</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
