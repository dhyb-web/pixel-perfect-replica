import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Search, X } from "lucide-react";
import { newsListQuery } from "@/lib/news.queries";
import { ArticleCard } from "@/components/news/ArticleCard";
import { CATEGORIES, FACULTIES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface NewsSearch {
  q?: string;
  categorie?: string;
  faculte?: string;
}

const str = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

export const Route = createFileRoute("/actualites/")({
  validateSearch: (search: Record<string, unknown>): NewsSearch => ({
    q: str(search.q, 100),
    categorie: str(search.categorie, 60),
    faculte: str(search.faculte, 20),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(newsListQuery(deps)),
  head: () => ({
    meta: [
      { title: "Toutes les actualités — UK ACTU, Université de Kara" },
      {
        name: "description",
        content:
          "Recherchez et filtrez les actualités de l'Université de Kara par catégorie et par faculté.",
      },
      { property: "og:title", content: "Toutes les actualités — UK ACTU" },
      {
        property: "og:description",
        content: "Recherche et filtres des actualités de l'Université de Kara.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewsListPage,
});

function NewsListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/actualites/" });
  const { data } = useSuspenseQuery(newsListQuery(search));
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => setQ(search.q ?? ""), [search.q]);

  const category = CATEGORIES.find((c) => c.slug === search.categorie);
  const faculty = FACULTIES.find((f) => f.code === search.faculte);
  const title = category?.name ?? (faculty ? faculty.code : "Toutes les actualités");

  function submit(e: FormEvent) {
    e.preventDefault();
    navigate({ search: (prev) => ({ ...prev, q: q.trim() || undefined }) });
  }

  const hasFilters = !!(search.q || search.categorie || search.faculte);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-widest text-accent">Actualités</p>
      <h1 className="mt-1 text-4xl font-extrabold text-primary sm:text-5xl">{title}</h1>
      {faculty && category && <p className="mt-2 text-muted-foreground">{faculty.name}</p>}

      <div className="mt-8 rounded-2xl border bg-card p-4 shadow-card sm:p-5">
        <form onSubmit={submit} className="flex flex-col gap-3 md:flex-row" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Mot-clé dans le titre ou le texte…"
              aria-label="Mot-clé"
              className="h-11 pl-9"
            />
          </div>
          <Select
            value={search.faculte ?? "all"}
            onValueChange={(v) =>
              navigate({ search: (prev) => ({ ...prev, faculte: v === "all" ? undefined : v }) })
            }
          >
            <SelectTrigger className="h-11 md:w-56" aria-label="Faculté">
              <SelectValue placeholder="Faculté" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les facultés</SelectItem>
              {FACULTIES.map((f) => (
                <SelectItem key={f.code} value={f.code}>
                  {f.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="accent" className="h-11 px-6">
            Rechercher
          </Button>
        </form>
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          <Chip active={!search.categorie} categorie={undefined}>Toutes</Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.slug} active={search.categorie === c.slug} categorie={c.slug}>
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {data.length} actualité{data.length > 1 ? "s" : ""}
          {search.q && (
            <>
              {" "}pour « <span className="font-semibold text-foreground">{search.q}</span> »
            </>
          )}
        </p>
        {hasFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link to="/actualites" search={{}}>
              <X /> Effacer les filtres
            </Link>
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed p-12 text-center">
          <p className="text-lg font-semibold text-foreground">Aucune actualité trouvée</p>
          <p className="mt-1 text-sm text-muted-foreground">Essayez un autre mot-clé ou retirez un filtre.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  categorie,
  children,
}: {
  active: boolean;
  categorie: string | undefined;
  children: string;
}) {
  return (
    <Link
      from="/actualites/"
      to="/actualites"
      search={(prev: NewsSearch) => ({ ...prev, categorie })}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:border-primary hover:text-primary",
      )}
    >
      {children}
    </Link>
  );
}
