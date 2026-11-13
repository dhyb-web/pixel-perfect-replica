import { Eye, Heart, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/format";

export function ArticleStats({
  views,
  likes,
  comments,
  className,
}: {
  views?: number;
  likes: number;
  comments: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
      {views !== undefined && (
        <span className="inline-flex items-center gap-1" title="Vues">
          <Eye className="size-3.5" aria-hidden /> {formatCount(views)}
        </span>
      )}
      <span className="inline-flex items-center gap-1" title="J'aime">
        <Heart className="size-3.5" aria-hidden /> {formatCount(likes)}
        <span className="sr-only">j'aime</span>
      </span>
      <span className="inline-flex items-center gap-1" title="Commentaires">
        <MessageCircle className="size-3.5" aria-hidden /> {formatCount(comments)}
        <span className="sr-only">commentaires</span>
      </span>
    </div>
  );
}
