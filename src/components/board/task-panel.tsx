import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  CalendarDays,
  CircleDot,
  Flag,
  Hash,
  Layers,
  MoreHorizontal,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  columnColorClass,
  priorityClass,
  taskDetailQuery,
  taskProgress,
  type BoardColumn,
  type Priority,
  type Project,
  type TaskWithMeta,
} from "@/lib/board";
import {
  addComment,
  addSubtask,
  deleteComment,
  deleteSubtask,
  deleteTask,
  refreshBoard,
  updateSubtask,
  updateTask,
} from "@/lib/board-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Flag;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-3 py-1.5">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </span>
      <div className="min-w-0 text-sm">{children}</div>
    </div>
  );
}

export function TaskPanel({
  task,
  project,
  columns,
  ownerInitials,
  ownerName,
  onClose,
}: {
  task: TaskWithMeta;
  project: Project;
  columns: BoardColumn[];
  ownerInitials: string;
  ownerName: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: detail } = useQuery(taskDetailQuery(task.id));
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [tagDraft, setTagDraft] = useState("");
  const [subDraft, setSubDraft] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
  }, [task.id, task.title, task.description]);

  const refresh = () => {
    refreshBoard(qc, project.id);
    qc.invalidateQueries({ queryKey: ["task", task.id] });
  };

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      refresh();
    }
  }

  const subtasks = detail?.subtasks ?? [];
  const comments = detail?.comments ?? [];
  const progress = taskProgress(detail ? subtasks : task.subtasks);
  const column = columns.find((c) => c.id === task.column_id);

  return (
    <aside className="absolute inset-y-3 right-3 z-20 flex w-[min(460px,calc(100%-24px))] animate-slide-in-right flex-col overflow-hidden rounded-2xl border bg-card shadow-panel">
      <div className="bg-panel-head px-5 pb-4 pt-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-primary-foreground shadow-brand">
            {project.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] text-muted-foreground">
              {project.name} · D-{task.ref}
            </p>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() =>
                title.trim() &&
                title !== task.title &&
                run(() => updateTask(task.id, { title: title.trim() }))
              }
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="mt-0.5 h-auto border-transparent bg-transparent px-0 py-0.5 text-lg font-semibold tracking-tight shadow-none hover:border-input focus-visible:border-input focus-visible:px-2"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="subtle" size="icon-sm" aria-label="Task options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={async () => {
                  if (!window.confirm(`Delete "${task.title}"?`)) return;
                  onClose();
                  await run(() => deleteTask(task.id));
                }}
              >
                <Trash2 /> Delete task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="subtle" size="icon-sm" aria-label="Close" onClick={onClose}>
            <X />
          </Button>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-6">
        <div className="border-b pb-3">
          <Row icon={CircleDot} label="Status">
            <Select
              value={task.column_id}
              onValueChange={(v) =>
                run(() => updateTask(task.id, { column_id: v, position: Date.now() }))
              }
            >
              <SelectTrigger className="h-8 w-auto gap-2 border-transparent px-2 shadow-none hover:border-input">
                <span
                  className={cn("h-3 w-1 rounded-full", columnColorClass[column?.color ?? "slate"])}
                />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row icon={Flag} label="Priority">
            <Select
              value={task.priority}
              onValueChange={(v) => run(() => updateTask(task.id, { priority: v }))}
            >
              <SelectTrigger className="h-8 w-auto border-transparent px-2 shadow-none hover:border-input">
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-xs font-medium",
                    priorityClass[task.priority as Priority],
                  )}
                >
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row icon={CalendarDays} label="Due date">
            <Input
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) => run(() => updateTask(task.id, { due_date: e.target.value || null }))}
              className="h-8 w-44 border-transparent px-2 shadow-none hover:border-input"
            />
          </Row>
          <Row icon={Tag} label="Tags">
            <div className="flex flex-wrap items-center gap-1.5">
              {task.tags.map((t) => (
                <span
                  key={t}
                  className="group/tag flex items-center gap-1 rounded-md bg-tag-soft px-1.5 py-0.5 text-xs font-medium text-tag"
                >
                  {t}
                  <button
                    aria-label={`Remove ${t}`}
                    onClick={() =>
                      run(() => updateTask(task.id, { tags: task.tags.filter((x) => x !== t) }))
                    }
                    className="opacity-50 hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  const v = tagDraft.trim();
                  if (e.key === "Enter" && v && !task.tags.includes(v)) {
                    setTagDraft("");
                    run(() => updateTask(task.id, { tags: [...task.tags, v] }));
                  }
                }}
                placeholder="+ Add tag"
                className="w-24 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
          </Row>
          <Row icon={Layers} label="Created by">
            <span className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                {ownerInitials}
              </span>
              {ownerName}
            </span>
          </Row>
          <Row icon={Hash} label="Progress">
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
            </div>
          </Row>
        </div>

        <Tabs defaultValue="checklist" className="mt-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="checklist">
              Checklist <span className="ml-1 text-muted-foreground">{subtasks.length}</span>
            </TabsTrigger>
            <TabsTrigger value="discussion">
              Discussion <span className="ml-1 text-muted-foreground">{comments.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-3">
            <Textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() =>
                description !== task.description && run(() => updateTask(task.id, { description }))
              }
              placeholder="Add more detail…"
              className="resize-none"
            />
          </TabsContent>

          <TabsContent value="checklist" className="mt-3 space-y-1">
            {subtasks.map((s) => (
              <div
                key={s.id}
                className="group/sub flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted"
              >
                <Checkbox
                  checked={s.done}
                  onCheckedChange={(v) => run(() => updateSubtask(s.id, { done: v === true }))}
                />
                <span
                  className={cn("flex-1 text-sm", s.done && "text-muted-foreground line-through")}
                >
                  {s.title}
                </span>
                <button
                  aria-label="Remove item"
                  onClick={() => run(() => deleteSubtask(s.id))}
                  className="text-muted-foreground opacity-0 transition group-hover/sub:opacity-100 hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <form
              className="flex items-center gap-2 px-2 pt-1"
              onSubmit={(e) => {
                e.preventDefault();
                const t = subDraft.trim();
                if (!t) return;
                setSubDraft("");
                run(() =>
                  addSubtask({
                    task_id: task.id,
                    title: t,
                    position: (subtasks[subtasks.length - 1]?.position ?? 0) + 1000,
                  }),
                );
              }}
            >
              <Plus className="size-4 text-muted-foreground" />
              <input
                value={subDraft}
                onChange={(e) => setSubDraft(e.target.value)}
                placeholder="Add checklist item"
                className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
            </form>
          </TabsContent>

          <TabsContent value="discussion" className="mt-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const b = comment.trim();
                if (!b) return;
                setComment("");
                run(() => addComment({ task_id: task.id, body: b }));
              }}
              className="rounded-xl border bg-card p-2 shadow-card focus-within:border-primary/40"
            >
              <Textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a comment…"
                className="min-h-0 resize-none border-0 p-1.5 shadow-none focus-visible:ring-0"
              />
              <div className="flex justify-end">
                <Button size="xs" variant="brand" type="submit" disabled={!comment.trim()}>
                  Publish
                </Button>
              </div>
            </form>
            <div className="mt-4 space-y-4">
              {[...comments].reverse().map((c) => (
                <div key={c.id} className="group/c flex gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                    {ownerInitials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">{ownerName}</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </span>
                      <button
                        onClick={() => run(() => deleteComment(c.id))}
                        className="ml-auto text-muted-foreground opacity-0 transition group-hover/c:opacity-100 hover:text-destructive"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">No comments yet.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  );
}
