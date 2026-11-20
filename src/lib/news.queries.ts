import { queryOptions } from "@tanstack/react-query";
import { getArticleBySlug, getHomeNews, listNews } from "./news.functions";

export const homeNewsQuery = () =>
  queryOptions({ queryKey: ["news", "home"], queryFn: () => getHomeNews() });

export interface NewsFilters {
  q?: string | undefined;
  categorie?: string | undefined;
  faculte?: string | undefined;
}

export const newsListQuery = (filters: NewsFilters) =>
  queryOptions({
    queryKey: ["news", "list", filters.q ?? "", filters.categorie ?? "", filters.faculte ?? ""],
    queryFn: () => listNews({ data: filters }),
  });

export const articleQuery = (slug: string) =>
  queryOptions({
    queryKey: ["news", "article", slug],
    queryFn: () => getArticleBySlug({ data: { slug } }),
  });
