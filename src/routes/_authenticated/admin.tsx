import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    return { isAdmin: data === true };
  },
  head: () => ({
    meta: [
      { title: "Administration — UK ACTU" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin } = Route.useRouteContext();
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <ShieldAlert className="mx-auto size-12 text-urgent" />
        <h1 className="mt-4 text-3xl font-bold text-primary">Accès réservé</h1>
        <p className="mt-2 text-muted-foreground">Cet espace est réservé aux administrateurs de UK ACTU.</p>
        <Button asChild variant="accent" className="mt-6">
          <Link to="/">Retour à l'accueil</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Outlet />
    </div>
  );
}
