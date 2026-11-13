import { useState, type FormEvent } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CommentRow {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { first_name: string; last_name: string } | null;
}

function useRequireLogin() {
  const navigate = useNavigate();
  const href = useRouterState({ select: (s) => s.location.href });
  return () => navigate({ to: "/connexion", search: { redirect: href } });
}

export function ArticleInteractions({
  articleId,
  initialLikes,
  initialComments,
}: {
  articleId: string;
  initialLikes: number;
  initialComments: number;
}) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const requireLogin = useRequireLogin();
  const [text, setText] = useState("");

  const likes = useQuery({
    queryKey: ["article-likes", articleId, user?.id ?? "anon"],
    queryFn: async () => {
      const { count } = await supabase
        .from("reactions")
        .select("id", { count: "exact", head: true })
        .eq("article_id", articleId)
        .eq("type", "like");
      let mine = false;
      if (user) {
        const { data } = await supabase
          .from("reactions")
          .select("id")
          .eq("article_id", articleId)
          .eq("user_id", user.id)
          .eq("type", "like")
          .maybeSingle();
        mine = !!data;
      }
      return { count: count ?? 0, mine };
    },
    initialData: user ? undefined : { count: initialLikes, mine: false },
  });

  const comments = useQuery({
    queryKey: ["article-comments", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id, profiles(first_name, last_name)")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as CommentRow[];
    },
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (likes.data?.mine) {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("article_id", articleId)
          .eq("user_id", user.id)
          .eq("type", "like");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reactions")
          .insert({ article_id: articleId, user_id: user.id, type: "like" });
        if (error && error.code !== "23505") throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["article-likes", articleId] }),
    onError: () => toast.error("Impossible d'enregistrer votre j'aime."),
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("comments")
        .insert({ article_id: articleId, user_id: user.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      toast.success("Commentaire publié");
      queryClient.invalidateQueries({ queryKey: ["article-comments", articleId] });
    },
    onError: () => toast.error("Impossible de publier le commentaire."),
  });

  const removeComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["article-comments", articleId] }),
    onError: () => toast.error("Suppression impossible."),
  });

  function onLike() {
    if (!user) return requireLogin();
    toggleLike.mutate();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return requireLogin();
    const content = text.trim();
    if (!content) return;
    if (content.length > 2000) return toast.error("2000 caractères maximum.");
    addComment.mutate(content);
  }

  const likeCount = likes.data?.count ?? initialLikes;
  const liked = likes.data?.mine ?? false;
  const commentList = comments.data ?? [];
  const commentCount = comments.data ? commentList.length : initialComments;

  return (
    <section className="mt-12" aria-label="Réactions et commentaires">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-secondary/60 p-4">
        <Button
          variant={liked ? "accent" : "outline"}
          onClick={onLike}
          disabled={toggleLike.isPending}
          aria-pressed={liked}
          className="rounded-full"
        >
          <Heart className={cn(liked && "fill-current")} />
          {liked ? "J'aime" : "J'aime"} · {formatCount(likeCount)}
        </Button>
        <a href="#commentaires" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
          <MessageCircle className="size-4" /> {formatCount(commentCount)} commentaire{commentCount > 1 ? "s" : ""}
        </a>
        {!user && (
          <p className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">
            Connectez-vous pour aimer et commenter.
          </p>
        )}
      </div>

      <div id="commentaires" className="mt-10 scroll-mt-32">
        <h2 className="text-2xl font-bold text-primary">Commentaires</h2>

        <form onSubmit={onSubmit} className="mt-4 rounded-2xl border bg-card p-4 shadow-card">
          {user ? (
            <>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Votre commentaire…"
                aria-label="Votre commentaire"
                maxLength={2000}
                rows={3}
              />
              <div className="mt-3 flex justify-end">
                <Button type="submit" variant="accent" disabled={addComment.isPending || !text.trim()}>
                  {addComment.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                  Publier
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Vous devez être connecté pour commenter.</p>
              <Button type="button" variant="accent" onClick={requireLogin}>
                Se connecter pour commenter
              </Button>
            </div>
          )}
        </form>

        <ul className="mt-6 space-y-4">
          {comments.isLoading && <li className="text-sm text-muted-foreground">Chargement…</li>}
          {!comments.isLoading && commentList.length === 0 && (
            <li className="text-sm text-muted-foreground">Aucun commentaire pour le moment. Soyez le premier !</li>
          )}
          {commentList.map((c) => {
            const name = `${c.profiles?.first_name ?? ""} ${c.profiles?.last_name ?? ""}`.trim() || "Étudiant";
            const canDelete = user && (user.id === c.user_id || isAdmin);
            return (
              <li key={c.id} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 rounded-2xl bg-secondary px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{name}</p>
                    <div className="flex items-center gap-2">
                      <time className="text-xs text-muted-foreground" dateTime={c.created_at}>
                        {formatDateTime(c.created_at)}
                      </time>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => removeComment.mutate(c.id)}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                          aria-label="Supprimer le commentaire"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-foreground">
                    {c.content}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
