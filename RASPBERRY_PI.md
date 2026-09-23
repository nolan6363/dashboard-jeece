# Raspberry Pi : installation, réseau et affichage

Matériel actuel : Raspberry Pi 3B branchée à la TV, avec Firefox en mode kiosque.

## Installation (nouvelle carte SD)

```bash
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER      # puis se déconnecter / reconnecter
sudo systemctl enable docker

# Le dashboard
git clone https://github.com/<compte>/dashboard-jeece.git ~/Dashboard-JEECE
cd ~/Dashboard-JEECE
docker compose up -d --build      # ou docker-compose selon la version installée
```

Le conteneur redémarre tout seul au démarrage de la Pi (`restart: unless-stopped`).

Pour restaurer les données d'une ancienne installation, copie son dossier `data/` dans `~/Dashboard-JEECE/data/` avant de lancer le conteneur.

## Lancer le dashboard au démarrage (mode kiosque)

Le script `raspberry/kiosque.sh` attend que le serveur réponde, puis ouvre Firefox en plein écran. Pour le lancer automatiquement à l'ouverture de la session graphique :

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/dashboard.desktop <<EOF
[Desktop Entry]
Type=Application
Name=Dashboard JEECE
Exec=/home/$USER/Dashboard-JEECE/raspberry/kiosque.sh
EOF
```

Pour quitter le mode kiosque : `Alt+F4`.

## Réseau

La Pi n'a pas besoin d'internet pour fonctionner. Il lui faut seulement :
- un **accès réseau depuis ton ordinateur ou ton téléphone** pour ouvrir `/admin` ;
- **internet**, seulement pour les mises à jour du code (`./mettre-a-jour.sh`).

### Solution actuelle : partage de connexion d'un téléphone

La Pi et l'ordinateur se connectent au même partage de connexion, puis on ouvre `http://<ip-de-la-pi>:3000/admin`. Pour trouver l'IP : `hostname -I` sur la Pi, ou la liste des appareils connectés dans les réglages du partage. On peut aussi souvent utiliser `http://<nom-de-la-pi>.local:3000/admin`, sans connaître l'IP (le nom s'obtient avec `hostname`).

Pour ajouter un nouveau réseau Wi‑Fi (par exemple le partage de connexion de la personne qui reprend le dashboard) : `sudo raspi-config` → *System Options* → *Wireless LAN*, ou `sudo nmcli device wifi connect "<nom>" password "<mot de passe>"`.

### Alternative : la Pi crée son propre Wi‑Fi

La Pi peut émettre son propre réseau Wi‑Fi. Il suffit alors de s'y connecter avec son téléphone ou son ordinateur et d'ouvrir `http://10.42.0.1:3000/admin`. L'adresse ne change jamais, et on ne dépend plus du téléphone de quelqu'un. Il faut Raspberry Pi OS Bookworm ou plus récent (NetworkManager) :

```bash
sudo nmcli device wifi hotspot ifname wlan0 ssid "JEECE-Dashboard" password "<mot de passe>"
sudo nmcli connection modify Hotspot connection.autoconnect yes connection.autoconnect-priority 10
```

Limite : dans ce mode, la Pi n'a pas internet. Pour une mise à jour du code, il faut la connecter temporairement à un autre réseau (`sudo nmcli connection up "<nom du partage>"`, puis `sudo nmcli connection up Hotspot` pour revenir), ou lui brancher un câble Ethernet.

## Performances (Pi 3B)

La page est optimisée pour la Pi : pas d'effets de flou, pas de bibliothèque JavaScript, et une seule animation. Si l'affichage reste saccadé :

1. **Désactiver l'animation de la vague** dans `/admin` → *Affichage*. C'est le seul élément animé en continu.
2. **Passer l'écran en 1280×720** (`sudo raspi-config` → *Display Options* → *Resolution*). La page s'adapte à la résolution, et la Pi a 2,25 fois moins de pixels à dessiner qu'en 1080p.
3. **Essayer Chromium** à la place de Firefox (remplacer `firefox --kiosk` par `chromium-browser --kiosk --noerrdialogs --disable-infobars` dans `raspberry/kiosque.sh`). Raspberry Pi OS livre une version de Chromium optimisée pour la Pi, souvent plus fluide.

## Dépannage

```bash
cd ~/Dashboard-JEECE
docker compose ps              # le conteneur tourne-t-il ?
docker compose logs --tail 50  # messages d'erreur du serveur
docker compose restart         # redémarrer le serveur
```

- **L'écran affiche « impossible de se connecter »** : le serveur n'a pas démarré. Regarde les logs. `raspberry/kiosque.sh` évite ce problème au démarrage.
- **Les données ont disparu ou sont fausses** : la version précédente est dans `data/dashboard.json.bak`. Pour la restaurer : `sudo cp data/dashboard.json.bak data/dashboard.json`.
- **Plus de place sur la carte SD** : `docker system prune -a`.
