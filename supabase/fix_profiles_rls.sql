-- ============================================================
-- eGrowth Legal — Re-enable Row Level Security on profiles
-- Run in Supabase SQL Editor on an existing database.
--
-- RLS on profiles had been switched off because two policies
-- ("profiles: read", "profiles: admin update") queried profiles
-- from inside a profiles policy, which Postgres rejects as
-- infinite recursion. "profiles: staff manage" also let any
-- staff member change any role, including their own.
--
-- The app writes profiles only through the service role
-- (src/app/api/team), so the browser needs read access only.
-- ============================================================
BEGIN;

DROP POLICY IF EXISTS "profiles: read"         ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin update" ON public.profiles;
DROP POLICY IF EXISTS "profiles: staff manage" ON public.profiles;
DROP POLICY IF EXISTS "profiles: own read"     ON public.profiles;

-- is_staff_or_above() is SECURITY DEFINER, so it reads profiles without recursing
CREATE POLICY "profiles: read own or staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff_or_above());

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMIT;
