#!/bin/sh
# Met à jour le dashboard : récupère la dernière version du code et relance le serveur.
# Usage (sur la Raspberry Pi, avec internet) : ./mettre-a-jour.sh
set -e
cd "$(dirname "$0")"

git pull

# « docker compose » (récent) ou « docker-compose » (ancien) selon l'installation
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

# --build ne reconstruit que si app/requirements.txt ou app/Dockerfile ont changé.
$COMPOSE up -d --build --remove-orphans
# Le code est monté dans le conteneur : un redémarrage suffit pour l'appliquer.
$COMPOSE restart

echo "Mise à jour terminée. Le dashboard se recharge tout seul d'ici quelques secondes."
