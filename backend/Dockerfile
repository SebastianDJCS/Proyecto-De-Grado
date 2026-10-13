# Backend UCTP - FastAPI + OR-Tools
# Python 3.12 coincide con runtime.txt (evita el problema de ruedas en 3.14)
FROM python:3.12

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencias primero para cachear la capa
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copia el código (venv/, .env y logs quedan fuera por .dockerignore)
COPY . .

EXPOSE 8000

# --host 0.0.0.0 es obligatorio dentro del contenedor
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
