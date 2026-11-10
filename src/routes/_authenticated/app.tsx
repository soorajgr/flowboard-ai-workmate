import { createFileRoute, Outlet } from "@tanstack/react-router";
import { z } from "zod";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AssistantPanel } from "@/components/chat/assistant-panel";

export const Route = createFileRoute("/_authenticated/app")({
  validateSearch: z.object({ chat: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Your boards — Flowboard" },
      { name: "description", content: "Your Flowboard projects, tasks and AI assistant." },
      { property: "og:title", content: "Your boards — Flowboard" },
      { property: "og:description", content: "Your Flowboard projects, tasks and AI assistant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const { chat } = Route.useSearch();
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex min-w-0 flex-1 p-2 pl-0">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-panel shadow-card">
          <Outlet />
        </div>
      </main>
      {chat && <AssistantPanel key={chat} threadId={chat} />}
    </div>
  );
}
