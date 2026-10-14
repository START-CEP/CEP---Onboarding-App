// Estructura de los formularios (form_versions.schema). La usan el constructor del admin, el servidor y la app de la pareja.

export type QuestionType =
  | "text" | "textarea" | "number" | "email" | "date" | "yes_no" | "scale" | "single_choice" | "multi_choice";

export type Question = {
  key: string;
  type: QuestionType;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
  options?: string[];
};

export type Section = { key: string; title: string; description?: string; scope: "individual" | "shared"; questions: Question[] };
export type FormSchema = { sections: Section[] };

export const FORM_KINDS = [
  ["homework", "Tarea de un módulo"],
  ["intake", "Cuestionario inicial"],
  ["profile", "Onboarding"],
  ["test", "Test"],
  ["feedback", "Cierre / feedback"],
] as const;

export const QUESTION_TYPES: { type: QuestionType; label: string; hint: string; glyph: string }[] = [
  { type: "textarea", label: "Respuesta larga", hint: "Un párrafo o más", glyph: "¶" },
  { type: "text", label: "Respuesta corta", hint: "Una línea", glyph: "Aa" },
  { type: "single_choice", label: "Opción única", hint: "Elige una", glyph: "◉" },
  { type: "multi_choice", label: "Varias opciones", hint: "Elige todas las que apliquen", glyph: "☑" },
  { type: "yes_no", label: "Sí / No", hint: "Dos botones", glyph: "±" },
  { type: "scale", label: "Escala", hint: "Del 1 al 5, al 10…", glyph: "⋯" },
  { type: "number", label: "Número", hint: "Edad, años, cantidad…", glyph: "#" },
  { type: "email", label: "Correo", hint: "Valida el formato", glyph: "@" },
  { type: "date", label: "Fecha", hint: "Calendario", glyph: "◷" },
];

export const typeInfo = (t: QuestionType) => QUESTION_TYPES.find((x) => x.type === t) ?? QUESTION_TYPES[0];
export const hasOptions = (t: QuestionType) => t === "single_choice" || t === "multi_choice";

export function newKey(prefix: string, taken: Set<string>) {
  for (;;) {
    const k = `${prefix}_${Math.random().toString(36).slice(2, 7)}`;
    if (!taken.has(k)) return k;
  }
}

export function newQuestion(type: QuestionType, taken: Set<string>): Question {
  const q: Question = { key: newKey("p", taken), type, label: "", required: true };
  if (hasOptions(type)) q.options = ["Opción 1", "Opción 2"];
  if (type === "scale") Object.assign(q, { min: 1, max: 5, minLabel: "", maxLabel: "" });
  return q;
}

export function allKeys(sections: Section[]) {
  return new Set(sections.flatMap((s) => [s.key, ...s.questions.map((q) => q.key)]));
}

export function parseSchema(schema: unknown): Section[] {
  const sections = (schema as { sections?: Section[] } | null)?.sections;
  return Array.isArray(sections) ? sections : [];
}

/** Devuelve el primer problema que impide publicar, o null. Lo usan el constructor y el servidor. */
export function schemaProblem(sections: Section[]): string | null {
  if (sections.length === 0) return "El formulario necesita al menos una sección.";
  const keys = new Set<string>();
  for (const [si, s] of sections.entries()) {
    const where = sections.length > 1 ? ` (sección ${si + 1})` : "";
    if (!s.key || keys.has(s.key)) return `Hay una sección con identificador repetido${where}.`;
    keys.add(s.key);
    if (s.scope !== "individual" && s.scope !== "shared") return `Elige si la sección${where} es individual o en pareja.`;
    if (s.questions.length === 0) return `La sección «${s.title || si + 1}» no tiene preguntas.`;
    for (const [qi, q] of s.questions.entries()) {
      const n = `La pregunta ${qi + 1}${where}`;
      if (!q.key || keys.has(q.key)) return `${n} tiene un identificador repetido.`;
      keys.add(q.key);
      if (!QUESTION_TYPES.some((t) => t.type === q.type)) return `${n} tiene un tipo no válido.`;
      if (!q.label?.trim()) return `${n} no tiene texto.`;
      if (hasOptions(q.type)) {
        const opts = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
        if (opts.length < 2) return `${n} necesita al menos dos opciones.`;
        if (new Set(opts).size !== opts.length) return `${n} tiene opciones repetidas.`;
      }
      if (q.type === "scale") {
        const min = q.min ?? 1, max = q.max ?? 5;
        if (!Number.isInteger(min) || !Number.isInteger(max) || max <= min || max - min > 10) return `${n}: la escala debe ir, por ejemplo, del 1 al 5 o del 0 al 10.`;
      }
    }
  }
  return null;
}

/** Limpia lo que el constructor deja a medias (opciones vacías, textos con espacios, campos que no aplican al tipo). */
export function cleanSchema(sections: Section[]): FormSchema {
  return {
    sections: sections.map((s) => ({
      key: s.key,
      title: s.title.trim(),
      ...(s.description?.trim() ? { description: s.description.trim() } : {}),
      scope: s.scope,
      questions: s.questions.map((q) => {
        const out: Question = { key: q.key, type: q.type, label: q.label.trim() };
        if (q.description?.trim()) out.description = q.description.trim();
        if (q.placeholder?.trim() && ["text", "textarea", "number", "email"].includes(q.type)) out.placeholder = q.placeholder.trim();
        if (q.required) out.required = true;
        if (hasOptions(q.type)) out.options = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
        if (q.type === "scale") {
          out.min = q.min ?? 1;
          out.max = q.max ?? 5;
          if (q.minLabel?.trim()) out.minLabel = q.minLabel.trim();
          if (q.maxLabel?.trim()) out.maxLabel = q.maxLabel.trim();
        }
        return out;
      }),
    })),
  };
}

/** Texto legible de una respuesta (para el panel del equipo). */
export function answerText(q: Question | undefined, v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (q?.type === "date" && typeof v === "string") {
    const d = new Date(`${v}T12:00:00`);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
  }
  if (q?.type === "scale" && typeof v === "number") return `${v} de ${q.max ?? 5}`;
  return String(v);
}
