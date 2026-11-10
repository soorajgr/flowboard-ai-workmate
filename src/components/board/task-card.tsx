import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isPast, isToday, parseISO } from "date-fns";
import { CalendarDays, CheckSquare, Loader, MessageSquare } from "lucide-react";
import {
  priorityClass,
  priorityLabel,
  taskProgress,
  type Priority,
  type TaskWithMeta,
} from "@/lib/board";
import { cn } from "@/lib/utils";

export function TaskCardBody({
  task,
  ownerInitials,
  className,
}: {
  task: TaskWithMeta;
  ownerInitials: string;
  className?: string;
}) {
  const progress = taskProgress(task.subtasks);
  const done = task.subtasks.filter((s) => s.done).length;
  const comments = task.task_comments?.[0]?.count ?? 0;
  const due = task.due_date ? parseISO(task.due_date) : null;
  const overdue = due ? isPast(due) && !isToday(due) : false;

  return (
    <div
      className={cn(
        "group/card rounded-xl border bg-card p-3.5 shadow-card transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-px hover:border-primary/25 hover:shadow-lift",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[10.5px] font-medium",
              priorityClass[task.priority as Priority],
            )}
          >
            {priorityLabel[task.priority as Priority]}
          </span>
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-tag-soft px-1.5 py-0.5 text-[10.5px] font-medium text-tag"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-[10.5px] text-muted-foreground">+{task.tags.length - 2}</span>
          )}
        </div>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">D-{task.ref}</span>
      </div>

      <h3 className="mt-2.5 text-[13.5px] font-medium leading-snug text-card-foreground">
        {task.title}
      </h3>
      {task.description && (
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      )}

      <div className="mt-3.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Loader className="size-3" /> Progress
          </span>
          <span className="tabular-nums">{progress}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary ring-2 ring-card">
          {ownerInitials}
        </span>
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          {due && (
            <span
              className={cn("flex items-center gap-1", overdue && "font-medium text-prio-high")}
            >
              <CalendarDays className="size-3" />
              {isToday(due) ? "Today" : format(due, "MMM d")}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="flex items-center gap-1 tabular-nums">
              <CheckSquare className="size-3" />
              {done}/{task.subtasks.length}
            </span>
          )}
          <span className="flex items-center gap-1 tabular-nums">
            <MessageSquare className="size-3" />
            {comments}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SortableTaskCard({
  task,
  ownerInitials,
  onOpen,
  selected,
}: {
  task: TaskWithMeta;
  ownerInitials: string;
  onOpen: () => void;
  selected: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task" },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
        (listeners?.["onKeyDown"] as ((ev: React.KeyboardEvent) => void) | undefined)?.(e);
      }}
      className={cn(
        "cursor-grab touch-none outline-none active:cursor-grabbing",
        isDragging && "opacity-35",
      )}
    >
      <TaskCardBody
        task={task}
        ownerInitials={ownerInitials}
        className={cn(selected && "border-primary/50 ring-2 ring-primary/15")}
      />
    </div>
  );
}
