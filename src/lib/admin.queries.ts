import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const adminArticlesQuery = () =>
  queryOptions({
    queryKey: ["admin", "articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, slug, title, badge, status, faculty, views, published_at, updated_at, categories(name)")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminCategoriesQuery = () =>
  queryOptions({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, slug, name").order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

export const adminArticleQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "article", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
