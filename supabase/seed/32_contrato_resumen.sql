-- Resumen del contrato del proceso de pareja alineado con la revisión de Emilia (2026-10-14):
-- sin «su pareja no ve sus respuestas» (el cliente es la relación) y cambios de fecha con 72 horas.
-- Solo cambia los puntos del resumen; el texto legal no se toca.
update public.contract_templates ct
set summary_points = jsonb_build_array(
  jsonb_build_object('title', 'Qué incluye', 'body', '10 sesiones (9 de terapia: 3 con Emilia y 6 con la psicóloga; y 1 de coaching en pareja con Diego), 9 módulos en video y coaching grupal.'),
  jsonb_build_object('title', 'Cómo avanzan', 'body', '14 pasos; antes de cada sesión les decimos qué es indispensable haber visto y completado. El avance clínico lo marca Emilia en sesión.'),
  jsonb_build_object('title', 'Sus respuestas', 'body', 'Lo que cada uno responde queda en su ficha y lo que responden juntos, en la de los dos. Trabajamos con la relación.'),
  jsonb_build_object('title', 'Su compromiso', 'body', 'Ver los módulos y entregar las tareas antes de la sesión que los requiere.'),
  jsonb_build_object('title', 'Cambios de fecha', 'body', 'Cualquier cambio con más de 72 horas de anticipación. Si cancelan con menos tiempo o no se presentan, la sesión se descuenta de su paquete o se paga el 50% para reagendarla.'))
where ct.id in (select contract_template_id from public.service_activities sa
                join public.service_versions v on v.id = sa.version_id
                join public.services s on s.id = v.service_id
                where s.name = 'Proceso de pareja' and v.status = 'published' and sa.key = 'CON');
