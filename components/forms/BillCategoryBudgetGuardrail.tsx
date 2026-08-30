"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { checkCategoryBudgetCap, type CategoryBudgetCheckResult } from "@/lib/bill-validation";
import { money } from "@/lib/numbers";
import type { SheetRow } from "@/lib/types";

export type BillCategoryBudgetGuardrailProps = {
  values: Record<string, string>;
  projectRows?: SheetRow[];
};

export function BillCategoryBudgetGuardrail({ values, projectRows = [] }: BillCategoryBudgetGuardrailProps) {
  const [budgetStatus, setBudgetStatus] = useState<CategoryBudgetCheckResult | null>(null);

  const selectedProjectId = String(values["ID Project"] || "").trim();
  const selectedProduct = String(values["สินค้า"] || "").trim();
  const selectedCategory = String(values["ประเภท"] || "").trim();

  useEffect(() => {
    if (!selectedProjectId || (!selectedProduct && !selectedCategory)) {
      setBudgetStatus(null);
      return;
    }

    const matchedProject = projectRows.find(
      p => String(p["ID Project"] || "").trim() === selectedProjectId
    );

    if (!matchedProject) {
      setBudgetStatus(null);
      return;
    }

    const status = checkCategoryBudgetCap(values, matchedProject, []);
    setBudgetStatus(status);
  }, [selectedProjectId, selectedProduct, selectedCategory, values, projectRows]);

  if (!budgetStatus || !budgetStatus.hasBudgetCap) {
    return null;
  }

  const {
    categoryLabel,
    budgetLimit,
    currentBillAmount,
    totalAfterBill,
    remainingAfterBill,
    percentUsedAfterBill,
    isOverBudget,
    isWarning,
  } = budgetStatus;

  return (
    <div
      className={`w-full min-w-0 max-w-full h-10 sm:h-9 px-3 rounded-lg border transition-all text-xs font-sans flex items-center justify-between gap-2 shadow-2xs ${
        isOverBudget
          ? "bg-rose-50 border-rose-300 text-rose-900 animate-pulse"
          : isWarning
          ? "bg-amber-50 border-amber-300 text-amber-900"
          : "bg-emerald-50/90 border-emerald-200/80 text-emerald-900"
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
        {isOverBudget ? (
          <ShieldAlert size={15} className="text-rose-600 shrink-0" />
        ) : isWarning ? (
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
        ) : (
          <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
        )}

        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="font-semibold text-xs truncate">คุมงบ: {categoryLabel}</span>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded shrink-0 ${
              isOverBudget
                ? "bg-rose-200 text-rose-800"
                : isWarning
                ? "bg-amber-200 text-amber-800"
                : "bg-emerald-200 text-emerald-800"
            }`}
          >
            {percentUsedAfterBill}%
          </span>
        </div>
      </div>

      <div className="text-right shrink-0 text-xs font-semibold">
        {remainingAfterBill < 0 ? (
          <span className="text-rose-700 font-bold">เกิน {money(Math.abs(remainingAfterBill))} ฿</span>
        ) : (
          <span className="text-emerald-800">คงเหลือ {money(remainingAfterBill)} ฿</span>
        )}
      </div>
    </div>
  );
}
