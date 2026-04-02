-- ============================================================
-- eGrowth Legal - Complete Database Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('master', 'admin', 'staff', 'notary', 'client');
CREATE TYPE service_type AS ENUM ('trust_estate', 'for_profit', 'nonprofit', 'trustee_service');
CREATE TYPE document_status AS ENUM ('draft', 'generated', 'queued', 'in_review', 'approved', 'submitted', 'complete', 'rejected');
CREATE TYPE interview_status AS ENUM ('in_progress', 'completed', 'abandoned');
CREATE TYPE trustee_fee_type AS ENUM ('flat', 'percentage', 'both');
CREATE TYPE entity_state AS ENUM (
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
);

-- ─────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  phone           TEXT,
  role            user_role NOT NULL DEFAULT 'client',
  created_by      UUID REFERENCES profiles(id),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  dob             DATE,
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  state           entity_state,
  zip             TEXT,
  ssn_last4       TEXT,
  assigned_to     UUID REFERENCES profiles(id),
  created_by      UUID REFERENCES profiles(id),
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- INTERVIEWS (wizard sessions)
-- ─────────────────────────────────────────
CREATE TABLE interviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_type    service_type NOT NULL,
  status          interview_status NOT NULL DEFAULT 'in_progress',
  current_step    INT NOT NULL DEFAULT 1,
  total_steps     INT NOT NULL DEFAULT 5,
  answers         JSONB NOT NULL DEFAULT '{}',
  started_by      UUID REFERENCES profiles(id),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- DOCUMENTS
-- ─────────────────────────────────────────
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  interview_id    UUID REFERENCES interviews(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  document_type   TEXT NOT NULL,
  service_type    service_type NOT NULL,
  status          document_status NOT NULL DEFAULT 'draft',
  storage_path    TEXT,
  signed_path     TEXT,
  notarized_path  TEXT,
  is_trustee_file BOOLEAN NOT NULL DEFAULT false,
  generated_by    UUID REFERENCES profiles(id),
  reviewed_by     UUID REFERENCES profiles(id),
  notarized_by    UUID REFERENCES profiles(id),
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- SUBMISSION QUEUE (human handoff)
-- ─────────────────────────────────────────
CREATE TABLE submission_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_to     UUID REFERENCES profiles(id),
  status          document_status NOT NULL DEFAULT 'queued',
  priority        INT NOT NULL DEFAULT 3,   -- 1=urgent 2=high 3=normal
  filing_state    entity_state,
  notes           TEXT,
  internal_notes  TEXT,
  submitted_at    TIMESTAMPTZ,
  confirmation_no TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TRUSTEE ACCOUNTS
-- ─────────────────────────────────────────
CREATE TABLE trustee_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  trust_name      TEXT NOT NULL,
  trust_type      TEXT NOT NULL,
  fee_type        trustee_fee_type NOT NULL DEFAULT 'both',
  flat_fee_cents  INT NOT NULL DEFAULT 50000,       -- $500.00
  fee_percentage  NUMERIC(5,4) NOT NULL DEFAULT 0.0150,  -- 1.50%
  estate_value    NUMERIC(14,2),
  billing_cycle   TEXT NOT NULL DEFAULT 'annual',
  next_billing    DATE,
  last_billed     DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  managed_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TRUSTEE LEDGER (earnings tracking)
-- ─────────────────────────────────────────
CREATE TABLE trustee_ledger (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trustee_id      UUID NOT NULL REFERENCES trustee_accounts(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,        -- 'flat_fee' | 'percentage_fee' | 'payment'
  amount_cents    INT NOT NULL,
  description     TEXT,
  stripe_payment  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- AUDIT LOG
-- ─────────────────────────────────────────
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID REFERENCES profiles(id),
  action          TEXT NOT NULL,
  table_name      TEXT NOT NULL,
  record_id       UUID,
  old_data        JSONB,
  new_data        JSONB,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'info',
  is_read         BOOLEAN NOT NULL DEFAULT false,
  link            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- UPDATED_AT TRIGGER HELPER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_clients     BEFORE UPDATE ON clients     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_interviews  BEFORE UPDATE ON interviews  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_documents   BEFORE UPDATE ON documents   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_queue       BEFORE UPDATE ON submission_queue FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trustee     BEFORE UPDATE ON trustee_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────
-- HELPER: get current user role
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_staff_or_above()
RETURNS BOOLEAN AS $$
  SELECT role IN ('master', 'admin', 'staff', 'notary') FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles: own read"     ON profiles FOR SELECT USING (auth.uid() = id OR is_staff_or_above());
CREATE POLICY "profiles: staff manage" ON profiles FOR ALL    USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- CLIENTS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients: staff full"    ON clients FOR ALL    USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());
CREATE POLICY "clients: own read"      ON clients FOR SELECT USING (profile_id = auth.uid());

-- INTERVIEWS
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interviews: staff full" ON interviews FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());
CREATE POLICY "interviews: client own" ON interviews FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
);

-- DOCUMENTS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs: staff full"       ON documents FOR ALL    USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());
CREATE POLICY "docs: client own"       ON documents FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
);

-- SUBMISSION QUEUE
ALTER TABLE submission_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue: staff full"      ON submission_queue FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- TRUSTEE ACCOUNTS
ALTER TABLE trustee_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trustee: staff full"    ON trustee_accounts FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());
CREATE POLICY "trustee: client own"    ON trustee_accounts FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
);

-- TRUSTEE LEDGER
ALTER TABLE trustee_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger: staff full"     ON trustee_ledger FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());
CREATE POLICY "ledger: client own"     ON trustee_ledger FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
);

-- AUDIT LOG
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit: master/admin only" ON audit_log FOR SELECT USING (
  current_user_role() IN ('master', 'admin')
);

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifs: own only" ON notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────


-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX idx_clients_profile      ON clients(profile_id);
CREATE INDEX idx_clients_assigned     ON clients(assigned_to);
CREATE INDEX idx_interviews_client    ON interviews(client_id);
CREATE INDEX idx_interviews_status    ON interviews(status);
CREATE INDEX idx_documents_client     ON documents(client_id);
CREATE INDEX idx_documents_status     ON documents(status);
CREATE INDEX idx_queue_status         ON submission_queue(status);
CREATE INDEX idx_queue_assigned       ON submission_queue(assigned_to);
CREATE INDEX idx_trustee_client       ON trustee_accounts(client_id);
CREATE INDEX idx_ledger_trustee       ON trustee_ledger(trustee_id);
CREATE INDEX idx_notifs_user          ON notifications(user_id, is_read);
CREATE INDEX idx_audit_actor          ON audit_log(actor_id);
CREATE INDEX idx_audit_table          ON audit_log(table_name, record_id);
