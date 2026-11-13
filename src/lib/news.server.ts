import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ArticleListItem } from "./news.types";
import type { Badge } from "./constants";

/** Read-only client using the publishable key; row-level rules limit it to published content. */
export function createPublicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Configuration serveur manquante");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const LIST_COLUMNS =
  "id, slug, title, excerpt, cover_image_url, badge, faculty, author_name, published_at, views, categories(slug, name), reactions(count), comments(count)";

interface RawRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  badge: Badge;
  faculty: string | null;
  author_name: string;
  published_at: string;
  views: number;
  categories: { slug: string; name: string } | null;
  reactions: { count: number }[] | null;
  comments: { count: number }[] | null;
}

export function mapListRow(row: unknown): ArticleListItem {
  const r = row as RawRow;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    cover_image_url: r.cover_image_url,
    badge: r.badge,
    faculty: r.faculty,
    author_name: r.author_name,
    published_at: r.published_at,
    views: r.views,
    category: r.categories ? { slug: r.categories.slug, name: r.categories.name } : null,
    likes: r.reactions?.[0]?.count ?? 0,
    comments: r.comments?.[0]?.count ?? 0,
  };
}
