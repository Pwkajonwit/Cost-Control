-- ==========================================================
-- Supabase Performance Optimization: Indexes & RLS Security
-- Run this script in Supabase Dashboard -> SQL Editor
-- ==========================================================

-- 1. Create Indexes on Primary Keys & Foreign Keys for Query Acceleration
CREATE INDEX IF NOT EXISTS idx_data_project_id ON public.data ("ID Project");
CREATE INDEX IF NOT EXISTS idx_data_store ON public.data ("ร้าน/บุคคล");
CREATE INDEX IF NOT EXISTS idx_data_created_at ON public.data ("created_at" DESC);

CREATE INDEX IF NOT EXISTS idx_contract_work_project ON public.contract_work ("ID Project");
CREATE INDEX IF NOT EXISTS idx_contract_work_contractor ON public.contract_work ("id_Contractor");

CREATE INDEX IF NOT EXISTS idx_project_customer ON public.project ("id_cus");
CREATE INDEX IF NOT EXISTS idx_project_company ON public.project ("id_Company");

-- 2. Enable Row Level Security (RLS) on Core Tables
ALTER TABLE IF EXISTS public.data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contract_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contractor ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.category ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_options ENABLE ROW LEVEL SECURITY;

-- 3. Standard RLS Policies (Allow access for service_role and authenticated/anon if needed)
DO $$ 
BEGIN
    -- Policy for data table
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'data' AND policyname = 'Allow all access to data') THEN
        CREATE POLICY "Allow all access to data" ON public.data FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Policy for project table
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project' AND policyname = 'Allow all access to project') THEN
        CREATE POLICY "Allow all access to project" ON public.project FOR ALL USING (true) WITH CHECK (true);
    END IF;

    -- Policy for contract_work table
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_work' AND policyname = 'Allow all access to contract_work') THEN
        CREATE POLICY "Allow all access to contract_work" ON public.contract_work FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
