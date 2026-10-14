-- Roles del equipo y roles clínicos. Se usa en local y en la nube.
-- Requiere que existan los usuarios (local: 00_users_local.sql; nube: scripts/seed-remote-demo.sh).

insert into public.staff_members (profile_id, title) values
  ('a0000000-0000-4000-8000-000000000001', 'Administración'),
  ('a0000000-0000-4000-8000-000000000002', 'Terapeuta principal'),
  ('a0000000-0000-4000-8000-000000000003', 'Psicóloga'),
  ('a0000000-0000-4000-8000-000000000004', 'Especialista DISC'),
  ('a0000000-0000-4000-8000-000000000005', 'Asistente');

insert into public.staff_roles (profile_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'admin'),
  ('a0000000-0000-4000-8000-000000000002', 'clinician'),
  ('a0000000-0000-4000-8000-000000000003', 'clinician'),
  ('a0000000-0000-4000-8000-000000000004', 'clinician'),
  ('a0000000-0000-4000-8000-000000000005', 'assistant'),
  ('a0000000-0000-4000-8000-000000000005', 'sales');

insert into public.care_roles (key, name, description) values
  ('lead_therapist',  'Terapeuta principal', 'Marca el avance clínico (Emilia).'),
  ('psychologist',    'Psicóloga',           'Sesiones de historia de vida y profundización.'),
  ('disc_specialist', 'Especialista DISC',   'Sesión de personalidad (Diego).'),
  ('coordinator',     'Coordinación',        'Onboarding y seguimiento (Yasna).');
