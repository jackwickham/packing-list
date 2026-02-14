# Packing List

A personal web app for managing packing lists for trips, with reusable templates and per-trip lists.

## Technology

Backend:

- Express 5 on Node.js with TypeScript (ESM, `"type": "module"`)
- SQLite via better-sqlite3 (no ORM, raw SQL)
- YAML config (`config.yaml` with fallback to `config.default.yaml`)

Frontend:

- React 19 + TypeScript, bundled with Vite 6
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin, no config file, use `@theme {}` in CSS)
- React Router v7 (import from `react-router`, not `react-router-dom`)

## Code structure

```
src/server/              Express API server
  index.ts               App bootstrap, static file serving, SPA fallback
  config.ts              YAML config loader
  db.ts                  SQLite init, schema creation, category seeding
  routes/
    lists.ts             CRUD + duplicate + create-from-templates
    items.ts             CRUD, touches parent list updated_at
    categories.ts        CRUD with deletion guard
    suggestions.ts       Prefix-match autocomplete endpoint

src/client/              React SPA
  main.tsx               React root + BrowserRouter
  App.tsx                Routes (/ and /lists/:id) + layout
  api.ts                 Typed fetch wrapper for all API endpoints
  types.ts               Shared interfaces (PackingList, Item, Category, Suggestion)
  index.css              Tailwind imports + theme customization
  components/
    HomePage.tsx          Active lists, templates, archived lists toggle
    ListPage.tsx          Full list view with editing, checked items section, undo toast
    NewListModal.tsx      Create blank or from template(s)
    ItemRow.tsx           Checkbox + inline text edit + delete
    CategorySection.tsx   Groups items by category + add input
    AutocompleteInput.tsx Debounced suggestion dropdown with keyboard nav
```

## Key patterns

- Templates are lists with `is_template = 1` (no separate table)
- `is_archived` and `is_checked` are integers (0/1), not booleans (SQLite has no bool)
- Express 5 uses path-to-regexp v8: wildcard routes must be `/{*path}` not `*`
- All item mutations touch the parent list's `updated_at`
- Suggestions use prefix match (`LIKE 'text%'`), exclude items already in the current list, ordered by frequency

## DB schema

Three tables: `categories`, `lists`, `items`. Items have foreign keys to both lists (CASCADE delete) and categories (RESTRICT delete). See `src/server/db.ts` for full schema.

## Scripts

- `npm run dev` - Vite (port 5173) + Express via tsx watch (port 3000), Vite proxies `/api`
- `npm run typecheck` - `tsc --noEmit`

## After changes

After making changes, make sure to:

- run `npm run typecheck` to verify TypeScript compiles cleanly
- check that CLAUDE.md is still up to date, and update it if appropriate
