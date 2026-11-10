import { queryOptions } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { maybe, must } from "./board";

export const threadsQuery = () =>
  queryOptions({
    queryKey: ["threads"],
    queryFn: async () =>
      must(
        await supabase
          .from("chat_threads")
          .select("id, title, updated_at")
          .order("updated_at", { ascending: false }),
      ),
  });

export const threadMessagesQuery = (threadId: string) =>
  queryOptions({
    queryKey: ["chat-messages", threadId],
    staleTime: Infinity,
    queryFn: async () => {
      const thread = maybe(
        await supabase.from("chat_threads").select("id").eq("id", threadId).maybeSingle(),
      );
      if (!thread) return null;
      const rows = must(
        await supabase
          .from("chat_messages")
          .select("message_id, role, parts, created_at")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true }),
      );
      return rows.map(
        (r) =>
          ({
            id: r.message_id,
            role: r.role as UIMessage["role"],
            parts: r.parts as unknown as UIMessage["parts"],
          }) satisfies UIMessage,
      );
    },
  });
