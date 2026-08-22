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
  FileText
} from "lucide-react";

type SystemOptionsMap = Record<string, string[]>;

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

  useEffect(() => {
    async function loadOptions() {
      setLoading(true);
      try {
        const res = await fetch("/api/system-options");
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

