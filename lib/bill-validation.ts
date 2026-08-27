import { TABLES } from "@/lib/config";
import { hydrateContractRows } from "@/lib/formulas";
import { getRows } from "@/lib/db";
import { money, toNumber } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";

const PRODUCT_BUDGET_MAP: Record<string, string> = {
  "1 เหล็กเส้น": "งบไม่เกินเหล็กเส้น",
  "2 เหล็กรูปพรรณ": "งบไม่เกินรูปพรรณ",
  "3 คอนกรีต": "งบไม่เกินคอนกรีต",
  "4 ไม้แบบ": "งบไม่เกินไม้แบบ",
  "5 วัสดุมุง": "งบไม่เกินวัสดุมุง",
  "6 ฝ้าผนัง": "งบไม่เกินฝ้าผนัง",
  "7 ปูพื้น": "งบไม่เกินปูพื้น",
  "8 กระจก": "งบไม่เกินกระจก",
  "9 ไฟฟ้า": "งบไม่เกินไฟฟ้า",
  "10 ประปา": "งบไม่เกินประปา",
  "11 อื่นๆ(วัสดุ)": "งบไม่เกินอื่นๆ",
  "12 สีเคมี": "งบไม่เกินสีเคมี",
  "13 สุขภัณฑ์": "งบไม่เกินสุขภัณฑ์",
  "14 บิวอิน": "งบไม่เกินบิวอิน",
  "15 แอร์": "งบไม่เกินแอร์",
  "16 ดิน": "งบไม่เกินดิน",
  "17 หินทราย": "งบไม่เกินหินทราย",
  "18 เตรียมงาน": "งบไม่เกินเตรียมงาน",
};

const CATEGORY_BUDGET_MAP: Record<string, string> = {
  "1.ค่าของ": "งบไม่เกินค่าของ",
  "2.ค่าแรง": "งบไม่เกินค่าแรง",
  "3.พนักงาน": "งบไม่เกินพนักงาน",
  "4.น้ำมัน": "งบไม่เกินน้ำมัน",
  "5.ซ่อมรถ": "งบไม่เกินซ่อมรถ",
  "6.เครื่องจักร": "งบไม่เกินเครื่องจักร",
  "7.เครื่องมือ": "งบไม่เกินเครื่องมือ",
};

export type CategoryBudgetCheckResult = {
  hasBudgetCap: boolean;
  categoryLabel: string;
  targetBudgetField: string;
  budgetLimit: number;
  accumulatedAmount: number;
  currentBillAmount: number;
  totalAfterBill: number;
  remainingBeforeBill: number;
  remainingAfterBill: number;
  percentUsedAfterBill: number;
  isOverBudget: boolean;
  isWarning: boolean;
  message: string;
};

export async function validateBillRelations(row: SheetRow) {
  const projectId = String(row["ID Project"] || "").trim();
  const [projects, contracts, dataRows] = await Promise.all([
    getRows(TABLES.PROJECT, 120_000),
    row["ร้านค้า/ผู้รับเหมา"] === "ผู้รับเหมา"
      ? getRows(TABLES.CONTRACT_WORK, 60_000)
      : Promise.resolve([]),
    getRows(TABLES.DATA, 150_000).catch(() => [])
  ]);

  const project = projects.find(p => String(p["ID Project"] || "").trim() === projectId);
  if (!project) {
    throw new Error("ไม่พบ Project ที่เลือก");
  }

  // Validate Contractor Relations if contractor bill
  if (row["ร้านค้า/ผู้รับเหมา"] === "ผู้รับเหมา") {
    const contractId = String(row["ผู้รับเหมา"] || "").trim();
    const hydratedContracts = await hydrateContractRows(contracts);
    const contract = hydratedContracts.find(item => String(item.id_Conwork || "").trim() === contractId);
    if (!contract) throw new Error("ไม่พบรายการเปิดจ้างที่เลือก");
    if (String(contract["ID Project"] || "").trim() !== projectId) {
      throw new Error("รายการเปิดจ้างไม่อยู่ใน Project ที่เลือก");
    }
    if (toNumber(contract["ค่าแรงคงเหลือ"]) <= 0) {
      throw new Error("รายการเปิดจ้างนี้ชำระครบแล้ว");
    }
  }

  // Check Category Budget Cap
  const budgetCheck = checkCategoryBudgetCap(row, project, dataRows);
  if (budgetCheck.hasBudgetCap && budgetCheck.isOverBudget) {
    console.warn(`[Category Budget Over-Cap Warning] ${budgetCheck.message}`);
  }
}

export function checkCategoryBudgetCap(
  row: SheetRow,
  project: SheetRow,
  existingBills: SheetRow[] = []
): CategoryBudgetCheckResult {
  const productVal = String(row["สินค้า"] || "").trim();
  const categoryVal = String(row["ประเภท"] || "").trim();

  let targetBudgetField = "";
  let categoryLabel = "";

  if (productVal && PRODUCT_BUDGET_MAP[productVal]) {
    targetBudgetField = PRODUCT_BUDGET_MAP[productVal];
    categoryLabel = productVal;
  } else if (categoryVal && CATEGORY_BUDGET_MAP[categoryVal]) {
    targetBudgetField = CATEGORY_BUDGET_MAP[categoryVal];
    categoryLabel = categoryVal;
  }

  const defaultResult: CategoryBudgetCheckResult = {
    hasBudgetCap: false,
    categoryLabel: categoryLabel || "ทั่วไป",
    targetBudgetField: "",
    budgetLimit: 0,
    accumulatedAmount: 0,
    currentBillAmount: 0,
    totalAfterBill: 0,
    remainingBeforeBill: 0,
    remainingAfterBill: 0,
    percentUsedAfterBill: 0,
    isOverBudget: false,
    isWarning: false,
    message: ""
  };

  if (!targetBudgetField) return defaultResult;

  const budgetLimit = toNumber(project[targetBudgetField]);
  if (budgetLimit <= 0) return defaultResult;

  const currentProjectId = String(project["ID Project"] || "").trim();
  const currentRowKey = String(row._sheetRow || row["ลำดับ"] || "").trim();

  // Sum up accumulated bills for same project and category
  let accumulatedAmount = 0;
  for (const b of existingBills) {
    const bProjId = String(b["ID Project"] || "").trim();
    if (bProjId !== currentProjectId) continue;

    const bRowKey = String(b._sheetRow || b["ลำดับ"] || "").trim();
    if (currentRowKey && bRowKey === currentRowKey) continue; // Skip self when editing

    const bProd = String(b["สินค้า"] || "").trim();
    const bCat = String(b["ประเภท"] || "").trim();

    const matchesProduct = productVal && bProd === productVal;
    const matchesCategory = !productVal && categoryVal && bCat === categoryVal;

    if (matchesProduct || matchesCategory) {
      const amt = getBillRowAmount(b);
      accumulatedAmount += amt;
    }
  }

  const currentBillAmount = getBillRowAmount(row);
  const totalAfterBill = accumulatedAmount + currentBillAmount;
  const remainingBeforeBill = budgetLimit - accumulatedAmount;
  const remainingAfterBill = budgetLimit - totalAfterBill;
  const percentUsedAfterBill = (totalAfterBill / budgetLimit) * 100;
  const isOverBudget = totalAfterBill > budgetLimit;
  const isWarning = !isOverBudget && percentUsedAfterBill >= 85;

  let message = "";
  if (isOverBudget) {
    const overAmt = totalAfterBill - budgetLimit;
    message = `ยอดเบิกหมวด '${categoryLabel}' รวมแล้ว ${money(totalAfterBill)} ฿ เกินวงเงินคุมงบ (${money(budgetLimit)} ฿) อยู่ ${money(overAmt)} ฿`;
  } else if (isWarning) {
    message = `ยอดเบิกหมวด '${categoryLabel}' รวมแล้ว ${money(totalAfterBill)} ฿ (คิดเป็น ${percentUsedAfterBill.toFixed(0)}% ของวงเงินคุมงบ ${money(budgetLimit)} ฿)`;
  } else {
    message = `งบหมวด '${categoryLabel}' คงเหลือเบิกได้ ${money(remainingAfterBill)} ฿ (จากวงเงินคุมงบ ${money(budgetLimit)} ฿)`;
  }

  return {
    hasBudgetCap: true,
    categoryLabel,
    targetBudgetField,
    budgetLimit,
    accumulatedAmount,
    currentBillAmount,
    totalAfterBill,
    remainingBeforeBill,
    remainingAfterBill,
    percentUsedAfterBill: Number(percentUsedAfterBill.toFixed(1)),
    isOverBudget,
    isWarning,
    message
  };
}

function getBillRowAmount(row: SheetRow): number {
  return toNumber(
    row["ยอดเงิน"] ||
    row["ค่าของ"] ||
    row["ค่าแรง"] ||
    row["พนักงาน"] ||
    row["น้ำมัน"] ||
    row["ซ่อมรถ"] ||
    row["เครื่องจักร"] ||
    row["เครื่องมือ"] ||
    row["อื่นๆ"] ||
    0
  );
}
