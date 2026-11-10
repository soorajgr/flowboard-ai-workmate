import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject } from "@/lib/board-actions";

export function NewProjectDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const project = await createProject({
        name: name.trim(),
        client: client.trim(),
        position: Date.now(),
      });
      await qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false);
      setName("");
      setClient("");
      navigate({ to: "/app/p/$projectId", params: { projectId: project.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>A fresh board with four starter columns.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pname">Project name</Label>
              <Input
                id="pname"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Website redesign"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pclient">Client (optional)</Label>
              <Input
                id="pclient"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" variant="brand" disabled={busy || !name.trim()}>
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
