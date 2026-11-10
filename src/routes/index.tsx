import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, GripVertical, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark, BrandWordmark } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flowboard — Kanban boards with a built-in AI assistant" },
      {
        name: "description",
        content:
          "Organize projects on gorgeous drag-and-drop Kanban boards and ask an AI assistant to plan, create and move tasks for you.",
      },
      { property: "og:title", content: "Flowboard — Kanban boards with a built-in AI assistant" },
      {
        property: "og:description",
        content: "Drag-and-drop Kanban boards plus an AI assistant that manages your tasks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const preview = [
  {
    name: "To-Do",
    color: "bg-col-slate",
    cards: [
      {
        t: "Develop API endpoints",
        p: "High",
        tone: "bg-prio-high-soft text-prio-high",
        tag: "Back-End",
        prog: 0,
      },
      {
        t: "Ensure responsive design",
        p: "Low",
        tone: "bg-prio-low-soft text-prio-low",
        tag: "Front-End",
        prog: 15,
      },
    ],
  },
  {
    name: "In Progress",
    color: "bg-col-amber",
    cards: [
      {
        t: "Create clickable prototype",
        p: "High",
        tone: "bg-prio-high-soft text-prio-high",
        tag: "UI/UX Design",
        prog: 60,
      },
      {
        t: "Choose tech stack",
        p: "Medium",
        tone: "bg-prio-medium-soft text-prio-medium",
        tag: "Research",
        prog: 30,
      },
    ],
  },
  {
    name: "In Review",
    color: "bg-col-violet",
    cards: [
      {
        t: "Design highlights page",
        p: "Low",
        tone: "bg-prio-low-soft text-prio-low",
        tag: "UI/UX Design",
        prog: 85,
      },
    ],
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <BrandWordmark />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth" search={{ redirect: undefined }}>
              Sign in
            </Link>
          </Button>
          <Button asChild variant="brand">
            <Link to="/app">Open my boards</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-14 text-center">
        <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground shadow-card">
          <BrandMark className="size-4" /> Now with Flow, your AI project assistant
        </span>
        <h1
          className="mx-auto mt-6 max-w-3xl animate-fade-up text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          Plan beautifully.
          <br />
          <span className="bg-brand bg-clip-text text-transparent">Let AI move the cards.</span>
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl animate-fade-up text-base text-muted-foreground"
          style={{ animationDelay: "120ms" }}
        >
          Flowboard gives every project a calm, drag-and-drop Kanban board — and an assistant that
          answers questions, creates tasks and keeps everything moving.
        </p>
        <div
          className="mt-8 flex animate-fade-up justify-center gap-3"
          style={{ animationDelay: "180ms" }}
        >
          <Button asChild variant="brand" size="lg">
            <Link to="/auth" search={{ redirect: undefined }}>
              Get started free <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div
          className="animate-fade-up overflow-hidden rounded-3xl border bg-panel p-2 shadow-panel"
          style={{ animationDelay: "240ms" }}
        >
          <div className="flex gap-4 overflow-hidden rounded-2xl bg-dots p-5">
            {preview.map((col) => (
              <div key={col.name} className="w-72 shrink-0 rounded-2xl bg-muted/60 p-2">
                <div className="flex items-center gap-2 px-2 pb-2 pt-1">
                  <span className={`h-4 w-1 rounded-full ${col.color}`} />
                  <span className="text-sm font-semibold">{col.name}</span>
                  <span className="rounded-md border bg-card px-1.5 text-[11px] text-muted-foreground">
                    {col.cards.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {col.cards.map((c) => (
                    <div
                      key={c.t}
                      className="rounded-xl border bg-card p-3.5 text-left shadow-card"
                    >
                      <div className="flex gap-1">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-medium ${c.tone}`}
                        >
                          {c.p}
                        </span>
                        <span className="rounded-md bg-tag-soft px-1.5 py-0.5 text-[10.5px] font-medium text-tag">
                          {c.tag}
                        </span>
                      </div>
                      <div className="mt-2.5 text-[13.5px] font-medium">{c.t}</div>
                      <div className="mt-3 h-1 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${c.prog}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="ml-auto hidden w-80 shrink-0 flex-col gap-3 rounded-2xl border bg-card p-4 shadow-lift lg:flex">
              <div className="flex items-center gap-2">
                <BrandMark className="size-7" />
                <span className="text-sm font-semibold">Flow Assistant</span>
              </div>
              <div className="ml-auto rounded-2xl rounded-br-md bg-chat-user px-3.5 py-2 text-left text-sm text-chat-user-foreground">
                Move the prototype to In Review and add a QA checklist
              </div>
              <div className="text-left text-sm leading-relaxed">
                Done! <span className="font-medium">D-146</span> is now in{" "}
                <span className="font-medium">In Review</span> with 3 QA checklist items.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: GripVertical,
              t: "Drag & drop",
              d: "Fully customizable columns with smooth, satisfying card moves.",
            },
            {
              icon: ListChecks,
              t: "Rich cards",
              d: "Priorities, tags, due dates, checklists, progress and comments.",
            },
            {
              icon: Bot,
              t: "AI that acts",
              d: "Ask questions or let Flow create, edit and move tasks for you.",
            },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border bg-card p-5 shadow-card">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <f.icon className="size-4" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
