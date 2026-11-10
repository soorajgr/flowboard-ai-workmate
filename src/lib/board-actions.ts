import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { must } from "./board";

type T = Database["public"]["Tables"];

export function refreshBoard(qc: QueryClient, projectId?: string) {
  if (projectId) qc.invalidateQueries({ queryKey: ["board", projectId] });
  else qc.invalidateQueries({ queryKey: ["board"] });
  qc.invalidateQueries({ queryKey: ["upcoming"] });
}

export async function updateTask(id: string, patch: T["tasks"]["Update"]) {
  return must(await supabase.from("tasks").update(patch).eq("id", id).select().single());
}

export async function createTask(input: T["tasks"]["Insert"]) {
  return must(await supabase.from("tasks").insert(input).select().single());
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createColumn(input: T["board_columns"]["Insert"]) {
  return must(await supabase.from("board_columns").insert(input).select().single());
}

export async function updateColumn(id: string, patch: T["board_columns"]["Update"]) {
  return must(await supabase.from("board_columns").update(patch).eq("id", id).select().single());
}

export async function deleteColumn(id: string) {
  const { error } = await supabase.from("board_columns").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createProject(input: T["projects"]["Insert"]) {
  return must(await supabase.from("projects").insert(input).select().single());
}

export async function updateProject(id: string, patch: T["projects"]["Update"]) {
  return must(await supabase.from("projects").update(patch).eq("id", id).select().single());
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addSubtask(input: T["subtasks"]["Insert"]) {
  return must(await supabase.from("subtasks").insert(input).select().single());
}

export async function updateSubtask(id: string, patch: T["subtasks"]["Update"]) {
  const { error } = await supabase.from("subtasks").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSubtask(id: string) {
  const { error } = await supabase.from("subtasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addComment(input: T["task_comments"]["Insert"]) {
  return must(await supabase.from("task_comments").insert(input).select().single());
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from("task_comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
