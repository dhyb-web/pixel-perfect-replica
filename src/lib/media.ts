export type MediaBucket = "images" | "pdfs";

/** Stable, same-origin URL for a file kept in the storage buckets. */
export function mediaUrl(bucket: MediaBucket, path: string): string {
  return `/api/public/media/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .toLowerCase();
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${base || "fichier"}${ext ? "." + ext : ""}`;
}
