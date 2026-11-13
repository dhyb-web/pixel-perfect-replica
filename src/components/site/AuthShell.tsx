import type { ReactNode } from "react";
import { Newspaper, ShieldCheck, Heart } from "lucide-react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-5xl gap-0 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <aside className="hidden flex-col justify-between rounded-l-3xl bg-primary p-10 text-primary-foreground lg:flex">
        <div>
          <span className="inline-block h-1 w-12 rounded-full bg-brand-gradient" />
          <h2 className="mt-6 text-3xl font-extrabold leading-tight">
            Restez informé de tout ce qui se passe à l'Université de Kara.
          </h2>
        </div>
        <ul className="space-y-4 text-sm text-primary-foreground/80">
          <li className="flex gap-3"><Newspaper className="size-5 shrink-0 text-gold" /> Communiqués, résultats et inscriptions en temps réel</li>
          <li className="flex gap-3"><Heart className="size-5 shrink-0 text-gold" /> Aimez et commentez les actualités</li>
          <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-gold" /> Inscription simple : nom, email, mot de passe</li>
        </ul>
      </aside>
      <div className="rounded-3xl border bg-card p-6 shadow-card sm:p-10 lg:rounded-l-none">
        <h1 className="text-3xl font-extrabold text-primary">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
