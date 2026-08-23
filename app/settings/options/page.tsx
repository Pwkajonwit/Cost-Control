"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Plus,
  RefreshCw,
  Save,
  Sliders,
  Trash2,
  Wrench,
  DollarSign,
  Package,
  FileText,
  Hash,
  AlertTriangle,
  RotateCcw
} from "lucide-react";

type SystemOptionsMap = Record<string, string[]>;

type SequenceInfo = {
  totalBills: number;
  maxBillId: number;
  configuredStartSequence: number;
  nextSequence: number;
};

const DEFAULT_CATEGORIES: Array<{ key: string; label: string; icon: any; defaultValues: string[] }> = [
  {
    key: "ชื่อเครื่องมือ",
    label: "รายชื่อเครื่องมือ (สำหรับเลือกประเภท 7.เครื่องมือ)",
    icon: Wrench,
    defaultValues: ["สว่านเจาะเหล็กไฟฟ้า", "สว่านเจาะปูน Rotary", "ลูกหมูขนาด 4\"", "ลูกหมูขนาด 7\"", "ไฟเบอร์ตัดเหล็ก"]
  },
  {
    key: "สินค้า",
    label: "ประเภทสินค้า (สำหรับเลือกประเภท 1.ค่าของ)",
    icon: Package,
    defaultValues: [
      "1 เหล็กเส้น", "2 เหล็กรูปพรรณ", "3 คอนกรีต", "4 ไม้แบบ", "5 วัสดุมุง", "6 ฝ้าผนัง",
      "7 ปูพื้น", "8 กระจก", "9 ไฟฟ้า", "10 ประปา", "11 อื่นๆ(วัสดุ)", "12 สีเคมี",
      "13 สุขภัณฑ์", "14 บิวอิน", "15 แอร์", "16 ดิน", "17 หินทราย", "18 เตรียมงาน",
      "101 น้ำมัน", "102 ค่าขนส่ง", "103 เครื่องจักร", "200 ดำเนินการ(อื่นๆ)", "non"
    ]
  },
  {
    key: "vat",
    label: "อัตราเปอร์เซ็นต์ VAT",
    icon: DollarSign,
    defaultValues: ["1", "3", "5", "7", "ระบุเอง"]
  },
  {
    key: "หัก",
    label: "อัตราเปอร์เซ็นต์ หัก ณ ที่จ่าย",
    icon: DollarSign,
    defaultValues: ["1", "3", "5", "ระบุเอง"]
  },
  {
    key: "เครดิต",
    label: "ระยะเวลาเครดิต (วัน)",
    icon: FileText,
    defaultValues: ["30", "45", "60", "ระบุเอง"]
  },
  {
    key: "ประเภทบิล",
    label: "ตัวเลือกประเภทบิล",
    icon: FileText,
    defaultValues: ["หลัก", "ย่อย"]
  },
  {
    key: "statusค่าแรง",
    label: "ตัวเลือกประเภทค่าแรง",
    icon: FileText,
    defaultValues: ["บุคคลธรรมดา", "บริษัท"]
  },
  {
    key: "รายละเอียดงาน",
    label: "รายละเอียดงาน (สำหรับเปิดจ้างงานรับเหมา)",
    icon: FileText,
    defaultValues: [
      "งานฐานราก/เสาเข็ม",
      "งานโครงสร้าง/ผูกเหล็ก/เข้าแบบ",
      "งานเทคอนกรีต",
      "งานมุงหลังคา/กันสาด",
      "งานก่ออิฐ/ฉาบปูน",
      "งานปูกระเบื้อง/พื้น",
      "งานระบบไฟฟ้า",
      "งานระบบประปา/สุขาภิบาล",
      "งานสีและเคมี",
      "งานประตู/หน้าต่าง/กระจก",
      "งานบิวท์อิน/ตกแต่ง"
    ]
  },
  {
    key: "รายการ",
    label: "รายการค่าใช้จ่าย (สำหรับเลือกประเภท 8.อื่นๆ)",
    icon: FileText,
    defaultValues: ["ค่าที่พัก", "ห้องรายเดือน", "เงินพิเศษ", "ค่าน้ำ/ค่าไฟ", "ค่าส่งเอกสาร", "ค่าธรรมเนียม", "ค่าประกันภัย"]
  },
  {
    key: "รับผิดชอบ",
    label: "ผู้รับผิดชอบโครงการ (สำหรับ 1.Project รวม)",
    icon: Sliders,
    defaultValues: ["PW1", "PW2", "PW3", "PW4", "PW"]
  },
  {
    key: "รถของ",
    label: "ความเป็นเจ้าของรถ (สำหรับ 7.ทะเบียนรถ)",
    icon: Sliders,
    defaultValues: ["รถบริษัท", "รถส่วนตัว", "รถเช่า"]
  },
  {
    key: "ยี่ห้อรถ",
    label: "ยี่ห้อรถยนต์ (สำหรับ 7.ทะเบียนรถ)",
    icon: Sliders,
    defaultValues: ["Toyota", "Isuzu", "Ford", "Mitsubishi", "Nissan", "Honda", "MG", "Mazda"]
  }
];

export default function SystemOptionsSettingsPage() {
  const [options, setOptions] = useState<SystemOptionsMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

  // Sequence management state
  const [seqInfo, setSeqInfo] = useState<SequenceInfo | null>(null);
  const [startSeqInput, setStartSeqInput] = useState<string>("");
  const [isUpdatingSeq, setIsUpdatingSeq] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [isResettingBills, setIsResettingBills] = useState<boolean>(false);

  async function loadSequenceInfo() {
    try {
      const res = await fetch("/api/bills/sequence");
      const json = await res.json();
      if (json.success) {
        setSeqInfo(json);
        setStartSeqInput(String(json.configuredStartSequence || 1));
      }
    } catch (err) {
      console.warn("Failed fetching bill sequence info:", err);
    }
  }

  useEffect(() => {
    async function loadOptions() {
      setLoading(true);
      try {
        const [res, _] = await Promise.all([
          fetch("/api/system-options"),
          loadSequenceInfo()
        ]);
        const json = await res.json();
        if (json.success && json.options) {
          const loaded = { ...json.options };
          // Fill missing keys with defaults if not present
          DEFAULT_CATEGORIES.forEach(cat => {
            if (!loaded[cat.key] || !Array.isArray(loaded[cat.key]) || loaded[cat.key].length === 0) {
              loaded[cat.key] = cat.defaultValues;
            }
          });
          setOptions(loaded);
        } else {
          // Initialize defaults
          const initial: SystemOptionsMap = {};
          DEFAULT_CATEGORIES.forEach(cat => {
            initial[cat.key] = cat.defaultValues;
          });
          setOptions(initial);
        }
      } catch (err) {
        console.error("Failed to load system options:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, []);

  function handleAddItem(key: string) {
    const val = (newItemInputs[key] || "").trim();
    if (!val) return;
    const currentList = options[key] || [];
    if (currentList.includes(val)) {
      setErrorMsg(`"${val}" มีอยู่ในรายการแล้ว`);
      return;
    }
    setOptions(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), val]
    }));
    setNewItemInputs(prev => ({ ...prev, [key]: "" }));
    setErrorMsg("");
  }

  function handleRemoveItem(key: string, indexToRemove: number) {
    setOptions(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, idx) => idx !== indexToRemove)
    }));
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/system-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "บันทึกไม่สำเร็จ");

      setSuccessMsg("บันทึกตัวเลือกระบบเรียบร้อยแล้ว");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStartSequence() {
    const val = parseInt(startSeqInput.trim(), 10);
    if (isNaN(val) || val < 1) {
      setErrorMsg("กรุณาระบุเลขเริ่มต้นที่เป็นตัวเลขตั้งแต่ 1 ขึ้นไป");
      return;
    }

    setIsUpdatingSeq(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/bills/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_start_sequence", startSequence: val })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "ตั้งค่าเลขเริ่มต้นไม่สำเร็จ");

      setSuccessMsg(`บันทึกเลขเริ่มต้นบิลเป็น ${val} เรียบร้อยแล้ว`);
      await loadSequenceInfo();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการตั้งค่าเลขเริ่มต้น");
    } finally {
      setIsUpdatingSeq(false);
    }
  }

  async function handleResetBills() {
    setIsResettingBills(true);
    setErrorMsg("");
    try {
      const val = parseInt(startSeqInput.trim(), 10) || 1;
      const res = await fetch("/api/bills/sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_bills_and_sequence", startSequence: val })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "รีเซ็ตบิลไม่สำเร็จ");

      setShowResetModal(false);
      setSuccessMsg(`ล้างข้อมูลบิลทั้งหมดและรีเซ็ตเลขเริ่มต้นเป็น ${val} สำเร็จ!`);
      await loadSequenceInfo();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "เกิดข้อผิดพลาดในการรีเซ็ตข้อมูลบิล");
    } finally {
      setIsResettingBills(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-sans text-xs flex items-center justify-center gap-2">
        <RefreshCw size={16} className="animate-spin text-emerald-600" />
        กำลังโหลดข้อมูลตัวเลือกระบบ...
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 max-w-5xl mx-auto space-y-3.5 font-sans text-xs text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 bg-white p-3 rounded-md border shadow-2xs">
        <div>
          <h1 className="text-sm font-medium text-slate-900 tracking-tight">ตั้งค่าตัวเลือก & เงื่อนไขระบบ (System Options)</h1>
          <p className="text-slate-500 text-xs mt-0.5">จัดการรายชื่อตัวเลือก Dropdown/Enum สำหรับแบบฟอร์มบันทึกบิลและรายการในระบบ</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded transition disabled:opacity-50 cursor-pointer shrink-0 text-xs"
        >
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
          <span>{saving ? "กำลังบันทึก..." : "บันทึกตัวเลือกระบบ"}</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <span className="shrink-0">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* BILL SEQUENCE & NUMBERING SECTION */}
      <div className="bg-white border border-slate-200 rounded-md p-3.5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
              <Hash size={15} />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-900 m-0">จัดการเลขลำดับบิล (Bill Sequence & Reset)</h2>
              <p className="text-[11px] text-slate-500 m-0">กำหนดเลขเริ่มต้นของบิลถัดไป หรือรีเซ็ตล้างข้อมูลบิลทดสอบเพื่อเริ่มนับเลขใหม่</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadSequenceInfo}
            className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-50 cursor-pointer"
            title="รีเฟรชข้อมูลเลขบิล"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
            <div className="text-[11px] text-slate-500">เลขบิลสูงสุดในระบบปัจจุบัน</div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">
              {seqInfo ? (seqInfo.maxBillId > 0 ? `#${seqInfo.maxBillId}` : "ไม่มีรายการบิล (0)") : "-"}
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
            <div className="text-[11px] text-slate-500">จำนวนบิลทั้งหมดในระบบ</div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">
              {seqInfo ? `${seqInfo.totalBills} รายการ` : "-"}
            </div>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-md p-2.5">
            <div className="text-[11px] text-emerald-700 font-medium">เลขบิลที่จะถูกสร้างถัดไป</div>
            <div className="text-sm font-bold text-emerald-800 mt-0.5">
              {seqInfo ? `#${seqInfo.nextSequence}` : "-"}
            </div>
          </div>
        </div>

        {/* Setting Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-slate-700 whitespace-nowrap font-medium">
              เลขเริ่มต้นบิลถัดไป:
            </label>
            <input
              type="number"
              min="1"
              value={startSeqInput}
              onChange={(e) => setStartSeqInput(e.target.value)}
              placeholder="เช่น 1, 1001, 3000"
              className="w-32 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 text-xs font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            <button
              type="button"
              onClick={handleSaveStartSequence}
              disabled={isUpdatingSeq}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded flex items-center gap-1 transition cursor-pointer text-xs disabled:opacity-50"
            >
              {isUpdatingSeq ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
              <span>บันทึกเลขเริ่มต้น</span>
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="w-full sm:w-auto px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded flex items-center justify-center gap-1.5 transition cursor-pointer text-xs font-medium"
            >
              <RotateCcw size={12} />
              <span>ล้างบิลทดสอบทั้งหมด & เริ่มที่เลข {startSeqInput || 1}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting Bills */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-3.5">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-lg">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                ยืนยันการล้างข้อมูลบิลทั้งหมด?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              การดำเนินการนี้จะ <b>ลบรายการบิลทั้งหมด ({seqInfo?.totalBills || 0} รายการ)</b> ออกจากระบบอย่างถาวร และตั้งค่าให้การสร้างบิลใหม่เริ่มต้นนับที่เลข <b>#{startSeqInput || 1}</b>
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResettingBills}
                className="flex-1 py-2 border border-slate-300 text-slate-700 text-xs rounded hover:bg-slate-50 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleResetBills}
                disabled={isResettingBills}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 font-medium"
              >
                {isResettingBills ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>กำลังล้างข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>ยืนยันล้างข้อมูล</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Option Categories List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DEFAULT_CATEGORIES.map((cat) => {
          const IconComp = cat.icon || Sliders;
          const currentList = options[cat.key] || cat.defaultValues;
          return (
            <div key={cat.key} className="bg-white border border-slate-200 rounded-md p-3 space-y-2 shadow-2xs">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <IconComp size={13} className="text-emerald-700 shrink-0" />
                <h2 className="text-xs font-medium text-slate-900 m-0">{cat.label}</h2>
              </div>

              {/* Items Chip Grid */}
              <div className="flex flex-wrap gap-1 min-h-[36px] items-center p-2 bg-slate-50 rounded border border-slate-200">
                {currentList.length === 0 ? (
                  <span className="text-slate-400 italic text-xs">ไม่มีรายการตัวเลือก</span>
                ) : (
                  currentList.map((item, idx) => (
                    <span
                      key={`${item}-${idx}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-300 text-slate-800 rounded text-xs font-normal"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(cat.key, idx)}
                        className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-0.5"
                        title="ลบรายการนี้"
                      >
                        <Trash2 size={11} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add New Input */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <input
                  type="text"
                  placeholder="พิมพ์ตัวเลือกใหม่..."
                  value={newItemInputs[cat.key] || ""}
                  onChange={(e) => setNewItemInputs((prev) => ({ ...prev, [cat.key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddItem(cat.key);
                    }
                  }}
                  className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-slate-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddItem(cat.key)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded flex items-center gap-1 transition cursor-pointer text-xs"
                >
                  <Plus size={13} />
                  <span>เพิ่ม</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
