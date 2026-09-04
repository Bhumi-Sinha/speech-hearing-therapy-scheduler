# Slim Python base keeps the image small while still being a full CPython (needed for psycopg2/argon2 wheels)
FROM python:3.12-slim

WORKDIR /app

# System deps needed to build psycopg2 / argon2-cffi if wheels aren't available
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# --reload is fine for local dev; production would drop it and add workers via gunicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
