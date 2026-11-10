import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { History, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { threadMessagesQuery, threadsQuery } from "@/lib/chat";
import { useAssistant } from "@/hooks/use-assistant";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChatWindow } from "./chat-window";
import { Shimmer } from "@/components/ai-elements/shimmer";

export function AssistantPanel({ threadId }: { threadId: string }) {
  const assistant = useAssistant();
  const qc = useQueryClient();
  const { data: threads = [] } = useQuery(threadsQuery());
  const { data: initial, isLoading, error } = useQuery(threadMessagesQuery(threadId));
  const current = threads.find((t) => t.id === threadId);

  async function removeThread(id: string) {
    const { error: err } = await supabase.from("chat_threads").delete().eq("id", id);
    if (err) return void toast.error(err.message);
    await qc.invalidateQueries({ queryKey: ["threads"] });
    qc.removeQueries({ queryKey: ["chat-messages", id] });
    if (id === threadId) {
      const next = threads.find((t) => t.id !== id);
      if (next) assistant.selectThread(next.id);
      else assistant.close();
    }
  }

  return (
    <aside className="flex w-[420px] shrink-0 animate-slide-in-right flex-col py-2 pr-2">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-panel shadow-card">
        <header className="flex items-center gap-2.5 border-b bg-panel-head px-4 py-3">
          <BrandMark className="size-8" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Flow Assistant</p>
            <p className="truncate text-xs text-muted-foreground">
              {current?.title ?? "Conversation"}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Conversations">
                <History />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Conversations
              </DropdownMenuLabel>
              <div className="scrollbar-thin max-h-80 overflow-y-auto">
                {threads.map((t) => (
                  <div key={t.id} className="group/t flex items-center">
                    <DropdownMenuItem
                      onSelect={() => assistant.selectThread(t.id)}
                      className={cn(
                        "min-w-0 flex-1 flex-col items-start gap-0",
                        t.id === threadId && "bg-accent",
                      )}
                    >
                      <span className="w-full truncate text-sm">{t.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}
                      </span>
                    </DropdownMenuItem>
                    <button
                      aria-label="Delete conversation"
                      onClick={() => removeThread(t.id)}
                      className="mr-1 rounded p-1.5 text-muted-foreground opacity-0 transition group-hover/t:opacity-100 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => assistant.newThread()}>
                <Plus /> New conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="New conversation"
            onClick={() => assistant.newThread()}
          >
            <Plus />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close assistant"
            onClick={assistant.close}
          >
            <X />
          </Button>
        </header>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Shimmer>Loading conversation…</Shimmer>
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-destructive">
            {error.message}
          </div>
        ) : initial === null || initial === undefined ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">This conversation no longer exists.</p>
            <Button variant="brand" size="sm" onClick={() => assistant.newThread()}>
              Start a new one
            </Button>
          </div>
        ) : (
          <ChatWindow threadId={threadId} initialMessages={initial} />
        )}
      </div>
    </aside>
  );
}
