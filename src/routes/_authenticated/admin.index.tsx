import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, FileEdit, Newspaper, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminArticlesQuery } from "@/lib/admin.queries";
import { supabase } from "@/integrations/supabase/client";
import { formatCount, formatDate } from "@/lib/format";
import { NewsBadge } from "@/components/news/NewsBadge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminArticlesQuery()),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data } = useSuspenseQuery(adminArticlesQuery());
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<{ id: string; title: string } | null>(null);
  const published = data.filter((a) => a.status === "published").length;
  const views = data.reduce((s, a) => s + a.views, 0);

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from("articles").delete().eq("id", toDelete.id);
    setToDelete(null);
    if (error) return toast.error("Suppression impossible.");
    toast.success("Actualité supprimée.");
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["news"] });
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Administration</p>
          <h1 className="mt-1 text-4xl font-extrabold text-primary">Tableau de bord</h1>
        </div>
        <Button asChild variant="accent" size="lg">
          <Link to="/admin/nouveau"><Plus /> Nouvelle actualité</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Newspaper} label="Actualités" value={data.length} />
        <Stat icon={Send} label="Publiées" value={published} />
        <Stat icon={FileEdit} label="Brouillons" value={data.length - published} />
        <Stat icon={Eye} label="Vues totales" value={views} />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-card">
        {data.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Aucune actualité. Créez la première !</p>
        ) : (
          <ul className="divide-y">
            {data.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        a.status === "published" ? "bg-primary text-primary-foreground" : "bg-gold text-gold-foreground",
                      )}
                    >
                      {a.status === "published" ? "Publiée" : "Brouillon"}
                    </span>
                    <NewsBadge badge={a.badge} />
                    {a.categories?.name && <span className="text-xs text-muted-foreground">{a.categories.name}</span>}
                    {a.faculty && <span className="text-xs font-semibold text-muted-foreground">· {a.faculty}</span>}
                  </div>
                  <p className="mt-1 truncate font-semibold text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(a.published_at)} · {formatCount(a.views)} vues
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {a.status === "published" && (
                    <Button asChild variant="ghost" size="icon" aria-label="Voir">
                      <Link to="/actualites/$slug" params={{ slug: a.slug }}><Eye /></Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin/modifier/$id" params={{ id: a.id }}><Pencil /> Modifier</Link>
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => setToDelete({ id: a.id, title: a.title })} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette actualité ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {toDelete?.title} » sera définitivement supprimée, avec ses commentaires et ses j'aime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-accent" />
      </div>
      <p className="mt-2 font-serif-display text-3xl font-bold text-primary">{formatCount(value)}</p>
    </div>
  );
}
