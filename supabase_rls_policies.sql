-- ============================================================
-- LIFESAVE — Row Level Security (RLS) Policies
-- Run this in Supabase Dashboard → SQL Editor AFTER the migration
-- ============================================================

-- Since the anon key is now public (used in frontend JS),
-- we MUST enable RLS and define what anonymous users can do.

-- ── Donors Table ──
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;

-- Allow anyone to register as a donor
CREATE POLICY "Allow public insert on donors"
    ON donors FOR INSERT
    WITH CHECK (true);

-- Allow anyone to read donor records (needed for RPC and Realtime)
CREATE POLICY "Allow public select on donors"
    ON donors FOR SELECT
    USING (true);

-- Allow updating donation date (when a donor clicks Accept)
CREATE POLICY "Allow public update on donors"
    ON donors FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ── Requests Table ──
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create a blood request
CREATE POLICY "Allow public insert on requests"
    ON requests FOR INSERT
    WITH CHECK (true);

-- Allow reading request records
CREATE POLICY "Allow public select on requests"
    ON requests FOR SELECT
    USING (true);

-- ── Enable Realtime on donors table ──
-- NOTE: You must ALSO enable Realtime in the Supabase Dashboard:
--   Database → Replication → Toggle ON for "donors" table
-- The SQL below adds the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE donors;
