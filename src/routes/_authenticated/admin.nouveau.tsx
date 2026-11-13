import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { adminCategoriesQuery } from "@/lib/admin.queries";

export const Route = createFileRoute("/_authenticated/admin/nouveau")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminCategoriesQuery()),
  component: NewArticlePage,
});

function NewArticlePage() {
  return (
    <>
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Tableau de bord
      </Link>
      <h1 className="mb-8 mt-3 text-4xl font-extrabold text-primary">Nouvelle actualité</h1>
      <ArticleForm />
    </>
  );
}
