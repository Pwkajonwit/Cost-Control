# Costlab2 - Executive UI/UX Design System Guide

เอกสารฉบับนี้คือมาตรฐานการออกแบบ (Design System Standard) สำหรับโปรเจกต์ **Costlab2** โดยกำหนดให้ทุกการพัฒนาหน้าใหม่หรือการแก้ไขหน้าเดิม ต้องยึดถือโครงสร้าง สไตล์สี Tailwind มาตรฐาน และการใช้มุมโค้ง `rounded-lg` อย่างเคร่งครัด

---

## 🎨 1. Core Design Principles (หลักการออกแบบ)

1. **Ultra-Compact & High-Density:**
   - ออกแบบให้มีความหนาแน่นของข้อมูลสูง กระชับ อ่านง่าย เหมาะสำหรับระบบบริหารจัดการระดับผู้บริหาร (Executive Dashboard)
   - ลดระยะห่าง padding/margin ที่ไม่จำเป็น (ใช้ `p-3`, `p-4`, `gap-2.5`, `space-y-3`)

2. **Tailwind Standard Palette & `rounded-lg` Rule:**
   - **มุมโค้งมาตรฐาน:** ใช้ **`rounded-lg`** สำหรับปุ่ม การ์ด คอนเทนเนอร์ กล่องข้อความ และโลโก้ทั้งหมด (ห้ามใช้ `rounded-xl`, `rounded-2xl` หรือค่าแบบกำหนดเอง)
   - **พาเลทสีมาตรฐาน Tailwind (No Arbitrary Hex):**
     - **Dark Sidebar & Headers:** `bg-emerald-950`, `bg-emerald-900`, `bg-slate-900`, `border-emerald-900/80`
     - **Card Surfaces & Cards:** `bg-white`, `bg-slate-50`, `border-slate-200`
     - **Text Colors:** `text-slate-900`, `text-slate-800`, `text-slate-600`, `text-slate-400`, `text-emerald-600`, `text-emerald-400`
     - **Status Badges & Accents:** `bg-emerald-100 text-emerald-800`, `bg-amber-100 text-amber-800`, `bg-sky-100 text-sky-800`, `bg-rose-100 text-rose-800`

3. **No Redundancy (ขจัดส่วนซ้ำซ้อน):**
   - **ห้ามมีเมนูด้านบนซ้ำซ้อน:** ให้ใช้เมนูนำทางหลักใน **Sidebar** เท่านั้น ไม่ต้องใส่ Tab Header ด้านบนหน้าเพจอีก
   - **โลโก้บริษัท:** แสดงผลเฉพาะที่กล่องแบรนด์หลักบน Sidebar Rail แถบซ้ายสุดเท่านั้น (`w-10 h-10 rounded-lg bg-emerald-900 border border-emerald-700/60`)

4. **No Emojis Standard (ห้ามใช้ Emoji ในองค์ประกอบ UI):**
   - **ไม่ใช้ Emoji:** ในตาราง สเปก สิทธิ์ (Role) หรือป้ายสถานะ (Status Badges) เช่น ห้ามใช้ 👑, 👔, 👤, 🟢, 🔴
   - **ใช้ Lucide SVG Icons / CSS Dots แทน:** ใช้ไอคอน Lucide (เช่น `<Shield />`, `<UserCheck />`, `<User />`) หรือจุดสถานะ CSS (`w-1.5 h-1.5 rounded-full bg-emerald-500`) เพื่อลุคที่สะอาด เรียบหรู และเป็นมืออาชีพ

---

## 📐 2. Layout Structure Standard (โครงสร้างมาตรฐานแต่ละหน้า)

ทุกหน้าควรประกอบด้วย 3 ส่วนหลักจัดเรียงในคอนเทนเนอร์ `max-w-5xl mx-auto space-y-4 text-xs`:

```tsx
<div className="p-3 sm:p-5 max-w-5xl mx-auto space-y-4 font-sans text-xs">
  {/* 1. Compact Page Header */}
  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
    <div className="flex items-center gap-2">
      <Icon size={20} className="text-emerald-600 shrink-0" />
      <h1 className="font-extrabold text-base text-slate-900 tracking-tight">ชื่อหน้าระบบ</h1>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        Active
      </span>
    </div>
    <div className="flex items-center gap-2">
      {/* Primary / Secondary Action Buttons */}
      <button className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold transition">
        บันทึกข้อมูล
      </button>
    </div>
  </div>

  {/* 2. Metric / Summary Cards (4-Column Compact Grid) */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
      {/* Card Content */}
    </div>
  </div>

  {/* 3. Main Data Content (High-Density Forms / Tables) */}
  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
    {/* Form Controls or Table */}
  </div>
</div>
```

---

## 🖼️ 3. Sidebar Branding Rule (มาตรฐานการแสดงโลโก้บน Sidebar)

```tsx
/* Slim Left Rail Brand Container */
<div className="w-10 h-10 rounded-lg bg-emerald-900 border border-emerald-700/60 text-white flex items-center justify-center overflow-hidden shrink-0">
  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
</div>
```
- กล่องโลโก้ใช้สีมาตรฐาน `bg-emerald-900` พร้อมเส้นขอบ `border-emerald-700/60` และมุมโค้ง `rounded-lg`
- รูปภาพใช้ `object-cover` เพื่อให้เต็มกล่องอย่างสวยงาม พอดีกับทรงสี่เหลี่ยมโค้ง

---

## 📋 4. Table & Form Control Standards

- **Input Fields:** `px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:border-emerald-500 font-medium`
- **Tables:** ความสูงแถวกะทัดรัด `py-2 px-3`, หัวตารางตัวหนา `uppercase text-[10px] bg-slate-100/90`
- **Action Buttons:** `px-3 py-1.5 rounded-lg font-extrabold text-xs flex items-center gap-1.5`

---

## 🎯 5. Compliance Checklist สำหรับ Developer/AI

- [ ] ทุกคอนเทนเนอร์ ปุ่ม การ์ด และกล่องใช้มุมโค้ง **`rounded-lg`**
- [ ] ใช้สีมาตรฐานจาก Tailwind Palette เท่านั้น (`bg-emerald-950`, `bg-emerald-900`, `bg-slate-900`, `text-slate-800`, ฯลฯ)
- [ ] ห้ามใส่ Emoji ในป้าย สิทธิ์ หรือสถานะ ให้ใช้ Lucide Icon / CSS Dot แทน
- [ ] ตัด Sub-navigation Tabs ด้านบนออกทั้งหมด (พึ่งพา Sidebar อย่างเดียว)
- [ ] ไม่มีรูปโลโก้แสดงซ้ำกันในหน้าเดียวกัน
- [ ] ใช้ขนาดฟอนต์กระชับ (`text-xs`, `text-[11px]`, `text-[10px]`)
- [ ] ทดสอบ `npx tsc --noEmit` ผ่าน 100% เสมอ
