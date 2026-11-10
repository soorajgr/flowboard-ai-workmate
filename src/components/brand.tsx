import logo from "@/assets/assistant-logo.png";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt=""
      aria-hidden="true"
      width={256}
      height={256}
      className={cn("size-8 shrink-0 select-none", className)}
    />
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="text-[15px] font-semibold tracking-tight text-foreground">Flowboard</span>
    </div>
  );
}
