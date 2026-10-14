import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AvatarForm, ChangePasswordForm, ProfileForm } from "@/components/profile-forms";
import { avatarUrl } from "@/lib/data/extra";
import { firstName } from "@/lib/process";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tu perfil · CEP" };

export default function ProfilePage() {
  return (
    <Suspense fallback={<section className="card" style={{ minHeight: 400 }} aria-busy="true" />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (!uid) return null;
  const { data: p } = await supabase.from("profiles").select("full_name, phone, email, avatar_path").eq("id", uid).maybeSingle();
  const name = p?.full_name ?? "";
  const photo = await avatarUrl(p?.avatar_path);

  return (
    <>
      <div className="ph">
        <div>
          <p className="eyebrow">Tu perfil</p>
          <h1>{firstName(name) ? `Hola, ${firstName(name)}` : "Tu perfil"}</h1>
          <p className="lead">Tu foto, tus datos y tu contraseña. Es tu cuenta personal: tu pareja tiene la suya.</p>
        </div>
      </div>
      <section className="card">
        <h2 style={{ marginBottom: 16 }}>Tu foto</h2>
        <AvatarForm uid={uid} initial={firstName(name).charAt(0) || "·"} photo={photo} />
      </section>
      <div className="grid2e">
        <section className="card">
          <h2 style={{ marginBottom: 16 }}>Tus datos</h2>
          <ProfileForm name={name} phone={p?.phone ?? ""} email={p?.email ?? (auth?.claims?.email as string) ?? ""} />
        </section>
        <section className="card">
          <h2 style={{ marginBottom: 16 }}>Contraseña</h2>
          <ChangePasswordForm />
        </section>
      </div>
    </>
  );
}
