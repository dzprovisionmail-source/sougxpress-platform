-- Migration: 202607110002700_admin_audit_logs
-- Purpose: Dedicated admin/founder action audit log.
--          Separate from public.audit_logs (trigger-driven system log).
--          This table records intentional admin/founder actions.
--
-- Security model:
--   - SELECT: admin and founder only (via get_user_role)
--   - INSERT: NO direct client INSERT policy — must use log_admin_audit_event() RPC
--   - The RPC is SECURITY DEFINER and re-verifies the caller's role internally

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action         TEXT        NOT NULL,
  entity_type    TEXT        NOT NULL,
  entity_id      UUID,
  details        JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_user_id
  ON public.admin_audit_logs(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON public.admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity_type
  ON public.admin_audit_logs(entity_type);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admin / founder may read entries.
DROP POLICY IF EXISTS rls_select_admin_audit_logs ON public.admin_audit_logs;
CREATE POLICY rls_select_admin_audit_logs ON public.admin_audit_logs
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('admin', 'founder')
  );

-- No INSERT policy is defined intentionally.
-- Direct client inserts are blocked by RLS (no permissive INSERT policy).
-- All writes MUST go through log_admin_audit_event() below.

-- ─── Secure RPC ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_admin_audit_event(
  p_action       TEXT,
  p_entity_type  TEXT,
  p_entity_id    UUID    DEFAULT NULL,
  p_details      JSONB   DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Reject anonymous callers
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Re-verify role inside the function (cannot be spoofed from client)
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();

  IF v_role NOT IN ('admin', 'founder') THEN
    RAISE EXCEPTION 'Insufficient privilege: role % cannot write to admin_audit_logs', v_role;
  END IF;

  INSERT INTO public.admin_audit_logs (
    admin_user_id, action, entity_type, entity_id, details
  )
  VALUES (
    auth.uid(), p_action, p_entity_type, p_entity_id, p_details
  );
END;
$$;

-- Grant execute to authenticated users (the function itself enforces role check)
GRANT EXECUTE ON FUNCTION public.log_admin_audit_event(TEXT, TEXT, UUID, JSONB)
  TO authenticated;
