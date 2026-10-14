import { icsEvent } from "@/lib/ics";
import { groupTitle } from "@/lib/process";
import { createClient } from "@/lib/supabase/server";

// La RLS decide si el usuario puede ver la sesión; si no, 404.
export async function GET(_req: Request, ctx: RouteContext<"/calendario/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("No encontrado", { status: 404 });
  const supabase = await createClient();
  let ev: Parameters<typeof icsEvent>[0] | null = null;

  if (kind === "sesion") {
    const { data } = await supabase.from("enrollment_sessions")
      .select("id, scheduled_at, meeting_url, status, enrollment_activities(title, key)").eq("id", id).maybeSingle();
    if (data?.scheduled_at && data.status === "scheduled") {
      const a = data.enrollment_activities;
      ev = { uid: `sesion-${data.id}`, title: `${a?.key ? `${a.key} · ` : ""}${a?.title ?? "Sesión de terapia"} · Creciendo en pareja`, start: new Date(data.scheduled_at), minutes: 60, url: data.meeting_url };
    }
  } else if (kind === "coaching") {
    const { data } = await supabase.from("group_sessions").select("id, scheduled_at, meeting_url, title, status").eq("id", id).maybeSingle();
    if (data) ev = { uid: `coaching-${data.id}`, title: `${groupTitle(data)} · Creciendo en pareja`, start: new Date(data.scheduled_at), minutes: 90, url: data.meeting_url };
  }

  if (!ev) return new Response("No encontrado", { status: 404 });
  return new Response(icsEvent(ev), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}-${id.slice(0, 8)}.ics"`, "Cache-Control": "private, no-store" },
  });
}
