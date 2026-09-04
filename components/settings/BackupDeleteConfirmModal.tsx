"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import type { BackupSnapshotSummary } from "@/lib/backup-service";

interface BackupDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: BackupSnapshotSummary | null;
  onConfirmDelete: (snapshot: BackupSnapshotSummary) => Promise<void>;
}

export function BackupDeleteConfirmModal({
  isOpen,
  onClose,
  snapshot,
  onConfirmDelete
}: BackupDeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !snapshot) return null;

  const dateFormatted = new Date(snapshot.createdAt).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok"
  });

  async function handleExecuteDelete() {
    if (!snapshot) return;
    setDeleting(true);
    try {
      await onConfirmDelete(snapshot);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-rose-100 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 border border-rose-200">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">ยืนยันการลบจุดสำรองข้อมูล</h2>
              <p className="text-xs text-rose-700">ไฟล์สำรองและประวัติจะถูกลบออกจากระบบอย่างถาวร</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500">รหัสจุดสำรอง:</span>
              <span className="font-mono text-slate-900 font-semibold">{snapshot.id}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500">วันที่สำรอง:</span>
              <span className="text-slate-900 font-medium">{dateFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500">จำนวนตาราง & แถว:</span>
              <span className="text-emerald-700 font-semibold">
                {snapshot.totalTables || 12} ตาราง ({snapshot.totalRows.toLocaleString()} รายการ)
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500">ขนาดไฟล์:</span>
              <span className="text-slate-700 font-mono">{(snapshot.sizeBytes / 1024).toFixed(1)} KB</span>
            </div>
            {snapshot.filename && (
              <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-200/60 text-slate-600">
                <span className="text-slate-500">ชื่อไฟล์ในระบบจัดเก็บ:</span>
                <span className="font-mono text-[11px] text-slate-800 break-all">{snapshot.filename}</span>
              </div>
            )}
          </div>

          <div className="text-xs text-rose-800 leading-relaxed bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <div className="font-semibold mb-0.5">คำเตือนการลบข้อมูลถาวร</div>
              เมื่อลบแล้วจะไม่สามารถกู้คืนจุดสำรองนี้หรือดาวน์โหลดไฟล์นี้ได้อีก กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleExecuteDelete}
            disabled={deleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {deleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังลบข้อมูล...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบจุดสำรองข้อมูล</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
