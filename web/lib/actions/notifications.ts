"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markAllRead() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("profile_id", data.claims.sub).is("read_at", null);
  refresh();
}

export async function setTaskDone(taskId: string, done: boolean) {
  const supabase = await createClient();
  await supabase.from("staff_tasks").update({ status: done ? "done" : "open", done_at: done ? new Date().toISOString() : null }).eq("id", taskId);
  refresh();
}
