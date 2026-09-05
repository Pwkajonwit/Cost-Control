import React from "react";
import { Loader2 } from "lucide-react";

export type StatCardItem = {
  title: string;
  hint?: string;
};

type StatCardsSkeletonProps = {
  cards?: StatCardItem[];
  count?: number;
  className?: string;
};

const DEFAULT_CARDS: StatCardItem[] = [
  { title: "รายการบิลทั้งหมด" },
  { title: "รวมยอดเงินบิล" },
  { title: "ยอดอนุมัติ/เบิกแล้ว" },
  { title: "ยอดรออนุมัติ" },
];

export function StatCardsSkeleton({ cards, count, className = "" }: StatCardsSkeletonProps) {
  const cardList = cards || (count ? Array.from({ length: count }).map((_, i) => ({ title: `รายการ ${i + 1}` })) : DEFAULT_CARDS);
  const total = cardList.length;

  return (
    <div
      className={`hidden md:grid gap-3 ${
        total === 2
          ? "md:grid-cols-2"
          : total === 3
          ? "md:grid-cols-3"
          : total === 5
          ? "md:grid-cols-5"
          : total === 6
          ? "md:grid-cols-6"
          : "md:grid-cols-4"
      } ${className}`}
    >
      {cardList.map((card, idx) => (
        <div
          key={idx}
          className="bg-white rounded-md p-2.5 sm:p-3 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[68px]"
        >
          <span className="text-xs text-slate-500 block truncate">{card.title}</span>
          <div className="text-base sm:text-lg text-slate-800 mt-0.5 font-medium flex items-center gap-1.5">
            <span className="text-slate-300">-</span>
            <Loader2 size={13} className="animate-spin text-slate-300 ml-1 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
