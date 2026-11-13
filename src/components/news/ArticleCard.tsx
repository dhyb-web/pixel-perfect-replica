import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import type { ArticleListItem } from "@/lib/news.types";
import { formatDate } from "@/lib/format";
import { CategoryTag, NewsBadge } from "./NewsBadge";
import { ArticleStats } from "./ArticleStats";
import { cn } from "@/lib/utils";

export function ArticleCover({
  src,
  alt,
  className,
  eager = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-secondary text-muted-foreground", className)}>
        <ImageOff className="size-8" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      width={1600}
      height={900}
      className={cn("object-cover", className)}
    />
  );
}

export function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <Link
      to="/actualites/$slug"
      params={{ slug: article.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <ArticleCover
          src={article.cover_image_url}
          alt={article.title}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3">
          <NewsBadge badge={article.badge} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          {article.category && <CategoryTag name={article.category.name} />}
          {article.faculty && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
              {article.faculty}
            </span>
          )}
        </div>
        <h3 className="mt-2 text-xl font-bold leading-snug text-foreground transition-colors group-hover:text-primary-soft">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {article.excerpt}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-4 mt-5">
          <time className="text-xs font-medium text-muted-foreground" dateTime={article.published_at}>
            {formatDate(article.published_at)}
          </time>
          <ArticleStats likes={article.likes} comments={article.comments} />
        </div>
      </div>
    </Link>
  );
}

export function ArticleRow({ article }: { article: ArticleListItem }) {
  return (
    <Link
      to="/actualites/$slug"
      params={{ slug: article.slug }}
      className="group flex gap-4 rounded-xl p-2 transition-colors hover:bg-secondary"
    >
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
        <ArticleCover src={article.cover_image_url} alt="" className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <NewsBadge badge={article.badge} />
          {article.category && <CategoryTag name={article.category.name} className="truncate text-[10px]" />}
        </div>
        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-foreground group-hover:text-primary-soft">
          {article.title}
        </h3>
        <ArticleStats likes={article.likes} comments={article.comments} className="mt-1" />
      </div>
    </Link>
  );
}
