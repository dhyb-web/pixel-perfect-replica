/** Cleans a keyword so it can be used safely inside a database text filter. */
export function sanitizeSearch(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .replace(/[%_,()*\\:."'`;]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function excerptFrom(content: string, max = 220): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).trim() + "…";
}
