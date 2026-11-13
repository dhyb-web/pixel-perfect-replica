import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-2.5", className)} aria-label="UK ACTU - Université de Kara, accueil">
      <span className="flex size-10 items-center justify-center rounded-lg bg-gold font-serif-display text-lg font-extrabold text-gold-foreground shadow-sm transition-transform group-hover:-rotate-3">
        UK
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-serif-display text-xl font-extrabold tracking-tight",
            tone === "dark" ? "text-primary-foreground" : "text-primary",
          )}
        >
          UK <span className="text-accent">ACTU</span>
        </span>
        <span
          className={cn(
            "mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
            tone === "dark" ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          Université de Kara
        </span>
      </span>
    </Link>
  );
}
