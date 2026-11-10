import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { format, isPast, isToday, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Bot,
  ChevronRight,
  Kanban,
  List,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import {
  boardQuery,
  columnColorClass,
  initials,
  priorityClass,
  priorityLabel,
  profileQuery,
  taskProgress,
  type Priority,
} from "@/lib/board";
import { deleteProject, updateProject } from "@/lib/board-actions";
import { useAssistant } from "@/hooks/use-assistant";
import { cn } from "@/lib/utils";
import { KanbanBoard } from "@/components/board/kanban-board";
import { TaskPanel } from "@/components/board/task-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/app/p/$projectId")({
  validateSearch: z.object({
    task: z.string().optional(),
    view: z.enum(["kanban", "list"]).optional(),
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(boardQuery(params.projectId)),
  head: () => ({
    meta: [
      { title: "Board — Flowboard" },
      { name: "description", content: "Your Kanban board on Flowboard." },
      { property: "og:title", content: "Board — Flowboard" },
      { property: "og:description", content: "Your Kanban board on Flowboard." },
    ],
  }),
  component: BoardPage,
});

function BoardPage() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const assistant = useAssistant();
  const { data } = useSuspenseQuery(boardQuery(projectId));
  const { data: profile } = useQuery(profileQuery(user.id));
  const [filter, setFilter] = useState("");

  const ownerName = profile?.display_name || user.email?.split("@")[0] || "You";
  const ownerInitials = initials(ownerName);
  const view = search.view ?? "kanban";

  if (!data.project) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-lg font-semibold">Project not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">It may have been deleted.</p>
          <Button asChild variant="subtle" className="mt-4">
            <Link to="/app">Back to my boards</Link>
          </Button>
        </div>
      </div>
    );
  }
  const project = data.project;
  const selectedTask = search.task ? data.tasks.find((t) => t.id === search.task) : undefined;
  const doneColumn = data.columns[data.columns.length - 1];
  const doneCount = doneColumn ? data.tasks.filter((t) => t.column_id === doneColumn.id).length : 0;

  const openTask = (id: string | undefined) =>
    navigate({ search: (prev) => ({ ...prev, task: id }) });

  async function rename() {
    const name = window.prompt("Rename project", project.name)?.trim();
    if (!name || name === project.name) return;
    try {
      await updateProject(project.id, { name });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["board", project.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't rename");
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${project.name}" and all of its tasks?`)) return;
    try {
      await deleteProject(project.id);
      await qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/app", search: { chat: search.chat } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-2 border-b px-6 py-3 text-sm">
        <span className="text-muted-foreground">My projects</span>
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <span className="font-medium">{project.name}</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search tasks"
              className="h-8 w-56 bg-muted/60 pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Project header */}
      <div className="flex flex-wrap items-center gap-4 px-6 pb-3 pt-5">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand text-lg font-semibold text-primary-foreground shadow-brand">
          {project.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-xl font-semibold tracking-tight">{project.name}</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label="Project options">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={rename}>
                  <Pencil /> Rename project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={remove}
                >
                  <Trash2 /> Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {project.client && (
              <span>
                Client: <span className="text-foreground">{project.client}</span>
              </span>
            )}
            <span>
              Tasks: <span className="text-foreground">{data.tasks.length}</span>
            </span>
            <span>
              Completed: <span className="font-medium text-col-emerald">{doneCount}</span>
            </span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border bg-muted/60 p-0.5">
            {(
              [
                ["kanban", Kanban, "Kanban"],
                ["list", List, "List"],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                onClick={() => navigate({ search: (prev) => ({ ...prev, view: v }) })}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
                  view === v
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
          <Button variant="brand" onClick={() => assistant.open()}>
            <Bot /> Ask AI
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="relative min-h-0 flex-1 bg-dots">
        {view === "kanban" ? (
          <KanbanBoard
            projectId={project.id}
            columns={data.columns}
            tasks={data.tasks}
            filter={filter}
            ownerInitials={ownerInitials}
            selectedTaskId={search.task}
            onOpenTask={(id) => openTask(id)}
          />
        ) : (
          <div className="scrollbar-thin h-full overflow-auto p-6">
            <div className="overflow-hidden rounded-xl border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Task</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Priority</th>
                    <th className="px-4 py-2.5 font-medium">Due</th>
                    <th className="px-4 py-2.5 font-medium">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tasks
                    .filter((t) => !filter || t.title.toLowerCase().includes(filter.toLowerCase()))
                    .map((t) => {
                      const col = data.columns.find((c) => c.id === t.column_id);
                      const due = t.due_date ? parseISO(t.due_date) : null;
                      const p = taskProgress(t.subtasks);
                      return (
                        <tr
                          key={t.id}
                          onClick={() => openTask(t.id)}
                          className="cursor-pointer border-t transition hover:bg-muted/50"
                        >
                          <td className="px-4 py-3">
                            <span className="mr-2 font-mono text-[11px] text-muted-foreground">
                              D-{t.ref}
                            </span>
                            <span className="font-medium">{t.title}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2 text-xs">
                              <span
                                className={cn(
                                  "h-3 w-1 rounded-full",
                                  columnColorClass[col?.color ?? "slate"],
                                )}
                              />
                              {col?.name}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                                priorityClass[t.priority as Priority],
                              )}
                            >
                              {priorityLabel[t.priority as Priority]}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-xs",
                              due && isPast(due) && !isToday(due)
                                ? "font-medium text-prio-high"
                                : "text-muted-foreground",
                            )}
                          >
                            {due ? format(due, "MMM d, yyyy") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${p}%` }}
                                />
                              </div>
                              <span className="text-[11px] tabular-nums text-muted-foreground">
                                {p}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedTask && (
          <TaskPanel
            key={selectedTask.id}
            task={selectedTask}
            project={project}
            columns={data.columns}
            ownerInitials={ownerInitials}
            ownerName={ownerName}
            onClose={() => openTask(undefined)}
          />
        )}
      </div>
    </div>
  );
}
