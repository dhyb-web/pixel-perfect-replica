import type { Badge } from "./constants";

export interface ArticleListItem {
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
  category: { slug: string; name: string } | null;
  likes: number;
  comments: number;
}

export interface ArticleDetail extends ArticleListItem {
  content: string;
  gallery_urls: string[];
  pdf_url: string | null;
  pdf_name: string | null;
}
