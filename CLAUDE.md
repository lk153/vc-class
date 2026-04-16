# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VC Class is a full-stack EdTech platform for language learning. Teachers create vocabulary tests with 10 question types, students take structured exams, and teachers grade results. Built with Next.js 16 App Router, React 19, Prisma 7.5 on PostgreSQL, and NextAuth v5.

## Commands

```bash
# Development
make dev              # Start dev server (port 18888)
make setup            # First-time: install, start DB, migrate, seed, dev

# Database
make db               # Start PostgreSQL container (port 5433)
make db-migrate       # Run Prisma migrations
make db-seed          # Seed database
make db-studio        # Open Prisma Studio GUI
make db-reset         # Drop all tables, re-migrate, re-seed

# Validation
make typecheck        # npx tsc --noEmit
make lint             # ESLint
make build            # Production build (prisma generate + next build)
```

Prisma commands require `--config prisma/prisma.config.ts` when run directly (the Makefile handles this). Prisma config manually loads `.env.local` and uses `DIRECT_URL` over `DATABASE_URL` for migrations.

## Architecture

**Framework**: Next.js 16 App Router with `src/` directory. Path alias `@/*` maps to `src/*`.

**Route Groups**:
- `src/app/(auth)/` — Login, registration (public)
- `src/app/(student)/` — Student dashboard, topics, flashcards, practice, results
- `src/app/teacher/` — Teacher dashboard, classes, practice tests, assignments
- `src/app/api/` — REST API endpoints

**Auth**: NextAuth v5 with Credentials provider (email/password, bcryptjs). JWT strategy. Session includes `id`, `email`, `name`, `role` (STUDENT/TEACHER), `status`. Auth check via `auth()` in server components, redirect to `/login`.

**Database**: Prisma 7.5 with `@prisma/adapter-pg` (PrismaPg). Global singleton in `src/lib/prisma.ts`. Strips `sslmode` from connection string for Supabase compatibility. SSL with `rejectUnauthorized: false`.

**i18n**: next-intl v4 with English (`messages/en.json`) and Vietnamese (`messages/vi.json`). Locale resolved from cookies in `src/lib/i18n/request.ts`. Use `useTranslations("namespace")` client-side, `getTranslations("namespace")` server-side.

**Media**: Vercel Blob (`@vercel/blob`) for image/audio uploads. Remote patterns configured in `next.config.ts`.

## Key Patterns

**Exam Flow**: Teacher creates PracticeTest (mode: "practice" | "test"). For test mode: `ExamEntryGate` → `ExamShell` orchestrator → `ExamHeader`/`ExamPhase`/`ExamFooter` → `ExamReview` → submit. `useExamSession` hook manages state with 3-second auto-save via ref-based interval. `correctAnswer` is never sent to client in test mode — grading happens server-side in `src/lib/grading.ts`.

**Test Structure**: PracticeTest → TestSection (PART/GROUP/EXERCISE tree) → Questions. `useExamPhases` builds flat phase list from section tree with seeded deterministic shuffle.

**Server Components**: Pages in `src/app/` are async server components. They fetch data with Prisma directly, pass serialized props to client components in `src/components/`.

**API Pattern**: Route handlers in `src/app/api/` use `auth()` for authentication, Prisma for data access. Atomic operations use `updateMany` with WHERE clauses for idempotency.

## Design System

Full spec in `design/DESIGN.md`. M3 skill in `.claude/skills/material-3-skill/SKILL.md`.

Key rules:
- Page background: `#f8f9ff` (never pure white)
- Primary: `#2a14b4` (deep purple)
- Text: `#121c2a` (never pure black) → `#464554` → `#777586` → `#c7c4d7`
- Cards: `rounded-2xl` with M3 shadow elevation (no borders)
- Buttons: `rounded-full` pill shape always
- Labels: `text-[10px] uppercase tracking-widest font-bold`
- Icons: Material Symbols Outlined only
- Typography: Roboto via `font-body` class on every text element
- Toasts: Sonner (`toast.success()` / `toast.error()`)
- Animations: Framer Motion (`motion/react`) with spring config
- Number inputs: local draft state + `onBlur` save (never `onChange` save)

## Conventions

- All components use `"use client"` directive when they need hooks/interactivity
- Translations use `useTranslations("teacher")` or `useTranslations("exam")` namespaces
- `tLang(t, languageName)` helper for translating language names
- Reusable components: `<ModalOverlay>`, `<Tooltip>`, `<ChipDropdown>`, `<ExamStatusBadge>`
- Filter chips follow M3 pattern: active = `bg-[#2a14b4] text-white`, inactive = `bg-[#f7f2fa] text-[#777586]`
- Responsive grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4`
