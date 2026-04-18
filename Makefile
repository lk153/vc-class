.PHONY: install dev build start db db-stop db-create db-migrate db-seed db-studio db-reset setup clean e2e e2e-ui e2e-headed e2e-report

# ──────────────────────────────────────────────
# Quick start
# ──────────────────────────────────────────────

## First-time setup: install deps, start DB, migrate, seed, then run dev server
setup: install db db-create db-migrate db-seed dev

## Install npm dependencies and generate Prisma client
install:
	npm install
	npx prisma generate

## Start Next.js dev server on port 18888
dev:
	npm run dev

## Build production bundle
build:
	npx prisma generate
	npm run build

## Start production server on port 18888
start:
	npm run start -- -p 18888

# ──────────────────────────────────────────────
# Database
# ──────────────────────────────────────────────

## Start PostgreSQL container (port 5433)
db:
	docker compose up -d

## Stop PostgreSQL container
db-stop:
	docker compose down

## Create vc_class database (idempotent)
db-create:
	@docker compose exec -T postgres psql -U luminaled -tc \
		"SELECT 1 FROM pg_database WHERE datname = 'vc_class'" | grep -q 1 || \
		docker compose exec -T postgres psql -U luminaled -c "CREATE DATABASE vc_class"

## Run Prisma migrations
db-migrate:
	npx prisma migrate dev --config prisma/prisma.config.ts

## Seed database with initial data
db-seed:
	npx prisma db seed --config prisma/prisma.config.ts

## Open Prisma Studio GUI
db-studio:
	npx prisma studio

## Reset database: drop all tables, re-migrate, and re-seed
db-reset:
	npx prisma migrate reset --config prisma/prisma.config.ts --force

## Deploy migrations without prompting
db-deploy:
	npx prisma migrate deploy --config prisma/prisma.config.ts

# ──────────────────────────────────────────────
# Utilities
# ──────────────────────────────────────────────

## Type-check without emitting
typecheck:
	npx tsc --noEmit

## Run ESLint
lint:
	npm run lint

## Remove build artifacts and node_modules
clean:
	rm -rf .next node_modules

# ──────────────────────────────────────────────
# E2E Tests (Playwright)
# ──────────────────────────────────────────────

PW = npx playwright test --config playwright/playwright.config.ts

## Worker count for E2E. Override: `make e2e WORKERS=8` or WORKERS=1 for serial.
## Default: 50% of CPU cores (set in playwright.config.ts).
WORKERS ?=

## Run all E2E tests (headless, chromium only, parallel)
e2e:
	PW_WORKERS=$(WORKERS) $(PW) --project=chromium --project=chromium-exam

## Run serially (single worker) — useful for debugging parallel-related flakes
e2e-serial:
	PW_WORKERS=1 $(PW) --project=chromium --project=chromium-exam

## Run a specific spec file. Usage: make e2e-file FILE=tests/auth/register.spec.ts
e2e-file:
	PW_WORKERS=$(WORKERS) $(PW) --project=chromium --project=chromium-exam playwright/$(FILE)

## Run a specific test by name. Usage: make e2e-test NAME="should register"
e2e-test:
	PW_WORKERS=$(WORKERS) $(PW) --project=chromium --project=chromium-exam --grep "$(NAME)"

## List all test titles (without running them)
e2e-list:
	$(PW) --list

## List tests in a specific file. Usage: make e2e-list-file FILE=tests/auth/register.spec.ts
e2e-list-file:
	$(PW) --list playwright/$(FILE)

## Open Playwright UI mode (interactive debugging)
e2e-ui:
	$(PW) --ui

## Run E2E tests with visible browser
e2e-headed:
	$(PW) --project=chromium --project=chromium-exam --headed

## Run a specific file with visible browser. Usage: make e2e-headed-file FILE=tests/auth/register.spec.ts
e2e-headed-file:
	$(PW) --project=chromium --project=chromium-exam --headed playwright/$(FILE)

## Open last E2E test report
e2e-report:
	npx playwright show-report playwright/report
