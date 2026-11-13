import { createFileRoute } from "@tanstack/react-router";
import { createPublicClient } from "@/lib/news.server";

const BUCKETS = new Set(["images", "pdfs"]);

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  pdf: "application/pdf",
};

// Serves files from the storage buckets at stable public URLs (read-only).
export const Route = createFileRoute("/api/public/media/$bucket/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const bucket = params.bucket;
        const path = params._splat ?? "";
        if (!BUCKETS.has(bucket) || !path || path.includes("..")) {
          return new Response("Introuvable", { status: 404 });
        }
        const db = createPublicClient();
        const { data, error } = await db.storage.from(bucket).download(decodeURIComponent(path));
        if (error || !data) return new Response("Introuvable", { status: 404 });

        const ext = path.split(".").pop()?.toLowerCase() ?? "";
        const headers = new Headers({
          "Content-Type": TYPES[ext] ?? data.type ?? "application/octet-stream",
          "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
          "X-Content-Type-Options": "nosniff",
        });
        const download = new URL(request.url).searchParams.get("download");
        if (download) {
          const name = download.replace(/[^\p{L}\p{N} ._()-]/gu, "").slice(0, 120) || "document.pdf";
          headers.set(
            "Content-Disposition",
            `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
          );
        }
        return new Response(data, { headers });
      },
    },
  },
});
