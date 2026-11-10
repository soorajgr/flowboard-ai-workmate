import { ClientOnly } from "@tanstack/react-router";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

function IconToggleInner({ className }: { className?: string | undefined }) {
  const { resolved, toggle } = useTheme();
  const dark = resolved === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-card transition hover:text-foreground",
        className,
      )}
    >
      <Sun className={cn("size-4 transition-all", dark ? "rotate-90 scale-0" : "rotate-0 scale-100")} />
      <Moon
        className={cn(
          "absolute size-4 transition-all",
          dark ? "rotate-0 scale-100" : "-rotate-90 scale-0",
        )}
      />
    </button>
  );
}

/** Compact sun/moon button for page headers. */
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <ClientOnly fallback={<span className={cn("inline-block size-9", className)} aria-hidden />}>
      <IconToggleInner className={className} />
    </ClientOnly>
  );
}

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "Auto", Icon: Monitor },
];

function SegmentedInner() {
  const { preference, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-lg border bg-muted p-1">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition",
              active
                ? "bg-card font-medium text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Light / Dark / Auto switch for the sidebar. */
export function ThemeSegmented() {
  return (
    <ClientOnly fallback={<div className="h-[34px] rounded-lg border bg-muted" aria-hidden />}>
      <SegmentedInner />
    </ClientOnly>
  );
}
