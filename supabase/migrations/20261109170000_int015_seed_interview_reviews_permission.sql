-- INT-015 follow-up: seed staff permission for mentor review RPCs (port of 5cec8d9).
-- Apply after 20261109_interview_score_overrides.sql.
-- Do not run supabase db push against the shared project without approval.

-- ---------------------------------------------------------------------------
-- Staff permission: mentor review queue and score overrides (INT-015)
-- ---------------------------------------------------------------------------

INSERT INTO public.staff_permissions (key, group_name, label, sort_order)
VALUES (
  'interview.reviews',
  'Student features',
  'Review interview scores',
  230
)
ON CONFLICT (key) DO UPDATE
SET group_name = EXCLUDED.group_name,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

-- Only main_admin and admin receive this permission by default (same as interview_quota.manage).
INSERT INTO public.staff_label_permissions (label_id, permission_key)
SELECT l.id, 'interview.reviews'
FROM public.staff_labels l
WHERE l.slug IN ('main_admin', 'admin')
ON CONFLICT DO NOTHING;
