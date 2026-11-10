import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import {
  COLUMN_COLORS,
  boardQuery,
  columnColorClass,
  positionBetween,
  type BoardColumn,
  type TaskWithMeta,
} from "@/lib/board";
import {
  createColumn,
  createTask,
  deleteColumn,
  refreshBoard,
  updateColumn,
  updateTask,
} from "@/lib/board-actions";
import { cn } from "@/lib/utils";
import { SortableTaskCard, TaskCardBody } from "./task-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Grouped = Record<string, TaskWithMeta[]>;

function group(columns: BoardColumn[], tasks: TaskWithMeta[]): Grouped {
  const g: Grouped = {};
  for (const c of columns) g[c.id] = [];
  for (const t of [...tasks].sort((a, b) => a.position - b.position)) {
    (g[t.column_id] ??= []).push(t);
  }
  return g;
}

export function KanbanBoard({
  projectId,
  columns,
  tasks,
  filter,
  ownerInitials,
  selectedTaskId,
  onOpenTask,
}: {
  projectId: string;
  columns: BoardColumn[];
  tasks: TaskWithMeta[];
  filter: string;
  ownerInitials: string;
  selectedTaskId?: string | undefined;
  onOpenTask: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [items, setItems] = useState<Grouped>(() => group(columns, tasks));
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId) setItems(group(columns, tasks));
  }, [columns, tasks, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findContainer = (id: string) =>
    id in items ? id : Object.keys(items).find((k) => items[k]?.some((t) => t.id === id));

  const activeTask = useMemo(
    () => (activeId ? tasks.find((t) => t.id === activeId) : undefined),
    [activeId, tasks],
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = findContainer(String(active.id));
    const to = findContainer(String(over.id));
    if (!from || !to || from === to) return;
    setItems((prev) => {
      const fromItems = prev[from] ?? [];
      const toItems = prev[to] ?? [];
      const moving = fromItems.find((t) => t.id === active.id);
      if (!moving) return prev;
      const overIndex = toItems.findIndex((t) => t.id === over.id);
      const idx = overIndex >= 0 ? overIndex : toItems.length;
      return {
        ...prev,
        [from]: fromItems.filter((t) => t.id !== active.id),
        [to]: [...toItems.slice(0, idx), { ...moving, column_id: to }, ...toItems.slice(idx)],
      };
    });
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id);
    const container = findContainer(id);
    setActiveId(null);
    if (!over || !container) return;
    let list = items[container] ?? [];
    const oldIndex = list.findIndex((t) => t.id === id);
    const overIndex = list.findIndex((t) => t.id === over.id);
    if (overIndex >= 0 && oldIndex !== overIndex) list = arrayMove(list, oldIndex, overIndex);
    const idx = list.findIndex((t) => t.id === id);
    const position = positionBetween(list[idx - 1]?.position, list[idx + 1]?.position);
    const original = tasks.find((t) => t.id === id);
    list = list.map((t) => (t.id === id ? { ...t, position, column_id: container } : t));
    setItems((prev) => ({ ...prev, [container]: list }));
    if (!original || (original.column_id === container && original.position === position)) return;

    const key = boardQuery(projectId).queryKey;
    qc.setQueryData(key, (old) =>
      old
        ? {
            ...old,
            tasks: old.tasks.map((t) =>
              t.id === id ? { ...t, position, column_id: container } : t,
            ),
          }
        : old,
    );
    try {
      await updateTask(id, { column_id: container, position });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't move task");
    } finally {
      refreshBoard(qc, projectId);
    }
  }

  const q = filter.trim().toLowerCase();
  const visible = (list: TaskWithMeta[]) =>
    q
      ? list.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
            `d-${t.ref}`.includes(q),
        )
      : list;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="scrollbar-thin flex h-full items-start gap-4 overflow-x-auto px-6 pb-6 pt-5">
        {columns.map((col, i) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={visible(items[col.id] ?? [])}
            totalCount={(items[col.id] ?? []).length}
            projectId={projectId}
            ownerInitials={ownerInitials}
            selectedTaskId={selectedTaskId}
            onOpenTask={onOpenTask}
            prev={columns[i - 1]}
            next={columns[i + 1]}
            nextNext={columns[i + 2]}
            prevPrev={columns[i - 2]}
          />
        ))}
        <AddColumn projectId={projectId} lastPosition={columns[columns.length - 1]?.position} />
      </div>
      <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.22,1,0.36,1)" }}>
        {activeTask ? (
          <TaskCardBody
            task={activeTask}
            ownerInitials={ownerInitials}
            className="w-[296px] rotate-[1.5deg] cursor-grabbing shadow-lift"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  column,
  tasks,
  totalCount,
  projectId,
  ownerInitials,
  selectedTaskId,
  onOpenTask,
  prev,
  next,
  prevPrev,
  nextNext,
}: {
  column: BoardColumn;
  tasks: TaskWithMeta[];
  totalCount: number;
  projectId: string;
  ownerInitials: string;
  selectedTaskId?: string | undefined;
  onOpenTask: (id: string) => void;
  prev?: BoardColumn | undefined;
  next?: BoardColumn | undefined;
  prevPrev?: BoardColumn | undefined;
  nextNext?: BoardColumn | undefined;
}) {
  const qc = useQueryClient();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(column.name);

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      refreshBoard(qc, projectId);
    }
  }

  async function saveName() {
    setRenaming(false);
    const n = name.trim();
    if (!n || n === column.name) return setName(column.name);
    await run(() => updateColumn(column.id, { name: n }));
  }

  return (
    <section className="flex max-h-full w-[312px] shrink-0 flex-col rounded-2xl bg-muted/60 p-2">
      <header className="flex items-center gap-2 px-2 pb-2 pt-1.5">
        <span
          className={cn("h-4 w-1 rounded-full", columnColorClass[column.color] ?? "bg-col-slate")}
        />
        {renaming ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setName(column.name);
                setRenaming(false);
              }
            }}
            className="h-7 text-sm"
          />
        ) : (
          <h2
            className="truncate text-sm font-semibold tracking-tight"
            onDoubleClick={() => setRenaming(true)}
          >
            {column.name}
          </h2>
        )}
        <span className="rounded-md border bg-card px-1.5 text-[11px] tabular-nums text-muted-foreground">
          {totalCount}
        </span>
        <div className="ml-auto flex items-center">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Add task to ${column.name}`}
            onClick={() => setAdding(true)}
          >
            <Plus />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" aria-label="Column options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setRenaming(true)}>
                <Pencil /> Rename
              </DropdownMenuItem>
              <DropdownMenuLabel className="pb-1 pt-2 text-[11px] font-normal text-muted-foreground">
                Color
              </DropdownMenuLabel>
              <div className="flex gap-1.5 px-2 pb-2">
                {COLUMN_COLORS.map((c) => (
                  <button
                    key={c}
                    aria-label={c}
                    onClick={() => run(() => updateColumn(column.id, { color: c }))}
                    className={cn(
                      "size-5 rounded-full transition hover:scale-110",
                      columnColorClass[c],
                      column.color === c && "ring-2 ring-ring ring-offset-2 ring-offset-popover",
                    )}
                  />
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!prev}
                onSelect={() =>
                  prev &&
                  run(() =>
                    updateColumn(column.id, {
                      position: positionBetween(prevPrev?.position, prev.position),
                    }),
                  )
                }
              >
                <ArrowLeft /> Move left
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!next}
                onSelect={() =>
                  next &&
                  run(() =>
                    updateColumn(column.id, {
                      position: positionBetween(next.position, nextNext?.position),
                    }),
                  )
                }
              >
                <ArrowRight /> Move right
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => {
                  if (
                    window.confirm(
                      `Delete "${column.name}"${totalCount ? ` and its ${totalCount} task(s)` : ""}?`,
                    )
                  )
                    run(() => deleteColumn(column.id));
                }}
              >
                <Trash2 /> Delete column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "scrollbar-thin flex min-h-24 flex-1 flex-col gap-2.5 overflow-y-auto rounded-xl p-0.5 transition-colors",
            isOver && "bg-primary-soft/60",
          )}
        >
          {tasks.map((t) => (
            <SortableTaskCard
              key={t.id}
              task={t}
              ownerInitials={ownerInitials}
              selected={selectedTaskId === t.id}
              onOpen={() => onOpenTask(t.id)}
            />
          ))}
          {adding ? (
            <QuickAdd
              projectId={projectId}
              columnId={column.id}
              lastPosition={tasks[tasks.length - 1]?.position}
              onDone={() => setAdding(false)}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-input py-2.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-card hover:text-primary"
            >
              <Plus className="size-3.5" /> Add new
            </button>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function QuickAdd({
  projectId,
  columnId,
  lastPosition,
  onDone,
}: {
  projectId: string;
  columnId: string;
  lastPosition?: number | undefined;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  async function save() {
    const t = title.trim();
    if (!t) return onDone();
    setBusy(true);
    try {
      await createTask({
        project_id: projectId,
        column_id: columnId,
        title: t,
        position: positionBetween(lastPosition, undefined),
      });
      setTitle("");
      refreshBoard(qc, projectId);
      ref.current?.focus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add task");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-up rounded-xl border bg-card p-2 shadow-card">
      <Textarea
        ref={ref}
        autoFocus
        rows={2}
        value={title}
        disabled={busy}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") onDone();
        }}
        placeholder="Task title… (Enter to add)"
        className="min-h-0 resize-none border-0 p-1.5 text-sm shadow-none focus-visible:ring-0"
      />
      <div className="mt-1 flex justify-end gap-1">
        <Button size="xs" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button size="xs" variant="brand" onClick={save} disabled={busy || !title.trim()}>
          Add task
        </Button>
      </div>
    </div>
  );
}

function AddColumn({
  projectId,
  lastPosition,
}: {
  projectId: string;
  lastPosition?: number | undefined;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function save() {
    const n = name.trim();
    if (!n) return setOpen(false);
    try {
      await createColumn({
        project_id: projectId,
        name: n,
        color: COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)] ?? "slate",
        position: positionBetween(lastPosition, undefined),
      });
      setName("");
      setOpen(false);
      refreshBoard(qc, projectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add column");
    }
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex h-11 w-[260px] shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-input text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-card hover:text-primary"
      >
        <Plus className="size-4" /> Add column
      </button>
    );

  return (
    <div className="w-[260px] shrink-0 animate-fade-up rounded-2xl border bg-card p-2 shadow-card">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Column name"
        className="h-8"
      />
      <div className="mt-2 flex justify-end gap-1">
        <Button size="xs" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button size="xs" variant="brand" onClick={save}>
          Add column
        </Button>
      </div>
    </div>
  );
}
