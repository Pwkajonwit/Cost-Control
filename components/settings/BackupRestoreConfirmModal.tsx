"use client";

import { useState } from "react";
import { AlertTriangle, RotateCcw, X, Loader2, Database } from "lucide-react";
import type { BackupSnapshotSummary } from "@/lib/backup-service";

interface BackupRestoreConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: BackupSnapshotSummary | null;
  onConfirmRestore: (snapshot: BackupSnapshotSummary) => Promise<void>;
}

export function BackupRestoreConfirmModal({
  isOpen,
  onClose,
  snapshot,
  onConfirmRestore
}: BackupRestoreConfirmModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [restoring, setRestoring] = useState(false);

  if (!isOpen || !snapshot) return null;

  const dateFormatted = new Date(snapshot.createdAt).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok"
  });

  const isConfirmed = confirmText.trim().toUpperCase() === "RESTORE";

  async function handleExecuteRestore() {
    if (!snapshot || !isConfirmed) return;
    setRestoring(true);
    try {
      await onConfirmRestore(snapshot);
      onClose();
    } finally {
      setRestoring(false);
      setConfirmText("");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">ยืนยันการกู้คืนข้อมูลระบบ</h2>
              <p className="text-xs text-amber-800">ระบบจะเขียนทับ/อัปเดตข้อมูลด้วยจุดสำรองนี้</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                {snapshot.totalTables} ตาราง ({snapshot.totalRows.toLocaleString()} รายการ)
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-500">ขนาดไฟล์:</span>
              <span className="text-slate-700">{(snapshot.sizeBytes / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          <div className="text-xs text-slate-700 leading-relaxed bg-rose-50 border border-rose-200 p-3 rounded-xl">
            <div className="font-semibold text-rose-800 mb-1">⚠️ คำเตือนเรื่องความปลอดภัย</div>
            การกู้คืนข้อมูลจะนำข้อมูลจากจุดสำรองนี้ไปบันทึกทับข้อมูลปัจจุบัน เพื่อป้องกันความผิดพลาด กรุณาพิมพ์คำว่า <span className="font-bold text-rose-900 uppercase bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">RESTORE</span> ด้านล่างเพื่อยืนยัน:
          </div>

          <input
            type="text"
            placeholder="พิมพ์ RESTORE เพื่อยืนยัน"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-center text-sm font-semibold text-slate-900 tracking-widest placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!isConfirmed || restoring}
            onClick={handleExecuteRestore}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            เริ่มการกู้คืนข้อมูลทันที
          </button>
        </div>
      </div>
    </div>
  );
}
