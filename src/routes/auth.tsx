import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandWordmark } from "@/components/brand";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Flowboard" },
      { name: "description", content: "Sign in or create your Flowboard account." },
      { property: "og:title", content: "Sign in — Flowboard" },
      { property: "og:description", content: "Sign in or create your Flowboard account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function safeRedirect(value: string | undefined) {
  if (!value) return "/app";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "/app";
    return url.pathname + url.search;
  } catch {
    return "/app";
  }
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: safeRedirect(search.redirect), replace: true });
    });
  }, [navigate, search.redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: safeRedirect(search.redirect), replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/app",
            data: { display_name: name.trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/app", replace: true });
        } else {
          setNotice("Check your inbox to confirm your email, then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your account"
        : "Reset password";
  const subtitle =
    mode === "signin"
      ? "Sign in to pick up where you left off."
      : mode === "signup"
        ? "Boards, tasks and an AI assistant — all in one place."
        : "We'll email you a link to set a new password.";

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm animate-fade-up">
          <Link to="/">
            <BrandWordmark />
          </Link>
          <h1 className="mt-10 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

          {notice && (
            <div className="mt-6 rounded-lg border bg-primary-soft px-3.5 py-2.5 text-sm text-primary">
              {notice}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            )}
            <Button type="submit" variant="brand" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                New to Flowboard?{" "}
                <button className="font-medium text-primary" onClick={() => setMode("signup")}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button className="font-medium text-primary" onClick={() => setMode("signin")}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
      <AuthShowcase />
    </div>
  );
}

function AuthShowcase() {
  return (
    <div className="relative hidden flex-1 overflow-hidden border-l bg-dots lg:block">
      <div className="absolute inset-0 flex items-center justify-center p-12">
        <div className="w-full max-w-md space-y-3">
          {[
            {
              tag: "High",
              tone: "bg-prio-high-soft text-prio-high",
              title: "Ship onboarding flow",
              p: 72,
            },
            {
              tag: "Medium",
              tone: "bg-prio-medium-soft text-prio-medium",
              title: "Design system tokens",
              p: 40,
            },
            {
              tag: "Low",
              tone: "bg-prio-low-soft text-prio-low",
              title: "Write release notes",
              p: 10,
            },
          ].map((c, i) => (
            <div
              key={c.title}
              className="animate-fade-up rounded-xl border bg-card p-4 shadow-lift"
              style={{ animationDelay: `${120 + i * 90}ms`, marginLeft: `${i * 28}px` }}
            >
              <div className="flex items-center gap-1.5">
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${c.tone}`}>
                  {c.tag}
                </span>
                <span className="rounded-md bg-tag-soft px-1.5 py-0.5 text-[10px] font-medium text-tag">
                  Product
                </span>
              </div>
              <div className="mt-2.5 text-sm font-medium">{c.title}</div>
              <div className="mt-3 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${c.p}%` }} />
              </div>
            </div>
          ))}
          <div
            className="animate-fade-up ml-auto w-72 rounded-2xl rounded-br-md bg-chat-user px-4 py-3 text-sm text-chat-user-foreground shadow-brand"
            style={{ animationDelay: "480ms" }}
          >
            Move "Ship onboarding flow" to In Review
          </div>
        </div>
      </div>
    </div>
  );
}
