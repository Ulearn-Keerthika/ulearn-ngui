-- Student feature access: Allowed CRT / Allowed Interview.
-- Assign these permissions on a label, then add students as members.

INSERT INTO public.staff_permissions (key, group_name, label, sort_order) VALUES
  ('crt.access', 'Student features', 'Allowed CRT', 200),
  ('interview.access', 'Student features', 'Allowed Interview', 210)
ON CONFLICT (key) DO UPDATE
SET group_name = EXCLUDED.group_name,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order;

INSERT INTO public.staff_labels (slug, name, description, is_system, portal_access) VALUES
  ('allowed_crt', 'Allowed CRT', 'Students who can open CRT.', true, false),
  ('allowed_interview', 'Allowed Interview', 'Students who can open Interview.', true, false)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = true,
    portal_access = false;

INSERT INTO public.staff_label_permissions (label_id, permission_key)
SELECT l.id, 'crt.access'
FROM public.staff_labels l
WHERE l.slug IN ('main_admin', 'admin', 'allowed_crt')
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_label_permissions (label_id, permission_key)
SELECT l.id, 'interview.access'
FROM public.staff_labels l
WHERE l.slug IN ('main_admin', 'admin', 'allowed_interview')
ON CONFLICT DO NOTHING;
