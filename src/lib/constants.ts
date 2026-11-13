export const SITE_NAME = "UK ACTU";
export const SITE_FULL_NAME = "UK ACTU - Université de Kara";

export const CATEGORIES = [
  { slug: "communiques", name: "Communiqués officiels" },
  { slug: "inscriptions-concours", name: "Inscriptions / Concours" },
  { slug: "examens-resultats", name: "Examens / Résultats" },
  { slug: "vie-etudiante", name: "Vie étudiante" },
  { slug: "evenements", name: "Événements" },
  { slug: "sports", name: "Sports" },
] as const;

export const FACULTIES = [
  { code: "FLESH", name: "Faculté des Lettres, Langues et Sciences Humaines" },
  { code: "FaSEG", name: "Faculté des Sciences Économiques et de Gestion" },
  { code: "FDSP", name: "Faculté de Droit et de Science Politique" },
  { code: "FSS", name: "Faculté des Sciences de la Santé" },
  { code: "ISMA", name: "Institut Supérieur des Métiers de l'Agriculture" },
  { code: "IPI", name: "Institut Polytechnique d'Ingénierie" },
  { code: "ISPAU", name: "Institut Supérieur de Planification et d'Aménagement Urbain" },
] as const;

export type Badge = "normal" | "une" | "urgent";

export const BADGE_LABELS: Record<Badge, string> = {
  urgent: "URGENT",
  une: "À LA UNE",
  normal: "NORMAL",
};

export function isKnownFaculty(value: string | undefined | null): value is string {
  return !!value && FACULTIES.some((f) => f.code === value);
}

export function isKnownCategory(value: string | undefined | null): value is string {
  return !!value && CATEGORIES.some((c) => c.slug === value);
}
