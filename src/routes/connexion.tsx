import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AuthShell } from "@/components/site/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeRedirect } from "@/lib/redirect";

export const Route = createFileRoute("/connexion")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(s.redirect),
  }),
  head: () => ({
    meta: [
      { title: "Connexion — UK ACTU" },
      { name: "description", content: "Connectez-vous à UK ACTU pour aimer et commenter les actualités de l'Université de Kara." },
      { property: "og:title", content: "Connexion — UK ACTU" },
      { property: "og:description", content: "Connectez-vous pour réagir aux actualités de l'Université de Kara." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ href: redirect ?? "/", replace: true });
  }, [ready, user, redirect, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.includes("Email not confirmed")
          ? "Confirmez d'abord votre adresse email (lien reçu par email)."
          : "Email ou mot de passe incorrect.",
      );
      return;
    }
    toast.success("Bienvenue sur UK ACTU !");
  }

  return (
    <AuthShell title="Connexion" subtitle="Accédez à votre compte UK ACTU.">
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        <Button type="submit" variant="accent" className="h-11 w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />} Se connecter
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link to="/inscription" search={{ redirect }} className="font-semibold text-accent hover:underline">
          Inscrivez-vous
        </Link>
      </p>
    </AuthShell>
  );
}
