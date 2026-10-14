import type { Database } from "@/lib/database.types";

export type ActType = Database["public"]["Enums"]["activity_type"];

export const ACTIVITY_TYPES: [ActType, string][] = [
  ["video_module", "Video (módulo)"], ["homework", "Tarea"], ["form", "Cuestionario"], ["contract", "Contrato"],
  ["therapy_session", "Sesión de terapia"], ["group_session", "Coaching grupal"], ["staff_task", "Tarea del equipo"],
  ["external_link", "Enlace externo"], ["reading", "Lectura"], ["checklist", "Checklist"],
];
