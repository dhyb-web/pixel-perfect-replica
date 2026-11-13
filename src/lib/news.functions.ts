import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient, LIST_COLUMNS, mapListRow } from "./news.server";
import type { ArticleDetail, ArticleListItem } from "./news.types";
import { isKnownCategory, isKnownFaculty } from "./constants";
import { sanitizeSearch } from "./search";

export const getHomeNews = createServerFn({ method: "GET" }).handler(async () => {
  const db = createPublicClient();
  const { data, error } = await db
    .from("articles")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30);
  if (error) throw new Error("Impossible de charger les actualités");
  const items = (data ?? []).map(mapListRow);
  const featured = items.find((a) => a.badge === "une") ?? items[0] ?? null;
  const urgent = items.filter((a) => a.badge === "urgent").slice(0, 3);
  const rest = items.filter((a) => a.id !== featured?.id);
  return { featured, urgent, latest: rest };
});

const listInput = z.object({
  q: z.string().max(200).optional(),
  categorie: z.string().max(60).optional(),
  faculte: z.string().max(20).optional(),
});

export const listNews = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => listInput.parse(data ?? {}))
  .handler(async ({ data }): Promise<ArticleListItem[]> => {
    const db = createPublicClient();
    let query = db.from("articles").select(LIST_COLUMNS).eq("status", "published");

    if (isKnownCategory(data.categorie)) {
      const { data: cat } = await db
        .from("categories")
        .select("id")
        .eq("slug", data.categorie)
        .maybeSingle();
      if (!cat) return [];
      query = query.eq("category_id", cat.id);
    }
    if (isKnownFaculty(data.faculte)) query = query.eq("faculty", data.faculte);

    const q = sanitizeSearch(data.q);
    if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%,excerpt.ilike.%${q}%`);

    const { data: rows, error } = await query.order("published_at", { ascending: false }).limit(60);
    if (error) throw new Error("Impossible de charger les actualités");
    return (rows ?? []).map(mapListRow);
  });

export const getArticleBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }): Promise<{ article: ArticleDetail; similar: ArticleListItem[] } | null> => {
    const db = createPublicClient();
    const { data: row, error } = await db
      .from("articles")
      .select(`${LIST_COLUMNS}, content, gallery_urls, pdf_url, pdf_name, category_id`)
      .eq("status", "published")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error("Impossible de charger l'actualité");
    if (!row) return null;

    const base = mapListRow(row);
    const extra = row as unknown as {
      content: string;
      gallery_urls: string[] | null;
      pdf_url: string | null;
      pdf_name: string | null;
      category_id: string | null;
    };
    const article: ArticleDetail = {
      ...base,
      content: extra.content,
      gallery_urls: extra.gallery_urls ?? [],
      pdf_url: extra.pdf_url,
      pdf_name: extra.pdf_name,
    };

    let similar: ArticleListItem[] = [];
    if (extra.category_id) {
      const { data: same } = await db
        .from("articles")
        .select(LIST_COLUMNS)
        .eq("status", "published")
        .eq("category_id", extra.category_id)
        .neq("id", article.id)
        .order("published_at", { ascending: false })
        .limit(3);
      similar = (same ?? []).map(mapListRow);
    }
    if (similar.length < 3) {
      const exclude = [article.id, ...similar.map((s) => s.id)];
      const { data: more } = await db
        .from("articles")
        .select(LIST_COLUMNS)
        .eq("status", "published")
        .not("id", "in", `(${exclude.join(",")})`)
        .order("published_at", { ascending: false })
        .limit(3 - similar.length);
      similar = [...similar, ...(more ?? []).map(mapListRow)];
    }

    return { article, similar };
  });
