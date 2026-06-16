PYTHON ?= python3
VENV   ?= .venv
PIP    := $(VENV)/bin/pip
PY     := $(VENV)/bin/python
PNPM   ?= pnpm

.PHONY: help install lint test schema enumerate clean \
        site-install site-lint site-test site-build site-dev site-storybook

help:
	@echo "Scanner targets:"
	@echo "  install      install the Python package and dev deps into $(VENV)"
	@echo "  lint         ruff check"
	@echo "  test         pytest"
	@echo "  schema       validate report.schema.json is a valid JSON Schema"
	@echo "  enumerate    run scanner enumerate against the live catalogue"
	@echo "  clean        remove $(VENV) and build artefacts"
	@echo ""
	@echo "Site targets (React app under site/):"
	@echo "  site-install   pnpm install"
	@echo "  site-lint      pnpm lint + lint-types"
	@echo "  site-test      pnpm test:ci"
	@echo "  site-build     pnpm build"
	@echo "  site-dev       vite dev server on :5173 (proxies report data from :8765)"
	@echo "  site-storybook storybook on :6006"

$(VENV)/bin/activate:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip

install: $(VENV)/bin/activate
	$(PIP) install -e ".[dev]"

lint: install
	$(VENV)/bin/ruff check scanner tests

test: install
	$(VENV)/bin/pytest

schema: install
	$(VENV)/bin/python -m json.tool schema/report.schema.json > /dev/null
	$(VENV)/bin/python -c "import json, jsonschema; \
		s = json.load(open('schema/report.schema.json')); \
		jsonschema.Draft202012Validator.check_schema(s); \
		print('schema OK')"

enumerate: install
	$(VENV)/bin/scanner enumerate

clean:
	rm -rf $(VENV) build dist *.egg-info .pytest_cache .ruff_cache
	rm -rf site/node_modules site/dist site/storybook-static

# --- Site targets ---

site-install:
	cd site && $(PNPM) install

site-lint:
	cd site && $(PNPM) lint && $(PNPM) lint-types

site-test:
	cd site && $(PNPM) test:ci

site-build:
	cd site && $(PNPM) build

site-dev:
	cd site && $(PNPM) dev

site-storybook:
	cd site && $(PNPM) storybook
