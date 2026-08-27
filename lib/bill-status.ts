import type { SheetRow } from "@/lib/types";
import { toNumber } from "@/lib/numbers";

export function validateBillStatusTransition(currentStatus: unknown, nextStatus: unknown) {
  const current = normalizeBillStatus(currentStatus);
  const next = normalizeBillStatus(nextStatus);
  if (current === next) return;

  const validTransitions: Record<string, string[]> = {
    "": ["รอตั้งเบิก", "ตั้งเบิก", "อนุมัติ", "เบิกแล้ว"],
    "รอตั้งเบิก": ["ตั้งเบิก", "อนุมัติ", "เบิกแล้ว"],
    "รออนุมัติ": ["รอตั้งเบิก", "ตั้งเบิก", "อนุมัติ", "เบิกแล้ว"],
    "ตั้งเบิก": ["รอตั้งเบิก", "อนุมัติ", "เบิกแล้ว"],
    "อนุมัติ": ["ตั้งเบิก", "เบิกแล้ว"],
    "เบิกแล้ว": ["อนุมัติ", "ตั้งเบิก"]
  };

  const allowed = validTransitions[current] || ["รอตั้งเบิก", "ตั้งเบิก", "อนุมัติ", "เบิกแล้ว"];
  if (!allowed.includes(next)) {
    throw new Error(`เปลี่ยนสถานะจาก ${current || "ว่าง"} เป็น ${next || "ว่าง"} ไม่ได้`);
  }
}

export function canEditOrDeleteBill(_status: unknown) {
  return true;
}

export function isValidBill(row: SheetRow) {
  if (!row) return false;
  const hasSeq = Boolean(row["ลำดับ"] || row._sheetRow || row.id);
  const hasVendor = Boolean(row["ร้าน/บุคคล"] && String(row["ร้าน/บุคคล"]).trim() !== "");
  const hasProject = Boolean(row["ชื่อ Project"] || row["ID Project"]);
  const hasItem = Boolean(row["สินค้า/ทำงาน"] || row["รายการ"]);
  const hasMoney = toNumber(row["ยอดเงิน"]) > 0 || ["ค่าของ", "ค่าแรง", "พนักงาน", "น้ำมัน", "ซ่อมรถ", "เครื่องจักร", "เครื่องมือ", "อื่นๆ"].some(c => toNumber(row[c]) > 0);
  return hasSeq || hasVendor || hasProject || hasItem || hasMoney;
}

export function isCommittedBill(row: SheetRow) {
  return isValidBill(row);
}

export function isUnpaidBill(row: SheetRow) {
  return normalizeBillStatus(row["สถานะ"]) !== "เบิกแล้ว";
}

export function normalizeBillStatus(value: unknown) {
  const str = String(value || "").trim();
  if (str.includes("รอตั้งเบิก")) return "รอตั้งเบิก";
  if (str.includes("อนุมัติ") && !str.includes("รออนุมัติ")) return "อนุมัติ";
  if (str.includes("เบิกแล้ว") || str.toLowerCase() === "paid" || str.toLowerCase() === "withdrawn") return "เบิกแล้ว";
  if (str.includes("ตั้งเบิก")) return "ตั้งเบิก";
  if (str.includes("รออนุมัติ")) return "รออนุมัติ";
  return str;
}
