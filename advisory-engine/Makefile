.PHONY: install dev test lint run docker-build docker-run

VENV ?= .venv
PY   ?= $(VENV)/bin/python
PORT ?= 8000

install:
	python -m venv $(VENV)
	$(PY) -m pip install --upgrade pip
	$(PY) -m pip install -r requirements-dev.txt

test:
	$(PY) -m pytest

run:
	$(PY) -m uvicorn app.main:app --reload --port $(PORT)

docker-build:
	docker build -t khet-kundli-advisory .

docker-run:
	docker run --rm -p $(PORT):8000 --env-file .env khet-kundli-advisory
