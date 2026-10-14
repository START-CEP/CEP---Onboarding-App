"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { changePassword, saveAvatar, updateProfile, type AccountState } from "@/lib/actions/account";
import { createClient } from "@/lib/supabase/client";

export function AvatarForm({ uid, initial, photo }: { uid: string; initial: string; photo: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(photo);
  const [msg, setMsg] = useState<AccountState>({});
  const [pending, start] = useTransition();

  function upload(file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setMsg({ error: "Usa una foto JPG, PNG o WEBP." });
    if (file.size > 5 * 1024 * 1024) return setMsg({ error: "La foto pesa más de 5 MB." });
    start(async () => {
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${uid}/foto-${Date.now()}.${ext}`;
      const { error } = await createClient().storage.from("avatars").upload(path, file, { contentType: file.type });
      if (error) return setMsg({ error: "No pudimos subir tu foto. Inténtalo de nuevo." });
      const r = await saveAvatar(path);
      setMsg(r);
      if (r.ok) setPreview(URL.createObjectURL(file));
    });
  }

  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local o URL firmada */}
      <span className="av lg">{preview ? <img src={preview} alt="Tu foto" /> : initial}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
        <button className="btn soft sm" type="button" disabled={pending} onClick={() => input.current?.click()}>
          {pending ? "Subiendo…" : preview ? "Cambiar foto" : "Subir foto"}
        </button>
        <span className="small muted">JPG, PNG o WEBP, hasta 5 MB. La ven tu pareja y el equipo.</span>
        {msg.error && <p className="formerr" role="alert">{msg.error}</p>}
        {msg.ok && <p className="formok" role="status">{msg.ok}</p>}
      </div>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </div>
  );
}

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateProfile, {});
  return (
    <form action={action} className="qblock" style={{ gap: 14 }}>
      <div className="field">
        <label htmlFor="full_name">Nombre</label>
        <input className="input" id="full_name" name="full_name" autoComplete="name" defaultValue={name} required />
      </div>
      <div className="field">
        <label htmlFor="phone">Teléfono</label>
        <input className="input" id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={phone} placeholder="+52 55 1234 5678" />
        <span className="hint">Con código de país. Lo usa el equipo para contactarte.</span>
      </div>
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input className="input" id="email" value={email} readOnly disabled />
        <span className="hint">Es tu usuario para entrar. Si necesitas cambiarlo, pídeselo al equipo.</span>
      </div>
      {state.error && <p className="formerr" role="alert">{state.error}</p>}
      {state.ok && <p className="formok" role="status">{state.ok}</p>}
      <button className="btn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>{pending ? "Guardando…" : "Guardar datos"}</button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<AccountState, FormData>(changePassword, {});
  return (
    <form action={action} className="qblock" style={{ gap: 14 }} key={state.ok ? "done" : "form"}>
      <div className="field">
        <label htmlFor="current">Contraseña actual</label>
        <input className="input" id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña nueva</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <span className="hint">Al menos 10 caracteres.</span>
      </div>
      <div className="field">
        <label htmlFor="confirm">Repite la nueva</label>
        <input className="input" id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      {state.error && <p className="formerr" role="alert">{state.error}</p>}
      {state.ok && <p className="formok" role="status">{state.ok}</p>}
      <button className="btn" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>{pending ? "Cambiando…" : "Cambiar contraseña"}</button>
    </form>
  );
}
