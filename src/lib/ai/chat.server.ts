import { createOpenAI } from "@ai-sdk/openai";
import {
  APICallError,
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import type { Json } from "@/integrations/supabase/types";
import { getUserClient } from "@/lib/supabase-user.server";
import { createBoardTools } from "./board-tools.server";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

function json(status: number, error: string) {
  return Response.json({ error }, { status });
}

function textOf(message: UIMessage | undefined) {
  return (message?.parts ?? [])
    .map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();
}

function friendlyError(error: unknown): string {
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 402)
      return "The AI assistant is out of credits for this workspace. Add credits to keep chatting.";
    if (error.statusCode === 429) return "The assistant is busy right now. Please try again in a moment.";
    if (error.statusCode === 403) return "The AI assistant isn't available for this workspace right now.";
  }
  const msg = error instanceof Error ? error.message : String(error);
  return msg || "Something went wrong talking to the assistant.";
}

export async function handleChat(request: Request): Promise<Response> {
  const auth = await getUserClient(request).catch(() => null);
  if (!auth) return json(401, "Please sign in again.");
  const { supabase, userId } = auth;

  let body: { messages?: UIMessage[]; threadId?: string; projectId?: string | null };
  try {
    body = await request.json();
  } catch {
    return json(400, "Invalid request");
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const threadId = typeof body.threadId === "string" ? body.threadId : "";
  if (!threadId || messages.length === 0) return json(400, "Missing conversation");

  const { data: thread, error: threadErr } = await supabase
    .from("chat_threads")
    .select("id, title")
    .eq("id", threadId)
    .maybeSingle();
  if (threadErr) return json(500, threadErr.message);
  if (!thread) return json(404, "Conversation not found");

  // Persist the newest user message before streaming.
  const last = messages[messages.length - 1];
  if (last?.role === "user") {
    const { error } = await supabase.from("chat_messages").upsert(
      {
        thread_id: threadId,
        user_id: userId,
        message_id: last.id,
        role: "user",
        parts: last.parts as unknown as Json,
      },
      { onConflict: "thread_id,message_id" },
    );
    if (error) return json(500, `Could not save your message: ${error.message}`);
    if (thread.title === "New conversation") {
      const title = textOf(last).slice(0, 60) || "New conversation";
      await supabase.from("chat_threads").update({ title }).eq("id", threadId);
    } else {
      await supabase.from("chat_threads").update({ title: thread.title }).eq("id", threadId);
    }
  }

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return json(500, "AI is not configured for this project.");

  let projectContext = "The user is not currently viewing a specific project.";
  if (body.projectId) {
    const { data: p } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", body.projectId)
      .maybeSingle();
    if (p) projectContext = `The user is currently viewing the project "${p.name}" (id: ${p.id}).`;
  }

  const today = new Date().toISOString().slice(0, 10);
  const instructions = `You are Flow, the friendly AI assistant inside Flowboard, a Kanban task manager.
Today's date is ${today}. ${projectContext}
You can read the user's projects, columns and tasks, and you can create, edit and move tasks and add checklist items using your tools.
- Always look up real data with tools before answering questions about the board; never invent tasks.
- When the user asks you to change something, do it with the tools, then confirm briefly what changed (mention the task ref like D-123).
- If a request is ambiguous (e.g. which project), assume the project they're currently viewing.
- Keep answers concise and well formatted with short markdown lists when helpful.`;

  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const tools = createBoardTools(supabase, userId);

  const result = streamText({
    model: provider.responses(MODEL),
    instructions,
    messages: await convertToModelMessages(messages, { ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: stepCountIs(50),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    generateMessageId: () => crypto.randomUUID(),
    onError: (error) => {
      console.error("[chat] stream error", error);
      return friendlyError(error);
    },
    onFinish: async ({ responseMessage }) => {
      if (!responseMessage || responseMessage.parts.length === 0) return;
      const { error } = await supabase.from("chat_messages").upsert(
        {
          thread_id: threadId,
          user_id: userId,
          message_id: responseMessage.id,
          role: "assistant",
          parts: responseMessage.parts as unknown as Json,
        },
        { onConflict: "thread_id,message_id" },
      );
      if (error) console.error("[chat] failed to save assistant message", error.message);
    },
  });

  return withLovableAiGatewayRunIdHeader(response, runIdFetch);
}
