"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import type { ModuleItem } from "@/lib/data/modules";
import { keyRange } from "@/lib/process";
import { moduleHref } from "@/lib/activity-config";

const STATUS: Record<ModuleItem["status"], { icon: "check" | "pen" | "play" | "lock"; cls: string; text: string }> = {
  done: { icon: "check", cls: "ok", text: "Visto · tarea entregada" },
  task: { icon: "pen", cls: "warn", text: "Visto · falta la tarea" },
  available: { icon: "play", cls: "info", text: "Disponible" },
  locked: { icon: "lock", cls: "", text: "Se abre al cumplir su requisito" },
};

/** Lista de módulos; los que tienen varios videos se despliegan para ir directo a cada lección. */
export function ModuleList({ items, activeId, activeLesson }: { items: ModuleItem[]; activeId?: string; activeLesson: number }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(activeId ? [activeId] : []));
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="list modlist">
      {items.map((m, i) => {
        const s = STATUS[m.status];
        const on = m.activityId === activeId;
        const many = m.lessons.length > 1;
        const expanded = many && open.has(m.activityId);
        const text = m.status === "done" && !m.hasTask ? "Visto" : m.status === "available" && m.taskSent ? "Tarea entregada · falta ver el video" : s.text;
        return (
          <div key={m.activityId}>
            {m.trackName !== items[i - 1]?.trackName && <div className="blockhead">{m.trackName}</div>}
            <div className="modrow">
              <Link href={moduleHref(m.key)} className={`li ${on ? "on" : ""}`} aria-current={on ? "true" : undefined}>
                <span className={`ico ${s.cls}`}><Icon name={s.icon} /></span>
                <div className="tx">
                  <b>{m.title}</b>
                  <span>{text}{many ? ` · ${m.lessons.length} videos` : ""}{m.requiredFor.length ? ` · para ${keyRange(m.requiredFor)}` : ""}</span>
                </div>
              </Link>
              {many && (
                <button type="button" className="modtoggle" aria-expanded={expanded} aria-controls={`lec-${m.activityId}`}
                  aria-label={`${expanded ? "Ocultar" : "Ver"} los videos de ${m.title.split(" · ")[0]}`} onClick={() => toggle(m.activityId)}>
                  <Icon name="chev" size={16} />
                </button>
              )}
            </div>
            {expanded && (
              <ol className="lessons" id={`lec-${m.activityId}`}>
                {m.lessons.map((l) => {
                  const body = (
                    <>
                      <span className="n">{m.status === "locked" ? <Icon name="lock" size={11} /> : l.n}</span>
                      <span className="t">{l.title}</span>
                      {l.minutes ? <span className="m">{l.minutes} min</span> : null}
                    </>
                  );
                  return (
                    <li key={l.n}>
                      {m.status === "locked"
                        ? <span className="off">{body}</span>
                        : <Link href={moduleHref(m.key, l.n)} aria-current={on && l.n === activeLesson ? "true" : undefined}>{body}</Link>}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}
