import { createFileRoute, redirect } from "@tanstack/react-router";
import { FolderPlus } from "lucide-react";
import { projectsQuery } from "@/lib/board";
import { NewProjectDialog } from "@/components/app/new-project-dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/")({
  loader: async ({ context, location }) => {
    const projects = await context.queryClient.ensureQueryData(projectsQuery());
    const first = projects[0];
    if (first) {
      const chat = (location.search as { chat?: string }).chat;
      throw redirect({
        to: "/app/p/$projectId",
        params: { projectId: first.id },
        search: { chat },
        replace: true,
      });
    }
    return null;
  },
  component: EmptyApp,
});

function EmptyApp() {
  return (
    <div className="flex flex-1 items-center justify-center bg-dots p-8">
      <div className="max-w-sm animate-fade-up text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand text-primary-foreground shadow-brand">
          <FolderPlus className="size-5" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Create your first project</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Each project gets its own Kanban board with To-Do, In Progress, In Review and Done.
        </p>
        <NewProjectDialog>
          <Button variant="brand" className="mt-6">
            New project
          </Button>
        </NewProjectDialog>
      </div>
    </div>
  );
}
