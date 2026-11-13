import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { FileText, ImagePlus, Loader2, Send, Save, Trash2, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { adminCategoriesQuery } from "@/lib/admin.queries";
import { FACULTIES, type Badge } from "@/lib/constants";
import { mediaUrl, safeFileName, type MediaBucket } from "@/lib/media";
import { excerptFrom, slugify } from "@/lib/search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewsBadge } from "@/components/news/NewsBadge";
import { cn } from "@/lib/utils";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
type Status = "draft" | "published";

async function uploadFile(bucket: MediaBucket, file: File): Promise<string> {
  const path = `articles/${new Date().getFullYear()}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return mediaUrl(bucket, path);
}

const BADGES: { value: Badge; label: string; hint: string }[] = [
  { value: "normal", label: "Normal", hint: "Actualité standard" },
  { value: "une", label: "À la une", hint: "Grande actualité en haut de l'accueil" },
  { value: "urgent", label: "Urgent", hint: "Bandeau rouge très visible" },
];

export function ArticleForm({ initial }: { initial?: ArticleRow }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories } = useSuspenseQuery(adminCategoriesQuery());

  const [title, setTitle] = useState(initial?.title ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? categories[0]?.id ?? "");
  const [faculty, setFaculty] = useState(initial?.faculty ?? "none");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [author, setAuthor] = useState(initial?.author_name ?? "Rédaction UK ACTU");
  const [cover, setCover] = useState<string | null>(initial?.cover_image_url ?? null);
  const [gallery, setGallery] = useState<string[]>(initial?.gallery_urls ?? []);
  const [pdfUrl, setPdfUrl] = useState<string | null>(initial?.pdf_url ?? null);
  const [pdfName, setPdfName] = useState<string | null>(initial?.pdf_name ?? null);
  const [badge, setBadge] = useState<Badge>(initial?.badge ?? "normal");
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? "");
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState<Status | null>(null);

  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  async function onCover(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choisissez une image.");
    setUploading("cover");
    try {
      setCover(await uploadFile("images", file));
    } catch {
      toast.error("Envoi de l'image impossible (10 Mo max).");
    } finally {
      setUploading(null);
    }
  }

  async function onGallery(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    setUploading("gallery");
    try {
      const urls: string[] = [];
      for (const f of files) urls.push(await uploadFile("images", f));
      setGallery((g) => [...g, ...urls]);
    } catch {
      toast.error("Certaines images n'ont pas pu être envoyées.");
    } finally {
      setUploading(null);
    }
  }

  async function onPdf(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return toast.error("Choisissez un fichier PDF.");
    }
    setUploading("pdf");
    try {
      setPdfUrl(await uploadFile("pdfs", file));
      setPdfName(file.name);
    } catch {
      toast.error("Envoi du PDF impossible (20 Mo max).");
    } finally {
      setUploading(null);
    }
  }

  async function save(status: Status) {
    if (!title.trim()) return toast.error("Le titre est obligatoire.");
    if (!content.trim()) return toast.error("Le texte de l'actualité est obligatoire.");
    setSaving(status);
    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      title: title.trim(),
      category_id: categoryId || null,
      faculty: faculty === "none" ? null : faculty,
      excerpt: excerpt.trim() || excerptFrom(content),
      content: content.trim(),
      author_name: author.trim() || "Rédaction UK ACTU",
      cover_image_url: cover,
      gallery_urls: gallery,
      pdf_url: pdfUrl,
      pdf_name: pdfUrl ? pdfName : null,
      badge,
      video_url: videoUrl.trim() || null,
      status,
    };

    let error;
    if (initial) {
      const firstPublish = initial.status === "draft" && status === "published";
      ({ error } = await supabase
        .from("articles")
        .update({ ...payload, ...(firstPublish ? { published_at: new Date().toISOString() } : {}) })
        .eq("id", initial.id));
    } else {
      const slug = `${slugify(title) || "actualite"}-${crypto.randomUUID().slice(0, 5)}`;
      ({ error } = await supabase.from("articles").insert({
        ...payload,
        slug,
        author_id: auth.user?.id ?? null,
        published_at: new Date().toISOString(),
      }));
    }
    setSaving(null);
    if (error) {
      toast.error("Enregistrement impossible. Vérifiez vos droits administrateur.");
      return;
    }
    toast.success(status === "published" ? "Actualité publiée !" : "Brouillon enregistré.");
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
    await queryClient.invalidateQueries({ queryKey: ["news"] });
    navigate({ to: "/admin" });
  }

  const busy = !!uploading || !!saving;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Field label="Titre" htmlFor="title">
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} className="h-12 text-lg font-semibold" placeholder="Titre de l'actualité" />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Catégorie">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Faculté">
            <Select value={faculty} onValueChange={setFaculty}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Faculté" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Toute l'université</SelectItem>
                {FACULTIES.map((f) => (
                  <SelectItem key={f.code} value={f.code}>{f.code} — {f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Chapeau (résumé court)" htmlFor="excerpt" hint="Laissez vide pour le générer automatiquement à partir du texte.">
          <Textarea id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} maxLength={400} />
        </Field>

        <Field label="Texte complet" htmlFor="content" hint="Laissez une ligne vide entre deux paragraphes.">
          <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={16} className="font-serif-display text-base leading-relaxed" />
        </Field>

        <Field label="Auteur" htmlFor="author">
          <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={120} className="h-11" />
        </Field>

        <Field label="Galerie d'images">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {gallery.map((src, i) => (
              <div key={src + i} className="group relative overflow-hidden rounded-lg border">
                <img src={src} alt="" className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setGallery((g) => g.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded-full bg-primary/80 p-1 text-primary-foreground hover:bg-destructive"
                  aria-label="Retirer l'image"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => galleryInput.current?.click()}
              disabled={busy}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs font-semibold text-muted-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {uploading === "gallery" ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
              Ajouter
            </button>
          </div>
          <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={onGallery} />
        </Field>
      </div>

      <aside className="space-y-6">
        <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-card">
          <Button className="h-11 w-full" variant="accent" disabled={busy} onClick={() => save("published")}>
            {saving === "published" ? <Loader2 className="animate-spin" /> : <Send />} Publier
          </Button>
          <Button className="h-11 w-full" variant="outline" disabled={busy} onClick={() => save("draft")}>
            {saving === "draft" ? <Loader2 className="animate-spin" /> : <Save />} Enregistrer en brouillon
          </Button>
          {initial && (
            <p className="text-center text-xs text-muted-foreground">
              Statut actuel : <span className="font-semibold">{initial.status === "published" ? "Publiée" : "Brouillon"}</span>
            </p>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold text-foreground">Badge</p>
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="Badge">
            {BADGES.map((b) => (
              <button
                key={b.value}
                type="button"
                role="radio"
                aria-checked={badge === b.value}
                onClick={() => setBadge(b.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors",
                  badge === b.value ? "border-accent bg-accent/5" : "hover:border-primary/40",
                )}
              >
                <span>
                  <span className="block text-sm font-semibold">{b.label}</span>
                  <span className="block text-xs text-muted-foreground">{b.hint}</span>
                </span>
                <NewsBadge badge={b.value} showNormal />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold text-foreground">Image de couverture</p>
          {cover ? (
            <div className="relative mt-3 overflow-hidden rounded-xl">
              <img src={cover} alt="Couverture" className="aspect-video w-full object-cover" />
              <button type="button" onClick={() => setCover(null)} className="absolute right-2 top-2 rounded-full bg-primary/80 p-1.5 text-primary-foreground hover:bg-destructive" aria-label="Retirer la couverture">
                <Trash2 className="size-4" />
              </button>
            </div>
          ) : null}
          <Button type="button" variant="outline" className="mt-3 w-full" disabled={busy} onClick={() => coverInput.current?.click()}>
            {uploading === "cover" ? <Loader2 className="animate-spin" /> : <Upload />} {cover ? "Changer l'image" : "Choisir une image"}
          </Button>
          <input ref={coverInput} type="file" accept="image/*" hidden onChange={onCover} />
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold text-foreground">Pièce jointe PDF</p>
          <p className="text-xs text-muted-foreground">Communiqué, résultats…</p>
          {pdfUrl && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary p-2 text-sm">
              <FileText className="size-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate">{pdfName || "document.pdf"}</span>
              <button type="button" onClick={() => { setPdfUrl(null); setPdfName(null); }} aria-label="Retirer le PDF" className="text-muted-foreground hover:text-destructive">
                <X className="size-4" />
              </button>
            </div>
          )}
          <Button type="button" variant="outline" className="mt-3 w-full" disabled={busy} onClick={() => pdfInput.current?.click()}>
            {uploading === "pdf" ? <Loader2 className="animate-spin" /> : <Upload />} {pdfUrl ? "Remplacer le PDF" : "Ajouter un PDF"}
          </Button>
          <input ref={pdfInput} type="file" accept="application/pdf,.pdf" hidden onChange={onPdf} />
        </div>

        <div className="rounded-2xl border border-dashed bg-muted p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Video className="size-4" /> Vidéo YouTube
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Bientôt</span>
          </p>
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/…" className="mt-3" />
          <p className="mt-2 text-xs text-muted-foreground">Le lien est enregistré mais la vidéo n'est pas encore affichée sur le site.</p>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-semibold">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
