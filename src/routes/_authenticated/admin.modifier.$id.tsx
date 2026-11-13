import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { adminArticleQuery, adminCategoriesQuery } from "@/lib/admin.queries";

export const Route = createFileRoute("/_authenticated/admin/modifier/$id")({
  loader: async ({ context, params }) => {
    const [article] = await Promise.all([
      context.queryClient.ensureQueryData(adminArticleQuery(params.id)),
      context.queryClient.ensureQueryData(adminCategoriesQuery()),
    ]);
    if (!article) throw notFound();
  },
  component: EditArticlePage,
});

function EditArticlePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(adminArticleQuery(id));
  return (
    <>
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Tableau de bord
      </Link>
      <h1 className="mb-8 mt-3 text-4xl font-extrabold text-primary">Modifier l'actualité</h1>
      {data && <ArticleForm key={data.id} initial={data} />}
    </>
  );
}
