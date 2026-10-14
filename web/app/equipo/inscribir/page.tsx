import { Suspense } from "react";
import { EnrollForm } from "@/components/enroll-form";
import { getStaff } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";

export default function EnrollPage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Enroll />
    </Suspense>
  );
}

async function Enroll() {
  const staff = await getStaff();
  if (!staff?.canSell) return <section className="card empty">Solo ventas o admin pueden inscribir.</section>;
  const supabase = await createClient();
  const [{ data: versions }, { data: members }, { data: roles }] = await Promise.all([
    supabase.from("service_versions").select("id, version, services(name, unit_kind, price_cents, currency)").eq("status", "published"),
    supabase.from("staff_members").select("profile_id, title, profiles(full_name)").eq("is_active", true),
    supabase.from("care_roles").select("id, key, name"),
  ]);
  const ids = (versions ?? []).map((v) => v.id);
  const { data: acts } = await supabase.from("service_activities").select("version_id, responsible_role_id").in("version_id", ids).not("responsible_role_id", "is", null);

  const options = (versions ?? []).map((v) => {
    const used = new Set((acts ?? []).filter((a) => a.version_id === v.id).map((a) => a.responsible_role_id));
    const price = v.services?.price_cents ? ` · ${(v.services.price_cents / 100).toLocaleString("es")} ${v.services.currency}` : "";
    return {
      id: v.id,
      label: `${v.services?.name} (v${v.version})${price}`,
      unitKind: v.services?.unit_kind ?? "couple",
      roles: (roles ?? []).filter((r) => used.has(r.id)),
    };
  });
  const team = (members ?? []).map((m) => ({ id: m.profile_id, name: `${m.profiles?.full_name} · ${m.title}` }));
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Ventas</p>
          <h1>Inscribir una pareja</h1>
          <p className="lead">Al confirmar la compra: elige el servicio, la fecha de inicio y quién del equipo lleva cada parte. Cada persona recibe su invitación para entrar.</p>
        </div>
      </div>
      <section className="card">
        {options.length === 0 ? <p className="muted">No hay servicios publicados.</p> : <EnrollForm versions={options} team={team} today={today} />}
      </section>
    </>
  );
}
