import { useState, type FormEvent } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Search, User, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORIES } from "@/lib/constants";
import { displayName, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function SearchForm({ onDone, autoFocus }: { onDone?: () => void; autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    navigate({ to: "/actualites", search: { q: q.trim() || undefined } });
    onDone?.();
  }
  return (
    <form onSubmit={submit} role="search" className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-foreground/60" aria-hidden />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher une actualité…"
        aria-label="Rechercher une actualité"
        autoFocus={autoFocus}
        className="h-10 rounded-full border-primary-foreground/20 bg-primary-foreground/10 pl-9 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:bg-primary-foreground/15"
      />
    </form>
  );
}

function UserMenu() {
  const { user, profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/connexion", search: { redirect: undefined }, replace: true });
  }

  const name = displayName(profile, user);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="onDark" size="sm" className="h-10 rounded-full px-3">
          <span className="flex size-6 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-gold-foreground">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="hidden max-w-32 truncate sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          {name}
          <span className="block truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <LayoutDashboard /> Tableau de bord admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={signOut}>
          <LogOut /> Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteHeader() {
  const { user, ready } = useAuth();
  const [mobileSearch, setMobileSearch] = useState(false);
  const location = useRouterState({ select: (s) => s.location });
  const activeCat =
    location.pathname === "/actualites" ? (location.search as { categorie?: string }).categorie : undefined;
  const isHome = location.pathname === "/";

  return (
    <header className="sticky top-0 z-50 shadow-card">
      <div className="h-1 bg-brand-gradient" />
      <div className="bg-primary">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <div className="mx-auto hidden w-full max-w-md md:block">
            <SearchForm />
          </div>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Button
              variant="onDark"
              size="icon"
              className="rounded-full md:hidden"
              onClick={() => setMobileSearch((v) => !v)}
              aria-label={mobileSearch ? "Fermer la recherche" : "Rechercher"}
            >
              {mobileSearch ? <X /> : <Search />}
            </Button>
            {!ready ? (
              <div className="h-10 w-24" aria-hidden />
            ) : user ? (
              <UserMenu />
            ) : (
              <>
                <Button asChild variant="onDark" size="sm" className="h-10 rounded-full">
                  <Link to="/connexion" search={{ redirect: undefined }}>
                    <User className="sm:hidden" />
                    <span className="hidden sm:inline">Connexion</span>
                  </Link>
                </Button>
                <Button asChild variant="accent" size="sm" className="h-10 rounded-full px-4">
                  <Link to="/inscription" search={{ redirect: undefined }}>Inscription</Link>
                </Button>
              </>
            )}
          </div>
        </div>
        {mobileSearch && (
          <div className="px-4 pb-3 md:hidden">
            <SearchForm autoFocus onDone={() => setMobileSearch(false)} />
          </div>
        )}
      </div>
      <nav aria-label="Catégories" className="border-b bg-background">
        <div className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          <NavItem active={isHome} to="/">Accueil</NavItem>
          <CatLink active={location.pathname === "/actualites" && !activeCat}>Toutes</CatLink>
          {CATEGORIES.map((c) => (
            <CatLink key={c.slug} slug={c.slug} active={activeCat === c.slug}>
              {c.name}
            </CatLink>
          ))}
        </div>
      </nav>
    </header>
  );
}

const navItemClass = (active: boolean) =>
  cn(
    "relative shrink-0 whitespace-nowrap px-3 py-3 text-sm font-semibold transition-colors",
    "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
    active
      ? "text-primary after:bg-accent"
      : "text-muted-foreground hover:text-primary after:bg-transparent",
  );

function NavItem({ to, active, children }: { to: "/"; active: boolean; children: string }) {
  return (
    <Link to={to} className={navItemClass(active)}>
      {children}
    </Link>
  );
}

function CatLink({ slug, active, children }: { slug?: string; active: boolean; children: string }) {
  return (
    <Link to="/actualites" search={{ categorie: slug }} className={navItemClass(active)}>
      {children}
    </Link>
  );
}
