import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { BADGE_LABELS, type Badge } from "@/lib/constants";

const badgeStyles = cva(
  "inline-flex items-center gap-1.5 rounded-md font-extrabold uppercase tracking-wider",
  {
    variants: {
      badge: {
        urgent: "bg-urgent text-urgent-foreground animate-urgent",
        une: "bg-une text-une-foreground",
        normal: "bg-secondary text-secondary-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { size: "sm" },
  },
);

export function NewsBadge({
  badge,
  size,
  showNormal = false,
  className,
}: {
  badge: Badge;
  size?: "sm" | "md";
  showNormal?: boolean;
  className?: string;
}) {
  if (badge === "normal" && !showNormal) return null;
  return (
    <span className={cn(badgeStyles({ badge, size }), className)}>
      {badge === "urgent" && <span className="size-1.5 rounded-full bg-urgent-foreground" />}
      {BADGE_LABELS[badge]}
    </span>
  );
}

export function CategoryTag({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("text-xs font-bold uppercase tracking-wider text-accent", className)}>
      {name}
    </span>
  );
}
