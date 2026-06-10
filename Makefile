PYTHON ?= python3
VENV   ?= .venv
PIP    := $(VENV)/bin/pip
PY     := $(VENV)/bin/python

.PHONY: help install lint test schema enumerate clean

help:
	@echo "Targets:"
	@echo "  install  install the package and dev deps into $(VENV)"
	@echo "  lint     ruff check"
	@echo "  test     pytest"
	@echo "  schema   validate report.schema.json is a valid JSON Schema"
	@echo "  clean    remove $(VENV) and build artefacts"

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
