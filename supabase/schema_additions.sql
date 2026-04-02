-- ============================================================
-- eGrowth Legal — Schema Additions
-- Run this in Supabase SQL Editor AFTER the main schema.sql
-- ============================================================

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE delegate_status AS ENUM ('pending', 'active', 'revoked');
CREATE TYPE ad_placement AS ENUM ('slide_top', 'slide_bottom', 'sidebar');

-- ─────────────────────────────────────────
-- SLIDE EXPLAINERS (Feature 3)
-- Admin manages per-slide explainer content
-- ─────────────────────────────────────────
CREATE TABLE slide_explainers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type    TEXT NOT NULL,       -- 'trust_estate' | 'for_profit' | etc
  slide_index     INT NOT NULL,        -- 0-based slide number
  title           TEXT,
  body_text       TEXT,
  video_url       TEXT,                -- YouTube/Vimeo embed URL
  video_thumbnail TEXT,
  is_enabled      BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(service_type, slide_index)
);

-- ─────────────────────────────────────────
-- ADS (Feature 1)
-- Admin manages ads shown per slide
-- ─────────────────────────────────────────
CREATE TABLE ads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  image_url       TEXT NOT NULL,
  click_url       TEXT NOT NULL,
  placement       ad_placement NOT NULL DEFAULT 'slide_bottom',
  service_types   TEXT[] NOT NULL DEFAULT '{}',   -- empty = all services
  slide_indexes   INT[] NOT NULL DEFAULT '{}',    -- empty = all slides
  is_active       BOOLEAN NOT NULL DEFAULT true,
  priority        INT NOT NULL DEFAULT 1,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CLIENT IDENTITY VERIFICATION (Feature 5)
-- ─────────────────────────────────────────
CREATE TABLE client_verification (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  id_required         BOOLEAN NOT NULL DEFAULT false,    -- admin toggle
  status              verification_status NOT NULL DEFAULT 'unverified',
  id_front_path       TEXT,
  id_back_path        TEXT,
  selfie_path         TEXT,
  id_type             TEXT,                              -- 'drivers_license' | 'passport' | 'state_id'
  submitted_at        TIMESTAMPTZ,
  reviewed_at         TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES profiles(id),
  rejection_reason    TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- ACCOUNT DELEGATES (Feature 4)
-- Client shares account access with trusted contact
-- ─────────────────────────────────────────
CREATE TABLE account_delegates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  -- Delegate identity (must be fully verified before activation)
  delegate_full_name    TEXT NOT NULL,
  delegate_email        TEXT NOT NULL,
  delegate_phone        TEXT NOT NULL,
  delegate_dob          DATE NOT NULL,
  delegate_address      TEXT NOT NULL,
  relationship          TEXT NOT NULL,           -- 'spouse' | 'child' | 'attorney' | 'guardian' | 'friend' | 'other'
  relationship_detail   TEXT,
  -- Access control
  status                delegate_status NOT NULL DEFAULT 'pending',
  can_download          BOOLEAN NOT NULL DEFAULT true,
  can_print             BOOLEAN NOT NULL DEFAULT true,
  can_view_history      BOOLEAN NOT NULL DEFAULT true,
  -- Verification
  id_verified           BOOLEAN NOT NULL DEFAULT false,
  id_path               TEXT,
  -- Disclaimer
  disclaimer_signed     BOOLEAN NOT NULL DEFAULT false,
  disclaimer_signed_at  TIMESTAMPTZ,
  disclaimer_ip         TEXT,
  -- Admin controls
  revoked_by            UUID REFERENCES profiles(id),
  revoked_at            TIMESTAMPTZ,
  revoke_reason         TEXT,
  -- Meta
  invited_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- DELEGATE ACCESS LOG (audit trail)
-- ─────────────────────────────────────────
CREATE TABLE delegate_access_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegate_id   UUID NOT NULL REFERENCES account_delegates(id) ON DELETE CASCADE,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,       -- 'view_document' | 'download_document' | 'print_document' | 'view_history'
  document_id   UUID REFERENCES documents(id),
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────

-- Slide explainers: public read (client side needs it), staff manage
ALTER TABLE slide_explainers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "explainers: public read enabled" ON slide_explainers FOR SELECT USING (is_enabled = true);
CREATE POLICY "explainers: staff manage" ON slide_explainers FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- Ads: public read active, staff manage
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads: public read active" ON ads FOR SELECT USING (is_active = true);
CREATE POLICY "ads: staff manage" ON ads FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());

-- Client verification: client owns, staff full
ALTER TABLE client_verification ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verify: staff full" ON client_verification FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());
CREATE POLICY "verify: client own" ON client_verification FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
);
CREATE POLICY "verify: client upload" ON client_verification FOR UPDATE USING (
  client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
);

-- Delegates: client manages their own, staff full
ALTER TABLE account_delegates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delegates: staff full" ON account_delegates FOR ALL USING (is_staff_or_above()) WITH CHECK (is_staff_or_above());
CREATE POLICY "delegates: client own" ON account_delegates FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
) WITH CHECK (
  client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())
);

-- Delegate access log: staff read, system write
ALTER TABLE delegate_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delegate_log: staff read" ON delegate_access_log FOR SELECT USING (is_staff_or_above());

-- ─────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────
CREATE INDEX idx_explainers_service_slide ON slide_explainers(service_type, slide_index);
CREATE INDEX idx_ads_active ON ads(is_active, priority);
CREATE INDEX idx_verify_client ON client_verification(client_id, status);
CREATE INDEX idx_delegates_client ON account_delegates(client_id, status);
CREATE INDEX idx_delegate_log ON delegate_access_log(delegate_id, created_at);

-- ─────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES
  ('client-ids',  'client-ids',  false),
  ('ad-assets',   'ad-assets',   true);
