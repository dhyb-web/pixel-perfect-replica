<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Public news reads go through `createServerFn` in `src/lib/news.functions.ts` with a publishable-key client; RLS limits anon to published rows. Why: SSR + SEO without exposing admin access.
- Storage buckets `images` and `pdfs` are private (workspace blocks public buckets); files are served via `/api/public/media/$bucket/$` and only that relative URL is stored in tables. Why: stable public URLs without public buckets.
- Likes, comments and admin CRUD use the browser client under RLS; admin rights come only from `public.user_roles` via `has_role`. Why: no privilege data in user-editable places.
- The first account ever created gets the admin role (signup trigger). Why: lets the owner publish without code; extra admins are added in `user_roles`.
- Article body is plain text; paragraphs are separated by a blank line. Why: simple admin editing without a rich editor.
