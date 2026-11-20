import { describe, expect, it } from "vitest";
import { CATEGORIES, FACULTIES, BADGE_LABELS } from "@/lib/constants";
import { sanitizeSearch } from "@/lib/search";
import { safeRedirect } from "@/lib/redirect";

describe("UK ACTU rules", () => {
  it("lists exactly the six requested categories", () => {
    expect(CATEGORIES.map((c) => c.name)).toEqual([
      "Communiqués officiels",
      "Inscriptions / Concours",
      "Examens / Résultats",
      "Vie étudiante",
      "Événements",
      "Sports",
    ]);
  });

  it("lists exactly the seven requested faculties", () => {
    expect(FACULTIES.map((f) => f.code)).toEqual(["FLESH", "FaSEG", "FDSP", "FSS", "ISMA", "IPI", "ISPAU"]);
  });

  it("uses the three requested badges", () => {
    expect(BADGE_LABELS).toEqual({ urgent: "URGENT", une: "À LA UNE", normal: "NORMAL" });
  });

  it("strips filter-breaking characters from search keywords", () => {
    expect(sanitizeSearch("campus,nord(1)%")).toBe("campus nord 1");
  });

  it("only allows same-site redirects after sign-in", () => {
    expect(safeRedirect("/actualites/abc")).toBe("/actualites/abc");
    expect(safeRedirect("https://evil.com")).toBeUndefined();
    expect(safeRedirect("//evil.com")).toBeUndefined();
  });
});
