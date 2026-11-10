import { tool } from "ai";
import { z } from "zod";
import type { UserSupabase } from "@/lib/supabase-user.server";

const priority = z.enum(["low", "medium", "high"]);

function fail(message: string): never {
  throw new Error(message);
}

async function nextPosition(supabase: UserSupabase, columnId: string) {
  const { data } = await supabase
    .from("tasks")
    .select("position")
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1);
  return (data?.[0]?.position ?? 0) + 1000;
}

async function resolveColumn(
  supabase: UserSupabase,
  projectId: string,
  columnId: string | null,
  columnName: string | null,
) {
  const { data: columns, error } = await supabase
    .from("board_columns")
    .select("id, name, position")
    .eq("project_id", projectId)
    .order("position");
  if (error) fail(error.message);
  if (!columns?.length) fail("This project has no columns yet.");
  if (columnId) {
    const c = columns.find((col) => col.id === columnId);
    if (!c) fail("Column not found in this project.");
    return c;
  }
  if (columnName) {
    const needle = columnName.trim().toLowerCase();
    const c =
      columns.find((col) => col.name.toLowerCase() === needle) ??
      columns.find((col) => col.name.toLowerCase().includes(needle));
    if (!c) fail(`No column named "${columnName}". Columns: ${columns.map((x) => x.name).join(", ")}`);
    return c;
  }
  return columns[0];
}

export function createBoardTools(supabase: UserSupabase, userId: string) {
  return {
    list_projects: tool({
      description:
        "List the user's projects (boards) with their columns and task counts. Call this first when you need project or column ids.",
      inputSchema: z.object({}),
      execute: async () => {
        const [{ data: projects, error }, { data: columns }, { data: tasks }] = await Promise.all([
          supabase.from("projects").select("id, name, client, description").order("position"),
          supabase.from("board_columns").select("id, name, project_id, position").order("position"),
          supabase.from("tasks").select("id, column_id"),
        ]);
        if (error) fail(error.message);
        return (projects ?? []).map((p) => ({
          ...p,
          columns: (columns ?? [])
            .filter((c) => c.project_id === p.id)
            .map((c) => ({
              id: c.id,
              name: c.name,
              task_count: (tasks ?? []).filter((t) => t.column_id === c.id).length,
            })),
        }));
      },
    }),

    list_tasks: tool({
      description:
        "List tasks with their project, column, priority, tags, due date, checklist progress and description. Filter by project, priority, or overdue.",
      inputSchema: z.object({
        project_id: z.string().nullable().describe("Limit to one project, or null for all"),
        priority: priority.nullable(),
        overdue_only: z.boolean().nullable(),
      }),
      execute: async ({ project_id, priority: prio, overdue_only }) => {
        let q = supabase
          .from("tasks")
          .select(
            "id, ref, title, description, priority, tags, due_date, project_id, column_id, subtasks(title, done), task_comments(count)",
          )
          .order("position");
        if (project_id) q = q.eq("project_id", project_id);
        if (prio) q = q.eq("priority", prio);
        if (overdue_only) q = q.lt("due_date", new Date().toISOString().slice(0, 10));
        const [{ data: tasks, error }, { data: columns }, { data: projects }] = await Promise.all([
          q,
          supabase.from("board_columns").select("id, name"),
          supabase.from("projects").select("id, name"),
        ]);
        if (error) fail(error.message);
        return (tasks ?? []).map((t) => {
          const subs = (t.subtasks ?? []) as { title: string; done: boolean }[];
          return {
            id: t.id,
            ref: `D-${t.ref}`,
            title: t.title,
            description: t.description,
            priority: t.priority,
            tags: t.tags,
            due_date: t.due_date,
            project: projects?.find((p) => p.id === t.project_id)?.name,
            project_id: t.project_id,
            column: columns?.find((c) => c.id === t.column_id)?.name,
            column_id: t.column_id,
            checklist: subs,
            comments: (t.task_comments as unknown as { count: number }[])?.[0]?.count ?? 0,
          };
        });
      },
    }),

    create_task: tool({
      description:
        "Create a new task card. Provide the project id and either a column id or a column name (defaults to the first column).",
      inputSchema: z.object({
        project_id: z.string(),
        column_id: z.string().nullable(),
        column_name: z.string().nullable(),
        title: z.string(),
        description: z.string().nullable(),
        priority: priority.nullable(),
        tags: z.array(z.string()).nullable(),
        due_date: z.string().nullable().describe("YYYY-MM-DD or null"),
        checklist: z.array(z.string()).nullable().describe("Optional checklist item titles"),
      }),
      execute: async (input) => {
        const column = await resolveColumn(
          supabase,
          input.project_id,
          input.column_id,
          input.column_name,
        );
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            project_id: input.project_id,
            column_id: column.id,
            user_id: userId,
            title: input.title.slice(0, 200),
            description: input.description ?? "",
            priority: input.priority ?? "medium",
            tags: (input.tags ?? []).slice(0, 8),
            due_date: input.due_date || null,
            position: await nextPosition(supabase, column.id),
          })
          .select("id, ref, title")
          .single();
        if (error) fail(error.message);
        if (input.checklist?.length) {
          const { error: subErr } = await supabase.from("subtasks").insert(
            input.checklist.slice(0, 20).map((title, i) => ({
              task_id: data.id,
              user_id: userId,
              title,
              position: (i + 1) * 1000,
            })),
          );
          if (subErr) fail(subErr.message);
        }
        return { created: true, id: data.id, ref: `D-${data.ref}`, title: data.title, column: column.name };
      },
    }),

    update_task: tool({
      description:
        "Edit a task's fields. Pass null for any field you don't want to change. To move it to another column use move_task.",
      inputSchema: z.object({
        task_id: z.string(),
        title: z.string().nullable(),
        description: z.string().nullable(),
        priority: priority.nullable(),
        tags: z.array(z.string()).nullable(),
        due_date: z.string().nullable().describe("YYYY-MM-DD, or null to leave unchanged"),
        clear_due_date: z.boolean().nullable(),
      }),
      execute: async (input) => {
        const patch: Record<string, unknown> = {};
        if (input.title) patch.title = input.title.slice(0, 200);
        if (input.description !== null) patch.description = input.description;
        if (input.priority) patch.priority = input.priority;
        if (input.tags) patch.tags = input.tags.slice(0, 8);
        if (input.due_date) patch.due_date = input.due_date;
        if (input.clear_due_date) patch.due_date = null;
        if (Object.keys(patch).length === 0) return { updated: false, reason: "Nothing to change" };
        const { data, error } = await supabase
          .from("tasks")
          .update(patch)
          .eq("id", input.task_id)
          .select("id, ref, title")
          .maybeSingle();
        if (error) fail(error.message);
        if (!data) fail("Task not found.");
        return { updated: true, id: data.id, ref: `D-${data.ref}`, title: data.title, changed: Object.keys(patch) };
      },
    }),

    move_task: tool({
      description: "Move a task to a different column (by column id or column name) within its project.",
      inputSchema: z.object({
        task_id: z.string(),
        column_id: z.string().nullable(),
        column_name: z.string().nullable(),
      }),
      execute: async ({ task_id, column_id, column_name }) => {
        const { data: task, error } = await supabase
          .from("tasks")
          .select("id, ref, title, project_id")
          .eq("id", task_id)
          .maybeSingle();
        if (error) fail(error.message);
        if (!task) fail("Task not found.");
        const column = await resolveColumn(supabase, task.project_id, column_id, column_name);
        const { error: upErr } = await supabase
          .from("tasks")
          .update({ column_id: column.id, position: await nextPosition(supabase, column.id) })
          .eq("id", task_id);
        if (upErr) fail(upErr.message);
        return { moved: true, ref: `D-${task.ref}`, title: task.title, to: column.name };
      },
    }),

    add_checklist_item: tool({
      description: "Add a checklist (subtask) item to a task.",
      inputSchema: z.object({ task_id: z.string(), title: z.string() }),
      execute: async ({ task_id, title }) => {
        const { data: last } = await supabase
          .from("subtasks")
          .select("position")
          .eq("task_id", task_id)
          .order("position", { ascending: false })
          .limit(1);
        const { error } = await supabase.from("subtasks").insert({
          task_id,
          user_id: userId,
          title,
          position: (last?.[0]?.position ?? 0) + 1000,
        });
        if (error) fail(error.message);
        return { added: true, title };
      },
    }),
  };
}
