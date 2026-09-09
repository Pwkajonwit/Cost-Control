# CostLab - Executive UI/UX Design System Guide

เอกสารฉบับนี้คือ **มาตรฐานการออกแบบ (Design System Specification)** ฉบับสมบูรณ์สำหรับโปรเจกต์ **CostLab** ซึ่งถูกถอดรหัสและรวบรวมจากรูปแบบการทำงานจริง โครงสร้างหน้าตา สไตล์สี และสถาปัตยกรรม UI/UX ทั้งหมดของระบบในปัจจุบัน เพื่อให้นักพัฒนาและ AI ยึดถือเป็นมาตรฐานเดียวกันในการพัฒนาหน้าใหม่และการปรับปรุงหน้าระบบเดิม

---

## 🎨 1. Core Design Philosophy & System Identity (อัตลักษณ์หลักของระบบ)

1. **Ultra-Compact & High-Density (เน้นความกระชับและความหนาแน่นข้อมูลสูงสุด):**
   - ออกแบบเพื่อรองรับงานระดับผู้บริหารและการจัดการต้นทุนจริง (Executive & Financial Dashboard)
   - จัดวางข้อมูลให้เห็นภาพรวมได้ครบถ้วนโดยไม่ต้องเลื่อนหน้าจอนาน ลด padding/margin ที่ไม่จำเป็น (`p-2.5`, `p-3`, `gap-2`, `space-y-2`)
   - ขนาดฟอนต์มาตรฐานในตารางและแบบฟอร์มใช้ `text-xs` (12px), `text-[11px]`, และ `text-[10px]`

2. **Deep Forest Teal & Electric Lime Accent (ธีมสีประจำแบรนด์ CostLab):**
   - สีหลัก (Brand Primary): **Deep Forest Teal** (`#0b3531` และ `#062e2b`) ให้ความรู้สึกหนักแน่น มั่นคง น่าเชื่อถือแบบสถาบันการเงิน
   - สีเน้น (Brand Accent): **Electric Lime** (`#d4f54e`) ใช้เป็นสีไฮไลต์สำหรับเมนูที่กำลังเลือก (Active Menu), ปุ่ม CTA สำคัญ, และป้ายตัวเลขเด่น

3. **Clean & Lightweight Typography (มาตรฐานตัวอักษรแบบมินิมอลสบายตา):**
   - ฟอนต์ระบบรองรับภาษาไทยคมชัด: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Thai", "Sarabun", "Thonburi", sans-serif`
   - ระบบมีการควบคุม Font Weight ในระดับโกลบอลให้อ่านสบายตา ไม่หนาเทอะทะจนเกินไป

4. **Professional Non-Emoji Standard (ห้ามใช้อิโมจิในองค์ประกอบ UI ทางการ):**
   - **ห้ามใช้อิโมจิ** ในหัวข้อสถานะ ตาราง สิทธิ์ผู้ใช้ หรือป้ายกำกับ (เช่น ห้ามใช้ 🟢, 🔴, 👑, 👔, 📁)
   - **ใช้ Lucide SVG Icons** (เช่น `<Shield />`, `<CheckCircle2 />`, `<FileText />`, `<Wallet />`) หรือ CSS Status Dot (`w-2 h-2 rounded-full`) เพื่อลุคที่หรูหรา สะอาด และเป็นมืออาชีพ

---

## 🌈 2. Design Tokens & Color Palette (ชุดสีและตัวแปรมาตรฐาน)

### 2.1 CSS Variables & Tailwind Theme (`globals.css`)
```css
@theme {
  --color-app-bg: #f4f7f6;        /* พื้นหลังหน้าจอหลัก */
  --color-app-panel: #ffffff;     /* พื้นผิวการ์ดและคอนเทนเนอร์ */
  --color-app-line: #e2e8f0;      /* เส้นขอบมาตรฐาน */
  --color-app-text: #0f172a;      /* ข้อความหลัก Slate 900 */
  --color-app-muted: #64748b;     /* ข้อความรอง Slate 500 */
  --color-app-primary: #0b3531;   /* สีหลัก Forest Teal */
  --color-app-accent: #d4f54e;    /* สีเน้น Electric Lime */
}
```

### 2.2 Brand & Surface Colors (สีโครงสร้างและพื้นผิว)
| บทบาท (Role) | สี Hex / Tailwind Class | การใช้งาน |
| :--- | :--- | :--- |
| **Slim Left Rail** | `#062e2b` / `bg-[#062e2b]` | แถบเครื่องมือซ้ายสุด (60px) |
| **Sidebar Drawer** | `#0b3531` / `bg-[#0b3531]` | ลิ้นชักเมนูย่อยด้านข้าง (240px) |
| **Mobile Topbar** | `#0b3531` (`border-b #062e2b`) | เฮดเดอร์บนจอมือถือ (ความสูง 56px) |
| **Active Highlight** | `#d4f54e` (ข้อความ `#0b3531`) | แท็บเมนูที่เลือก, ปุ่มเพิ่มข้อมูลหลัก |
| **Hover State (Dark)** | `#124d45` / `bg-[#124d45]` | เมนูแถบข้างเมื่อนำเมาส์ไปชี้ |
| **App Background** | `#f4f7f6` / `bg-slate-200` | พื้นหลังใหญ่ของหน้าจอ |
| **Card Surface** | `#ffffff` / `border-slate-200` | การ์ดข้อมูล ตาราง และฟอร์ม |
| **Table Head** | `#0b3531` / `text-white` | แถบหัวคอลัมน์ของตารางข้อมูล |

### 2.3 Semantic & Status Badges (ป้ายสถานะและชิปสี)
| สถานะบิล/งาน | โทนสีและสไตล์คลาส | การใช้งาน |
| :--- | :--- | :--- |
| **อนุมัติแล้ว (Approved)** | `bg-emerald-100 text-emerald-800 border-emerald-200` | บิลที่ตรวจและอนุมัติแล้ว, ยอดรายรับ |
| **รออนุมัติ / ตั้งเบิก (Pending)** | `bg-amber-100 text-amber-800 border-amber-200` | บิลรอตั้งเบิก, เงินรอโอนจ่าย |
| **เบิกแล้ว / เสร็จสิ้น (Completed)** | `bg-slate-100 text-slate-700 border-slate-200` | บิลที่ตัดจ่ายเงินสด/โอนแล้ว |
| **แจ้งเตือน / ขาดทุน (Danger)** | `bg-rose-100 text-rose-800 border-rose-200` | ยอดเกินงบ, กำไรติดลบ, เกินกำหนดจ่าย |
| **โครงการ / ข้อมูลทั่วไป (Info)** | `bg-indigo-100 text-indigo-800 border-indigo-200` | เลขที่ ID Project, แท็กโครงการ, ข้อมูลหลัก |

---

## 🏛️ 3. Layout Architecture (โครงสร้างเลย์เอาต์หลัก)

### 3.1 Desktop Dual-Sidebar Layout (ระบบแถบข้างคู่)
โครงสร้างแถบข้างบนคอมพิวเตอร์แบ่งออกเป็น 2 ชั้นแบบประกบคู่ (รวมความกว้างปกติ 300px, พับเก็บเหลือ 60px):

```
+-----------+-----------------------+-------------------------------------------------+
| Left Rail | Right Secondary Panel | Main Content Area                               |
|  (60px)   |       (240px)         | (flex-1 bg-slate-200 min-h-screen)              |
|  #062e2b  |       #0b3531         |                                                 |
|           |                       | +---------------------------------------------+ |
| [Logo]    | CostLab Executive     | | Page Header / Filter Bar                    | |
| [Mode 1]  | [ 🔍 ค้นหาเมนู...  ]  | +---------------------------------------------+ |
| [Mode 2]  |                       | | KPI Summary Cards (2-4 Columns)             | |
| [Mode 3]  | • รายการเมนูหลัก       | +---------------------------------------------+ |
| [Mode 4]  | • ข้อมูลมาสเตอร์        | | Data Table / High-Density Grid              | |
|           | • ตั้งค่าระบบ          | +---------------------------------------------+ |
| [Collapse]| [UserSwitcher]        | | Sticky Pagination Footer                    | |
+-----------+-----------------------+-------------------------------------------------+
```

- **1. Left Slim Rail (60px):**
  - แสดงกล่องโลโก้บริษัทขนาดกะทัดรัด (36x36px `rounded-md bg-[#072825] border-[#144d47]`)
  - โหมดสลับกลุ่มเมนู (Mode Switcher):
    1. `LayoutGrid` -> เมนูหลัก (WORKPLACE)
    2. `CheckSquare` -> จัดการงาน & ใบสั่งงาน (TASKS & PW)
    3. `Layers` -> ข้อมูลมาสเตอร์ (MASTER DATA)
    4. `Database` -> ตั้งค่าระบบ (SYSTEM & ACCOUNT)
  - ด้านล่างมีปุ่มสลับย่อ/ขยาย (`ChevronLeft` / `ChevronRight`)
- **2. Right Secondary Panel (240px - พับซ่อนได้):**
  - ชื่อบริษัทและสโลแกนระบบ
  - ช่องค้นหาเมนูด่วน (Filter Search) พิมพ์เพื่อกรองเมนูแบบ Real-time
  - ลิสต์ลิงก์เมนูที่มีไอคอน SVG, ชื่อภาษาไทย, และจำนวนเรคอร์ด (Count Badge)
  - แถบล่างสุดแสดงตัวสลับผู้ใช้งานและสิทธิ์ (`UserSwitcher`) ในธีม Dark
- **3. Main Content Wrapper:**
  - กำหนด `md:ml-[300px]` (หรือ `md:ml-[60px]` เมื่อพับ)
  - มีเส้นแบ่งชัดเจน (`border-r border-[#062e2b]` หรือ `2px solid #e2e8f0`)

### 3.2 Mobile Responsive Navigation (โครงสร้างบนสมาร์ตโฟน)
- **Topbar ถาวร (Height: 56px / `h-14`):**
  - พื้นหลัง `#0b3531` เส้นขอบล่าง `#062e2b` ตัวอักษรสีขาว
  - ฝั่งซ้าย: ปุ่มไอคอนแฮมเบอร์เกอร์เปิด Drawer
  - ตรงกลาง: ชื่อหน้าปัจจุบัน หรือช่องค้นหาแบบขยายเต็มจอ
  - ฝั่งขวา: ปุ่ม Action CTA เด่น (เช่น `+ เพิ่ม` สี Lime `#d4f54e` ข้อความ `#0b3531`)
- **Drawer Slide-Over:**
  - พื้นหลังม่านสีทึบพร้อมเบลอ (`bg-slate-950/60 backdrop-blur-xs`)
  - เมนูเลื่อนออกมาจากฝั่งซ้าย พร้อมข้อมูลผู้ใช้งานและปุ่ม Logout

---

## 🧩 4. Core UI Components Standard (มาตรฐานส่วนประกอบ UI)

### 4.1 Executive Metric & KPI Cards (การ์ดสรุปยอดระดับผู้บริหาร)
การ์ดสรุปตัวเลขแบบ Compact 4 คอลัมน์บนเดสก์ท็อป และ 2 คอลัมน์บนมือถือ:

```tsx
<div className="bg-gradient-to-br from-white via-indigo-50/25 to-indigo-100/40 rounded-xl p-2.5 sm:p-3 border border-indigo-200/90 shadow-2xs flex flex-col justify-between hover:shadow-sm transition-all">
  <div className="flex items-center justify-between gap-1.5">
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
        <Wallet className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-bold text-slate-700 truncate">ยอดเบิกจ่ายจริง</span>
    </div>
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-indigo-100/80 text-indigo-800 border-indigo-200 shrink-0">
      จ่ายแล้ว 45 บิล
    </span>
  </div>
  <div className="mt-2">
    <div className="text-xl sm:text-2xl font-black text-indigo-700 tracking-tight truncate">
      ฿1,245,600.00
    </div>
    <div className="text-[11px] font-semibold text-amber-600 truncate mt-0.5">
      (รอเบิก ฿85,200.00)
    </div>
  </div>
</div>
```

- **จุดเด่น:**
  - ใช้ Gradient อ่อนๆ สอดคล้องกับประเภทข้อมูล (Indigo สำหรับรายจ่าย, Emerald สำหรับรายได้, Teal/Amber สำหรับกำไร)
  - ไอคอนบรรจุในกล่องทรงสี่เหลี่ยมโค้งมนขนาดกะทัดรัด `w-7 h-7 rounded-lg`
  - ยอดเงินแสดงขนาดใหญ่ เด่น ชัดเจน (`text-xl sm:text-2xl font-black`)

---

### 4.2 Filter Toolbar & Search Bar (แถบค้นหาและตัวกรองข้อมูล)
แถบเครื่องมือควบคุมการแสดงผลที่ออกแบบให้กระชับและครบครัน:

- **ช่องค้นหา (Search Input):**
  - ขอบมน `rounded-md border border-slate-300`
  - มีไอคอนแว่นขยายนำหน้า และปุ่มกากบาท `X` ด้านหลังสำหรับเคลียร์คำค้นหาทันที
- **ปุ่มกรองวันที่ด่วน (Date Preset Pills):**
  - ปุ่มแบบแคปซูล (`rounded-full px-2.5 py-1 text-xs`) เช่น `ข้อมูลทั้งหมด`, `วันนี้`, `เมื่อวาน`, `เดือนนี้`, `กำหนดเอง`
- **ปุ่มส่งออก Excel / CSV:**
  - สไตล์สีเขียวมรกต: `border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md text-xs`
  - ไอคอน `<FileSpreadsheet size={14} />`
- **ปุ่มสลับการเรียงลำดับ (Sort Toggle):**
  - สลับระหว่าง "ล่าสุดก่อน" (`ArrowDownWideNarrow`) กับ "เก่าสุดก่อน" (`ArrowUpWideNarrow`)

---

### 4.3 Enterprise Data Table (ตารางข้อมูลสำหรับเดสก์ท็อป)
ตารางความหนาแน่นสูง จัดชิดขอบล่าง พร้อมระบบ Sticky Column:

```html
<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="manage-select-col">เลือก</th>
        <th data-label="ลำดับ">ลำดับ</th>
        <th data-label="ID Project">ID Project</th>
        <th data-label="ชื่อ Project">ชื่อ Project</th>
        <th>รูปถ่ายบิล</th>
        <th>ร้าน/บุคคล</th>
        <th class="numeric-cell">ยอดเงิน</th>
        <th data-label="สถานะ">สถานะ</th>
        <th data-label="จัดการ">จัดการ</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <!-- ข้อมูลแถว -->
      </tr>
    </tbody>
  </table>
</div>
```

- **หัวตาราง (Table Head):**
  - ใช้สี Forest Teal เข้ม `#0b3531` ข้อความสีขาว ตัวหนา `uppercase text-[11px]` ความสูงแถว 34px
  - ตรึงอยู่ด้านบนเสมอ (`position: sticky; top: 0; z-index: 10`)
- **เนื้อหาตาราง (Table Body):**
  - ทำลายทางสลับสี (Zebra Striping): แถวคี่สีขาว `#ffffff`, แถวคู่สีเทาอ่อนมาก `#f8fafc`
  - เอฟเฟกต์ชี้เมาส์ (Hover): เปลี่ยนเป็นสี `#f1f5f9` ทันที
  - ตรึงคอลัมน์ "จัดการ" ไว้ทางขวาสุดเสมอ (`position: sticky; right: 0; z-index: 15`) เพื่อไม่ให้หลุดขอบจอ
- **การจัดตำแหน่งตัวเลข:**
  - ตัวเลขเงินและจำนวนจัดชิดขวา (`text-right numeric-cell font-mono`)
  - รหัส วันที่ และสถานะ จัดกึ่งกลาง (`text-center`)

---

### 4.4 Mobile High-Density Card Feed (การแสดงผลบนมือถือ)
บนหน้าจอมือถือ (`md:hidden`) ตารางจะถูกแปลงเป็นการ์ดแบบ High-Density Feed โดยอัตโนมัติ:

- แสดงรูปภาพย่อขนาดกะทัดรัด (46x46px) ฝั่งซ้ายสุด
- ส่วนกลางแสดงเลขลำดับ, รหัสโครงการ, ชื่อร้านค้า, และรายการสินค้า
- ฝั่งขวาแสดงยอดเงินตัวเลขใหญ่และป้ายสถานะ
- แตะที่การ์ดเพื่อเปิด Drawer ดูรายละเอียดฉบับเต็ม

---

### 4.5 Compact Form Modal System (ระบบหน้าต่างป๊อปอัปฟอร์ม)
หน้าต่างบันทึกข้อมูลออกแบบให้เปิดทำงานได้รวดเร็ว กรอกง่าย ไม่เกะกะสายตา:

- **Backdrop:** แผ่นหลังกระจกฝ้าสีเข้ม (`background: rgba(10, 16, 28, 0.55); backdrop-filter: blur(6px)`)
- **ขนาด Modal Card:** `width: min(840px, calc(100vw - 24px))` มุมโค้งมน `rounded-xl` (12px)
- **Form Grid:** แบ่งออกเป็น 2 คอลัมน์บนเดสก์ท็อป และ 1 คอลัมน์บนมือถือ (`gap: 6px 12px`)
- **ช่องกรอก (Inputs / Selects):**
  - ความสูงกะทัดรัด 32px (`h-8 text-xs rounded-md border-slate-300`)
  - เส้นโฟกัสเป็นสีเขียวเข้ม CostLab (`focus:border-[#00570f] focus:ring-1`)
- **Choice Control Buttons (ปุ่มเลือกตัวเลือกด่วน):**
  - สำหรับฟิลด์เช่น ร้านค้า/ผู้รับเหมา, ประเภทบิล, VAT, หัก ณ ที่จ่าย, เครดิต
  - ปุ่มปกติ: `bg-slate-50 border border-slate-300 text-slate-700`
  - ปุ่มที่เลือก (Active): `bg-[#00570f] text-white font-bold border-[#00570f]`
- **Live Summary Bar (แถบคำนวณยอดสด):**
  - แถบสรุปยอดเงินรวม ยอดหักภาษี 3% และยอดโอนสุทธิ แสดงแบบ Real-time ใต้ฟอร์ม

---

### 4.6 Slide-Over Detail Drawer (`BillDetailDrawer`)
ลิ้นชักแสดงรายละเอียดที่เลื่อนเปิดจากขอบขวาของจอ (ความกว้าง `max-w-lg md:max-w-xl`):

- **Header Bar:**
  - รหัสและชื่อบิล
  - ปุ่มนำทางก่อนหน้า/ถัดไป (`ChevronLeft` / `ChevronRight`)
  - ปุ่มคำสั่ง Action: แก้ไข (`Edit`), ลบ (`Trash2`), และปิด (`X`)
- **Tabbed View:**
  - แท็บที่ 1: "รายละเอียดบิล" (ข้อมูลร้านค้า, ยอดเงิน, รูปถ่ายหลักฐาน, ผู้เบิก)
  - แท็บที่ 2: "สรุปโครงการ" (ดึงข้อมูลงบประมาณและยอดเงินของโครงการนั้นมาแสดงทันที)

---

## 📐 5. Spacing, Typography & Micro-Interactions (ระยะห่างและแอนิเมชัน)

### 5.1 Spacing Standard (ระบบระยะห่าง)
| Utility Class | ขนาด (px) | กรณีการใช้งาน |
| :--- | :--- | :--- |
| `gap-1` / `space-y-1` | 4px | ระยะห่างระหว่างป้ายกำกับ (Label) กับกล่องข้อความ |
| `p-2` / `gap-2` | 8px | ระยะห่างภายในแถบเครื่องมือ, ปุ่มตัวกรอง, เซลล์ตาราง |
| `p-2.5` / `p-3` | 10-12px | ระยะห่างภายในการ์ด KPI, เมนูแถบข้าง |
| `p-4` / `space-y-4` | 16px | ระยะห่างระหว่างบล็อกหลักของหน้าจอ |

### 5.2 Micro-Interactions (การตอบสนองต่อผู้ใช้งาน)
- **Active Click State:** ปุ่มและแถวสำคัญใช้ `active:scale-95` หรือ `active:bg-slate-100` เพื่อให้ความรู้สึกตอบสนองสมจริง
- **Transitions:** ควบคุมความเร็วแอนิเมชันไว้ที่ `transition-all duration-150 ease-in-out` เพื่อความลื่นไหลและรวดเร็ว
- **Custom Minimalist Scrollbar:**
  - แถบเลื่อนหน้าจอขนาดเล็กพิเศษเพียง 6px (`width: 6px; height: 6px;`)
  - สีแถบปกติ `#cbd5e1`, เมื่อชี้เมาส์เปลี่ยนเป็นสีเขียวมรกต `#059669`

---

## 💻 6. Developer Page Template (โครงสร้างโค้ดหน้ามาตรฐาน)

สำหรับการสร้างหน้าใหม่หรือรีแฟกเตอร์หน้าเดิม ให้ยึดโครงสร้างโค้ดมาตรฐานดังต่อไปนี้:

```tsx
"use client";

import { useState } from "react";
import { Gauge, Plus, Search, FileSpreadsheet, ArrowDownWideNarrow } from "lucide-react";

export default function StandardPageTemplate() {
  const [search, setSearch] = useState("");

  return (
    <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans text-xs text-slate-800">
      {/* 1. Page Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0b3531] text-[#d4f54e] flex items-center justify-center shrink-0 shadow-xs">
            <Gauge size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              ชื่อระบบ / หน้ารายการ
            </h1>
            <span className="text-[11px] text-slate-500">
              คำอธิบายฟังก์ชันการทำงานหรือสถานะของหน้านี้
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-8 px-3 rounded-lg bg-[#0b3531] text-white hover:bg-[#124d45] font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs"
          >
            <Plus size={15} className="text-[#d4f54e]" />
            <span>สร้างรายการใหม่</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards (Optional) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* KPI Card Items */}
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาข้อมูล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-[#0b3531]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-8 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet size={14} className="text-emerald-700" />
            <span>ส่งออก Excel</span>
          </button>
        </div>
      </div>

      {/* 4. Main Data Content (Table / Cards) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        {/* Table หรือ Card Feed Content */}
      </div>
    </div>
  );
}
```

---

## 🎯 7. Developer & AI Compliance Checklist (เกณฑ์การตรวจรับรอง)

ก่อนส่งมอบงานหรือ Pull Request ทุกครั้ง ต้องผ่านการตรวจสอบตามรายการนี้ 100%:

- [ ] **ชุดสีหลัก:** ใช้สีประจำแบรนด์ Deep Forest Teal (`#0b3531`, `#062e2b`) และ Accent Lime (`#d4f54e`) ในจุดสำคัญ
- [ ] **ความกะทัดรัด:** ยึดขนาดฟอนต์ `text-xs` (12px), `text-[11px]`, และ `text-[10px]` สำหรับตารางและป้ายกำกับ
- [ ] **ปราศจาก Emoji:** ไม่มีอิโมจิในตาราง หัวข้อ สิทธิ์ หรือป้ายสถานะ ให้ใช้ Lucide Icon หรือ CSS Dot แทน
- [ ] **โครงสร้าง Sidebar:** รองรับทั้งโหมดเต็ม (300px) และโหมดย่อ (60px) พร้อมแสดงตัวสลับผู้ใช้ด้านล่าง
- [ ] **Responsive Design:** แสดงผลตารางแบบเต็มบนเดสก์ท็อป และเปลี่ยนเป็นการ์ด High-Density บนมือถือ
- [ ] **ตารางติดตรึง:** คอลัมน์จัดการด้านขวาสุดของตารางต้องตรึงนิ่ง (`sticky right-0`) เสมอ
- [ ] **ความถูกต้องทางเทคนิค:** ทดสอบผ่าน `npx tsc --noEmit` โดยไม่มีข้อผิดพลาด Type ใดๆ
