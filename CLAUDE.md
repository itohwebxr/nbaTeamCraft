@AGENTS.md

# Project Rules

## Language
There are two distinct language rules — do not mix them up:

- **App UI text** (UI labels, buttons, messages, placeholders, modals, etc.) must be written in **English**. Do not use Japanese or any other language in the app UI.
- **Conversation with the user**: Claude must always reply in **Japanese** (日本語) in chat, including explanations, progress reports, and summaries. Code, identifiers, commit messages, and the app UI itself stay in English as specified above.

## Supabase Migrations

When creating a new table, **always include GRANT statements** in the same migration file. Missing grants cause `permission denied` errors at runtime even when RLS policies allow access.

Required pattern for every new table:

```sql
CREATE TABLE IF NOT EXISTS my_table (...);

ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON my_table ...;

-- Always include these:
GRANT SELECT ON public.my_table TO anon, authenticated, service_role;
GRANT INSERT ON public.my_table TO anon, authenticated, service_role;
GRANT UPDATE ON public.my_table TO authenticated, service_role;
GRANT DELETE ON public.my_table TO authenticated, service_role;
```

Omit UPDATE/DELETE grants for append-only tables, but SELECT and INSERT must always be explicit.

## GTM Custom Events
When implementing any new feature, always follow these two steps:

1. **Propose custom events**: Before or during implementation, propose which GTM custom events should be sent and at what user actions. Use `lib/gtm.ts` to add new event functions and call them from the relevant components.

2. **Explain GTM configuration**: After implementing the events, explain what additional GTM settings are required:
   - New data layer variables (`dlv_*`) to add in Step 2
   - Whether the existing `tag_all_custom_events` tag covers it (just add new event parameters) or if a new tag is needed
   - Any new GA4 custom dimensions to register if the new parameters are useful for reporting
