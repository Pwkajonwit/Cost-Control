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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">ยืนยันการกู้คืนข้อมูลระบบ</h2>
              <p className="text-xs text-amber-300/80">ระบบจะเขียนทับ/อัปเดตข้อมูลด้วยจุดสำรองนี้</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">รหัสจุดสำรอง:</span>
              <span className="font-mono text-white font-semibold">{snapshot.id}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">วันที่สำรอง:</span>
              <span className="text-white">{dateFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">จำนวนตาราง & แถว:</span>
              <span className="text-emerald-400 font-semibold">
                {snapshot.totalTables} ตาราง ({snapshot.totalRows.toLocaleString()} รายการ)
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">ขนาดไฟล์:</span>
              <span className="text-slate-300">{(snapshot.sizeBytes / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          <div className="text-xs text-slate-300 leading-relaxed bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
            <div className="font-semibold text-rose-300 mb-1">⚠️ คำเตือนเรื่องความปลอดภัย</div>
            การกู้คืนข้อมูลจะนำข้อมูลจากจุดสำรองนี้ไปบันทึกทับข้อมูลปัจจุบัน เพื่อป้องกันความผิดพลาด กรุณาพิมพ์คำว่า <span className="font-bold text-white uppercase bg-slate-800 px-1.5 py-0.5 rounded">RESTORE</span> ด้านล่างเพื่อยืนยัน:
          </div>

          <input
            type="text"
            placeholder="พิมพ์ RESTORE เพื่อยืนยัน"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl text-center text-sm font-semibold text-white tracking-widest placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-2.5 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={!isConfirmed || restoring}
            onClick={handleExecuteRestore}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-lg shadow-amber-900/30"
          >
            {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            เริ่มการกู้คืนข้อมูลทันที
          </button>
        </div>
      </div>
    </div>
  );
}
