-- INT-006: Weekly AI mock interview quota.
-- Default: 5 sessions per student per IST week.
-- Local migration draft: do not deploy until tested.

CREATE TABLE IF NOT EXISTS public.interview_quota_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  weekly_limit integer NOT NULL DEFAULT 5
    CHECK (weekly_limit > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.interview_quota_config (id, weekly_limit)
VALUES (1, 5)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.interview_quota_user_locks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Dedicated permission for managing the quota.
INSERT INTO public.staff_permissions (key, group_name, label, sort_order)
VALUES (
  'interview_quota.manage',
  'Student features',
  'Manage Interview Quota',
  220
)
ON CONFLICT (key) DO UPDATE
SET group_name = EXCLUDED.group_name,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

-- Only the existing main_admin and admin labels receive this permission.
INSERT INTO public.staff_label_permissions (label_id, permission_key)
SELECT l.id, 'interview_quota.manage'
FROM public.staff_labels l
WHERE l.slug IN ('main_admin', 'admin')
ON CONFLICT DO NOTHING;

ALTER TABLE public.interview_quota_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_quota_user_locks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.interview_quota_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.interview_quota_config TO service_role;

REVOKE ALL ON public.interview_quota_user_locks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.interview_quota_user_locks TO service_role;
