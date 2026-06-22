FROM python:3.11-slim

# Crear grupo y usuario sin privilegios para ejecutar la app.
# Nunca correr la app como root en producción.
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

# Copiar dependencias primero para aprovechar el cacheo de capas de Docker.
# Solo se reinstalan si requirements.txt cambia.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código
COPY . .

# Cambiar a usuario no-root antes de arrancar
USER appuser

EXPOSE 8000

# Healthcheck para Docker Compose y orquestadores
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
