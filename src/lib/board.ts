import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type Project = Tables["projects"]["Row"];
export type BoardColumn = Tables["board_columns"]["Row"];
export type Task = Tables["tasks"]["Row"];
export type Subtask = Tables["subtasks"]["Row"];
export type TaskComment = Tables["task_comments"]["Row"];
export type Profile = Tables["profiles"]["Row"];
export type Priority = "low" | "medium" | "high";

export type TaskWithMeta = Task & {
  subtasks: Pick<Subtask, "id" | "done">[];
  task_comments: { count: number }[];
};

export const COLUMN_COLORS = ["slate", "amber", "violet", "emerald", "sky", "rose"] as const;
export type ColumnColor = (typeof COLUMN_COLORS)[number];

/** Static class names so Tailwind can see them. */
export const columnColorClass: Record<string, string> = {
  slate: "bg-col-slate",
  amber: "bg-col-amber",
  violet: "bg-col-violet",
  emerald: "bg-col-emerald",
  sky: "bg-col-sky",
  rose: "bg-col-rose",
};

export const PROJECT_COLORS = ["violet", "sky", "emerald", "amber", "rose"] as const;

export const priorityClass: Record<Priority, string> = {
  high: "bg-prio-high-soft text-prio-high",
  medium: "bg-prio-medium-soft text-prio-medium",
  low: "bg-prio-low-soft text-prio-low",
};

export const priorityLabel: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Position between two neighbours (fractional indexing with gaps of 1000). */
export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return 1000;
  if (before === undefined) return (after as number) - 1000;
  if (after === undefined) return before + 1000;
  return (before + after) / 2;
}

/** Progress (0–100) from a task's subtasks. */
export function taskProgress(subtasks: Pick<Subtask, "done">[]): number {
  if (subtasks.length === 0) return 0;
  return Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100);
}

export function initials(name: string | null | undefined): string {
  const clean = (name ?? "").trim();
  if (!clean) return "?";
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const projectsQuery = () =>
  queryOptions({
    queryKey: ["projects"],
    queryFn: async () =>
      must(
        await supabase
          .from("projects")
          .select("*")
          .order("position", { ascending: true })
          .order("created_at", { ascending: true }),
      ),
  });

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () =>
      must(await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()),
  });

export const boardQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["board", projectId],
    queryFn: async () => {
      const [project, columns, tasks] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
        supabase.from("board_columns").select("*").eq("project_id", projectId).order("position"),
        supabase
          .from("tasks")
          .select("*, subtasks(id, done), task_comments(count)")
          .eq("project_id", projectId)
          .order("position"),
      ]);
      return {
        project: must(project),
        columns: must(columns),
        tasks: must(tasks) as unknown as TaskWithMeta[],
      };
    },
  });

export const taskDetailQuery = (taskId: string) =>
  queryOptions({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const [subtasks, comments] = await Promise.all([
        supabase.from("subtasks").select("*").eq("task_id", taskId).order("position"),
        supabase
          .from("task_comments")
          .select("*")
          .eq("task_id", taskId)
          .order("created_at", { ascending: true }),
      ]);
      return { subtasks: must(subtasks), comments: must(comments) };
    },
  });

export { must };
