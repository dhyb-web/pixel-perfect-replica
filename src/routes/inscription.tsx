import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AuthShell } from "@/components/site/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeRedirect } from "@/lib/redirect";

export const Route = createFileRoute("/inscription")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(s.redirect),
  }),
  head: () => ({
    meta: [
      { title: "Inscription — UK ACTU" },
      { name: "description", content: "Créez votre compte UK ACTU en quelques secondes : nom, prénom, email et mot de passe." },
      { property: "og:title", content: "Inscription — UK ACTU" },
      { property: "og:description", content: "Rejoignez UK ACTU pour réagir aux actualités de l'Université de Kara." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [form, setForm] = useState({ last_name: "", first_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) navigate({ href: redirect ?? "/", replace: true });
  }, [ready, user, redirect, navigate]);

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin + (redirect ?? "/"),
        data: { first_name: form.first_name.trim(), last_name: form.last_name.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("registered")
          ? "Un compte existe déjà avec cet email."
          : "Inscription impossible. Vérifiez vos informations.",
      );
      return;
    }
    if (!data.session) setSentTo(form.email.trim());
    else toast.success("Compte créé, bienvenue !");
  }

  if (sentTo) {
    return (
      <AuthShell title="Vérifiez vos emails" subtitle="Plus qu'une étape pour activer votre compte.">
        <div className="flex flex-col items-center rounded-2xl bg-secondary p-8 text-center">
          <MailCheck className="size-12 text-accent" />
          <p className="mt-4 text-foreground">
            Un lien de confirmation a été envoyé à <span className="font-semibold">{sentTo}</span>.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Cliquez dessus, puis connectez-vous.</p>
          <Button asChild variant="accent" className="mt-6">
            <Link to="/connexion" search={{ redirect }}>Aller à la connexion</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Inscription" subtitle="Nom, prénom, email et mot de passe : c'est tout.">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="last_name">Nom</Label>
            <Input id="last_name" autoComplete="family-name" required maxLength={80} value={form.last_name} onChange={set("last_name")} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="first_name">Prénom</Label>
            <Input id="first_name" autoComplete="given-name" required maxLength={80} value={form.first_name} onChange={set("first_name")} className="h-11" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set("password")} className="h-11" />
          <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
        </div>
        <Button type="submit" variant="accent" className="h-11 w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Créer mon compte
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link to="/connexion" search={{ redirect }} className="font-semibold text-accent hover:underline">
          Connectez-vous
        </Link>
      </p>
    </AuthShell>
  );
}
