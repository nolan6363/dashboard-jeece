#!/bin/sh
# Ouvre le dashboard en plein écran au démarrage de la session graphique.
# À lancer automatiquement au démarrage (voir RASPBERRY_PI.md).
URL="http://localhost:3000"

# Empêche l'écran de se mettre en veille (X11)
xset s off 2>/dev/null
xset -dpms 2>/dev/null
xset s noblank 2>/dev/null

# Attend que le serveur réponde : au démarrage, Docker est parfois plus lent que
# la session graphique, et le navigateur resterait bloqué sur une page d'erreur.
until curl -s -o /dev/null "$URL"; do
  sleep 2
done

exec firefox --kiosk "$URL"
