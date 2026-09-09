import React from "react";
import { StatCardsSkeleton, type StatCardItem } from "./StatCardsSkeleton";
import { ToolbarSkeleton } from "./ToolbarSkeleton";
import { TableSkeleton } from "./TableSkeleton";

type DashboardSkeletonProps = {
  statCards?: StatCardItem[];
  statCardsCount?: number;
  columns?: string[];
  searchPlaceholder?: string;
  chips?: string[];
  primaryButtonLabel?: string;
  headerTitle?: string;
  loadingMessage?: string;
  className?: string;
};

export function DashboardSkeleton({
  statCards,
  statCardsCount,
  columns,
  searchPlaceholder = "ค้นหา...",
  chips,
  primaryButtonLabel = "เพิ่มข้อมูล",
  headerTitle,
  loadingMessage = "กำลังโหลดข้อมูล...",
  className = "",
}: DashboardSkeletonProps) {
  return (
    <div className={`w-full flex flex-col gap-3 p-3 sm:p-5 max-w-[1600px] mx-auto font-sans text-sm text-slate-800 ${className}`}>
      {/* Optional Page Title */}
      {headerTitle && (
        <div className="flex items-center justify-between py-1">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{headerTitle}</h1>
        </div>
      )}

      {/* 1. Real Stat Cards with Titles */}
      <StatCardsSkeleton cards={statCards} count={statCardsCount} />

      {/* 2. Real Search & Toolbar */}
      <ToolbarSkeleton
        searchPlaceholder={searchPlaceholder}
        chips={chips}
        primaryButtonLabel={primaryButtonLabel}
      />

      {/* 3. Real Table Header with Centered Spinner */}
      <TableSkeleton columns={columns} loadingMessage={loadingMessage} />
    </div>
  );
}
