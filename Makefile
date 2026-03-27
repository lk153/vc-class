.PHONY: install dev build start db db-stop db-create db-migrate db-seed db-studio db-reset setup clean

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
