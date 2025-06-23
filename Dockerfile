FROM python:3.13.3-alpine3.22

WORKDIR /app

# Instala dependencias primero (aprovecha caché)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el resto después
COPY . .

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1