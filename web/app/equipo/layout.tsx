import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { StaffBottomNav, StaffNav } from "@/components/staff-nav";
import { getStaff } from "@/lib/data/staff";
import { signOut } from "../login/actions";

export const metadata: Metadata = { title: "Equipo · CEP" };

const ROLE_NAME = { admin: "Admin", clinician: "Terapia", assistant: "Asistente", sales: "Ventas" } as const;

async function Shell({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  if (!staff) redirect("/");
  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="mark">C</span>
          <div>CEP<small>Panel del equipo</small></div>
        </div>
        <StaffNav admin={staff.isAdmin} sales={staff.canSell} />
        <div className="spacer" />
        <form action={signOut}>
          <button className="nav" type="submit"><Icon name="out" /><span>Cerrar sesión</span></button>
        </form>
      </aside>
      <main className="main">
        <div className="top">
          <div className="crumb">Panel del equipo</div>
          <div className="r">
            <div className="who">
              <span className="av">{staff.name.charAt(0)}</span>
              <div><b>{staff.name}</b><span>{staff.roles.map((r) => ROLE_NAME[r]).join(" · ")}</span></div>
            </div>
          </div>
        </div>
        <div className="content">{children}</div>
      </main>
      <StaffBottomNav admin={staff.isAdmin} sales={staff.canSell} />
    </div>
  );
}

export default function StaffLayout({ children }: LayoutProps<"/equipo">) {
  return (
    <Suspense fallback={<div className="app" aria-busy="true" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
