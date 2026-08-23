import { toNumber } from "@/lib/numbers";
import { isCommittedBill } from "@/lib/bill-status";
import type { RowValue, SheetRow } from "@/lib/types";

const AMOUNT_COLUMNS = [
  "ค่าของ",
  "ค่าแรง",
  "พนักงาน",
  "น้ำมัน",
  "ซ่อมรถ",
  "เครื่องจักร",
  "เครื่องมือ",
  "อื่นๆ"
];

export function valueOf(row: SheetRow, columns: string[]) {
  for (const column of columns) {
    const value = row[column];
    if (hasValue(value)) return value;
  }
  return "";
}

export function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function sumColumns(rows: SheetRow[], columns: string[]) {
  return rows.reduce((sum, row) => sum + columns.reduce((inner, column) => inner + toNumber(row[column]), 0), 0);
}

export function hydrateDataRows(rows: SheetRow[]) {
  return rows.map(row => {
    const output = { ...row };
    if (!hasValue(output["ยอดเงิน"])) output["ยอดเงิน"] = sumColumns([output], AMOUNT_COLUMNS);
    output["ยอดโอน"] = computeTransferAmount(output);
    if (!hasValue(output["ร้าน/บุคคล"])) output["ร้าน/บุคคล"] = valueOf(output, ["ร้านค้า", "ผู้รับเหมา", "ร้านค้า/ผู้รับเหมา"]);
    if (!hasValue(output["สินค้า/ทำงาน"])) output["สินค้า/ทำงาน"] = valueOf(output, ["สินค้า", "รายละเอียดงาน", "รายการ"]);
    return output;
  });
}

export function computeBillAmount(row: SheetRow) {
  return sumColumns([row], AMOUNT_COLUMNS);
}

export function computeBillTransferAmount(row: SheetRow) {
  return computeTransferAmount(row);
}

export function rowsForProject(dataRows: SheetRow[], projectId: RowValue | undefined) {
  const id = String(projectId || "").trim();
  return hydrateDataRows(dataRows).filter(row => String(row["ID Project"] || "").trim() === id);
}

export function getCategoryExpense(rows: SheetRow[], cat: string): number {
  return rows.reduce((sum, row) => {
    const directAmt = toNumber(row[cat]);
    if (directAmt > 0) return sum + directAmt;

    const catStr = String(row["ประเภท"] || row["รายการ"] || row["สินค้า/ทำงาน"] || "").trim();
    if (catStr.includes(cat)) {
      return sum + toNumber(row["ยอดเงิน"]);
    }
    return sum;
  }, 0);
}

export function hydrateProjectRowsForList(projectRows: SheetRow[], dataRows: SheetRow[]) {
  const totals = dataRows.reduce<Record<string, number>>((accumulator, row) => {
    if (!isCommittedBill(row)) return accumulator;
    const projectId = String(row["ID Project"] || "").trim();
    if (!projectId) return accumulator;
    const amount = toNumber(row["ยอดเงิน"]) || AMOUNT_COLUMNS.reduce((sum, column) => sum + toNumber(row[column]), 0);
    accumulator[projectId] = (accumulator[projectId] || 0) + amount;
    return accumulator;
  }, {});

  return projectRows.map(row => {
    const projectId = String(row["ID Project"] || "").trim();
    const output = { ...row };
    
    // Always compute "รวม ALL" dynamically from committed data rows
    output["รวม ALL"] = totals[projectId] ?? 0;

    const workAmount = toNumber(output["ยอดงาน"]);
    const vatAmount = toNumber(output["ยอดรวม vat"]);
    if (workAmount > 0 && (!hasValue(output["ยอดรวม vat"]) || vatAmount === 0)) {
      output["ยอดรวม vat"] = Math.round(workAmount * 1.07 * 100) / 100;
    } else if (vatAmount > 0 && (!hasValue(output["ยอดงาน"]) || workAmount === 0)) {
      output["ยอดงาน"] = Math.round((vatAmount / 1.07) * 100) / 100;
    }

    // Calculate overall budget cap "งบไม่เกิน"
    const currentCap = toNumber(output["งบไม่เกิน"]);
    const recalculatedWorkAmount = toNumber(output["ยอดงาน"]);
    const recalculatedVatAmount = toNumber(output["ยอดรวม vat"]);

    const categorySum = Object.keys(output)
      .filter(k => k.startsWith("งบไม่เกิน") && k !== "งบไม่เกิน")
      .reduce((sum, k) => sum + toNumber(output[k]), 0);

    if (categorySum > 0) {
      // Priority 1: Sub-category allocations exist (e.g. 3,000,000 in Category Budget Matrix)
      output["งบไม่เกิน"] = categorySum;
    } else if (
      currentCap === 0 ||
      (recalculatedVatAmount > 0 && currentCap === recalculatedVatAmount && recalculatedWorkAmount > 0 && recalculatedWorkAmount !== recalculatedVatAmount)
    ) {
      // Priority 2: No sub-category allocations, and currentCap is empty/0 or incorrectly set to vatAmount
      if (recalculatedWorkAmount > 0) {
        output["งบไม่เกิน"] = recalculatedWorkAmount;
      } else if (recalculatedVatAmount > 0) {
        output["งบไม่เกิน"] = Math.round(recalculatedVatAmount / 1.07);
      }
    }

    return output;
  });
}

export function hydrateProjectSummary(project: SheetRow, projectDataRows: SheetRow[]): {
  project: SheetRow;
  totals: {
    workTotal: number;
    totalVat: number;
    budget: number;
    totalAll: number;
    billCount: number;
    remaining: number;
    material: number;
    labor: number;
    staff: number;
    fuel: number;
    carRepair: number;
    machine: number;
    tool: number;
    other: number;
  };
} {
  const committedRows = projectDataRows.filter(isCommittedBill);
  const projectTotal = sumColumns(committedRows, ["ยอดเงิน"]);

  const rawWorkTotal = toNumber(valueOf(project, ["ยอดงาน", "ยอดงาน (ก่อน vat)", "ยอดงานก่อนvat"]));
  const rawTotalVat = toNumber(valueOf(project, ["ยอดรวม vat", "ยอดรวม VAT", "ยอดรวมVat"]));
  const rawBudget = toNumber(valueOf(project, ["งบไม่เกิน"]));

  const totalVat = rawTotalVat > 0 ? rawTotalVat : (rawWorkTotal > 0 ? rawWorkTotal * 1.07 : 0);
  const workTotal = rawWorkTotal > 0 ? rawWorkTotal : (totalVat > 0 ? totalVat / 1.07 : 0);
  const totalAll = hasValue(project["รวม ALL"]) && toNumber(project["รวม ALL"]) > 0 ? toNumber(project["รวม ALL"]) : projectTotal;

  // Check Category Budget Matrix sum for consistency with project-all
  const categorySum = Object.keys(project)
    .filter(k => k.startsWith("งบไม่เกิน") && k !== "งบไม่เกิน")
    .reduce((sum, k) => sum + toNumber(project[k]), 0);

  let budget = rawBudget;
  if (categorySum > 0) {
    budget = categorySum;
  } else if (rawBudget <= 0) {
    budget = workTotal > 0 ? workTotal : (totalVat > 0 ? Math.round(totalVat / 1.07) : totalAll);
  }

  return {
    project: {
      ...project,
      _raw: { ...project },
      "ยอดงาน": hasValue(project["ยอดงาน"]) && toNumber(project["ยอดงาน"]) > 0 ? project["ยอดงาน"] : workTotal,
      "ยอดรวม vat": hasValue(project["ยอดรวม vat"]) || hasValue(project["ยอดรวม VAT"]) ? (project["ยอดรวม vat"] || project["ยอดรวม VAT"]) : totalVat,
      "งบไม่เกิน": budget,
      "รวม ALL": totalAll
    },
    totals: {
      workTotal,
      totalVat,
      budget,
      totalAll,
      billCount: committedRows.length,
      remaining: budget - totalAll,
      material: getCategoryExpense(committedRows, "ค่าของ"),
      labor: getCategoryExpense(committedRows, "ค่าแรง"),
      staff: getCategoryExpense(committedRows, "พนักงาน"),
      fuel: getCategoryExpense(committedRows, "น้ำมัน"),
      carRepair: getCategoryExpense(committedRows, "ซ่อมรถ"),
      machine: getCategoryExpense(committedRows, "เครื่องจักร"),
      tool: getCategoryExpense(committedRows, "เครื่องมือ"),
      other: getCategoryExpense(committedRows, "อื่นๆ")
    }
  };
}

export function isVatActive(vatValue: unknown): boolean {
  if (vatValue === null || vatValue === undefined) return false;
  const str = String(vatValue).trim().toLowerCase();
  return str !== "" && str !== "0" && str !== "0.00" && str !== "0%" && str !== "ไม่มี" && str !== "ไม่มี vat" && str !== "false" && str !== "no";
}

export function parseDeductPercent(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const str = String(value).trim();
  if (str === "ไม่มี" || str === "0" || str === "0%" || str === "" || str === "false") return 0;
  const match = str.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

export function parseCreditDays(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const str = String(value).trim();
  if (str === "เงินสด" || str === "ไม่มี" || str === "0" || str === "" || str === "false") return 0;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export function isDeductActive(value: unknown): boolean {
  return parseDeductPercent(value) > 0;
}

export function isCreditActive(value: unknown): boolean {
  return parseCreditDays(value) > 0;
}

function computeTransferAmount(row: SheetRow) {
  const amount = hasValue(row["ยอดเงิน"]) ? toNumber(row["ยอดเงิน"]) : computeBillAmount(row);
  const hasVat = isVatActive(row.vat ?? row["vat"] ?? row["VAT"]);
  const deductRate = parseDeductPercent(row["หัก"] ?? row["หัก ณ ที่จ่าย"] ?? row["หักณที่จ่าย"]);
  const hasDeduct = deductRate > 0;
  const customDeduct = hasValue(row["จำนวนหัก"]) 
    ? toNumber(row["จำนวนหัก"]) 
    : (hasValue(row["3เปอร์เซ็น"]) ? toNumber(row["3เปอร์เซ็น"]) : null);

  if (!hasVat && !hasDeduct) return amount;

  if (hasVat && hasDeduct) {
    if (customDeduct !== null && customDeduct > 0) return amount - customDeduct;
    const deductAmt = (amount / 1.07) * (deductRate / 100);
    return amount - deductAmt;
  }

  if (hasVat) return amount;

  if (hasDeduct) {
    if (customDeduct !== null && customDeduct > 0) return amount - customDeduct;
    const deductAmt = (amount * deductRate) / 100;
    return amount - deductAmt;
  }

  return amount;
}

export function computeBillDeductMultiplier(row: SheetRow) {
  const rate = parseDeductPercent(row["หัก"] ?? row["หัก ณ ที่จ่าย"] ?? row["หักณที่จ่าย"]);
  const hasVat = isVatActive(row.vat ?? row["vat"] ?? row["VAT"]);
  if (rate <= 0) return 1;
  return hasVat ? 1 - (rate / 100 / 1.07) : 1 - (rate / 100);
}

function isCompanyLabor(row: SheetRow) {
  return String(row["statusค่าแรง"] || "").trim() === "บริษัท";
}
