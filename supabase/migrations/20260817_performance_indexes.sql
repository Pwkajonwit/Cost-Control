-- =========================================================================
-- Costlab2 High-Performance Dynamic Indexing Script (Bulletproof PL/pgSQL)
-- Execution Target: Supabase SQL Editor
-- Checks column existence dynamically before creating indexes
-- =========================================================================

DO $$
BEGIN
    -- 1. Indexing on BILLS Table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bills' AND column_name='status') THEN
        CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bills' AND column_name='bill_date') THEN
        CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bills' AND column_name='project_id') THEN
        CREATE INDEX IF NOT EXISTS idx_bills_project_id ON bills(project_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bills' AND column_name='requester') THEN
        CREATE INDEX IF NOT EXISTS idx_bills_requester ON bills(requester);
    END IF;

    -- 2. Indexing on MASTER_MEMBERS Table (Thai & English Columns)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='master_members' AND column_name='line_user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_members_line_user_id ON master_members(line_user_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='master_members' AND column_name='เบอร์โทรศัพท์') THEN
        CREATE INDEX IF NOT EXISTS idx_members_phone_th ON master_members("เบอร์โทรศัพท์");
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='master_members' AND column_name='phone') THEN
        CREATE INDEX IF NOT EXISTS idx_members_phone_en ON master_members(phone);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='master_members' AND column_name='สิทธิ์การใช้งาน') THEN
        CREATE INDEX IF NOT EXISTS idx_members_role_th ON master_members("สิทธิ์การใช้งาน");
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='master_members' AND column_name='role') THEN
        CREATE INDEX IF NOT EXISTS idx_members_role_en ON master_members(role);
    END IF;

    -- 3. Indexing on PROJECTS Table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='id') THEN
        CREATE INDEX IF NOT EXISTS idx_projects_id ON projects(id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='name') THEN
        CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
    END IF;

    -- 4. Indexing on CONTRACT_WORKS Table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contract_works' AND column_name='project_id') THEN
        CREATE INDEX IF NOT EXISTS idx_contract_works_project ON contract_works(project_id);
    END IF;

    -- 5. Indexing on SYSTEM_OPTIONS Table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_options' AND column_name='id') THEN
        CREATE INDEX IF NOT EXISTS idx_system_options_id ON system_options(id);
    END IF;

END $$;
