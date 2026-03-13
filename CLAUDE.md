# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Benfit Treinos — fitness/training management app. React 19 + Vite SPA backed by Supabase (auth + database). Deployed on Vercel.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

## Architecture

Single-page React app using React Router v7 for navigation.

- `src/pages/` — Route-level page components
- `src/components/` — Reusable UI components
- `src/context/` — React context providers (auth, app state)
- `src/hooks/` — Custom hooks
- `src/services/` — Supabase client and API calls
- `src/layouts/` — Layout wrappers
- `src/lib/` — Utilities and helpers
- `database/` — SQL schema and migration files for Supabase
- `supabase/` — Supabase project config and migrations
- `scripts/` — Helper scripts

**Backend**: Supabase (PostgreSQL + Auth). No separate server — all data access goes through the Supabase JS client.

**Styling**: Tailwind CSS + `tailwindcss-animate`.

## Skills (AGENTS.md)

This project uses skill files in `antigravity-skills/skills/`:

- `estilo_paf` — Primary skill. Apply to all UI/UX, layout, styling, and design tasks.
- `design_profissional` — Professional design deliverables.
- `ui-ux-designer` — Interface design and design systems.
- `ui-visual-validator` — Visual validation against design system.
- `sql-pro` — Apply to all database, SQL, schema, and Supabase tasks.

**Design System**: `design-system/` contains the master design reference. Check `design-system/centro/pages/[page-name].md` first for page-specific rules; fall back to `design-system/centro/MASTER-BR.md`.
