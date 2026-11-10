import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { threadsQuery } from "@/lib/chat";

/** Open / switch / close the AI assistant panel. The active thread lives in the URL (?chat=). */
export function useAssistant() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = useSearch({ strict: false }) as { chat?: string };

  const setChat = useCallback(
    (chat: string | undefined) => {
      navigate({
        to: ".",
        search: ((prev: Record<string, unknown>) => ({ ...prev, chat })) as never,
        replace: false,
      });
    },
    [navigate],
  );

  const newThread = useCallback(async () => {
    const { data, error } = await supabase.from("chat_threads").insert({}).select().single();
    if (error || !data) {
      toast.error(error?.message ?? "Couldn't start a conversation");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["threads"] });
    setChat(data.id);
  }, [qc, setChat]);

  const open = useCallback(async () => {
    const threads = await qc.fetchQuery(threadsQuery());
    const latest = threads[0];
    if (latest) setChat(latest.id);
    else await newThread();
  }, [qc, newThread, setChat]);

  return {
    activeThreadId: search.chat,
    open,
    newThread,
    selectThread: setChat,
    close: () => setChat(undefined),
  };
}
