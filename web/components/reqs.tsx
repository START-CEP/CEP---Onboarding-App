import { Icon } from "@/components/icon";
import { reqSummary } from "@/lib/process";
import type { RequirementRow } from "@/lib/data/hub";

/** Requisitos de una sesión o paso: lo pendiente uno a uno y lo cumplido resumido en un chip. */
export function Reqs({ reqs, title = "Para esta sesión es importante haber visto y completado:", allDone = false, dark = false }: {
  reqs: RequirementRow[]; title?: string; allDone?: boolean; dark?: boolean;
}) {
  if (reqs.length === 0) return null;
  const s = reqSummary(allDone ? reqs.map((r) => ({ ...r, is_met: true })) : reqs);
  return (
    <div>
      <span className="small" style={{ fontWeight: 700, ...(dark ? { color: "#8E9AC0" } : {}) }}>{title}</span>
      <div className="reqs">
        {s.pending.map((r) => (
          <span key={r.id} className="req no"><Icon name="lock" size={13} /> {r.label}</span>
        ))}
        {s.doneCount > 0 && <span className="req ok"><Icon name="check" size={13} /> {s.doneText}</span>}
      </div>
    </div>
  );
}
