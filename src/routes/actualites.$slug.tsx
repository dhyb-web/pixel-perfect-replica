import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Images, X } from "lucide-react";
import { articleQuery } from "@/lib/news.queries";
import { ArticleCard, ArticleCover } from "@/components/news/ArticleCard";
import { CategoryTag, NewsBadge } from "@/components/news/NewsBadge";
import { ArticleStats } from "@/components/news/ArticleStats";
import { ArticleInteractions } from "@/components/news/ArticleInteractions";
import { FACULTIES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/actualites/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(articleQuery(params.slug));
    if (!data) throw notFound();
    return { title: data.article.title, excerpt: data.article.excerpt };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Actualité introuvable — UK ACTU" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.title} — UK ACTU`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.excerpt },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: loaderData.excerpt },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-primary">Actualité introuvable</h1>
      <p className="mt-2 text-muted-foreground">Elle a peut-être été retirée ou n'est pas encore publiée.</p>
      <Button asChild variant="accent" className="mt-6">
        <Link to="/actualites">Voir toutes les actualités</Link>
      </Button>
    </div>
  ),
  component: ArticlePage,
});

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images.length) return null;
  const go = (d: number) => setOpen((i) => (i === null ? i : (i + d + images.length) % images.length));
  return (
    <section className="mt-12" aria-label="Galerie photos">
      <h2 className="flex items-center gap-2 text-2xl font-bold text-primary">
        <Images className="size-5 text-accent" /> Galerie
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setOpen(i)}
            className="group overflow-hidden rounded-xl shadow-card focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Agrandir la photo ${i + 1}`}
          >
            <img
              src={src}
              alt={`${title} — photo ${i + 1}`}
              loading="lazy"
              width={1600}
              height={900}
              className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </button>
        ))}
      </div>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-5xl border-0 bg-primary p-2 sm:p-3 [&>button]:hidden">
          <DialogTitle className="sr-only">Galerie — {title}</DialogTitle>
          {open !== null && (
            <div className="relative">
              <img src={images[open]} alt={`${title} — photo ${open + 1}`} className="max-h-[80vh] w-full rounded-lg object-contain" />
              <div className="absolute right-2 top-2">
                <Button variant="onDark" size="icon" onClick={() => setOpen(null)} aria-label="Fermer">
                  <X />
                </Button>
              </div>
              {images.length > 1 && (
                <div className="absolute inset-y-0 flex w-full items-center justify-between px-2">
                  <Button variant="onDark" size="icon" onClick={() => go(-1)} aria-label="Photo précédente">
                    <ChevronLeft />
                  </Button>
                  <Button variant="onDark" size="icon" onClick={() => go(1)} aria-label="Photo suivante">
                    <ChevronRight />
                  </Button>
                </div>
              )}
              <p className="mt-2 text-center text-xs text-primary-foreground/70">
                {open + 1} / {images.length}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(articleQuery(slug));
  const article = data!.article;
  const similar = data!.similar;
  const faculty = FACULTIES.find((f) => f.code === article.faculty);

  useEffect(() => {
    const key = `uk-viewed-${article.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void supabase.rpc("increment_article_views", { _article_id: article.id });
  }, [article.id]);

  const paragraphs = article.content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const pdfHref = article.pdf_url
    ? `${article.pdf_url}${article.pdf_url.includes("?") ? "&" : "?"}download=${encodeURIComponent(article.pdf_name || "document.pdf")}`
    : null;

  return (
    <article className="pb-4">
      <header className="mx-auto max-w-4xl px-4 pt-10 sm:px-6">
        <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span>/</span>
          {article.category ? (
            <Link to="/actualites" search={{ categorie: article.category.slug }} className="hover:text-primary">
              {article.category.name}
            </Link>
          ) : (
            <Link to="/actualites" className="hover:text-primary">Actualités</Link>
          )}
        </nav>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <NewsBadge badge={article.badge} size="md" />
          {article.category && <CategoryTag name={article.category.name} />}
          {article.faculty && (
            <Link
              to="/actualites"
              search={{ faculte: article.faculty }}
              className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
              title={faculty?.name}
            >
              {article.faculty}
            </Link>
          )}
        </div>
        <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] text-primary sm:text-5xl">{article.title}</h1>
        {article.excerpt && (
          <p className="mt-5 text-xl leading-relaxed text-muted-foreground">{article.excerpt}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-gold font-bold text-gold-foreground">
              {article.author_name.charAt(0)}
            </span>
            <div className="text-sm">
              <p className="font-semibold text-foreground">{article.author_name}</p>
              <time className="text-muted-foreground" dateTime={article.published_at}>
                {formatDate(article.published_at)}
              </time>
            </div>
          </div>
          <ArticleStats views={article.views} likes={article.likes} comments={article.comments} className="text-sm" />
        </div>
      </header>

      <div className="mx-auto mt-8 max-w-5xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl shadow-card-hover">
          <ArticleCover src={article.cover_image_url} alt={article.title} eager className="aspect-[16/9] w-full" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="article-body mt-10 text-foreground">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">{p}</p>
          ))}
        </div>

        {pdfHref && (
          <a
            href={pdfHref}
            className="group mt-10 flex items-center gap-4 rounded-2xl border-2 border-dashed border-accent/40 bg-accent/5 p-5 transition-colors hover:border-accent hover:bg-accent/10"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <FileText />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-accent">Pièce jointe PDF</span>
              <span className="block truncate font-semibold text-foreground">{article.pdf_name || "Document.pdf"}</span>
            </span>
            <span className="hidden items-center gap-1 text-sm font-semibold text-primary sm:flex">
              <Download className="size-4" /> Télécharger
            </span>
          </a>
        )}

        <Gallery images={article.gallery_urls} title={article.title} />

        <ArticleInteractions
          articleId={article.id}
          initialLikes={article.likes}
          initialComments={article.comments}
        />
      </div>

      {similar.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6" aria-labelledby="similar-title">
          <h2 id="similar-title" className="border-b pb-3 text-3xl font-extrabold text-primary">
            À lire aussi
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
