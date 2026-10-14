import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Video } from "@/components/video";
import { getHub } from "@/lib/data/hub";
import { activityRows, assets } from "@/lib/data/extra";
import { createClient } from "@/lib/supabase/server";
import { firstName, hiddenNav, todayActions } from "@/lib/process";

export const metadata: Metadata = { title: "Bienvenida · CEP" };

export default function WelcomePage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Welcome />
    </Suspense>
  );
}

const LINK: Record<string, { href: string; icon: IconName }> = {
  contract: { href: "/contrato", icon: "pen" },
  form: { href: "/radiografia", icon: "pulse" },
  video_module: { href: "/modulos", icon: "play" },
  homework: { href: "/modulos", icon: "pen" },
  therapy_session: { href: "/terapia", icon: "heart" },
  group_session: { href: "/coaching", icon: "users" },
};

async function Welcome() {
  const { me, hub } = await getHub();
  if (!me || !hub) return <section className="card empty">Todavía no tienes un proceso activo.</section>;
  const supabase = await createClient();

  // Video de bienvenida configurado en la versión del servicio.
  const { data: version } = await supabase
    .from("service_versions").select("welcome_activity_id").eq("id", (await enrollmentVersion(hub.enrollment.enrollment_id!)) ?? "").maybeSingle();
  const firstTrack = Math.min(...hub.activities.map((a) => a.track_position ?? 99));
  const startActs = hub.activities.filter((a) => a.track_position === firstTrack);
  const rows = await activityRows([...startActs.map((a) => a.activity_id!)]);
  const welcomeRow = rows.find((r) => r.source_activity_id === version?.welcome_activity_id);
  const assetMap = await assets(welcomeRow?.asset_id ? [welcomeRow.asset_id] : []);
  const welcomeAsset = welcomeRow?.asset_id ? assetMap.get(welcomeRow.asset_id) : null;

  const names = hub.members.map((m) => firstName(m.name)).filter(Boolean);
  const done = startActs.filter((a) => a.is_completed).length;
  const finished = hiddenNav(hub).includes("/bienvenida");
  const [first] = todayActions(hub);
  const team = hub.staff.filter((s) => s.roleKey !== "coordinator").map((s) => firstName(s.personName)).join(", ");

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Primeros pasos</p>
          <h1>Bienvenidos, {names.join(" y ")}</h1>
          <p className="lead">Acaban de dar un paso importante. Aquí siempre verán dónde están, qué sigue y qué pueden hacer hoy.</p>
        </div>
      </div>
      {finished && first && (
        <div className="alert info">
          <Icon name="check" />
          <div style={{ flex: 1 }}><b>Ya completaron su bienvenida.</b> Pueden volver a ver el video cuando quieran. Lo que sigue: {first.title}.</div>
          <Link className="btn sm" href={first.href}>{first.cta} <Icon name="arrow" size={14} /></Link>
        </div>
      )}
      <div className="grid2">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Video asset={welcomeAsset} title="Video de bienvenida" />
          <p className="muted small">En el video: cómo es su proceso, con quién es cada sesión y cómo usar esta app.</p>
        </div>
        <section className="card">
          <div className="ch">
            <h2>Su inicio</h2>
            <span className={`chip ${done === startActs.length ? "ok" : "info"}`}>{done} de {startActs.length}</span>
          </div>
          <div className="list">
            {startActs.map((a) => {
              const row = rows.find((r) => r.id === a.activity_id);
              const isTeam = a.type === "staff_task";
              const url = a.type === "external_link" ? ((row?.config as { url?: string } | null)?.url ?? null) : null;
              const link = LINK[a.type ?? ""];
              return (
                <div className="li" key={a.activity_id}>
                  <span className={`ico ${a.is_completed ? "ok" : "info"}`}><Icon name={a.is_completed ? "check" : isTeam ? "clock" : link?.icon ?? "route"} /></span>
                  <div className="tx">
                    <b>{a.title}</b>
                    <span>{isTeam ? (a.is_completed ? "Hecho por el equipo" : "A cargo del equipo") : row?.summary ?? ""}</span>
                  </div>
                  {!a.is_completed && !isTeam && (url
                    ? <a className="btn sm" href={url} target="_blank" rel="noreferrer">Abrir</a>
                    : link && <Link className="btn ghost sm" href={link.href}>Ir</Link>)}
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <section className="card">
        <p className="quote">
          «Trabajamos con mucha estructura, pero no se trata de que ustedes se adapten a ella. Todos nuestros recursos se adaptan a su caso. Esto no es una receta.»
          <cite>{team ? `${team} y el equipo` : "El equipo"}</cite>
        </p>
      </section>
      <section className="card">
        <div className="ch"><h2>Cómo funciona su proceso</h2><span className="muted small">{hub.steps.length} pasos · {hub.tracks.length} áreas</span></div>
        <div className="grid2e">
          {hub.tracks.map((t) => (
            <div className="li" key={t.track_key} style={{ borderTop: 0 }}>
              <span className="ico info"><Icon name="route" /></span>
              <div className="tx"><b>{t.track_name}</b><span>{t.activities_completed} de {t.activities_total} hechas</span></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

async function enrollmentVersion(enrollmentId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("enrollments").select("service_version_id").eq("id", enrollmentId).maybeSingle();
  return data?.service_version_id;
}
