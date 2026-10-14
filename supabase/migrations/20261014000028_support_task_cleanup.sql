-- Las tareas de soporte creadas antes de la 0027 copiaban el asunto y el texto de la consulta.
-- Se reescriben con el mismo formato genérico (nombre de la pareja + enlace a la bandeja).
update public.staff_tasks st
set title = format('%s: responder consulta de soporte', cu.display_name),
    description = 'Ver en Soporte (/equipo/soporte).'
from public.enrollments e
join public.client_units cu on cu.id = e.unit_id
where st.enrollment_id = e.id
  and st.source = 'automatic'
  and st.dedupe_key like 'support:%'
  and st.description is distinct from 'Ver en Soporte (/equipo/soporte).';
