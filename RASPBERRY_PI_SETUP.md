# 🍓 Guide d'installation sur Raspberry Pi

Ce guide vous explique comment installer et configurer le Dashboard JEECE sur une Raspberry Pi.

## 📋 Prérequis

- Raspberry Pi 3 ou 4 (recommandé: Pi 4 avec 2GB+ RAM)
- Carte SD (minimum 16GB)
- Raspberry Pi OS (anciennement Raspbian) installé
- Accès SSH ou écran/clavier/souris connectés

## 🔧 Étape 1: Configuration du WiFi

### Option A: Configuration via l'interface graphique (si vous avez un écran)

1. Cliquez sur l'icône WiFi en haut à droite
2. Sélectionnez le réseau "nolan"
3. Entrez le mot de passe: `nolanlebg`

### Option B: Configuration via ligne de commande (SSH)

```bash
# Créer/éditer la configuration WiFi
sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
```

Ajoutez à la fin du fichier:

```
network={
    ssid="nolan"
    psk="nolanlebg"
    key_mgmt=WPA-PSK
}
```

Sauvegardez (Ctrl+O, Enter) et quittez (Ctrl+X).

Redémarrez le service WiFi:
```bash
sudo wpa_cli -i wlan0 reconfigure
```

Vérifiez la connexion:
```bash
ip addr show wlan0
# Vous devriez voir une adresse IP 192.168.x.x
```

### Option C: Configuration via wpa_cli (méthode interactive)

```bash
sudo wpa_cli
> add_network
0
> set_network 0 ssid "nolan"
OK
> set_network 0 psk "nolanlebg"
OK
> enable_network 0
OK
> save_config
OK
> quit
```

## 🐳 Étape 2: Installation de Docker

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER

# Installer Docker Compose
sudo apt install docker-compose -y

# Redémarrer la session pour appliquer les changements de groupe
sudo reboot
```

Après le redémarrage, vérifiez l'installation:
```bash
docker --version
docker-compose --version
```

## 📦 Étape 3: Installation du Dashboard JEECE

```bash
# Cloner ou copier votre projet sur la Raspberry Pi
# Si vous utilisez Git:
git clone <URL_DE_VOTRE_REPO> Dashboard-JEECE
cd Dashboard-JEECE

# Ou si vous transférez les fichiers manuellement via SSH:
# scp -r Dashboard-JEECE/ pi@<IP_RASPBERRY>:~/
```

Vérifiez que le fichier `.env` est configuré en mode offline:
```bash
cat .env
# Devrait afficher:
# OFFLINE_MODE=true
```

## 🚀 Étape 4: Lancement de l'application

```bash
# Se placer dans le dossier du projet
cd ~/Dashboard-JEECE

# Construire et lancer les conteneurs
docker-compose up -d --build

# Vérifier que les conteneurs tournent
docker-compose ps

# Afficher les logs si nécessaire
docker-compose logs -f
```

## 🌐 Étape 5: Accès à l'application

### Trouver l'adresse IP de votre Raspberry Pi

```bash
hostname -I
# Note l'adresse IP (exemple: 192.168.1.100)
```

### Accéder au Dashboard

Depuis n'importe quel appareil sur le même réseau WiFi "nolan":

- **Dashboard principal**: `http://<IP_RASPBERRY>:3000`
- **Interface admin**: `http://<IP_RASPBERRY>:3000/admin`
- **API backend**: `http://<IP_RASPBERRY>:5000/api`

Exemple: `http://192.168.1.100:3000`

## 🎨 Étape 6: Configuration de l'affichage TV

### Installer Chromium en mode kiosk

```bash
# Installer Chromium si ce n'est pas déjà fait
sudo apt install chromium-browser -y

# Installer unclutter pour cacher le curseur
sudo apt install unclutter -y

# Créer un script de démarrage
nano ~/start-dashboard.sh
```

Contenu du script:
```bash
#!/bin/bash

# Attendre que le réseau soit prêt
sleep 10

# Désactiver l'économie d'énergie de l'écran
xset s off
xset -dpms
xset s noblank

# Cacher le curseur
unclutter -idle 0.1 &

# Lancer Chromium en mode kiosk
chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:3000
```

Rendre le script exécutable:
```bash
chmod +x ~/start-dashboard.sh
```

### Configurer le démarrage automatique

```bash
# Créer le fichier autostart
mkdir -p ~/.config/lxsession/LXDE-pi
nano ~/.config/lxsession/LXDE-pi/autostart
```

Ajouter ces lignes:
```
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash
@point-rpi
@/home/pi/start-dashboard.sh
```

Redémarrez:
```bash
sudo reboot
```

## 📝 Étape 7: Modifier les données via l'interface web

1. Accédez à `http://<IP_RASPBERRY>:3000/admin`
2. Modifiez les valeurs:
   - Objectif annuel
   - CA total (ou calculez automatiquement)
   - CA de chaque CDP
3. Cliquez sur "Sauvegarder les modifications"
4. Les données seront automatiquement synchronisées avec le dashboard

## 🔄 Maintenance

### Redémarrer l'application
```bash
cd ~/Dashboard-JEECE
docker-compose restart
```

### Voir les logs
```bash
docker-compose logs -f
```

### Arrêter l'application
```bash
docker-compose down
```

### Mettre à jour l'application
```bash
cd ~/Dashboard-JEECE
git pull  # ou copiez les nouveaux fichiers
docker-compose down
docker-compose up -d --build
```

### Démarrer automatiquement Docker au boot
```bash
sudo systemctl enable docker
```

## 🛠️ Dépannage

### Le WiFi ne se connecte pas
```bash
# Vérifier l'état du WiFi
sudo iwconfig

# Redémarrer le WiFi
sudo ifconfig wlan0 down
sudo ifconfig wlan0 up

# Vérifier les réseaux disponibles
sudo iwlist wlan0 scan | grep SSID
```

### L'application ne démarre pas
```bash
# Vérifier les logs
docker-compose logs backend
docker-compose logs frontend

# Vérifier l'espace disque
df -h

# Nettoyer Docker si nécessaire
docker system prune -a
```

### Impossible d'accéder à l'application depuis un autre appareil
```bash
# Vérifier que les ports sont ouverts
sudo netstat -tulpn | grep -E '3000|5000'

# Vérifier le firewall (normalement désactivé sur Raspberry Pi OS)
sudo ufw status
```

### L'écran se met en veille
```bash
# Ajouter au fichier /etc/lightdm/lightdm.conf
sudo nano /etc/lightdm/lightdm.conf

# Dans la section [Seat:*], ajouter:
xserver-command=X -s 0 -dpms
```

### Les modifications ne se sauvegardent pas
```bash
# Vérifier les permissions du fichier config.json
ls -la ~/Dashboard-JEECE/config.json

# Si nécessaire, corriger les permissions
chmod 644 ~/Dashboard-JEECE/config.json
```

## 📱 Configuration du réseau local

### Pour accéder au dashboard depuis votre téléphone ou ordinateur:

1. Connectez votre appareil au WiFi "nolan"
2. Ouvrez un navigateur
3. Allez sur `http://<IP_RASPBERRY>:3000`

### Pour avoir une adresse IP fixe sur la Raspberry Pi:

```bash
# Éditer la configuration DHCP
sudo nano /etc/dhcpcd.conf
```

Ajouter à la fin:
```
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

**Important**: Remplacez `192.168.1.100` par une IP libre sur votre réseau.

Redémarrez:
```bash
sudo reboot
```

## ⚡ Optimisation des performances

### Pour améliorer les performances sur Raspberry Pi 3:

```bash
# Augmenter la swap si nécessaire
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Changer CONF_SWAPSIZE=100 en CONF_SWAPSIZE=512
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### Réduire la fréquence de mise à jour:

Modifier `.env`:
```bash
UPDATE_INTERVAL_MINUTES=30  # Au lieu de 15
```

## 📚 Ressources utiles

- Documentation Raspberry Pi: https://www.raspberrypi.com/documentation/
- Documentation Docker: https://docs.docker.com/
- WiFi troubleshooting: https://www.raspberrypi.com/documentation/computers/configuration.html#wireless-connectivity

## 🆘 Support

Si vous rencontrez des problèmes:
1. Vérifiez les logs: `docker-compose logs`
2. Vérifiez la connexion réseau: `ping google.com`
3. Vérifiez l'espace disque: `df -h`
4. Redémarrez la Raspberry Pi: `sudo reboot`
