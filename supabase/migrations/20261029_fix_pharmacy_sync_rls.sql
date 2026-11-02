-- ============================================================================
-- BETA PHARMACY POS — SUPABASE DATABASE SCHEMA & RLS POLICIES (SELF-HEALING)
-- Target Project: coqziknetbiinumbueay (https://coqziknetbiinumbueay.supabase.co)
-- Version: 3.0 (Idempotent Table Creation + Self-Healing Existing Table Schema)
-- ============================================================================

-- ============================================================================
-- 1. BASE TABLES CREATION (IF MISSING)
-- ============================================================================

-- 1.1 Sales Bills Table
CREATE TABLE IF NOT EXISTS public.sales_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_branch TEXT NOT NULL DEFAULT 'MAIN',
    bill_no TEXT NOT NULL,
    bill_date TEXT NOT NULL,
    patient_name TEXT DEFAULT 'CUSTOMER',
    doctor_name TEXT DEFAULT 'Self / OTC',
    payment_mode TEXT DEFAULT 'cash',
    gross_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_payable NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    shift_id TEXT,
    quarantine_flag BOOLEAN DEFAULT false,
    client_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-heal existing sales_bills columns if table existed prior:
ALTER TABLE public.sales_bills ADD COLUMN IF NOT EXISTS shift_id TEXT;
ALTER TABLE public.sales_bills ADD COLUMN IF NOT EXISTS quarantine_flag BOOLEAN DEFAULT false;
ALTER TABLE public.sales_bills ADD COLUMN IF NOT EXISTS client_timestamp TIMESTAMPTZ;
ALTER TABLE public.sales_bills DROP CONSTRAINT IF EXISTS uq_sales_bills_branch_bill;
ALTER TABLE public.sales_bills ADD CONSTRAINT uq_sales_bills_branch_bill UNIQUE (store_branch, bill_no);

CREATE INDEX IF NOT EXISTS idx_sales_bills_bill_no ON public.sales_bills(bill_no);
CREATE INDEX IF NOT EXISTS idx_sales_bills_branch_bill ON public.sales_bills(store_branch, bill_no);
CREATE INDEX IF NOT EXISTS idx_sales_bills_created_at ON public.sales_bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_bills_branch ON public.sales_bills(store_branch);

-- 1.2 Credit Notes & Returns Table
CREATE TABLE IF NOT EXISTS public.credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id TEXT NOT NULL DEFAULT 'MAIN',
    credit_note_no TEXT,
    patient_name TEXT DEFAULT 'CUSTOMER',
    refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    unverified_items_json JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'PROCESSED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-heal existing credit_notes columns (fixes 42703 error on existing databases):
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS credit_note_no TEXT;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS unverified_items_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PROCESSED';
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'MAIN';
ALTER TABLE public.credit_notes DROP CONSTRAINT IF EXISTS uq_credit_notes_branch_cn;
ALTER TABLE public.credit_notes ADD CONSTRAINT uq_credit_notes_branch_cn UNIQUE (branch_id, credit_note_no);

CREATE INDEX IF NOT EXISTS idx_credit_notes_cn_no ON public.credit_notes(credit_note_no);
CREATE INDEX IF NOT EXISTS idx_credit_notes_branch_cn ON public.credit_notes(branch_id, credit_note_no);
CREATE INDEX IF NOT EXISTS idx_credit_notes_created_at ON public.credit_notes(created_at DESC);

-- 1.3 Stock Transfers Table
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id TEXT NOT NULL UNIQUE,
    medicine_name TEXT NOT NULL,
    from_store TEXT NOT NULL,
    to_store TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    branch_id TEXT DEFAULT 'MAIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'MAIN';
CREATE INDEX IF NOT EXISTS idx_stock_transfers_transfer_id ON public.stock_transfers(transfer_id);

-- 1.4 Purchase Inwards Table
CREATE TABLE IF NOT EXISTS public.purchase_inwards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_no TEXT,
    distributor TEXT DEFAULT '',
    supplier_name TEXT DEFAULT 'SUPPLIER',
    bill_date TEXT NOT NULL DEFAULT now()::text,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    store_branch TEXT DEFAULT 'MAIN',
    branch_id TEXT NOT NULL DEFAULT 'MAIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Self-heal purchase_inwards columns:
ALTER TABLE public.purchase_inwards ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE public.purchase_inwards ADD COLUMN IF NOT EXISTS distributor TEXT DEFAULT '';
ALTER TABLE public.purchase_inwards ADD COLUMN IF NOT EXISTS store_branch TEXT DEFAULT 'MAIN';
ALTER TABLE public.purchase_inwards ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.purchase_inwards ADD COLUMN IF NOT EXISTS supplier_name TEXT DEFAULT 'SUPPLIER';
ALTER TABLE public.purchase_inwards ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'MAIN';
CREATE INDEX IF NOT EXISTS idx_purchase_inwards_created_at ON public.purchase_inwards(created_at DESC);

-- 1.5 Shift Records Table
CREATE TABLE IF NOT EXISTS public.shift_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id TEXT NOT NULL DEFAULT 'MAIN',
    shift_id TEXT NOT NULL,
    closing_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_records ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'MAIN';
ALTER TABLE public.shift_records DROP CONSTRAINT IF EXISTS uq_shift_records_branch_shift;
ALTER TABLE public.shift_records ADD CONSTRAINT uq_shift_records_branch_shift UNIQUE (branch_id, shift_id);

CREATE INDEX IF NOT EXISTS idx_shift_records_shift_id ON public.shift_records(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_records_branch_shift ON public.shift_records(branch_id, shift_id);

-- 1.6 Medicines Delta Tracking Table (New Table)
CREATE TABLE IF NOT EXISTS public.medicines_delta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id TEXT NOT NULL DEFAULT 'MAIN',
    medicine_code TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT DEFAULT '',
    mrp NUMERIC(10, 2) DEFAULT 0.00,
    rack TEXT DEFAULT '',
    schedule TEXT DEFAULT '',
    stock INTEGER DEFAULT 0,
    stock_shop1 INTEGER DEFAULT 0,
    stock_shop2 INTEGER DEFAULT 0,
    batches_json JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_medicines_delta_branch_code UNIQUE (branch_id, medicine_code)
);

CREATE INDEX IF NOT EXISTS idx_med_delta_code ON public.medicines_delta(medicine_code);
CREATE INDEX IF NOT EXISTS idx_med_delta_branch_code ON public.medicines_delta(branch_id, medicine_code);
CREATE INDEX IF NOT EXISTS idx_med_delta_updated ON public.medicines_delta(updated_at DESC);

-- 1.7 Inventory Events Table (New Table for Concurrency & Deduplication)
CREATE TABLE IF NOT EXISTS public.inventory_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    branch_id TEXT NOT NULL DEFAULT 'MAIN',
    medicine_code TEXT NOT NULL,
    delta_qty INTEGER NOT NULL,
    bill_no TEXT,
    resulting_stock INTEGER NOT NULL,
    oversold_flag BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_events_event_id ON public.inventory_events(event_id);
CREATE INDEX IF NOT EXISTS idx_inventory_events_branch_med ON public.inventory_events(branch_id, medicine_code);

-- 1.8 Pharmacy Cloud Backups Table (New Table)
CREATE TABLE IF NOT EXISTS public.pharmacy_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id TEXT NOT NULL DEFAULT 'MAIN',
    backup_date DATE NOT NULL,
    backup_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    checksum TEXT NOT NULL,
    record_counts JSONB NOT NULL,
    snapshot_data JSONB NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_backups_branch_date ON public.pharmacy_backups(branch_id, backup_date DESC);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES — IDEMPOTENT (DROP IF EXISTS)
-- ============================================================================

ALTER TABLE public.sales_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_inwards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines_delta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read sales_bills" ON public.sales_bills;
DROP POLICY IF EXISTS "Allow authenticated insert sales_bills" ON public.sales_bills;
DROP POLICY IF EXISTS "Allow authenticated read credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Allow authenticated insert credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Allow authenticated read stock_transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Allow authenticated insert stock_transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Allow authenticated read purchase_inwards" ON public.purchase_inwards;
DROP POLICY IF EXISTS "Allow authenticated insert purchase_inwards" ON public.purchase_inwards;
DROP POLICY IF EXISTS "Allow authenticated read shift_records" ON public.shift_records;
DROP POLICY IF EXISTS "Allow authenticated insert shift_records" ON public.shift_records;
DROP POLICY IF EXISTS "Allow authenticated read medicines_delta" ON public.medicines_delta;
DROP POLICY IF EXISTS "Allow authenticated upsert medicines_delta" ON public.medicines_delta;
DROP POLICY IF EXISTS "Allow authenticated read inventory_events" ON public.inventory_events;
DROP POLICY IF EXISTS "Allow authenticated insert inventory_events" ON public.inventory_events;
DROP POLICY IF EXISTS "Allow authenticated read pharmacy_backups" ON public.pharmacy_backups;
DROP POLICY IF EXISTS "Allow authenticated insert pharmacy_backups" ON public.pharmacy_backups;

DROP POLICY IF EXISTS "Allow counter terminal insert sales_bills" ON public.sales_bills;
DROP POLICY IF EXISTS "Allow counter terminal insert credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Allow counter terminal insert stock_transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Allow counter terminal insert purchase_inwards" ON public.purchase_inwards;
DROP POLICY IF EXISTS "Allow counter terminal insert shift_records" ON public.shift_records;
DROP POLICY IF EXISTS "Allow counter terminal upsert medicines_delta" ON public.medicines_delta;
DROP POLICY IF EXISTS "Allow counter terminal insert inventory_events" ON public.inventory_events;
DROP POLICY IF EXISTS "Allow counter terminal backup pharmacy_backups" ON public.pharmacy_backups;

DROP POLICY IF EXISTS "Allow counter select sales_bills" ON public.sales_bills;
DROP POLICY IF EXISTS "Allow counter select credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Allow counter select stock_transfers" ON public.stock_transfers;
DROP POLICY IF EXISTS "Allow counter select purchase_inwards" ON public.purchase_inwards;
DROP POLICY IF EXISTS "Allow counter select shift_records" ON public.shift_records;
DROP POLICY IF EXISTS "Allow counter select medicines_delta" ON public.medicines_delta;
DROP POLICY IF EXISTS "Allow counter select inventory_events" ON public.inventory_events;
DROP POLICY IF EXISTS "Allow counter select pharmacy_backups" ON public.pharmacy_backups;

-- Authenticated Role Policies
CREATE POLICY "Allow authenticated read sales_bills" ON public.sales_bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert sales_bills" ON public.sales_bills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated read credit_notes" ON public.credit_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert credit_notes" ON public.credit_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated read stock_transfers" ON public.stock_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert stock_transfers" ON public.stock_transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated read purchase_inwards" ON public.purchase_inwards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert purchase_inwards" ON public.purchase_inwards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated read shift_records" ON public.shift_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert shift_records" ON public.shift_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated read medicines_delta" ON public.medicines_delta FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated upsert medicines_delta" ON public.medicines_delta FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read inventory_events" ON public.inventory_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert inventory_events" ON public.inventory_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated read pharmacy_backups" ON public.pharmacy_backups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert pharmacy_backups" ON public.pharmacy_backups FOR INSERT TO authenticated WITH CHECK (true);

-- Counter Terminal Anon Role Policies (Store Key verification)
CREATE POLICY "Allow counter terminal insert sales_bills" ON public.sales_bills FOR INSERT TO anon
    WITH CHECK (
        coalesce(current_setting('request.headers', true)::json->>'x-pharmacy-store-key', '') = 'beta_counter_2026'
        OR auth.role() = 'authenticated'
    );

CREATE POLICY "Allow counter terminal insert credit_notes" ON public.credit_notes FOR INSERT TO anon
    WITH CHECK (
        coalesce(current_setting('request.headers', true)::json->>'x-pharmacy-store-key', '') = 'beta_counter_2026'
        OR auth.role() = 'authenticated'
    );

CREATE POLICY "Allow counter terminal insert stock_transfers" ON public.stock_transfers FOR INSERT TO anon
    WITH CHECK (
        coalesce(current_setting('request.headers', true)::json->>'x-pharmacy-store-key', '') = 'beta_counter_2026'
        OR auth.role() = 'authenticated'
    );

CREATE POLICY "Allow counter terminal insert purchase_inwards" ON public.purchase_inwards FOR INSERT TO anon
    WITH CHECK (
        coalesce(current_setting('request.headers', true)::json->>'x-pharmacy-store-key', '') = 'beta_counter_2026'
        OR auth.role() = 'authenticated'
    );

CREATE POLICY "Allow counter terminal insert shift_records" ON public.shift_records FOR INSERT TO anon
    WITH CHECK (
        coalesce(current_setting('request.headers', true)::json->>'x-pharmacy-store-key', '') = 'beta_counter_2026'
        OR auth.role() = 'authenticated'
    );

CREATE POLICY "Allow counter terminal upsert medicines_delta" ON public.medicines_delta FOR ALL TO anon
    USING (
        coalesce(current_setting('request.headers', true)::json->>'x-pharmacy-store-key', '') = 'beta_counter_2026'
        OR auth.role() = 'authenticated'
    )
    WITH CHECK (
        coalesce(current_setting('request.headers', true)::json->>'x-pharmacy-store-key', '') = 'beta_counter_2026'
        OR auth.role() = 'authenticated'
    );

CREATE POLICY "Allow counter terminal insert inventory_events" ON public.inventory_events FOR INSERT TO anon
    WITH CHECK (
        coalesce(current_setting('request.headers', true)::json->>'x-pharmacy-store-key', '') = 'beta_counter_2026'
        OR auth.role() = 'authenticated'
    );

CREATE POLICY "Allow counter terminal backup pharmacy_backups" ON public.pharmacy_backups FOR ALL TO anon
    USING (
        coalesce(current_setting('request.headers', true)::json->>'x-pharmacy-store-key', '') = 'beta_counter_2026'
        OR auth.role() = 'authenticated'
    )
    WITH CHECK (
        coalesce(current_setting('request.headers', true)::json->>'x-pharmacy-store-key', '') = 'beta_counter_2026'
        OR auth.role() = 'authenticated'
    );

-- Read Policies
CREATE POLICY "Allow counter select sales_bills" ON public.sales_bills FOR SELECT TO anon USING (true);
CREATE POLICY "Allow counter select credit_notes" ON public.credit_notes FOR SELECT TO anon USING (true);
CREATE POLICY "Allow counter select stock_transfers" ON public.stock_transfers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow counter select purchase_inwards" ON public.purchase_inwards FOR SELECT TO anon USING (true);
CREATE POLICY "Allow counter select shift_records" ON public.shift_records FOR SELECT TO anon USING (true);
CREATE POLICY "Allow counter select medicines_delta" ON public.medicines_delta FOR SELECT TO anon USING (true);
CREATE POLICY "Allow counter select inventory_events" ON public.inventory_events FOR SELECT TO anon USING (true);
CREATE POLICY "Allow counter select pharmacy_backups" ON public.pharmacy_backups FOR SELECT TO anon USING (true);
