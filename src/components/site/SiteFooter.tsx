import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "./Logo";
import { CATEGORIES, FACULTIES } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-primary text-primary-foreground">
      <div className="h-1 bg-brand-gradient" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Logo />
          <h2 className="mt-6 text-sm font-bold uppercase tracking-widest text-gold">À propos de l'UK</h2>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
            Créée en 2004, l'Université de Kara est la deuxième université publique du Togo. Elle forme
            chaque année des milliers d'étudiants dans ses facultés et instituts, au service du
            développement du pays.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gold">Facultés & instituts</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {FACULTIES.map((f) => (
              <li key={f.code}>
                <Link
                  to="/actualites"
                  search={{ faculte: f.code }}
                  className="text-primary-foreground/75 transition-colors hover:text-gold"
                >
                  <span className="font-semibold text-primary-foreground">{f.code}</span> — {f.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gold">Rubriques</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link
                  to="/actualites"
                  search={{ categorie: c.slug }}
                  className="text-primary-foreground/75 transition-colors hover:text-gold"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gold">Contacts</h2>
          <ul className="mt-4 space-y-3 text-sm text-primary-foreground/75">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              Université de Kara, BP 404, Kara — Togo
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              (+228) 26 60 00 00
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
              <a href="mailto:contact@univkara.tg" className="hover:text-gold">contact@univkara.tg</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {2026} UK ACTU — Université de Kara. Tous droits réservés.</p>
          <p>L'actualité officielle de l'Université de Kara.</p>
        </div>
      </div>
    </footer>
  );
}
