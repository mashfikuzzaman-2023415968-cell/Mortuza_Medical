# ─────────────────────────────────────────────────────────────────────────────
#  MDC Web Portal — project task runner
#  Run `make` (or `make help`) to see all commands.
#
#  Database commands read PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE straight from
#  server/.env, so you never have to type credentials. First-time setup is just:
#      make install        # install backend + frontend dependencies
#      make db             # create the database and load schema + seed + views
#      make run            # start backend (:5000) and frontend (:5173) together
# ─────────────────────────────────────────────────────────────────────────────

.DEFAULT_GOAL := help

# Database name pulled from server/.env (for create/drop, which connect to the
# 'postgres' maintenance DB).
DBNAME := $(shell grep -E '^PGDATABASE=' server/.env 2>/dev/null | cut -d= -f2-)

# Export the PG* connection vars from server/.env into the shell so psql/createdb
# pick them up automatically.
LOAD_PGENV = set -a; eval "$$(grep -E '^(PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE)=' server/.env)"; set +a

SCHEMA = 01_schema (2).sql
SEED   = 03_seed (2).sql
VIEWS  = 04_views (1).sql
QUERIES = 05_queries (1).sql

.PHONY: help install install-server install-client db db-create db-drop db-reset db-queries backend backend-dev frontend run dev stop

help: ## Show this help
	@echo "MDC Web Portal — available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Typical first run:  make install  &&  make db  &&  make run"

# ── Dependencies ─────────────────────────────────────────────────────────────
install: install-server install-client ## Install backend + frontend dependencies

install-server: ## Install backend (server) dependencies
	cd server && npm install

install-client: ## Install frontend (client) dependencies
	cd client && npm install

# ── Database ─────────────────────────────────────────────────────────────────
db: db-create ## Create the database (if needed) and load schema + seed + views
	@echo "→ loading into database '$(DBNAME)'..."
	@$(LOAD_PGENV); psql -v ON_ERROR_STOP=1 -q -f "$(SCHEMA)"  && echo "  ✓ schema"
	@$(LOAD_PGENV); psql -v ON_ERROR_STOP=1 -q -f "$(SEED)"    && echo "  ✓ seed data"
	@$(LOAD_PGENV); psql -v ON_ERROR_STOP=1 -q -f "$(VIEWS)"   && echo "  ✓ views"
	@echo "✓ database '$(DBNAME)' is ready"

db-create: ## Create the database if it does not exist
	@$(LOAD_PGENV); PGDATABASE=postgres createdb "$(DBNAME)" 2>/dev/null && echo "✓ created database '$(DBNAME)'" || echo "• database '$(DBNAME)' already exists"

db-drop: ## Drop the database (DESTROYS ALL DATA)
	@$(LOAD_PGENV); PGDATABASE=postgres dropdb --if-exists "$(DBNAME)" && echo "✓ dropped database '$(DBNAME)'"

db-reset: db-drop db ## Drop and rebuild the database from scratch (DESTROYS ALL DATA)
	@echo "✓ database reset complete"

db-queries: ## Run the demo SQL queries and print their results
	@$(LOAD_PGENV); psql -f "$(QUERIES)"

# ── Run the app ──────────────────────────────────────────────────────────────
backend: ## Start the backend only (http://localhost:5000)
	cd server && npm start

backend-dev: ## Start the backend with auto-reload (nodemon)
	cd server && npm run dev

frontend: ## Start the frontend only (http://localhost:5173)
	cd client && npm run dev

run: ## Start backend AND frontend together (Ctrl+C stops both)
	@echo "Starting backend (:5000) and frontend (:5173) — press Ctrl+C to stop both."
	@trap 'kill 0' EXIT INT TERM; \
	(cd server && npm start) & \
	(cd client && npm run dev) & \
	wait

dev: run ## Alias for `make run`

stop: ## Stop any running backend / frontend started outside `make run`
	-@pkill -f "node src/index.js" 2>/dev/null && echo "✓ backend stopped" || echo "• backend not running"
	-@pkill -f "vite" 2>/dev/null && echo "✓ frontend stopped" || echo "• frontend not running"
