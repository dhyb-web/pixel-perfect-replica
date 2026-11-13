import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Siren } from "lucide-react";
import { homeNewsQuery } from "@/lib/news.queries";
import { ArticleCard, ArticleCover, ArticleRow } from "@/components/news/ArticleCard";
import { CategoryTag, NewsBadge } from "@/components/news/NewsBadge";
import { ArticleStats } from "@/components/news/ArticleStats";
import { formatDate } from "@/lib/format";
import type { ArticleListItem } from "@/lib/news.types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UK ACTU — L'actualité de l'Université de Kara" },
      {
        name: "description",
        content:
          "Communiqués officiels, inscriptions, résultats d'examens, vie étudiante, événements et sports : toute l'actualité de l'Université de Kara au Togo.",
      },
      { property: "og:title", content: "UK ACTU — L'actualité de l'Université de Kara" },
      {
        property: "og:description",
        content: "Toute l'actualité officielle et étudiante de l'Université de Kara (Togo).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeNewsQuery()),
  component: HomePage,
});

function UrgentStrip({ items }: { items: ArticleListItem[] }) {
  if (!items.length) return null;
  return (
    <div className="border-b border-urgent/20 bg-urgent/5">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md bg-urgent px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-urgent-foreground animate-urgent">
          <Siren className="size-3.5" aria-hidden /> Urgent
        </span>
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:gap-6">
          {items.map((a) => (
            <Link
              key={a.id}
              to="/actualites/$slug"
              params={{ slug: a.slug }}
              className="truncate text-sm font-semibold text-urgent hover:underline"
            >
              {a.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Featured({ article }: { article: ArticleListItem }) {
  return (
    <Link
      to="/actualites/$slug"
      params={{ slug: article.slug }}
      className="group relative block overflow-hidden rounded-3xl shadow-card-hover"
    >
      <div className="aspect-[4/5] sm:aspect-[16/10] lg:aspect-[16/11]">
        <ArticleCover
          src={article.cover_image_url}
          alt={article.title}
          eager
          className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]"
        />
      </div>
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <NewsBadge badge={article.badge === "normal" ? "une" : article.badge} size="md" />
          {article.category && <CategoryTag name={article.category.name} className="text-gold" />}
        </div>
        <h1 className="mt-4 max-w-3xl text-3xl font-extrabold leading-[1.1] text-primary-foreground sm:text-5xl">
          {article.title}
        </h1>
        <p className="mt-4 line-clamp-3 max-w-2xl text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
          {article.excerpt}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary-foreground/80">
          <span className="font-semibold text-primary-foreground">{article.author_name}</span>
          <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
          <ArticleStats
            views={article.views}
            likes={article.likes}
            comments={article.comments}
            className="text-primary-foreground/80"
          />
        </div>
      </div>
    </Link>
  );
}

function HomePage() {
  const { data } = useSuspenseQuery(homeNewsQuery());
  const side = data.latest.slice(0, 4);
  const grid = data.latest;

  return (
    <>
      <UrgentStrip items={data.urgent} />
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        {data.featured ? (
          <section className="grid gap-8 lg:grid-cols-3" aria-label="À la une">
            <div className="lg:col-span-2">
              <Featured article={data.featured} />
            </div>
            <aside className="rounded-3xl border bg-card p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                <span className="h-5 w-1 rounded-full bg-accent" /> Dernières infos
              </h2>
              <div className="mt-4 flex flex-col gap-1">
                {side.map((a) => (
                  <ArticleRow key={a.id} article={a} />
                ))}
              </div>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/actualites">
                  Toutes les actualités <ArrowRight />
                </Link>
              </Button>
            </aside>
          </section>
        ) : (
          <p className="py-20 text-center text-muted-foreground">Aucune actualité publiée pour le moment.</p>
        )}

        {grid.length > 0 && (
          <section className="mt-14" aria-labelledby="latest-title">
            <div className="flex items-end justify-between gap-4 border-b pb-3">
              <h2 id="latest-title" className="text-3xl font-extrabold text-primary">
                Actualités
              </h2>
              <Link to="/actualites" className="text-sm font-semibold text-accent hover:underline">
                Voir tout →
              </Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {grid.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
