FROM python:3.11-slim

# Seules les dépendances sont installées dans l'image.
# Le code est monté depuis le dépôt (voir docker-compose.yml) : après un
# `git pull`, un simple redémarrage suffit, pas besoin de reconstruire.
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /srv
EXPOSE 3000
CMD ["python", "app/server.py"]
