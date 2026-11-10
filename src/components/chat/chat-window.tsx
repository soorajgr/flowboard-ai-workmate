import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { BrandMark } from "@/components/brand";

const TOOL_LABELS: Record<string, string> = {
  list_projects: "Looked at your projects",
  list_tasks: "Read tasks",
  create_task: "Created a task",
  update_task: "Edited a task",
  move_task: "Moved a task",
  add_checklist_item: "Added a checklist item",
};

const SUGGESTIONS = [
  "What should I focus on today?",
  "Summarize this board",
  "What's overdue or due this week?",
  "Create a task to prepare the launch checklist",
];

export function ChatWindow({
  threadId,
  initialMessages,
}: {
  threadId: string;
  initialMessages: UIMessage[];
}) {
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectRef = useRef(params.projectId);
  projectRef.current = params.projectId;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: () => ({ threadId, projectId: projectRef.current ?? null }),
      }),
    [threadId],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (err) => {
      let msg = err.message;
      try {
        msg = (JSON.parse(err.message) as { error?: string }).error ?? msg;
      } catch {
        /* plain text */
      }
      toast.error(msg || "The assistant couldn't respond.");
    },
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["board"] });
      qc.invalidateQueries({ queryKey: ["upcoming"] });
      qc.invalidateQueries({ queryKey: ["threads"] });
      qc.invalidateQueries({ queryKey: ["task"] });
    },
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  // Refresh the board as soon as a mutating tool finishes.
  const lastToolDone = messages
    .flatMap((m) => m.parts)
    .filter((p) => isToolUIPart(p) && p.state === "output-available").length;
  useEffect(() => {
    if (lastToolDone > 0) qc.invalidateQueries({ queryKey: ["board"] });
  }, [lastToolDone, qc]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
  };

  const last = messages[messages.length - 1];
  const waiting =
    status === "submitted" ||
    (status === "streaming" &&
      last?.role === "assistant" &&
      !last.parts.some((p) => p.type === "text" && p.text.length > 0));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-5 px-4 py-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center pt-8 text-center">
              <BrandMark className="size-14" />
              <h3 className="mt-4 text-base font-semibold tracking-tight">Hi, I'm Flow</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Ask about your tasks, or tell me to create, edit and move cards for you.
              </p>
              <div className="mt-6 flex w-full flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border bg-card px-3.5 py-2.5 text-left text-sm shadow-card transition hover:border-primary/40 hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className="group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-md group-[.is-user]:bg-chat-user group-[.is-user]:text-chat-user-foreground">
                {m.parts.map((part, i) => {
                  const key = `${m.id}-${i}`;
                  if (part.type === "text") {
                    return m.role === "assistant" ? (
                      <MessageResponse key={key}>{part.text}</MessageResponse>
                    ) : (
                      <p key={key} className="whitespace-pre-wrap">
                        {part.text}
                      </p>
                    );
                  }
                  if (part.type === "reasoning" && part.text) {
                    return (
                      <details key={key} className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer select-none">Thought process</summary>
                        <p className="mt-1 whitespace-pre-wrap border-l-2 pl-2">{part.text}</p>
                      </details>
                    );
                  }
                  if (isToolUIPart(part)) {
                    const name = part.type.replace(/^tool-/, "");
                    return (
                      <Tool key={key} defaultOpen={false} className="mb-0 bg-card">
                        <ToolHeader
                          type={part.type as `tool-${string}`}
                          state={part.state}
                          title={TOOL_LABELS[name] ?? name}
                        />
                        <ToolContent>
                          <ToolInput input={part.input} />
                          <ToolOutput output={part.output} errorText={part.errorText} />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {waiting && (
            <div className="flex items-center gap-2 text-sm">
              <Shimmer>Thinking…</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <PromptInput onSubmit={(msg) => send(msg.text ?? "")}>
          <PromptInputTextarea
            ref={textareaRef}
            autoFocus
            placeholder="Ask Flow anything about your board…"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
