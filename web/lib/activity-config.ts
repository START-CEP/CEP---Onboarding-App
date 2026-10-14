// Claves de configuración de una actividad (service_activities.config → enrollment_activities.config):
//   session_label  tipo de sesión que ve la pareja («Sesión de terapia de pareja», «Sesión de coaching en pareja»…)
//   video_title    título del video principal de un módulo (su lección 1)
//   items          contenidos extra de un módulo: [{ asset_id, title }]; los videos son sus lecciones 2, 3…
//   faq            preguntas frecuentes (contrato): [{ q, a }]
type Cfg = unknown;
export type Item = { asset_id: string; title: string };
export type Faq = { q: string; a: string };

const obj = (c: Cfg): Record<string, unknown> => (c && typeof c === "object" && !Array.isArray(c) ? (c as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function sessionLabel(cfg: Cfg, participants: string | null | undefined): string {
  const own = str(obj(cfg).session_label);
  if (own) return own;
  return participants === "member_1" || participants === "member_2" ? "Sesión individual" : "Sesión de terapia de pareja";
}

export function parseItems(cfg: Cfg): Item[] {
  const list = obj(cfg).items;
  if (!Array.isArray(list)) return [];
  return list.flatMap((x) => {
    const o = obj(x);
    return typeof o.asset_id === "string" && o.asset_id ? [{ asset_id: o.asset_id, title: str(o.title) }] : [];
  });
}

export function videoTitle(cfg: Cfg): string {
  return str(obj(cfg).video_title);
}

/** Dirección de un módulo y, si no es la primera, de una de sus lecciones. */
export const moduleHref = (key: string, lesson = 1) => `/modulos?m=${encodeURIComponent(key)}${lesson > 1 ? `&l=${lesson}` : ""}`;

export function parseFaq(cfg: Cfg): Faq[] {
  const list = obj(cfg).faq;
  if (!Array.isArray(list)) return [];
  return list.flatMap((x) => {
    const o = obj(x);
    const q = str(o.q), a = str(o.a);
    return q && a ? [{ q, a }] : [];
  });
}

/** Une los campos con formulario propio a la configuración existente, sin perder claves que no conoce. */
export function buildConfig(base: Record<string, unknown>, f: { url?: string; sessionLabel?: string; videoTitle?: string; items?: Item[]; faq?: Faq[]; checklist?: unknown[] }) {
  const out: Record<string, unknown> = { ...base };
  const set = (k: string, v: unknown, keep: boolean) => { if (keep) out[k] = v; else delete out[k]; };
  if (f.url !== undefined) set("url", f.url.trim(), Boolean(f.url.trim()));
  if (f.sessionLabel !== undefined) set("session_label", f.sessionLabel.trim(), Boolean(f.sessionLabel.trim()));
  if (f.videoTitle !== undefined) set("video_title", f.videoTitle.trim(), Boolean(f.videoTitle.trim()));
  if (f.items !== undefined) {
    const items = f.items.filter((i) => i.asset_id).map((i) => ({ asset_id: i.asset_id, title: i.title.trim() }));
    set("items", items, items.length > 0);
  }
  if (f.faq !== undefined) {
    const faq = f.faq.map((x) => ({ q: x.q.trim(), a: x.a.trim() })).filter((x) => x.q && x.a);
    set("faq", faq, faq.length > 0);
  }
  if (f.checklist !== undefined) set("checklist", f.checklist, f.checklist.length > 0);
  return out;
}

/** Qué mostrar de cada contenido extra. Si el módulo está bloqueado, nada se firma ni se reproduce. */
export function extrasPlan(items: Item[], assets: Map<string, { kind: string }>, locked: boolean) {
  return items.map((i) => {
    const a = assets.get(i.asset_id);
    const kind: "locked" | "video" | "file" | "missing" = locked ? "locked" : !a ? "missing" : a.kind === "video" ? "video" : "file";
    return { ...i, kind };
  });
}
