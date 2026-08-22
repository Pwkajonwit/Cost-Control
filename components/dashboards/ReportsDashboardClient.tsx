"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  Briefcase,
  Building2,
  Calculator,
  ChevronDown,
  DollarSign,
  Download,
  FileSpreadsheet,
  Filter,
  FolderKanban,
  HardHat,
  Layers,
  Package,
  Printer,
  Receipt,
  RotateCw,
  Search,
  Store,
  Tag,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";
import {
  filterBillsByProject,
  getRowAmount,
  getRowCategory,
  getRowCategoryAmount,
  getRowTransferAmount,
  isLaborRow,
  isMaterialOrExpenseRow,
} from "@/lib/reports";

type ReportsDashboardClientProps = {
  initialDataRows: SheetRow[];
  initialProjectRows: SheetRow[];
  initialStoreRows: SheetRow[];
  initialContractorRows: SheetRow[];
  initialContractWorkRows?: SheetRow[];
  initialPeopleRows: SheetRow[];
};

type ActiveTab = "material" | "product_category" | "labor" | "category" | "contractor" | "store";

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function formatDateThai(dateVal: unknown): string {
  if (!dateVal) return "-";
  const str = String(dateVal).trim();
  if (!str) return "-";

  // Match YYYY-MM-DD or YYYY/MM/DD
  const matchISO = str.match(/^(\d{4})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])$/);
  if (matchISO) {
    const [, y, m, d] = matchISO;
    const dayNum = parseInt(d, 10);
    const monthIdx = parseInt(m, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${dayNum} ${THAI_MONTHS_SHORT[monthIdx]} ${y}`;
    }
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const matchDDMM = str.match(/^(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d\d|\d\d)$/);
  if (matchDDMM) {
    const [, d, m, y] = matchDDMM;
    const dayNum = parseInt(d, 10);
    const monthIdx = parseInt(m, 10) - 1;
    const fullYear = y.length === 2 ? `20${y}` : y;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${dayNum} ${THAI_MONTHS_SHORT[monthIdx]} ${fullYear}`;
    }
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${fullYear}`;
  }

  return str;
}

const CATEGORIES_LIST = [
  { key: "1.ค่าของ", label: "1.ค่าของ", searchKey: "ค่าของ", color: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  { key: "2.ค่าแรง", label: "2.ค่าแรง", searchKey: "ค่าแรง", color: "bg-indigo-50 text-indigo-900 border-indigo-200" },
  { key: "3.พนักงาน", label: "3.พนักงาน", searchKey: "พนักงาน", color: "bg-purple-50 text-purple-900 border-purple-200" },
  { key: "4.น้ำมัน", label: "4.น้ำมัน", searchKey: "น้ำมัน", color: "bg-amber-50 text-amber-900 border-amber-200" },
  { key: "5.ซ่อมรถ", label: "5.ซ่อมรถ", searchKey: "ซ่อมรถ", color: "bg-orange-50 text-orange-900 border-orange-200" },
  { key: "6.เครื่องจักร", label: "6.เครื่องจักร", searchKey: "เครื่องจักร", color: "bg-blue-50 text-blue-900 border-blue-200" },
  { key: "7.เครื่องมือ", label: "7.เครื่องมือ", searchKey: "เครื่องมือ", color: "bg-cyan-50 text-cyan-900 border-cyan-200" },
  { key: "8.อื่นๆ", label: "8.อื่นๆ", searchKey: "อื่นๆ", color: "bg-rose-50 text-rose-900 border-rose-200" },
];

type ProductCategoryItemConfig = {
  code: string;
  label: string;
  group: string;
  searchKeys: string[];
};

const DEFAULT_PRODUCT_CATEGORIES_LIST: ProductCategoryItemConfig[] = [
  { code: "1", label: "1. เหล็กเส้น", group: "หมวดงานโครงสร้าง", searchKeys: ["1", "เหล็กเส้น"] },
  { code: "2", label: "2. รูปพรรณ", group: "หมวดงานโครงสร้าง", searchKeys: ["2", "รูปพรรณ"] },
  { code: "3", label: "3. คอนกรีต", group: "หมวดงานโครงสร้าง", searchKeys: ["3", "คอนกรีต"] },
  { code: "4", label: "4. ไม้แบบ", group: "หมวดงานโครงสร้าง", searchKeys: ["4", "ไม้แบบ"] },
  { code: "5", label: "5. วัสดุมุง", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", searchKeys: ["5", "วัสดุมุง"] },
  { code: "6", label: "6. ฝ้าผนัง", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", searchKeys: ["6", "ฝ้าผนัง"] },
  { code: "7", label: "7. ปูพื้น", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", searchKeys: ["7", "ปูพื้น"] },
  { code: "8", label: "8. กระจก", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", searchKeys: ["8", "กระจก"] },
  { code: "9", label: "9. ไฟฟ้า", group: "หมวดงานระบบ M&E", searchKeys: ["9", "ไฟฟ้า"] },
  { code: "10", label: "10. ประปา", group: "หมวดงานระบบ M&E", searchKeys: ["10", "ประปา"] },
  { code: "11", label: "11. อื่นๆ", group: "หมวดงานทั่วไป & ดำเนินการ", searchKeys: ["11", "อื่นๆ"] },
  { code: "12", label: "12. สีเคมี", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", searchKeys: ["12", "สีเคมี"] },
  { code: "13", label: "13. สุขภัณฑ์", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", searchKeys: ["13", "สุขภัณฑ์"] },
  { code: "14", label: "14. นั่งร้าน", group: "หมวดงานสถาปัตยกรรม & ตกแต่ง", searchKeys: ["14", "นั่งร้าน", "บิวอิน"] },
  { code: "15", label: "15. แอร์", group: "หมวดงานระบบ M&E", searchKeys: ["15", "แอร์"] },
  { code: "16", label: "16. ดิน", group: "หมวดงานเตรียมดิน & โลจิสติกส์", searchKeys: ["16", "ดิน"] },
  { code: "17", label: "17. หินทราย", group: "หมวดงานเตรียมดิน & โลจิสติกส์", searchKeys: ["17", "หินทราย"] },
  { code: "18", label: "18. เตรียมงาน", group: "หมวดงานเตรียมดิน & โลจิสติกส์", searchKeys: ["18", "เตรียมงาน"] },
  { code: "101", label: "101. น้ำมัน", group: "หมวดงานเตรียมดิน & โลจิสติกส์", searchKeys: ["101", "น้ำมัน"] },
  { code: "102", label: "102. ค่าขนส่ง", group: "หมวดงานเตรียมดิน & โลจิสติกส์", searchKeys: ["102", "ค่าขนส่ง"] },
  { code: "103", label: "103. เครื่องจักร", group: "หมวดงานเตรียมดิน & โลจิสติกส์", searchKeys: ["103", "เครื่องจักร"] },
  { code: "200", label: "200. ดำเนินการ(อื่นๆ)", group: "หมวดงานทั่วไป & ดำเนินการ", searchKeys: ["200", "ดำเนินการ"] },
  { code: "non", label: "non (7.เครื่องมือ 8.อื่นๆ ที่พัก)", group: "หมวดงานทั่วไป & ดำเนินการ", searchKeys: ["non"] },
];

export function ReportsDashboardClient({
  initialDataRows,
  initialProjectRows,
  initialStoreRows,
  initialContractorRows,
  initialContractWorkRows = [],
  initialPeopleRows,
}: ReportsDashboardClientProps) {
  const [dataRows, setDataRows] = useState<SheetRow[]>(initialDataRows);
  const [projectRows, setProjectRows] = useState<SheetRow[]>(initialProjectRows);
  const [productCategoryList, setProductCategoryList] = useState<ProductCategoryItemConfig[]>(DEFAULT_PRODUCT_CATEGORIES_LIST);

  // Fetch dynamic Master Data for Product Categories
  useEffect(() => {
    async function loadMasterCategories() {
      try {
        const res = await fetch("/api/system-options");
        const json = await res.json();
        if (json.success && json.options && Array.isArray(json.options["PRODUCT_MASTER_DATA"])) {
          const masterList = json.options["PRODUCT_MASTER_DATA"];
          const dynamicList: ProductCategoryItemConfig[] = masterList.map((item: any) => {
            const code = String(item.code || "");
            const name = String(item.name || "");
            const group = (item.group || "").replace(/^[\p{Emoji}\s]+/gu, "").trim() || "หมวดงานทั่วไป & ดำเนินการ";
            return {
              code: code || name,
              label: `${code ? code + ". " : ""}${name}`,
              group,
              searchKeys: [code, name]
            };
          });
          setProductCategoryList(dynamicList);
        }
      } catch (err) {
        console.error("Failed to fetch product categories in ReportsDashboardClient:", err);
      }
    }
    loadMasterCategories();
  }, []);
  const [activeTab, setActiveTab] = useState<ActiveTab>("labor");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedRequester, setSelectedRequester] = useState<string>("all");
  const [selectedContractor, setSelectedContractor] = useState<string>("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  // Entrepreneur Financial Calculator States
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcBaseAmount, setCalcBaseAmount] = useState<string>("100000");
  const [calcVatPercent, setCalcVatPercent] = useState<number>(7);
  const [calcWhtPercent, setCalcWhtPercent] = useState<number>(3);

  const [calcContractValue, setCalcContractValue] = useState<string>("5000000");

  // Build People lookup map (Code -> Name/Nickname)
  const peopleMap = useMemo(() => {
    const map: Record<string, string> = {};
    (initialPeopleRows || []).forEach((r) => {
      const code = String(r["รหัสพนักงาน"] || r["รหัส"] || r["ID"] || "").trim().toLowerCase();
      const nickname = String(r["ชื่อเล่น"] || "").trim();
      const fullName = String(r["ชื่อ-นามสกุล"] || r["ชื่อ"] || "").trim();
      const displayName = nickname || fullName;
      if (code && displayName) {
        map[code] = displayName;
      }
    });
    return map;
  }, [initialPeopleRows]);

  function getRequesterDisplayName(raw: unknown): string {
    const val = String(raw || "").trim();
    if (!val) return "-";
    const mappedName = peopleMap[val.toLowerCase()];
    if (mappedName) {
      return mappedName;
    }
    return val;
  }

  // Contractor map: id_Contractor/id_Conwork/code -> Display Name
  const contractorMap = useMemo(() => {
    const map: Record<string, { code: string; name: string }> = {};

    // 1. Populate from Master Contractors table (5. รับเหมา)
    (initialContractorRows || []).forEach((c) => {
      const code = String(c["id_Contractor"] || c["id"] || c["รหัส"] || c["ID"] || "").trim();
      const nickname = String(c["ชื่อเล่น"] || "").trim();
      const fullName = String(c["ชื่อ-นามสกุล"] || "").trim();
      const name = nickname || fullName || String(c["รายละเอียดงาน"] || "").trim();

      if (code) {
        map[code.toLowerCase()] = {
          code,
          name: name || code,
        };
      }
      if (nickname) {
        map[nickname.toLowerCase()] = {
          code: code || nickname,
          name: nickname,
        };
      }
      if (fullName && !map[fullName.toLowerCase()]) {
        map[fullName.toLowerCase()] = {
          code: code || fullName,
          name: nickname || fullName,
        };
      }
    });

    // 2. Cross-reference with Open Hire Work Contracts table (งานรับเหมา)
    (initialContractWorkRows || []).forEach((cw) => {
      const conworkCode = String(cw["id_Conwork"] || cw["รหัสงาน"] || "").trim();
      const contractorRef = String(cw["id_Contractor"] || cw["ผู้รับเหมา"] || cw["ร้าน/บุคคล"] || "").trim();

      if (conworkCode) {
        let name = conworkCode;

        if (contractorRef) {
          const resolved = map[contractorRef.toLowerCase()];
          if (resolved) {
            name = resolved.name;
          } else {
            name = contractorRef;
          }
        }

        map[conworkCode.toLowerCase()] = {
          code: conworkCode,
          name,
        };
      }
    });

    return map;
  }, [initialContractorRows, initialContractWorkRows]);

  function getContractorInfo(raw: unknown): { code: string; name: string } {
    const val = String(raw || "").trim();
    if (!val) return { code: "-", name: "-" };

    const mapped = contractorMap[val.toLowerCase()];
    if (mapped) {
      return { code: mapped.code, name: mapped.name };
    }

    if (/^CW\d+/i.test(val)) {
      return { code: val, name: val };
    }

    return { code: "-", name: val };
  }

  // Extract unique projects list
  const projectsList = useMemo(() => {
    return projectRows
      .map((p) => {
        const id = String(p["ID Project"] || p.id || "").trim();
        const name = String(p["ชื่อ Project"] || p.name || "").trim();
        return { id, name, label: id && name ? `${id} - ${name}` : id || name };
      })
      .filter((p) => p.id || p.name);
  }, [projectRows]);

  // Unique Requesters List for Dropdown Filter
  const requestersList = useMemo(() => {
    const map = new Map<string, string>();
    dataRows.forEach((r) => {
      const raw = String(r["ผู้เบิก"] || "").trim();
      if (raw) {
        const displayName = getRequesterDisplayName(raw);
        map.set(raw, displayName);
      }
    });
    return Array.from(map.entries())
      .map(([val, name]) => ({
        val,
        label: name !== val && !val.includes(name) ? `${val} (${name})` : name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "th"));
  }, [dataRows, peopleMap]);

  // Unique Contractors List for Dropdown Filter
  const contractorsDropdownList = useMemo(() => {
    const map = new Map<string, string>();
    dataRows.forEach((r) => {
      const raw = String(r["ชื่อผู้รับเหมา"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "").trim();
      if (raw && (isLaborRow(r) || raw.toLowerCase().startsWith("cw"))) {
        const info = getContractorInfo(raw);
        const label = info.code !== "-" && info.name !== "-" && info.code !== info.name
          ? `${info.code} - ${info.name}`
          : info.name !== "-" ? info.name : raw;
        map.set(raw, label);
      }
    });
    (initialContractorRows || []).forEach((c) => {
      const code = String(c["id_Contractor"] || c["รหัส"] || c["ID"] || "").trim();
      const nickname = String(c["ชื่อเล่น"] || "").trim();
      const fullName = String(c["ชื่อ-นามสกุล"] || "").trim();
      const name = nickname || fullName;
      const key = code || name;
      if (key && !map.has(key)) {
        const label = code && name ? `${code} - ${name}` : code || name;
        map.set(key, label);
      }
    });
    return Array.from(map.entries())
      .map(([val, label]) => ({ val, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "th"));
  }, [dataRows, initialContractorRows, contractorMap]);

  // Extract unique contractors list
  const contractorsList = useMemo(() => {
    const set = new Set<string>();
    dataRows.forEach((r) => {
      if (isLaborRow(r)) {
        const contractor = String(r["ชื่อผู้รับเหมา"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "").trim();
        if (contractor) set.add(contractor);
      }
    });
    initialContractorRows.forEach((c) => {
      const name = String(c["ชื่อเล่น"] || c["ชื่อ-นามสกุล"] || c["รายละเอียดงาน"] || "").trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [dataRows, initialContractorRows]);

  // Extract unique stores list
  const storesList = useMemo(() => {
    const set = new Set<string>();
    dataRows.forEach((r) => {
      if (isMaterialOrExpenseRow(r)) {
        const store = String(r["ร้านค้า"] || r["ร้าน/บุคคล"] || r["ร้านค้า/ผู้รับเหมา"] || "").trim();
        if (store) set.add(store);
      }
    });
    initialStoreRows.forEach((s) => {
      const name = String(s["ชื่อร้านค้า"] || s.name || "").trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [dataRows, initialStoreRows]);

  // Filter rows by Project
  const projectFilteredRows = useMemo(() => {
    return filterBillsByProject(dataRows, selectedProjectId);
  }, [dataRows, selectedProjectId]);

  // Master Search & Multi-Dropdown Filter
  const searchFilteredRows = useMemo(() => {
    let list = projectFilteredRows;

    if (selectedRequester !== "all") {
      list = list.filter((r) => {
        const rawReq = String(r["ผู้เบิก"] || "").trim();
        const displayReq = getRequesterDisplayName(rawReq);
        return rawReq === selectedRequester || displayReq === selectedRequester;
      });
    }

    if (selectedContractor !== "all") {
      const target = selectedContractor.toLowerCase();
      list = list.filter((r) => {
        const rawC = String(r["ชื่อผู้รับเหมา"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "").trim();
        const info = getContractorInfo(rawC);
        return (
          rawC.toLowerCase().includes(target) ||
          info.code.toLowerCase().includes(target) ||
          info.name.toLowerCase().includes(target)
        );
      });
    }

    if (!searchTerm.trim()) return list;

    const q = searchTerm.toLowerCase().trim();
    return list.filter((r) => {
      const reqName = getRequesterDisplayName(r["ผู้เบิก"]);
      const cInfo = getContractorInfo(r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || r["ชื่อผู้รับเหมา"]);
      return (
        String(r["ลำดับ"] || "").toLowerCase().includes(q) ||
        String(r["ร้าน/บุคคล"] || "").toLowerCase().includes(q) ||
        String(r["ร้านค้า"] || "").toLowerCase().includes(q) ||
        String(r["ผู้รับเหมา"] || "").toLowerCase().includes(q) ||
        cInfo.code.toLowerCase().includes(q) ||
        cInfo.name.toLowerCase().includes(q) ||
        String(r["สินค้า/ทำงาน"] || "").toLowerCase().includes(q) ||
        String(r["รายละเอียดงาน"] || "").toLowerCase().includes(q) ||
        String(r["ประเภท"] || "").toLowerCase().includes(q) ||
        String(r["ผู้เบิก"] || "").toLowerCase().includes(q) ||
        reqName.toLowerCase().includes(q)
      );
    });
  }, [projectFilteredRows, selectedRequester, selectedContractor, searchTerm, peopleMap, contractorMap]);

  // Tab 1: Material rows
  const materialRows = useMemo(() => {
    return searchFilteredRows.filter(isMaterialOrExpenseRow);
  }, [searchFilteredRows]);

  // Tab 2: Product Categories rows breakdown (grouped by Work Group Name)
  const productCategoryMetrics = useMemo(() => {
    const grandTotal = materialRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);

    const breakdown = productCategoryList.map((cat) => {
      const rows = materialRows.filter((r) => {
        const itemVal = String(r["สินค้า"] || r["สินค้า/ทำงาน"] || r["รายการ"] || "").trim().toLowerCase();
        if (cat.code === "non") {
          return itemVal.includes("non") || itemVal.includes("ที่พัก");
        }
        if (itemVal.startsWith(cat.code.toLowerCase())) return true;
        return cat.searchKeys.some((k) => itemVal.includes(k.toLowerCase()));
      });

      const count = rows.length;
      const amount = rows.reduce((sum, r) => sum + getRowAmount(r), 0);
      const transfer = rows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
      const percent = grandTotal > 0 ? (transfer / grandTotal) * 100 : 0;
      return { ...cat, count, amount, transfer, percent, rows };
    });

    // Group breakdown items by Work Group
    const groupedMap: Record<string, typeof breakdown> = {};
    breakdown.forEach((item) => {
      const g = item.group || "หมวดงานทั่วไป & ดำเนินการ";
      if (!groupedMap[g]) groupedMap[g] = [];
      groupedMap[g].push(item);
    });

    return { grandTotal, breakdown, groupedMap };
  }, [materialRows, productCategoryList]);

  const productCategoryFilteredRows = useMemo(() => {
    if (selectedProductCategory === "all") return materialRows;
    const catObj = productCategoryList.find((c) => c.code === selectedProductCategory);
    if (!catObj) return materialRows;

    return materialRows.filter((r) => {
      const itemVal = String(r["สินค้า"] || r["สินค้า/ทำงาน"] || r["รายการ"] || "").trim().toLowerCase();
      if (catObj.code === "non") {
        return itemVal.includes("non") || itemVal.includes("ที่พัก");
      }
      if (itemVal.startsWith(catObj.code.toLowerCase())) return true;
      return catObj.searchKeys.some((k) => itemVal.includes(k.toLowerCase()));
    });
  }, [materialRows, selectedProductCategory, productCategoryList]);

  const productCategoryBillTotal = useMemo(() => {
    return productCategoryFilteredRows.reduce((sum, r) => sum + getRowAmount(r), 0);
  }, [productCategoryFilteredRows]);

  const productCategoryTransferTotal = useMemo(() => {
    return productCategoryFilteredRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
  }, [productCategoryFilteredRows]);

  // Tab 3: Labor rows
  const laborRows = useMemo(() => {
    return searchFilteredRows.filter(isLaborRow);
  }, [searchFilteredRows]);

  // Tab 4: Category rows breakdown (8หมวดหมู่)
  const categoryMetrics = useMemo(() => {
    const grandTotal = searchFilteredRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);

    const breakdown = CATEGORIES_LIST.map((cat) => {
      const rows = searchFilteredRows.filter((r) => {
        const rowCat = getRowCategory(r).toLowerCase();
        return rowCat.includes(cat.searchKey) || rowCat.includes(cat.key.toLowerCase());
      });
      const count = rows.length;
      const amount = rows.reduce((sum, r) => sum + getRowAmount(r), 0);
      const transfer = rows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
      const percent = grandTotal > 0 ? (transfer / grandTotal) * 100 : 0;
      return { ...cat, count, amount, transfer, percent, rows };
    });

    return { grandTotal, breakdown };
  }, [searchFilteredRows]);

  // Filtered rows for Category Tab
  const categoryFilteredRows = useMemo(() => {
    if (selectedCategory === "all") return searchFilteredRows;
    const catObj = CATEGORIES_LIST.find((c) => c.key === selectedCategory);
    const searchKey = catObj ? catObj.searchKey : selectedCategory.toLowerCase();
    return searchFilteredRows.filter((r) => {
      const rowCat = getRowCategory(r).toLowerCase();
      return rowCat.includes(searchKey) || rowCat.includes(selectedCategory.toLowerCase());
    });
  }, [searchFilteredRows, selectedCategory]);

  const categoryFilteredBillTotal = useMemo(() => {
    return categoryFilteredRows.reduce((sum, r) => sum + getRowAmount(r), 0);
  }, [categoryFilteredRows]);

  const categoryFilteredTransferTotal = useMemo(() => {
    return categoryFilteredRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
  }, [categoryFilteredRows]);

  // Tab 5: Contractor specific rows
  const contractorRows = useMemo(() => {
    const base = searchFilteredRows.filter(isLaborRow);
    if (selectedContractor === "all") return base;
    return base.filter((r) => {
      const name = String(r["ชื่อผู้รับเหมา"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "").trim();
      return name.toLowerCase().includes(selectedContractor.toLowerCase());
    });
  }, [searchFilteredRows, selectedContractor]);

  // Tab 6: Store specific rows
  const storeRows = useMemo(() => {
    const base = searchFilteredRows.filter(isMaterialOrExpenseRow);
    if (selectedStore === "all") return base;
    return base.filter((r) => {
      const name = String(r["ร้านค้า"] || r["ร้าน/บุคคล"] || r["ร้านค้า/ผู้รับเหมา"] || "").trim();
      return name.toLowerCase().includes(selectedStore.toLowerCase());
    });
  }, [searchFilteredRows, selectedStore]);

  // Metrics for Tab 1 (Material)
  const materialMetrics = useMemo(() => {
    const totalAmount = materialRows.reduce((sum, r) => sum + getRowAmount(r), 0);
    const totalTransfer = materialRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
    const catMaterial = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "ค่าของ"), 0);
    const catFuel = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "น้ำมัน"), 0);
    const catRepair = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "ซ่อมรถ"), 0);
    const catMachine = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "เครื่องจักร"), 0);
    const catTool = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "เครื่องมือ"), 0);
    const catOther = materialRows.reduce((sum, r) => sum + getRowCategoryAmount(r, "อื่นๆ"), 0);
    const vatTotal = materialRows.reduce((sum, r) => sum + (toNumber(r.vat) || 0), 0);

    return {
      count: materialRows.length,
      totalAmount,
      totalTransfer,
      catMaterial,
      catFuel,
      catRepair,
      catMachine,
      catTool,
      catOther,
      vatTotal,
    };
  }, [materialRows]);

function calcNetLabor(r: SheetRow): number {
  const directLaborCol = toNumber(r["แรง"]);
  if (directLaborCol > 0) return directLaborCol;

  const baseLabor = toNumber(r["ค่าแรง"]) || getRowAmount(r);
  const status = String(r["statusค่าแรง"] || "").trim();
  const deduct = toNumber(r["หัก"]);

  if (status === "บริษัท") {
    return Math.round(baseLabor * 1.04 * 100) / 100;
  }
  if (deduct > 0) {
    return Math.round(baseLabor * (1 - deduct / 100) * 100) / 100;
  }
  return baseLabor;
}

  // Metrics for Tab 3 (Labor)
  const laborMetrics = useMemo(() => {
    const totalLabor = laborRows.reduce((sum, r) => sum + (toNumber(r["ค่าแรง"]) || getRowAmount(r)), 0);
    const totalNetLabor = laborRows.reduce((sum, r) => sum + calcNetLabor(r), 0);
    const totalTransfer = laborRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
    const totalOpenHire = laborRows.reduce((sum, r) => sum + toNumber(r["เปิดจ้าง"]), 0);
    const totalAccumPaid = laborRows.reduce((sum, r) => sum + toNumber(r["จ่ายสะสม"]), 0);
    const totalStaff = laborRows.reduce((sum, r) => sum + toNumber(r["พนักงาน"]), 0);
    const totalOther = laborRows.reduce((sum, r) => sum + toNumber(r["อื่นๆ"]), 0);

    return {
      count: laborRows.length,
      totalLabor,
      totalNetLabor,
      totalTransfer,
      totalOpenHire,
      totalAccumPaid,
      totalStaff,
      totalOther,
    };
  }, [laborRows]);

  // Metrics for Tab 5 (Contractor)
  const contractorMetrics = useMemo(() => {
    const totalLabor = contractorRows.reduce((sum, r) => sum + (toNumber(r["ค่าแรง"]) || getRowAmount(r)), 0);
    const totalTransfer = contractorRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
    const totalOpenHire = contractorRows.reduce((sum, r) => sum + toNumber(r["เปิดจ้าง"]), 0);
    const totalAccumPaid = contractorRows.reduce((sum, r) => sum + toNumber(r["จ่ายสะสม"]), 0);
    const remaining = totalOpenHire - totalAccumPaid;

    return {
      count: contractorRows.length,
      totalLabor,
      totalTransfer,
      totalOpenHire,
      totalAccumPaid,
      remaining,
    };
  }, [contractorRows]);

  // Metrics for Tab 6 (Store)
  const storeMetrics = useMemo(() => {
    const totalAmount = storeRows.reduce((sum, r) => sum + getRowAmount(r), 0);
    const totalTransfer = storeRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);

    return {
      count: storeRows.length,
      totalAmount,
      totalTransfer,
    };
  }, [storeRows]);

  // Overall Financial Totals
  const totalTransferAll = useMemo(() => {
    return searchFilteredRows.reduce((sum, r) => sum + getRowTransferAmount(r), 0);
  }, [searchFilteredRows]);

  const totalBillAmountAll = useMemo(() => {
    return searchFilteredRows.reduce((sum, r) => sum + getRowAmount(r), 0);
  }, [searchFilteredRows]);

  // Entrepreneur VAT & Tax Calculator Computations
  const calcResults = useMemo(() => {
    const base = parseFloat(calcBaseAmount) || 0;
    const vatVal = (base * calcVatPercent) / 100;
    const whtVal = (base * calcWhtPercent) / 100;
    const netPayment = base + vatVal - whtVal;
    return { base, vatVal, whtVal, netPayment };
  }, [calcBaseAmount, calcVatPercent, calcWhtPercent]);

  // Entrepreneur Project Margin Computations
  const projectMarginResults = useMemo(() => {
    const contract = parseFloat(calcContractValue) || 0;
    const spent = totalTransferAll;
    const remaining = contract - spent;
    const burnRate = contract > 0 ? (spent / contract) * 100 : 0;
    const estimatedMargin = contract > 0 ? ((contract - spent) / contract) * 100 : 0;
    return { contract, spent, remaining, burnRate, estimatedMargin };
  }, [calcContractValue, totalTransferAll]);

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
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 max-w-[1700px] mx-auto font-sans text-sm text-slate-800 print:p-0 font-normal">
      {/* 1. HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-normal text-slate-900">รายงานวิเคราะห์การเงินและต้นทุนโครงการ</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">คำนวณและสรุปข้อมูลต้นทุนค่าของ ค่าแรง ภาษี และผู้รับเหมา</p>
        </div>

        {/* Quick Stats Strip & Calculator Toggle */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="border border-slate-200 rounded-md px-3 py-1.5 bg-white">
            <span className="text-xs text-slate-400 block">ยอดโอนเงินสุทธิ</span>
            <span className="font-normal text-emerald-700">{money(totalTransferAll)}</span>
          </div>

          <div className="border border-slate-200 rounded-md px-3 py-1.5 bg-white">
            <span className="text-xs text-slate-400 block">ยอดเงินบิลรวม</span>
            <span className="font-normal text-slate-900">{money(totalBillAmountAll)}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowCalculator(!showCalculator)}
            className={`px-3 py-1.5 rounded-md font-normal transition border cursor-pointer ${
              showCalculator
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            เครื่องมือคิดคำนวณ
          </button>

          <button
            type="button"
            onClick={refreshData}
            disabled={refreshing}
            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-normal rounded-md hover:bg-slate-50 transition cursor-pointer"
          >
            {refreshing ? "รีเฟรช..." : "รีเฟรช"}
          </button>
        </div>
      </div>

      {/* 2. ENTREPRENEUR FINANCIAL CALCULATOR DRAWER */}
      {showCalculator && (
        <div className="border border-slate-200 rounded-md p-4 bg-white space-y-3 font-normal">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-xs font-normal text-slate-800">
              เครื่องมือช่วยคำนวณภาษีและประเมินผลกำไร
            </h2>
            <button type="button" onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-slate-700">
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* VAT & WHT Calculator */}
            <div className="border border-slate-200 rounded-md p-3 bg-slate-50/50 space-y-3">
              <span className="font-normal text-slate-700 block">1. คำนวณภาษี VAT 7% & หัก ณ ที่จ่าย (WHT)</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">ยอดก่อนภาษี (บาท)</label>
                  <input
                    type="number"
                    value={calcBaseAmount}
                    onChange={(e) => setCalcBaseAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-xs font-normal px-2.5 py-1 rounded-md focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">VAT %</label>
                  <select
                    value={calcVatPercent}
                    onChange={(e) => setCalcVatPercent(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 text-xs font-normal px-2 py-1 rounded-md focus:outline-none"
                  >
                    <option value={0}>0% (ไม่มี Vat)</option>
                    <option value={7}>7% (Vat ปกติ)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">หัก ณ ที่จ่าย %</label>
                  <select
                    value={calcWhtPercent}
                    onChange={(e) => setCalcWhtPercent(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 text-xs font-normal px-2 py-1 rounded-md focus:outline-none"
                  >
                    <option value={0}>0% (ไม่หัก)</option>
                    <option value={1}>1% (ค่าขนส่ง)</option>
                    <option value={3}>3% (ค่าบริการ/รับเหมา)</option>
                    <option value={5}>5% (ค่าเช่า)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-md border border-slate-200 text-center">
                <div>
                  <span className="text-xs text-slate-400 block">VAT 7%</span>
                  <span className="font-normal text-slate-900">+{money(calcResults.vatVal)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">หัก ณ ที่จ่าย</span>
                  <span className="font-normal text-amber-600">-{money(calcResults.whtVal)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">ยอดโอนจริงสุทธิ</span>
                  <span className="font-normal text-emerald-700">{money(calcResults.netPayment)}</span>
                </div>
              </div>
            </div>

            {/* Burn Rate & Margin Estimator */}
            <div className="border border-slate-200 rounded-md p-3 bg-slate-50/50 space-y-3">
              <span className="font-normal text-slate-700 block">2. คำนวณ Burn Rate & ประมาณการกำไรโครงการ</span>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 block mb-1">มูลค่าสัญญาโครงการ (บาท)</label>
                  <input
                    type="number"
                    value={calcContractValue}
                    onChange={(e) => setCalcContractValue(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-xs font-normal px-2.5 py-1 rounded-md focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 block mb-1">เบิกจ่ายจริงแล้วสะสม</label>
                  <div className="w-full bg-white border border-slate-200 text-emerald-700 text-xs font-normal px-2.5 py-1 rounded-md">
                    {money(projectMarginResults.spent)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-md border border-slate-200 text-center">
                <div>
                  <span className="text-xs text-slate-400 block">งบประมาณคงเหลือ</span>
                  <span className={`font-normal ${projectMarginResults.remaining >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {money(projectMarginResults.remaining)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">อัตราใช้งบ (Burn Rate)</span>
                  <span className={`font-normal ${projectMarginResults.burnRate > 90 ? "text-rose-600" : "text-slate-800"}`}>
                    {projectMarginResults.burnRate.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">ประมาณการกำไร</span>
                  <span className={`font-normal ${projectMarginResults.estimatedMargin >= 0 ? "text-indigo-700" : "text-rose-600"}`}>
                    {projectMarginResults.estimatedMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CONTROL TOOLBAR & FILTERS */}
      <div className="border border-slate-200 rounded-md p-3 bg-white flex flex-col lg:flex-row items-center justify-between gap-3 text-xs font-normal">
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Project Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-normal text-slate-700">โครงการ:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-white border border-slate-300 text-xs font-normal text-slate-900 px-2.5 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 max-w-[210px]"
            >
              <option value="all">ทุกโครงการ ({projectsList.length} โครงการ)</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Requester Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-normal text-slate-700">ผู้เบิก:</span>
            <select
              value={selectedRequester}
              onChange={(e) => setSelectedRequester(e.target.value)}
              className="bg-white border border-slate-300 text-xs font-normal text-slate-900 px-2.5 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 max-w-[190px]"
            >
              <option value="all">ผู้เบิกทุกคน ({requestersList.length} คน)</option>
              {requestersList.map((r) => (
                <option key={r.val} value={r.val}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contractor Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="font-normal text-slate-700">ผู้รับเหมา:</span>
            <select
              value={selectedContractor}
              onChange={(e) => setSelectedContractor(e.target.value)}
              className="bg-white border border-slate-300 text-xs font-normal text-slate-900 px-2.5 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 max-w-[210px]"
            >
              <option value="all">ผู้รับเหมาทุกคน ({contractorsDropdownList.length} ราย)</option>
              {contractorsDropdownList.map((c) => (
                <option key={c.val} value={c.val}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative flex items-center w-full sm:w-72">
          <Search size={14} className="absolute left-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาร้านค้า, ผู้รับเหมา, รายการ..."
            className="w-full bg-white border border-slate-300 text-xs pl-8 pr-7 py-1 rounded-md focus:outline-none focus:border-slate-500 font-normal"
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm("")} className="absolute right-2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. WORKSPACE TABS */}
      <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-normal">
        <button
          type="button"
          onClick={() => setActiveTab("material")}
          className={`px-3 py-2 border-b-2 transition ${
            activeTab === "material"
              ? "border-slate-900 text-slate-900 font-normal"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          สรุปค่าของ ({materialMetrics.count})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("product_category")}
          className={`px-3 py-2 border-b-2 transition ${
            activeTab === "product_category"
              ? "border-slate-900 text-slate-900 font-normal"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          สรุปประเภทสินค้า (18 สินค้า)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("labor")}
          className={`px-3 py-2 border-b-2 transition ${
            activeTab === "labor"
              ? "border-slate-900 text-slate-900 font-normal"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          สรุปค่าแรง ({laborMetrics.count})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("category")}
          className={`px-3 py-2 border-b-2 transition ${
            activeTab === "category"
              ? "border-slate-900 text-slate-900 font-normal"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          สรุปประเภท (8 หมวด)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("contractor")}
          className={`px-3 py-2 border-b-2 transition ${
            activeTab === "contractor"
              ? "border-slate-900 text-slate-900 font-normal"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          ค่าแรง (ต่อคน) ({contractorMetrics.count})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("store")}
          className={`px-3 py-2 border-b-2 transition ${
            activeTab === "store"
              ? "border-slate-900 text-slate-900 font-normal"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          ค่าของ (ต่อร้าน) ({storeMetrics.count})
        </button>
      </div>


      {/* 5. TAB 1: สรุปค่าของ (MATERIAL & EXPENSES) */}
      {activeTab === "material" && (
        <div className="border border-slate-200 rounded-md bg-white overflow-hidden font-normal">
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-normal">
            <h2 className="font-normal text-slate-700">สรุปค่าของ (Material & Expenses Breakdown)</h2>
            <span className="font-normal text-emerald-700">
              โอนรวมสุทธิ: {money(materialMetrics.totalTransfer)}
            </span>
          </div>

          <div className="overflow-auto max-h-[calc(100vh-210px)] relative">
            <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans font-normal">
              <thead className="sticky top-0 z-20 bg-slate-900 text-white font-normal border-b border-slate-900">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-800 font-normal">ลำดับ</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 font-normal">ผู้เบิก</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 font-normal">บิล</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 font-normal">ชื่อร้านค้า/ผู้รับเหมา</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 font-normal">รายละเอียดงาน</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 font-normal">รายการ</th>
                  <th className="py-2.5 px-3 border-r border-slate-800 font-normal">ประเภท</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 font-normal">ค่าของ</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 font-normal">VAT</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 font-normal">น้ำมัน</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 font-normal">ซ่อมรถ</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 font-normal">เครื่องจักร</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 font-normal">เครื่องมือ</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 font-normal">อื่นๆ</th>
                  <th className="py-2.5 px-3 text-right border-r border-slate-800 text-emerald-300 font-normal">โอนเงิน</th>
                  <th className="py-2.5 px-3 font-normal">ว/ด/ป</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {materialRows.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="py-8 text-center text-slate-400 font-normal">
                        ไม่พบข้อมูลบิลค่าของ
                      </td>
                    </tr>
                  ) : (
                    materialRows.map((r, i) => {
                      const transfer = getRowTransferAmount(r);
                      const category = getRowCategory(r);
                      const requesterName = getRequesterDisplayName(r["ผู้เบิก"]);
                      const formattedDate = formatDateThai(r["ว/ด/ป"] || r["วันที่"]);

                      return (
                        <tr key={i} className="hover:bg-slate-50 transition font-normal">
                          <td className="py-2 px-3 font-normal text-slate-500">{r["ลำดับ"] || i + 1}</td>
                          <td className="py-2 px-3 font-normal text-slate-900">{requesterName}</td>
                          <td className="py-2 px-3 font-normal">{r["บิล"] || "-"}</td>
                          <td className="py-2 px-3 font-normal text-slate-900">
                            {r["ร้านค้า"] || r["ร้าน/บุคคล"] || r["ร้านค้า/ผู้รับเหมา"] || "-"}
                          </td>
                          <td className="py-2 px-3">{r["รายละเอียดงาน"] || "-"}</td>
                          <td className="py-2 px-3">{r["สินค้า/ทำงาน"] || r["รายการ"] || "-"}</td>
                          <td className="py-2 px-3 font-normal text-indigo-600">{category || "-"}</td>

                          <td className="py-2 px-3 text-right font-normal">{money(getRowCategoryAmount(r, "ค่าของ"))}</td>
                          <td className="py-2 px-3 text-right font-normal">{r.vat || "-"}</td>
                          <td className="py-2 px-3 text-right font-normal">{money(getRowCategoryAmount(r, "น้ำมัน"))}</td>
                          <td className="py-2 px-3 text-right font-normal">{money(getRowCategoryAmount(r, "ซ่อมรถ"))}</td>
                          <td className="py-2 px-3 text-right font-normal">{money(getRowCategoryAmount(r, "เครื่องจักร"))}</td>
                          <td className="py-2 px-3 text-right font-normal">{money(getRowCategoryAmount(r, "เครื่องมือ"))}</td>
                          <td className="py-2 px-3 text-right font-normal">{money(getRowCategoryAmount(r, "อื่นๆ"))}</td>

                          <td className="py-2 px-3 text-right font-normal text-emerald-700 bg-emerald-50/60">
                            {money(transfer)}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-normal whitespace-nowrap">{formattedDate}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {materialRows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 shadow-md border-t-2 border-slate-400 font-normal">
                    <tr className="font-normal text-xs">
                      <td
                        colSpan={7}
                        style={{ color: "#0f172a", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 font-normal text-slate-900 border-r border-slate-300 tracking-wider text-xs"
                      >
                        รวมสุทธิทั้งหมด ({materialRows.length} รายการ)
                      </td>
                      <td
                        style={{ color: "#064e3b", backgroundColor: "#d1fae5" }}
                        className="py-2.5 px-3 text-right font-normal border-r border-emerald-200 text-xs"
                      >
                        {money(materialMetrics.catMaterial)}
                      </td>
                      <td
                        style={{ color: "#0f172a", backgroundColor: "#f1f5f9" }}
                        className="py-2.5 px-3 text-right font-normal border-r border-slate-300 text-xs"
                      >
                        {materialMetrics.vatTotal > 0 ? money(materialMetrics.vatTotal) : "-"}
                      </td>
                      <td
                        style={{ color: "#78350f", backgroundColor: "#fef3c7" }}
                        className="py-2.5 px-3 text-right font-normal border-r border-amber-200 text-xs"
                      >
                        {money(materialMetrics.catFuel)}
                      </td>
                      <td
                        style={{ color: "#7c2d12", backgroundColor: "#ffedd5" }}
                        className="py-2.5 px-3 text-right font-normal border-r border-orange-200 text-xs"
                      >
                        {money(materialMetrics.catRepair)}
                      </td>
                      <td
                        style={{ color: "#1e3a8a", backgroundColor: "#dbeafe" }}
                        className="py-2.5 px-3 text-right font-normal border-r border-blue-200 text-xs"
                      >
                        {money(materialMetrics.catMachine)}
                      </td>
                      <td
                        style={{ color: "#164e63", backgroundColor: "#cffafe" }}
                        className="py-2.5 px-3 text-right font-normal border-r border-cyan-200 text-xs"
                      >
                        {money(materialMetrics.catTool)}
                      </td>
                      <td
                        style={{ color: "#881337", backgroundColor: "#ffe4e6" }}
                        className="py-2.5 px-3 text-right font-normal border-r border-rose-200 text-xs"
                      >
                        {money(materialMetrics.catOther)}
                      </td>
                      <td className="py-2 px-3 text-right font-normal text-emerald-800 bg-emerald-100 border-r border-emerald-300">
                        {money(materialMetrics.totalTransfer)}
                      </td>
                      <td className="py-2 px-3 text-center text-xs font-normal border-r border-slate-300">
                        -
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

      {/* 6. TAB 2: สรุปแยกตามประเภทสินค้า (ดึงข้อมูลจาก Master Data) */}
      {activeTab === "product_category" && (
        <div className="space-y-4 font-normal">
          <div className="border border-slate-200 rounded-lg p-3.5 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-normal text-slate-800">เลือกประเภทสินค้า:</span>
              <select
                value={selectedProductCategory}
                onChange={(e) => setSelectedProductCategory(e.target.value)}
                className="bg-white border border-slate-300 text-xs font-normal text-slate-900 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 min-w-[240px]"
              >
                <option value="all">แสดงสินค้าทุกประเภท ({productCategoryList.length} รหัสสินค้า)</option>
                {productCategoryList.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="font-normal text-slate-800 text-xs">
              ยอดโอนรวมสินค้า: <span className="text-emerald-800 text-sm font-normal">{money(productCategoryMetrics.grandTotal)} ฿</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-210px)] relative">
              <table className="w-full text-left text-xs text-slate-800 border-collapse font-sans font-normal">
                <thead className="sticky top-0 z-20 bg-slate-900 text-white font-normal border-b border-slate-900">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-800 font-normal">ลำดับ</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 font-normal">ผู้เบิก</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 font-normal">บิล</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 font-normal">ชื่อร้านค้า/ผู้รับเหมา</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 font-normal">รายละเอียดงาน / รายการ</th>
                    <th className="py-2.5 px-3 border-r border-slate-800 font-normal">ประเภท</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800 font-normal">ยอดเงินบิล</th>
                    <th className="py-2.5 px-3 text-right border-r border-slate-800 text-emerald-300 font-normal">โอนเงิน</th>
                    <th className="py-2.5 px-3 font-normal">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productCategoryFilteredRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-normal text-slate-600">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-3 font-normal text-slate-900">{getRequesterDisplayName(r["ผู้เบิก"])}</td>
                      <td className="py-2 px-3 font-normal text-slate-800">{r["บิล"] || "-"}</td>
                      <td className="py-2 px-3 font-normal text-slate-900">
                        {r["ร้านค้า"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "-"}
                      </td>
                      <td className="py-2 px-3 font-normal text-slate-800">{r["สินค้า/ทำงาน"] || r["รายละเอียดงาน"] || "-"}</td>
                      <td className="py-2 px-3 font-normal text-teal-800">{getRowCategory(r) || "-"}</td>
                      <td className="py-2 px-3 text-right font-normal text-slate-900">{money(getRowAmount(r))}</td>
                      <td className="py-2 px-3 text-right font-normal text-emerald-800 bg-emerald-50">
                        {money(getRowTransferAmount(r))}
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-normal whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  ))}
                </tbody>
                {productCategoryFilteredRows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 shadow-md border-t-2 border-slate-400">
                    <tr className="font-normal text-xs">
                      <td
                        colSpan={6}
                        style={{ color: "#0f172a", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 font-normal text-slate-900 border-r border-slate-300 tracking-wider text-xs"
                      >
                        รวมสุทธิสินค้า ({productCategoryFilteredRows.length} รายการ)
                      </td>
                      <td
                        style={{ color: "#0f172a", backgroundColor: "#f1f5f9" }}
                        className="py-2.5 px-3 text-right font-normal border-r border-slate-300 text-xs"
                      >
                        {money(productCategoryBillTotal)}
                      </td>
                      <td
                        style={{ color: "#ffffff", backgroundColor: "#0d9488" }}
                        className="py-2.5 px-3 text-right font-normal text-sm border-r border-teal-700 text-xs"
                      >
                        {money(productCategoryTransferTotal)}
                      </td>
                      <td
                        style={{ color: "#475569", backgroundColor: "#e2e8f0" }}
                        className="py-2.5 px-3 border-r border-slate-300 text-center text-xs font-normal"
                      >
                        -
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: สรุปค่าแรง (LABOR BREAKDOWN - EXCEL SPREADSHEET MATCH) */}
      {activeTab === "labor" && (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs space-y-0 font-sans font-normal">
          {/* Top Excel Summary Header Bar */}
          <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-normal text-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 font-normal">
                {selectedProjectId === "all" ? "สรุปค่าแรงงานและผู้รับเหมาทุกโครงการ" : projectsList.find(p => p.id === selectedProjectId)?.label || selectedProjectId}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-[#00e676]/20 border border-[#00c853] text-[#006020] rounded font-normal text-xs">
                ค่าแรงรวม: {money(laborMetrics.totalLabor)} ฿
              </div>
              <div className="px-3 py-1 bg-[#00e676] text-slate-900 rounded font-normal text-xs shadow-2xs">
                โอนเงินรวม: {money(laborMetrics.totalTransfer)} ฿
              </div>
            </div>
          </div>

          <div className="overflow-auto max-h-[calc(100vh-210px)] relative">
            <table className="w-full text-left text-xs sm:text-xs text-slate-800 border-collapse font-sans font-normal">
              <thead className="sticky top-0 z-20 bg-slate-900 text-white font-normal border-b border-slate-900 whitespace-nowrap">
                <tr>
                  <th className="py-2.5 px-2 border-r border-slate-800 text-center w-12 font-normal">ลำดับ</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-800 font-normal">เบิก</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-800 font-normal">บิล</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-800 font-normal">ผู้รับเหมา</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-800 font-normal">รายละเอียดงาน</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-800 font-normal">ประเภท</th>
                  <th className="py-2.5 px-2.5 text-right border-r border-slate-800 bg-[#00e676]/20 text-[#004d1a] font-normal">ค่าแรง</th>
                  <th className="py-2.5 px-2 text-center border-r border-slate-800 font-normal">หัก</th>
                  <th className="py-2.5 px-2.5 border-r border-slate-800 font-normal">statusค่าแรง</th>
                  <th className="py-2.5 px-2.5 text-right border-r border-slate-800 text-amber-300 font-normal">แรง</th>
                  <th className="py-2.5 px-2.5 text-right border-r border-slate-800 font-normal">เปิดจ้าง</th>
                  <th className="py-2.5 px-2.5 text-right border-r border-slate-800 font-normal">จ่ายสะสม</th>
                  <th className="py-2.5 px-2.5 text-right border-r border-slate-800 font-normal">พนักงาน</th>
                  <th className="py-2.5 px-2.5 text-right border-r border-slate-800 font-normal">อื่นๆ</th>
                  <th className="py-2.5 px-2.5 text-right border-r border-slate-800 text-[#00e676] bg-slate-950 font-normal">โอนเงิน</th>
                  <th className="py-2.5 px-2.5 text-center font-normal">ว/ด/ป</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-normal">
                {laborRows.map((r, i) => {
                  const laborAmt = toNumber(r["ค่าแรง"]) || getRowAmount(r);
                  const netLabor = calcNetLabor(r);
                  const transferAmt = getRowTransferAmount(r);
                  const openHire = toNumber(r["เปิดจ้าง"]);
                  const accumPaid = toNumber(r["จ่ายสะสม"]);
                  const staffAmt = toNumber(r["พนักงาน"]);
                  const otherAmt = toNumber(r["อื่นๆ"]);
                  const rawContractor = String(r["id_Contractor"] || r["CW Code"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || r["ชื่อผู้รับเหมา"] || "").trim();
                  const cInfo = getContractorInfo(rawContractor);

                  // Show ONLY the contractor name (e.g. น(เหล็ก), บอย(ขนส่ง), กร Survey, แก้ว(PW1))
                  const contractorName = cInfo.name !== "-" 
                    ? cInfo.name 
                    : String(r["ชื่อผู้รับเหมา"] || r["ร้าน/บุคคล"] || rawContractor || "-").trim();

                  const laborStatus = String(r["statusค่าแรง"] || "").trim() || "บุคคลธรรมดา";

                  return (
                    <tr key={i} className="hover:bg-amber-50/60 transition">
                      <td className="py-2 px-2 text-center font-normal text-slate-600">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-2.5 font-normal text-slate-900">{getRequesterDisplayName(r["ผู้เบิก"])}</td>
                      <td className="py-2 px-2.5 font-normal text-slate-700">{r["บิล"] || r["บิลหลัก/ย่อย"] || "-"}</td>
                      <td className="py-2 px-2.5 font-normal text-slate-900">{contractorName || "-"}</td>
                      <td className="py-2 px-2.5 font-normal text-slate-800">{r["รายละเอียดงาน"] || r["สินค้า/ทำงาน"] || "-"}</td>
                      <td className="py-2 px-2.5 font-normal text-emerald-800">{getRowCategory(r) || "2.ค่าแรง"}</td>
                      <td className="py-2 px-2.5 text-right font-normal text-emerald-900 bg-emerald-50/70">{money(laborAmt)}</td>
                      <td className="py-2 px-2 text-center font-normal text-slate-700">{r["หัก"] ? `${r["หัก"]}` : "-"}</td>
                      <td className="py-2 px-2.5 font-normal text-slate-700">{laborStatus}</td>
                      <td className="py-2 px-2.5 text-right font-normal text-slate-900">{money(netLabor)}</td>
                      <td className="py-2 px-2.5 text-right font-normal text-slate-700">{openHire > 0 ? money(openHire) : "-"}</td>
                      <td className="py-2 px-2.5 text-right font-normal text-slate-700">{accumPaid > 0 ? money(accumPaid) : "-"}</td>
                      <td className="py-2 px-2.5 text-right font-normal text-purple-700">{staffAmt > 0 ? money(staffAmt) : "-"}</td>
                      <td className="py-2 px-2.5 text-right font-normal text-rose-700">{otherAmt > 0 ? money(otherAmt) : "-"}</td>
                      <td className="py-2 px-2.5 text-right font-normal text-slate-900 bg-emerald-100/90">{money(transferAmt)}</td>
                      <td className="py-2 px-2.5 text-center text-slate-600 font-normal whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  );
                })}
              </tbody>
              {laborRows.length > 0 && (
                <tfoot className="sticky bottom-0 z-20 shadow-md border-t-2 border-slate-400 font-normal">
                  <tr className="font-normal text-xs">
                    <td
                      colSpan={6}
                      style={{ color: "#0f172a", backgroundColor: "#e2e8f0" }}
                      className="py-2.5 px-3 font-normal text-slate-900 border-r border-slate-300 tracking-wider text-xs"
                    >
                      รวมสุทธิค่าแรง ({laborRows.length} รายการ)
                    </td>
                    <td
                      style={{ color: "#064e3b", backgroundColor: "#d1fae5" }}
                      className="py-2.5 px-2.5 text-right font-normal border-r border-emerald-300 text-xs"
                    >
                      {money(laborMetrics.totalLabor)}
                    </td>
                    <td style={{ backgroundColor: "#f1f5f9" }} className="py-2 px-2 text-center text-xs font-normal border-r border-slate-300">-</td>
                    <td style={{ backgroundColor: "#f1f5f9" }} className="py-2 px-2.5 text-center text-xs font-normal border-r border-slate-300">-</td>
                    <td style={{ backgroundColor: "#f1f5f9" }} className="py-2.5 px-2.5 text-right font-normal text-slate-900 border-r border-slate-300 text-xs">
                      {money(laborMetrics.totalNetLabor)}
                    </td>
                    <td style={{ backgroundColor: "#f1f5f9" }} className="py-2.5 px-2.5 text-right font-normal text-slate-800 border-r border-slate-300 text-xs">
                      {money(laborMetrics.totalOpenHire)}
                    </td>
                    <td style={{ backgroundColor: "#f1f5f9" }} className="py-2.5 px-2.5 text-right font-normal text-slate-800 border-r border-slate-300 text-xs">
                      {money(laborMetrics.totalAccumPaid)}
                    </td>
                    <td style={{ backgroundColor: "#f3e8ff" }} className="py-2.5 px-2.5 text-right font-normal text-purple-900 border-r border-purple-200 text-xs">
                      {money(laborMetrics.totalStaff)}
                    </td>
                    <td style={{ backgroundColor: "#ffe4e6" }} className="py-2.5 px-2.5 text-right font-normal text-rose-900 border-r border-rose-200 text-xs">
                      {money(laborMetrics.totalOther)}
                    </td>
                    <td
                      style={{ color: "#ffffff", backgroundColor: "#15803d" }}
                      className="py-2.5 px-2.5 text-right font-normal text-sm border-r border-emerald-800 text-xs"
                    >
                      {money(laborMetrics.totalTransfer)}
                    </td>
                    <td style={{ backgroundColor: "#e2e8f0" }} className="py-2.5 px-2.5 border-r border-slate-300 text-center text-xs font-normal">-</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB 4: สรุปประเภท (8 CATEGORIES) */}
      {activeTab === "category" && (
        <div className="space-y-3 font-normal">
          <div className="border border-slate-200 rounded-lg p-3.5 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-normal text-slate-800">เลือกประเภทหมวดหมู่:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-300 text-xs font-normal text-slate-900 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 min-w-[240px]"
              >
                <option value="all">แสดงทุกหมวดหมู่ (8 หมวด)</option>
                {CATEGORIES_LIST.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="font-normal text-slate-800 text-xs">
              ยอดโอนรวมหมวดหมู่: <span className="text-purple-800 text-sm font-normal">{money(categoryMetrics.grandTotal)} ฿</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-210px)] relative">
              <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans font-normal">
                <thead className="sticky top-0 z-20 bg-slate-100 text-slate-800 font-normal border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">ลำดับ</th>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">ผู้เบิก</th>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">บิล</th>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">ร้านค้า/ผู้รับเหมา</th>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">รายละเอียดงาน</th>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">หมวดหมู่</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 font-normal">ยอดเงินบิล</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 text-slate-900 font-normal">โอนเงิน</th>
                    <th className="py-2 px-3 font-normal">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryFilteredRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-normal text-slate-500">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-3 font-normal text-slate-900">{getRequesterDisplayName(r["ผู้เบิก"])}</td>
                      <td className="py-2 px-3 font-normal">{r["บิล"] || "-"}</td>
                      <td className="py-2 px-3 font-normal text-slate-900">
                        {r["ร้านค้า"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "-"}
                      </td>
                      <td className="py-2 px-3">{r["รายละเอียดงาน"] || r["สินค้า/ทำงาน"] || "-"}</td>
                      <td className="py-2 px-3 font-normal text-purple-700">{getRowCategory(r) || "-"}</td>
                      <td className="py-2 px-3 text-right font-normal text-slate-900">{money(getRowAmount(r))}</td>
                      <td className="py-2 px-3 text-right font-normal text-purple-700 bg-purple-50/60">
                        {money(getRowTransferAmount(r))}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-normal whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  ))}
                </tbody>
                {categoryFilteredRows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 border-t-2 border-slate-300 bg-slate-100 font-normal text-xs">
                    <tr>
                      <td colSpan={6} className="py-2 px-3 font-normal text-slate-900 border-r border-slate-300">
                        รวมสุทธิประเภท ({categoryFilteredRows.length} รายการ)
                      </td>
                      <td className="py-2 px-3 text-right font-normal border-r border-slate-300">
                        {money(categoryFilteredBillTotal)}
                      </td>
                      <td className="py-2 px-3 text-right font-normal text-emerald-800 bg-emerald-100 border-r border-emerald-300">
                        {money(categoryFilteredTransferTotal)}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 text-center font-normal">-</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB 5: ค่าแรงต่อคน (CONTRACTOR DETAIL) */}
      {activeTab === "contractor" && (
        <div className="space-y-3 font-normal">
          <div className="border border-slate-200 rounded-md p-3 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-normal text-slate-700">เลือกผู้รับเหมา/ช่าง:</span>
              <select
                value={selectedContractor}
                onChange={(e) => setSelectedContractor(e.target.value)}
                className="bg-white border border-slate-300 text-xs text-slate-800 px-2.5 py-1 rounded-md focus:outline-none font-normal"
              >
                <option value="all">ผู้รับเหมาทุกคน ({contractorsList.length} คน)</option>
                {contractorsList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <span className="font-normal text-slate-700">
              โอนรวมผู้รับเหมา: <span className="text-emerald-700 font-normal">{money(contractorMetrics.totalTransfer)}</span>
            </span>
          </div>

          <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-210px)] relative">
              <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans font-normal">
                <thead className="sticky top-0 z-20 bg-slate-100 text-slate-800 font-normal border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">ลำดับ</th>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">ชื่อผู้รับเหมา</th>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">รายละเอียดงาน</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 font-normal">เปิดจ้าง</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 font-normal">ค่าแรง</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 text-slate-900 font-normal">โอนเงิน</th>
                    <th className="py-2 px-3 font-normal">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contractorRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-normal text-slate-500">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-3 font-normal text-slate-900">
                        {r["ชื่อผู้รับเหมา"] || r["ผู้รับเหมา"] || r["ร้าน/บุคคล"] || "-"}
                      </td>
                      <td className="py-2 px-3">{r["รายละเอียดงาน"] || r["สินค้า/ทำงาน"] || "-"}</td>
                      <td className="py-2 px-3 text-right font-normal">{money(toNumber(r["เปิดจ้าง"]))}</td>
                      <td className="py-2 px-3 text-right font-normal text-slate-900">{money(toNumber(r["ค่าแรง"]) || getRowAmount(r))}</td>
                      <td className="py-2 px-3 text-right font-normal text-emerald-700 bg-emerald-50/40">
                        {money(getRowTransferAmount(r))}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-normal whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  ))}
                </tbody>
                {contractorRows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 border-t-2 border-slate-300 bg-slate-100 font-normal text-xs">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 font-normal text-slate-900 border-r border-slate-300">
                        รวมสุทธิผู้รับเหมา ({contractorRows.length} รายการ)
                      </td>
                      <td className="py-2 px-3 text-right font-normal border-r border-slate-300">
                        {money(contractorMetrics.totalOpenHire)}
                      </td>
                      <td className="py-2 px-3 text-right font-normal border-r border-slate-300">
                        {money(contractorMetrics.totalLabor)}
                      </td>
                      <td className="py-2 px-3 text-right font-normal text-emerald-800 bg-emerald-100 border-r border-emerald-300">
                        {money(contractorMetrics.totalTransfer)}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 text-center font-normal">-</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 10. TAB 6: ค่าของต่อร้าน (STORE DETAIL) */}
      {activeTab === "store" && (
        <div className="space-y-3 font-normal">
          <div className="border border-slate-200 rounded-md p-3 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-normal text-slate-700">เลือกร้านค้า:</span>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-white border border-slate-300 text-xs text-slate-800 px-2.5 py-1 rounded-md focus:outline-none font-normal"
              >
                <option value="all">ร้านค้าทั้งหมด ({storesList.length} ร้าน)</option>
                {storesList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <span className="font-normal text-slate-700">
              โอนรวมร้านค้า: <span className="text-emerald-700 font-normal">{money(storeMetrics.totalTransfer)}</span>
            </span>
          </div>

          <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-210px)] relative">
              <table className="w-full text-left text-xs text-slate-700 border-collapse font-sans font-normal">
                <thead className="sticky top-0 z-20 bg-slate-100 text-slate-800 font-normal border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">ลำดับ</th>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">ชื่อร้านค้า</th>
                    <th className="py-2 px-3 border-r border-slate-200 font-normal">รายละเอียดงาน / สินค้า</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 font-normal">ยอดเงินบิล</th>
                    <th className="py-2 px-3 text-right border-r border-slate-200 text-slate-900 font-normal">โอนเงิน</th>
                    <th className="py-2 px-3 font-normal">ว/ด/ป</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storeRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-3 font-normal text-slate-500">{r["ลำดับ"] || i + 1}</td>
                      <td className="py-2 px-3 font-normal text-slate-900">
                        {r["ร้านค้า"] || r["ร้าน/บุคคล"] || r["ร้านค้า/ผู้รับเหมา"] || "-"}
                      </td>
                      <td className="py-2 px-3">{r["สินค้า/ทำงาน"] || r["รายละเอียดงาน"] || "-"}</td>
                      <td className="py-2 px-3 text-right font-normal text-slate-900">{money(getRowAmount(r))}</td>
                      <td className="py-2 px-3 text-right font-normal text-emerald-700 bg-emerald-50/40">
                        {money(getRowTransferAmount(r))}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-normal whitespace-nowrap">{formatDateThai(r["ว/ด/ป"] || r["วันที่"])}</td>
                    </tr>
                  ))}
                </tbody>
                {storeRows.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 border-t-2 border-slate-300 bg-slate-100 font-normal text-xs">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 font-normal text-slate-900 border-r border-slate-300">
                        รวมสุทธิร้านค้า ({storeRows.length} รายการ)
                      </td>
                      <td className="py-2 px-3 text-right font-normal border-r border-slate-300">
                        {money(storeMetrics.totalAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-normal text-emerald-800 bg-emerald-100 border-r border-emerald-300">
                        {money(storeMetrics.totalTransfer)}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 text-center font-normal">-</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

