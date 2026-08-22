# 📂 โครงสร้างและหมวดหมู่ไฟล์ของโปรเจกต์ (Costcode Supabase Next.js)

โปรเจกต์นี้ได้รับการจัดหมวดหมู่และวางโครงสร้างอย่างเป็นระเบียบ แยกส่วนระหว่าง **หน้าเว็บ (App Router)**, **ส่วนประกอบ UI (Components)**, **ระบบฐานข้อมูลและธุรกิจ (Lib)**, และ **สคริปต์ฐานข้อมูล (Supabase)** ดังนี้ครับ:

---

## 🗺️ แผนผังไดเรกทอรีหลัก (Directory Overview)

```
coscosesuperbase/
├── 📁 app/                    # Next.js 15 App Router (หน้าเว็บ & API Routes)
│   ├── 📁 api/                # API Backend Endpoints (Rows, Bills, Drive, LINE)
│   ├── 📁 bill-follow/        # หน้าตามบิล (Bill Follow Dashboard)
│   ├── 📁 bills/              # หน้าบิลเบิกจ่าย & รายละเอียดบิล ([billId])
│   ├── 📁 contract-open/      # หน้าสัญญาเปิดจ้างผู้รับเหมา
│   ├── 📁 withdraw-request/   # หน้าตั้งเบิกเงิน
│   ├── 📁 work-status/        # หน้าสถานะงาน & รายละเอียดโครงการ ([projectId])
│   ├── 📁 views/              # หน้าตารางจัดการข้อมูลย่อย ([id])
│   ├── 📄 layout.tsx          # Main App Frame Layout
│   └── 📄 globals.css         # Global Unified Executive SaaS Theme Styles
│
├── 📁 components/             # UI Components (ส่วนประกอบหน้าเว็บทั้งหมด)
│   ├── 📊 Client Dashboards   # หน้าจอหลัก (Main, WorkStatus, BillFollow, Withdraw, ฯลฯ)
│   ├── 📋 Data Tables         # ตารางแสดงข้อมูล (DataTable, ManageTableClient)
│   ├── 📝 Forms & Modals      # ฟอร์มเพิ่ม/แก้ไข (FormModal, BillWorkflowActions)
│   └── 🧩 Layout & Nav        # เมนูและแถบข้าง (AppShell, AppNav, DualSidebar, UserSwitcher)
│
├── 📁 lib/                    # Core Business Logic & Database Helpers
│   ├── 🗄️ Database & Sync     # supabase-db.ts, supabase-admin.ts, sheets.ts, drive.ts
│   ├── 📐 Formulas & Status   # formulas.ts, bill-status.ts, bill-validation.ts, project-summary.ts
│   ├── 📑 Schemas & Config    # schemas.ts, form.ts, config.ts, types.ts
│   └── 💬 Integrations        # lib/line/ (LINE Flex Notification System)
│
├── 📁 supabase/               # Database Schemas & Migrations (SQL Scripts & RPCs)
├── 📁 AppscriptBot/           # สคริปต์ย้ายระบบและบอทอัตโนมัติ
└── 📁 public/                 # Assets, Icons & Static Images
```

---

## 🛠️ รายละเอียดตามหมวดหมู่การทำงาน

### 1. 🌐 หมวดหมู่หน้าเว็บ & API Routes (`app/`)
* **`app/page.tsx`**: หน้าหลัก Executive SaaS Dashboard (`MainDashboardClient`) สรุปภาพรวมการเงิน ผลประกอบการ และค่าใช้จ่าย
* **`app/work-status/`**: หน้าติดตามสถานะงาน แยกรายโครงการ พร้อมหน้าดูรายละเอียดโครงการ (`[projectId]`)
* **`app/bill-follow/`**: หน้าติดตามบิลและภาษี (VAT, หัก ณ ที่จ่าย 3%, เครดิต)
* **`app/withdraw-request/`**: หน้าตั้งเบิกเงินและอนุมัติบิลค่าใช้จ่าย
* **`app/bills/[billId]/`**: หน้าแสดงรายละเอียดบิลแบบเจาะลึก
* **`app/api/`**: API Endpoints สำหรับ CRUD ข้อมูล (`/api/rows`, `/api/bills`, `/api/drive`, `/api/line`)

### 2. 🎨 หมวดหมู่ส่วนประกอบ UI (`components/`)
* **หน้าจอหลัก (Dashboards)**: `MainDashboardClient.tsx`, `WorkStatusDashboardClient.tsx`, `BillFollowDashboardClient.tsx`, `WithdrawDashboardClient.tsx`, `ProjectDetailClient.tsx`, `BillDetailClient.tsx`
* **ตารางและการจัดการ**: `DataTable.tsx`, `ManageTableClient.tsx`, `MetricCard.tsx`, `LoadingState.tsx`
* **ฟอร์มและการทำงาน**: `FormModal.tsx`, `BillWorkflowActions.tsx`, `BillImageThumbnail.tsx`
* **เมนูและโครงสร้าง**: `AppShell.tsx`, `AppNav.tsx`, `DualSidebar.tsx`, `UserSwitcher.tsx`

### 3. 🧠 หมวดหมู่ตรรกะและฐานข้อมูล (`lib/`)
* **Supabase Integration**: `lib/supabase-db.ts` (Data Mapping & CRUD), `lib/supabase-admin.ts`
* **Google Sheets & Drive Sync**: `lib/sheets.ts` (Dual Sync Backup), `lib/drive.ts` (Image Upload)
* **การคำนวณและตรวจสอบ**: `lib/formulas.ts` (คำนวณ VAT/หัก ณ ที่จ่าย/ยอดคงเหลือ), `lib/bill-status.ts`, `lib/bill-validation.ts`
* **โครงสร้างฟอร์ม**: `lib/schemas.ts` (11 ฟอร์มหลัก), `lib/form.ts`, `lib/config.ts`, `lib/types.ts`
