"use client";

import { useState } from "react";
import { X, Calendar, Clock, Bell, Shield, CheckCircle2, Loader2, Info } from "lucide-react";
import type { BackupConfig } from "@/lib/backup-service";
import { showToast } from "@/components/ToastProvider";

interface BackupScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BackupConfig;
  onSave: (updatedConfig: BackupConfig) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "วันอาทิตย์ (Sunday) - แนะนำ" },
  { value: 1, label: "วันจันทร์ (Monday)" },
  { value: 2, label: "วันอังคาร (Tuesday)" },
  { value: 3, label: "วันพุธ (Wednesday)" },
  { value: 4, label: "วันพฤหัสบดี (Thursday)" },
  { value: 5, label: "วันศุกร์ (Friday)" },
  { value: 6, label: "วันเสาร์ (Saturday)" }
];

export function BackupScheduleModal({ isOpen, onClose, config, onSave }: BackupScheduleModalProps) {
  const [enabled, setEnabled] = useState(config.enabled ?? true);
  const [frequency, setFrequency] = useState<"weekly" | "daily" | "monthly">(config.frequency || "weekly");
  const [dayOfWeek, setDayOfWeek] = useState<number>(config.dayOfWeek ?? 0);
  const [time, setTime] = useState<string>(config.time || "02:00");
  const [retentionSnapshots, setRetentionSnapshots] = useState<number>(config.retentionSnapshots || 12);
  const [notifyLine, setNotifyLine] = useState<boolean>(config.notifyLine ?? true);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  async function handleSave() {
    setSaving(true);
    try {
      const updated: Partial<BackupConfig> = {
        enabled,
        frequency,
        dayOfWeek,
        time,
        retentionSnapshots,
        notifyLine
      };

      const res = await fetch("/api/backup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกการตั้งค่าไม่สำเร็จ");

      showToast("success", "บันทึกการตั้งค่าตารางเวลาสำรองข้อมูลสำเร็จ");
      onSave(json.config);
      onClose();
    } catch (err: any) {
      showToast("error", err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md sm:backdrop-blur-lg animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">ตั้งเวลาสำรองข้อมูลอัตโนมัติ</h2>
              <p className="text-xs text-slate-500">กำหนดรอบเวลาสำรองข้อมูลทั้ง 12 ตารางลงระบบ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Main Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                เปิดใช้งานระบบสำรองอัตโนมัติ
              </div>
              <p className="text-xs text-slate-500">ระบบจะทำการสำรองข้อมูลอัตโนมัติตามรอบที่กำหนด</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {enabled && (
            <>
              {/* Frequency Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  ความถี่ในการสำรองข้อมูล
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "weekly", label: "ทุกสัปดาห์", sub: "Weekly (แนะนำ)" },
                    { id: "daily", label: "ทุกวัน", sub: "Daily" },
                    { id: "monthly", label: "ทุกเดือน", sub: "Monthly" }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFrequency(f.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        frequency === f.id
                          ? "bg-emerald-50 border-emerald-500 text-slate-900 shadow-2xs ring-1 ring-emerald-500/50"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-900">{f.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{f.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of Week (for Weekly) */}
              {frequency === "weekly" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    เลือกวันในสัปดาห์
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value} className="bg-white text-slate-900">
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time of Day */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  เวลาที่ต้องการให้เริ่มสำรอง
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                <p className="text-[11px] text-slate-500">
                  💡 แนะนำตั้งช่วงเวลา 01:00 - 04:00 น. ซึ่งเป็นช่วงเวลาที่ไม่มีผู้ใช้งานระบบ
                </p>
              </div>

              {/* Retention Count */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  จำนวนประวัติที่ต้องการเก็บย้อนหลัง
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={3}
                    max={52}
                    value={retentionSnapshots}
                    onChange={(e) => setRetentionSnapshots(Number(e.target.value))}
                    className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 text-center focus:outline-none focus:border-emerald-600"
                  />
                  <span className="text-xs text-slate-500">
                    จุดสำรอง (Snapshots) — เช่น 12 สัปดาห์ (~3 เดือน)
                  </span>
                </div>
              </div>

              {/* LINE Notification Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-slate-900 flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-blue-600" />
                    ส่งแจ้งเตือนสรุปผลเข้า LINE
                  </div>
                  <p className="text-[11px] text-slate-500">
                    แจ้งเตือนผลและจำนวนแถวที่สำรองสำเร็จไปยังกลุ่มไลน์แอดมิน
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyLine}
                  onChange={(e) => setNotifyLine(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              {/* Info Note */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex gap-2.5 text-blue-800 text-xs leading-relaxed">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-900 mb-0.5">ระบบ Cron Endpoint</div>
                  สามารถผูก URL <code>/api/cron/backup</code> กับ Vercel Cron หรือ External Cron เพื่อให้ระบบทำงานอัตโนมัติตามกำหนดได้อย่างแม่นยำ
                </div>
              </div>
            </>
          )}
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
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
}
