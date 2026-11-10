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

- Board data is read/written from the browser with the Supabase client under per-user RLS; keep every table's policies scoped to `auth.uid()` so no extra server layer is needed.
- AI chat streams from the `/api/chat` server route (`src/lib/ai/chat.server.ts`), which verifies the bearer token and runs board tools with a user-scoped client — never the admin client — so the assistant can only touch the caller's data.
- The active chat thread lives in the `?chat=` search param on the `/app` layout so conversations survive reloads and can be linked.
- Card/column order uses fractional `position` values (`positionBetween`) so a move updates one row.
- New users get a profile, a starter project and sample tasks from the `handle_new_user` trigger; new projects get default columns from a trigger.
