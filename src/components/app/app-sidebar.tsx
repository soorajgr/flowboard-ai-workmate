import { Link, useNavigate, useParams, useRouteContext, useSearch } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format, isPast, isToday, parseISO } from "date-fns";
import {
  ArrowUpRight,
  Bot,
  ChevronsUpDown,
  Folder,
  FolderOpen,
  LogOut,
  Plus,
  UserPen,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { initials, must, profileQuery, projectsQuery } from "@/lib/board";
import { useAssistant } from "@/hooks/use-assistant";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "@/components/brand";
import { NewProjectDialog } from "./new-project-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const upcomingQuery = () =>
  queryOptions({
    queryKey: ["upcoming"],
    queryFn: async () =>
      must(
        await supabase
          .from("tasks")
          .select("id, title, due_date, project_id")
          .not("due_date", "is", null)
          .order("due_date", { ascending: true })
          .limit(5),
      ),
  });

function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 mt-6 flex items-center justify-between px-3">
      <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {children}
      </span>
      {action}
    </div>
  );
}

export function AppSidebar() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const { data: profile } = useQuery(profileQuery(user.id));
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: upcoming = [] } = useQuery(upcomingQuery());
  const params = useParams({ strict: false }) as { projectId?: string };
  const { chat } = useSearch({ strict: false }) as { chat?: string };
  const assistant = useAssistant();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const displayName = profile?.display_name || user.email?.split("@")[0] || "You";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  }

  async function saveName() {
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: nameDraft.trim() })
      .eq("id", user.id);
    if (error) return void toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["profile", user.id] });
    setEditOpen(false);
  }

  return (
    <aside className="flex w-[264px] shrink-0 flex-col px-3 py-4">
      <div className="px-2">
        <BrandWordmark />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="mt-5 flex w-full items-center gap-2.5 rounded-xl border bg-card p-2 text-left shadow-card transition hover:bg-accent">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-semibold text-primary">
            {initials(displayName)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{displayName}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Account</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => {
              setNameDraft(displayName);
              setEditOpen(true);
            }}
          >
            <UserPen /> Edit display name
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={signOut}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={() => (chat ? assistant.close() : assistant.open())}
        className={cn(
          "mt-4 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
          chat
            ? "bg-primary-soft font-medium text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent",
        )}
      >
        <Bot className="size-4" />
        AI Assistant
        <kbd className="ml-auto rounded border bg-card px-1.5 font-mono text-[10px] text-muted-foreground">
          Ask
        </kbd>
      </button>

      <SectionLabel
        action={
          <NewProjectDialog>
            <button
              aria-label="New project"
              className="rounded-md p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <Plus className="size-3.5" />
            </button>
          </NewProjectDialog>
        }
      >
        My projects
      </SectionLabel>
      <nav className="scrollbar-thin -mx-1 max-h-[38vh] space-y-0.5 overflow-y-auto px-1">
        {projects.map((p) => {
          const active = params.projectId === p.id;
          const Icon = active ? FolderOpen : Folder;
          return (
            <Link
              key={p.id}
              to="/app/p/$projectId"
              params={{ projectId: p.id }}
              search={{ chat }}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-card"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/70",
              )}
            >
              <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
              <span className="truncate">{p.name}</span>
            </Link>
          );
        })}
        {projects.length === 0 && (
          <p className="px-3 py-1 text-xs text-muted-foreground">No projects yet.</p>
        )}
      </nav>

      <SectionLabel>Incoming deadlines</SectionLabel>
      <div className="space-y-0.5">
        {upcoming.map((t) => {
          const d = parseISO(t.due_date as string);
          const overdue = isPast(d) && !isToday(d);
          return (
            <Link
              key={t.id}
              to="/app/p/$projectId"
              params={{ projectId: t.project_id }}
              search={{ chat, task: t.id }}
              className="group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/70"
            >
              <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary" />
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              <span
                className={cn(
                  "shrink-0 text-[11px] tabular-nums",
                  overdue ? "font-medium text-prio-high" : "text-muted-foreground",
                )}
              >
                {isToday(d) ? "Today" : format(d, "MMM d")}
              </span>
            </Link>
          );
        })}
        {upcoming.length === 0 && (
          <p className="px-3 py-1 text-xs text-muted-foreground">Nothing scheduled.</p>
        )}
      </div>

      <div className="mt-auto rounded-xl border bg-card p-3 shadow-card">
        <p className="text-xs font-medium">Tip</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Ask the assistant to “create three tasks for launch week” — it updates your board for you.
        </p>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Display name</DialogTitle>
          </DialogHeader>
          <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="brand" onClick={saveName} disabled={!nameDraft.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
