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
      className={`rounded-lg p-3 border transition-all text-xs font-sans space-y-2 my-2 ${
        isOverBudget
          ? "bg-rose-950/90 border-rose-600/80 text-rose-100 shadow-md animate-pulse"
          : isWarning
          ? "bg-amber-950/80 border-amber-500/70 text-amber-100"
          : "bg-slate-900 border-slate-800 text-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOverBudget ? (
            <ShieldAlert size={18} className="text-rose-400 shrink-0" />
          ) : isWarning ? (
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          ) : (
            <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
          )}

          <div>
            <div className="flex items-center gap-1.5">
              <span>คุมงบหมวดงาน: {categoryLabel}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  isOverBudget
                    ? "bg-rose-900 border-rose-500 text-rose-200"
                    : isWarning
                    ? "bg-amber-900 border-amber-500 text-amber-200"
                    : "bg-emerald-950 border-emerald-700 text-emerald-300"
                }`}
              >
                {percentUsedAfterBill}%
              </span>
            </div>
            <p className="text-xs opacity-90 mt-0.5">{budgetStatus.message}</p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs opacity-75 block">วงเงินหมวดงาน:</span>
          <span className="text-xs">{money(budgetLimit)} ฿</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950/60 rounded-full h-2 overflow-hidden p-0.5 border border-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isOverBudget ? "bg-rose-500" : isWarning ? "bg-amber-400" : "bg-emerald-400"
          }`}
          style={{ width: `${Math.min(100, percentUsedAfterBill)}%` }}
        />
      </div>

      {/* Additional Stats Line */}
      <div className="flex items-center justify-between text-xs opacity-80 pt-0.5 border-t border-white/10">
        <span>ยอดบิลนี้: {money(currentBillAmount)} ฿</span>
        <span>
          {remainingAfterBill < 0
            ? `เกินงบ ${money(Math.abs(remainingAfterBill))} ฿`
            : `คงเหลือเบิกได้ ${money(remainingAfterBill)} ฿`}
        </span>
      </div>
    </div>
  );
}
