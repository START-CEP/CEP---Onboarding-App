"use client";

import { useTransition } from "react";
import { setTaskDone } from "@/lib/actions/notifications";

export function TaskDone({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button className="btn ghost sm" disabled={pending} onClick={() => start(() => setTaskDone(id, true))}>Hecho</button>;
}
