import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/database.types";
import type { Hub } from "@/lib/data/hub";

type Tables = Database["public"]["Tables"];

export type Question = {
  key: string;
  type: "text" | "textarea" | "number" | "scale" | "single_choice" | "multi_choice";
  label: string;
  min?: number;
  max?: number;
  options?: string[];
};
export type Section = { key: string; title: string; scope: "individual" | "shared"; questions: Question[] };

export type ModuleStatus = "done" | "task" | "available" | "locked";

export type ModuleItem = {
  activityId: string;
  key: string;
  title: string;
  trackName: string;
  minutes: number | null;
  status: ModuleStatus;
  hasTask: boolean;
  taskSent: boolean;
  partnerViewed: boolean | null;
  requiredFor: string[];
};

export type ModuleDetail = ModuleItem & {
  enrollmentId: string;
  responseScope: Database["public"]["Enums"]["response_scope"];
  video: { kind: "bunny"; libraryId: string; videoId: string; ready: boolean } | { kind: "pending" } | null;
  form: { versionId: string; sections: Section[] } | null;
  viewedByMe: boolean;
  submitted: Pick<Tables["form_submissions"]["Row"], "id" | "answers" | "submitted_at"> | null;
  draft: Pick<Tables["form_submissions"]["Row"], "id" | "answers"> | null;
  uploadedFiles: string[];
};

/** Módulos en video del servicio (genérico: toda actividad video_module de la inscripción). */
export async function getModules(hub: Hub, focusKey?: string) {
  const supabase = await createClient();
  const videos = hub.activities.filter((a) => a.type === "video_module");
  const ids = videos.map((a) => a.activity_id!).filter(Boolean);
  const partner = hub.members.find((m) => m.profileId !== hub.me.id);

  const [acts, progress, subs] = await Promise.all([
    supabase.from("enrollment_activities").select("id, asset_id, form_version_id, response_scope").in("id", ids),
    supabase.from("activity_progress").select("enrollment_activity_id, profile_id, status").in("enrollment_activity_id", ids),
    supabase.from("form_submissions").select("id, enrollment_activity_id, submitted_by, status, answers, submitted_at")
      .in("enrollment_activity_id", ids).order("created_at", { ascending: false }),
  ]);

  const viewed = (activityId: string, profileId: string) =>
    (progress.data ?? []).some((p) => p.enrollment_activity_id === activityId && p.profile_id === profileId && p.status === "completed");
  const mySubs = (activityId: string) =>
    (subs.data ?? []).filter((s) => s.enrollment_activity_id === activityId && s.submitted_by === hub.me.id);

  const items: ModuleItem[] = videos.map((a) => {
    const row = acts.data?.find((x) => x.id === a.activity_id);
    const hasTask = Boolean(row?.form_version_id);
    const seen = viewed(a.activity_id!, hub.me.id);
    const sent = mySubs(a.activity_id!).some((s) => s.status === "submitted");
    const status: ModuleStatus = (a.blocking_unmet ?? 0) > 0 ? "locked" : seen && (!hasTask || sent) ? "done" : seen ? "task" : "available";
    const requiredFor = hub.requirements
      .filter((r) => r.required_activity_id === a.activity_id && r.target_step_position)
      .map((r) => hub.steps.find((s) => s.position === r.target_step_position))
      .map((s) => (s?.activity_type === "therapy_session" ? s.activity_key : s?.title) ?? "")
      .filter((v, i, arr) => v && arr.indexOf(v) === i);
    return {
      activityId: a.activity_id!,
      key: a.key ?? "",
      title: a.title ?? "",
      trackName: a.track_name ?? "",
      minutes: a.estimated_minutes,
      status,
      hasTask,
      taskSent: sent,
      partnerViewed: partner ? viewed(a.activity_id!, partner.profileId) : null,
      requiredFor,
    };
  });

  const focus =
    items.find((m) => m.key === focusKey) ??
    items.find((m) => m.status === "task") ??
    items.find((m) => m.status === "available" && m.requiredFor.length > 0) ??
    items.find((m) => m.status === "available") ??
    items[0];
  if (!focus) return { items, detail: null };

  const row = acts.data?.find((x) => x.id === focus.activityId);
  const [asset, form] = await Promise.all([
    row?.asset_id
      ? supabase.from("content_assets").select("provider, provider_id, provider_library_id, processing_status").eq("id", row.asset_id).maybeSingle()
      : Promise.resolve({ data: null }),
    row?.form_version_id
      ? supabase.from("form_versions").select("id, schema").eq("id", row.form_version_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const mine = mySubs(focus.activityId);
  const submitted = mine.find((s) => s.status === "submitted") ?? null;
  const draft = mine.find((s) => s.status === "draft") ?? null;
  let uploadedFiles: string[] = [];
  if (submitted) {
    const { data } = await supabase.from("submission_files").select("files(path)").eq("submission_id", submitted.id);
    uploadedFiles = (data ?? [])
      .map((f) => (f.files?.path.split("/").at(-1) ?? "").replace(/^[0-9a-f-]{36}-/, ""))
      .filter(Boolean);
  }

  const a = asset.data;
  const video: ModuleDetail["video"] =
    a?.provider === "bunny" && a.provider_id && a.provider_library_id
      ? { kind: "bunny", libraryId: a.provider_library_id, videoId: a.provider_id, ready: a.processing_status === "ready" }
      : a ? { kind: "pending" } : null;

  const detail: ModuleDetail = {
    ...focus,
    enrollmentId: hub.enrollment.enrollment_id!,
    responseScope: row?.response_scope ?? "individual",
    video,
    form: form.data ? { versionId: form.data.id, sections: parseSections(form.data.schema) } : null,
    viewedByMe: viewed(focus.activityId, hub.me.id),
    submitted: submitted ? { id: submitted.id, answers: submitted.answers, submitted_at: submitted.submitted_at } : null,
    draft: draft ? { id: draft.id, answers: draft.answers } : null,
    uploadedFiles,
  };
  return { items, detail };
}

function parseSections(schema: Json): Section[] {
  const sections = (schema as { sections?: Section[] } | null)?.sections;
  return Array.isArray(sections) ? sections : [];
}
