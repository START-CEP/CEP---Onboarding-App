-- Usuarios de prueba (solo local). Contraseña de todos: cep-demo-2026

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', u.id::uuid, 'authenticated', 'authenticated', u.email,
       extensions.crypt('cep-demo-2026', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', u.name),
       now(), now(), '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001', 'admin@example.com',    'Admin CEP'),
  ('a0000000-0000-4000-8000-000000000002', 'emilia@example.com',   'Emilia'),
  ('a0000000-0000-4000-8000-000000000003', 'psicologa@example.com','Psicóloga del equipo'),
  ('a0000000-0000-4000-8000-000000000004', 'diego@example.com',    'Diego'),
  ('a0000000-0000-4000-8000-000000000005', 'yasna@example.com',    'Yasna'),
  ('b0000000-0000-4000-8000-000000000001', 'pedro@example.com',    'Pedro Ramírez'),
  ('b0000000-0000-4000-8000-000000000002', 'andrea@example.com',   'Andrea Solís'),
  ('b0000000-0000-4000-8000-000000000003', 'monica@example.com',   'Mónica Vidal')
) as u(id, email, name);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users
where email like '%@example.com';

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
