-- ========================================================
-- Supabase Schema DDL for CostCode Project
-- Run this script in your Supabase SQL Editor
-- ========================================================

-- 1. Projects Table (โครงการ)
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,                       -- ID Project (e.g. PRJ-001)
  name TEXT NOT NULL,                        -- ชื่อ Project
  customer_name TEXT,                        -- ชื่อลูกค้า
  budget NUMERIC DEFAULT 0,                  -- งบไม่เกิน
  vat_total NUMERIC DEFAULT 0,              -- ยอดรวม vat
  color TEXT DEFAULT 'Green',                -- สีสถานะ (Red / Green)
  company TEXT,                              -- บริษัท
  responsible_person TEXT,                   -- ผู้รับผิดชอบ
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Stores Table (ร้านค้า)
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY,                       -- id_store
  name TEXT NOT NULL,                        -- ชื่อร้านค้า
  full_name TEXT,                            -- ชื่อเต็ม
  bank_account TEXT,                         -- เลขบัญชี
  phone TEXT,                                -- เบอร์โทร
  address TEXT,                              -- ที่อยู่
  tax_id TEXT                                -- เลขที่ผู้เสียภาษี
);

-- 3. Contractors Table (รับเหมา)
CREATE TABLE IF NOT EXISTS public.contractors (
  id TEXT PRIMARY KEY,                       -- id_Contractor
  nickname TEXT,                             -- ชื่อเล่น
  full_name TEXT,                            -- ชื่อ-นามสกุล
  bank_account TEXT,                         -- เลขบัญชี
  id_card TEXT,                              -- บัตรประจำตัวประชาชน
  phone TEXT,                                -- เบอร์โทรศัพท์
  address TEXT,                              -- ที่อยู่
  annual_limit NUMERIC DEFAULT 0             -- จำกัดยอด/ปี
);

-- 4. Contract Works Table (งานรับเหมา)
CREATE TABLE IF NOT EXISTS public.contract_works (
  id TEXT PRIMARY KEY,                       -- id_Conwork
  contractor_id TEXT REFERENCES public.contractors(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  project_name TEXT,
  total_contract_amount NUMERIC DEFAULT 0,   -- ยอดเงินจ้าง
  work_details TEXT,                         -- รายละเอียดงาน
  work_date DATE,                            -- วันที่
  phone TEXT,                                -- เบอร์โทรศัพท์
  paid_amount NUMERIC DEFAULT 0              -- ยอดเงินจ่าย
);

-- 5. Bills Table (กรอกบิล / เบิกเงิน)
CREATE TABLE IF NOT EXISTS public.bills (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- ลำดับ
  project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
  project_name TEXT,
  bill_type TEXT DEFAULT 'หลัก',              -- ประเภทบิล (หลัก, ย่อย, หลัก2, ย่อย2)
  vendor_or_person TEXT,                     -- ร้าน/บุคคล / ร้านค้า
  description TEXT,                          -- สินค้า/ทำงาน
  bill_no TEXT,                              -- เลขที่บิล / No.
  category TEXT,                             -- ประเภท
  sub_category TEXT,                         -- ประเภทหมวดย่อย
  amount NUMERIC DEFAULT 0,                  -- ยอดเงิน / ยอดเบิก
  vat_amount NUMERIC DEFAULT 0,              -- vat
  withholding_tax NUMERIC DEFAULT 0,         -- หัก
  credit_days INTEGER DEFAULT 0,             -- เครดิต
  requester TEXT,                            -- ผู้เบิก
  bill_date DATE,                            -- ว/ด/ป
  image_url TEXT,                            -- รูปถ่ายบิล (Supabase Storage Public URL)
  status TEXT DEFAULT 'ตั้งเบิก',               -- สถานะ (ตั้งเบิก, อนุมัติ, เบิกแล้ว, รอตรวจสอบ)
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tasks Table (งานทั่วไป - สำหรับ LINE Bot)
CREATE TABLE IF NOT EXISTS public.tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,                       -- รายการ
  do_date DATE,                              -- ดู/ทำ
  send_date DATE,                            -- ส่งงาน
  assignee_id TEXT,                          -- รหัสพนักงาน
  assignee_name TEXT,                        -- ผู้รับผิดชอบ
  status TEXT DEFAULT 'ดำเนินการ',             -- สถานะ (ดำเนินการ / สำเร็จ)
  task_type INTEGER DEFAULT 1,              -- ประเภทงาน (1: เอกสาร, 2: แผนงาน, 3: PJSA)
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Works Table (งาน PW / มอบหมาย - สำหรับ LINE Bot)
CREATE TABLE IF NOT EXISTS public.works (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team TEXT NOT NULL DEFAULT 'PW',           -- ทีม (PW, PW1, PW2, PW3, PW4)
  activity_type TEXT,                        -- กิจกรรม (เสนอราคา, ประชุมงาน, ประมูล)
  title TEXT,                                -- เรื่อง
  pr_no TEXT,                                -- PR
  location TEXT,                             -- สถานที่
  date_inspect TEXT,                         -- นัดดู
  date_propose TEXT,                         -- นัดเสนอ
  contact1 TEXT,                             -- ติดต่อ1
  phone1 TEXT,                               -- เบอร์1
  contact2 TEXT,                             -- ติดต่อ2
  phone2 TEXT,                               -- เบอร์2
  company TEXT,                              -- บริษัท
  status TEXT DEFAULT 'รอดูงาน',               -- สถานะ (รอดูงาน, รอเสนอ, ส่งแล้ว, ประชุม, ฯลฯ)
  note TEXT,                                 -- หมายเหตุ
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Plans Table (แผนงาน - สำหรับ LINE Bot)
CREATE TABLE IF NOT EXISTS public.plans (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_code TEXT,                         -- รหัสงาน
  job_name TEXT,                             -- ชื่อแผนงาน
  item_name TEXT,                            -- รายการ
  start_date DATE,                           -- วันที่เริ่ม
  end_date DATE,                             -- วันที่จบ
  days_count INTEGER DEFAULT 0,
  plan_percentage NUMERIC DEFAULT 0,
  actual_percentage NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Master Members Table (รายชื่อพนักงาน - Sheet 'รายชื่อ')
CREATE TABLE IF NOT EXISTS public.master_members (
  id TEXT PRIMARY KEY,                       -- รหัสพนักงาน
  nickname TEXT,                             -- ชื่อเล่น
  full_name TEXT,                            -- ชื่อ-นามสกุล
  bank_account TEXT,                         -- เลขบัญชี
  phone TEXT,                                -- เบอร์โทร
  address TEXT,                              -- ที่อยู่
  id_card TEXT,                              -- เลขบัตรประชาชน
  role TEXT                                  -- สิทธิ์การใช้งาน
);

-- 10. Banks Table (ธนาคาร)
CREATE TABLE IF NOT EXISTS public.banks (
  id TEXT PRIMARY KEY,                       -- id_bank
  name TEXT NOT NULL,                        -- ชื่อธนาคาร
  image TEXT                                 -- โลโก้ธนาคาร
);

-- 11. Cars Table (ทะเบียนรถ)
CREATE TABLE IF NOT EXISTS public.cars (
  id TEXT PRIMARY KEY,                       -- id_car
  plate_no TEXT NOT NULL,                    -- หมายเลขทะเบียน
  brand TEXT,                                -- ยี่ห้อรถ
  color TEXT,                                -- สี
  responsible_person TEXT,                   -- รับผิดชอบ
  owner TEXT                                 -- รถของ
);

-- 12. Categories Table (ประเภท)
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name1 TEXT,
  name2 TEXT,
  name3 TEXT
);

-- 13. Customers Table (ลูกค้า)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,                       -- id_cus
  name TEXT NOT NULL,                        -- ชื่อลูกค้า
  address TEXT,                              -- ที่อยู่
  tax_id TEXT                                -- เลขที่ผู้เสียภาษี
);

-- 14. Companies Table (บริษัท)
CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,                       -- id_Company
  name_en TEXT,                              -- ชื่ออังกฤษ
  name_th TEXT NOT NULL,                     -- ชื่อบริษัท
  branch TEXT,                               -- สำนักงาน
  address TEXT,                              -- ที่อยู่
  tax_id TEXT,                               -- เลขที่ผู้เสียภาษี
  phone TEXT                                 -- เบอร์โทร
);

-- 15. Loans Table (ยืมเงิน)
CREATE TABLE IF NOT EXISTS public.loans (
  id TEXT PRIMARY KEY,                       -- id
  borrower_name TEXT,                        -- ชื่อ
  type TEXT,                                 -- type
  amount NUMERIC DEFAULT 0,                  -- จำนวนเงิน
  loan_date DATE                             -- วันที่
);

-- 16. System Options Table (ตัวเลือกระบบ - JSONB Dynamic Dropdown)
CREATE TABLE IF NOT EXISTS public.system_options (
  id TEXT PRIMARY KEY DEFAULT 'system_options',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Audit Logs Table (ระบบ Log)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action TEXT NOT NULL,                      -- การทำงาน
  table_name TEXT,                           -- ตาราง
  row_key TEXT,                              -- รหัส
  actor TEXT,                                -- ผู้ใช้งาน
  details JSONB,                             -- รายละเอียด
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================
-- Row Level Security (RLS) Configuration
-- ========================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read/write access for authenticated & service role users
CREATE POLICY "Public Read Access Projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public Write Access Projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Stores" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Public Write Access Stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Contractors" ON public.contractors FOR SELECT USING (true);
CREATE POLICY "Public Write Access Contractors" ON public.contractors FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access ContractWorks" ON public.contract_works FOR SELECT USING (true);
CREATE POLICY "Public Write Access ContractWorks" ON public.contract_works FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Bills" ON public.bills FOR SELECT USING (true);
CREATE POLICY "Public Write Access Bills" ON public.bills FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Public Write Access Tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Works" ON public.works FOR SELECT USING (true);
CREATE POLICY "Public Write Access Works" ON public.works FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Public Write Access Plans" ON public.plans FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Members" ON public.master_members FOR SELECT USING (true);
CREATE POLICY "Public Write Access Members" ON public.master_members FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Banks" ON public.banks FOR SELECT USING (true);
CREATE POLICY "Public Write Access Banks" ON public.banks FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Cars" ON public.cars FOR SELECT USING (true);
CREATE POLICY "Public Write Access Cars" ON public.cars FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Write Access Categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Public Write Access Customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Public Write Access Companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access Loans" ON public.loans FOR SELECT USING (true);
CREATE POLICY "Public Write Access Loans" ON public.loans FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access SystemOptions" ON public.system_options FOR SELECT USING (true);
CREATE POLICY "Public Write Access SystemOptions" ON public.system_options FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Access AuditLogs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Public Write Access AuditLogs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ========================================================
-- Supabase Storage Bucket Setup
-- ========================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bills', 'bills', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Bucket Storage RLS Policies
CREATE POLICY "Public Read Access for Bills Bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'bills');

CREATE POLICY "Public Insert Access for Bills Bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'bills');

CREATE POLICY "Public Update Access for Bills Bucket" ON storage.objects
FOR UPDATE USING (bucket_id = 'bills');

CREATE POLICY "Public Delete Access for Bills Bucket" ON storage.objects
FOR DELETE USING (bucket_id = 'bills');
