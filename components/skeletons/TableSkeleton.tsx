import React from "react";
import { Loader2 } from "lucide-react";

type TableSkeletonProps = {
  columns?: string[];
  showPagination?: boolean;
  minHeight?: string;
  loadingMessage?: string;
  className?: string;
};

const DEFAULT_COLUMNS = [
  "ลำดับ",
  "ID Project",
  "ชื่อ Project",
  "ร้าน/บุคคล",
  "สินค้า/ทำงาน",
  "ประเภท",
  "ยอดเงิน",
  "ผู้เบิก",
  "สถานะ",
  "จัดการ",
];

export function TableSkeleton({
  columns = DEFAULT_COLUMNS,
  showPagination = true,
  minHeight = "min-h-[320px]",
  loadingMessage = "กำลังโหลดข้อมูล...",
  className = "",
}: TableSkeletonProps) {
  return (
    <div className={`w-full bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden ${className}`}>
      {/* Desktop View: Real Table Header with Centered Loading State */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-semibold text-slate-600 tracking-wider">
              {columns.map((col, idx) => (
                <th key={idx} className="px-3.5 py-3 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className={`py-24 text-center ${minHeight}`}>
                <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 size={30} className="animate-spin text-slate-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-slate-500 tracking-wide font-medium">
                    {loadingMessage}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile View: Clean Card Shell with Centered Loading State */}
      <div className="md:hidden p-10 flex flex-col items-center justify-center gap-3 text-slate-500 min-h-[220px]">
        <Loader2 size={26} className="animate-spin text-slate-400 shrink-0" />
        <span className="text-xs text-slate-500 font-medium">
          {loadingMessage}
        </span>
      </div>

      {/* Footer bar */}
      {showPagination && (
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 bg-slate-50/50">
          <span className="text-[11px] text-slate-400">กำลังเตรียมข้อมูล...</span>
          <div className="flex items-center gap-2">
            <div className="h-6 w-14 bg-slate-100 rounded-md" />
            <div className="h-6 w-14 bg-slate-100 rounded-md" />
          </div>
        </div>
      )}
    </div>
  );
}
