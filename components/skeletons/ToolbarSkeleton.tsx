import React from "react";
import { Search, Filter, ArrowDownWideNarrow, Plus, FileSpreadsheet, RotateCw } from "lucide-react";

type ToolbarSkeletonProps = {
  searchPlaceholder?: string;
  chips?: string[];
  primaryButtonLabel?: string;
  className?: string;
};

const DEFAULT_CHIPS = ["ทั้งหมด", "รออนุมัติ", "อนุมัติแล้ว", "เบิกแล้ว"];

export function ToolbarSkeleton({
  searchPlaceholder = "ค้นหา...",
  chips = DEFAULT_CHIPS,
  primaryButtonLabel = "เพิ่มข้อมูล",
  className = "",
}: ToolbarSkeletonProps) {
  return (
    <div className={`flex flex-col gap-2 text-xs ${className}`}>
      {/* Mobile Toolbar */}
      <div className="flex md:hidden flex-col gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              readOnly
              placeholder={searchPlaceholder}
              className="w-full bg-slate-50 text-slate-500 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200"
            />
          </div>
          <button
            type="button"
            disabled
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400"
          >
            <Filter size={14} />
          </button>
          <button
            type="button"
            disabled
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-400"
          >
            <ArrowDownWideNarrow size={14} />
          </button>
        </div>
      </div>

      {/* Desktop Toolbar */}
      <div className="hidden md:flex border border-slate-200 rounded-md p-2.5 bg-white flex-col gap-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
          {/* Search Input */}
          <div className="relative flex items-center flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              readOnly
              placeholder={searchPlaceholder}
              className="w-full bg-white text-slate-500 text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-300 placeholder:text-slate-400 focus:outline-none cursor-default"
            />
          </div>

          {/* Action buttons matching real buttons */}
          <div className="flex items-center gap-2 shrink-0 justify-end">
            <button
              type="button"
              disabled
              className="px-2.5 py-1.5 border border-emerald-200 bg-emerald-50/70 text-emerald-700/60 rounded-md text-xs flex items-center gap-1.5 cursor-default opacity-80"
            >
              <FileSpreadsheet size={14} />
              <span>ส่งออก Excel</span>
            </button>

            <button
              type="button"
              disabled
              className="px-2.5 py-1.5 border border-slate-200 bg-white text-slate-400 rounded-md text-xs flex items-center gap-1.5 cursor-default"
            >
              <ArrowDownWideNarrow size={14} />
              <span>ล่าสุดก่อน</span>
            </button>

            <button
              type="button"
              disabled
              className="px-3 py-1.5 bg-emerald-800/80 text-white rounded-md text-xs flex items-center gap-1.5 cursor-default shadow-xs"
            >
              <Plus size={14} />
              <span>{primaryButtonLabel}</span>
            </button>
          </div>
        </div>

        {/* Filter Chips matching real filter buttons */}
        {chips && chips.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-xs font-medium">
            {chips.map((chip, idx) => (
              <span
                key={idx}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap text-xs ${
                  idx === 0
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500 border border-slate-200/50"
                }`}
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
