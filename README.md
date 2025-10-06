# Dashboard JEECE

Dashboard pour visualiser les KPI de JEECE et le classement des Chefs de Projet (CDP).

## 📋 Fonctionnalités

- **Affichage du chiffre d'affaires total** de JEECE
- **Barre de progression** vers l'objectif annuel de 100 000€
- **Classement des CDP** avec leur photo et leur CA individuel
- **Mode offline** : saisie manuelle des données via config.json
- **Mode online** : synchronisation automatique avec Google Sheets toutes les 15 minutes
- **Interface responsive** adaptée pour affichage TV
- **Déploiement Docker** prêt pour Raspberry Pi

## 🏗️ Architecture

- **Backend**: Flask (Python)
- **Frontend**: React
- **Base de données**: SQLite
- **Déploiement**: Docker + Docker Compose

## 📦 Structure du projet

```
Dashboard JEECE/
├── backend/                    # Backend Flask
│   ├── app.py                 # Application principale
│   ├── database.py            # Gestion SQLite
│   ├── google_sheets.py       # Integration Google Sheets API
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                   # Frontend React
│   ├── public/
│   │   └── images/
│   │       ├── logo.png       # Logo JEECE (à ajouter)
│   │       └── cdp/           # Photos des CDP (à ajouter)
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── credentials/                # Credentials Google API (mode online)
│   └── credentials.json       # À ajouter pour mode online
├── data/                      # Base de données SQLite
├── config.json                # Configuration mode offline
├── docker-compose.yml
└── .env                       # Configuration
```

## 🚀 Installation et déploiement

### Prérequis

- Docker et Docker Compose installés
- **Mode offline** : aucun prérequis supplémentaire
- **Mode online** : Un compte Google Cloud avec accès à l'API Google Sheets

## 🎯 Mode Offline (Recommandé pour débuter)

Le mode offline vous permet d'utiliser le dashboard sans configuration Google Sheets. Les données sont gérées via un fichier `config.json`.

### Configuration mode offline

1. **Le fichier `config.json` est déjà créé** avec tous les CDP de JEECE:
   - Benjamin Bruneaux
   - Noah Zieba
   - Axel De Crevoisier
   - Clément Vallet
   - Juliette Selitto
   - Sasha Franckfort
   - Nolan Bayon
   - Gauthier Blanchard
   - Marceau Michaud
   - Antoine Brossaux
   - Aaron Wipliez

2. **Modifier les données dans `config.json`**:
   ```json
   {
     "objectif_annuel": 100000,
     "chiffre_affaire_total": 45000,
     "chefs_projet": [
       {
         "nom": "Bruneaux",
         "prenom": "Benjamin",
         "chiffre_affaire": 12000,
         "photo_filename": "benjamin_bruneaux.jpg"
       },
       ...
     ]
   }
   ```

3. **Le fichier `.env` est déjà configuré en mode offline**:
   ```
   OFFLINE_MODE=true
   ```

4. **Ajouter les photos des CDP**:
   - Placez les photos dans `frontend/public/images/cdp/`
   - Nommez-les exactement comme dans `photo_filename` du config.json
   - Formats supportés: JPG, PNG
   - Résolution recommandée: 300x300px

5. **Ajouter le logo JEECE**:
   - Placez votre logo dans `frontend/public/images/logo.png`

6. **Lancer l'application**:
   ```bash
   docker-compose up --build
   ```

7. **Mettre à jour les données**:
   - Modifiez directement `config.json`
   - Les données seront rechargées automatiquement toutes les 15 minutes
   - Ou forcez une mise à jour: `curl -X POST http://localhost:5000/api/sync`

### Avantages du mode offline
- ✅ Pas besoin de configuration Google Cloud
- ✅ Mise à jour simple via fichier JSON
- ✅ Contrôle total des données
- ✅ Fonctionne sans connexion internet

## 🌐 Mode Online (Google Sheets)

Si vous préférez synchroniser automatiquement avec Google Sheets, suivez ces étapes:

### Activer le mode online

1. **Modifier le fichier `.env`**:
   ```bash
   OFFLINE_MODE=false
   GOOGLE_SPREADSHEET_ID=votre_spreadsheet_id_ici
   ```

### Étape 1: Configuration Google Sheets API

1. **Créer un projet Google Cloud**
   - Allez sur [Google Cloud Console](https://console.cloud.google.com/)
   - Créez un nouveau projet

2. **Activer l'API Google Sheets**
   - Dans votre projet, allez dans "APIs & Services" > "Library"
   - Recherchez "Google Sheets API" et activez-la

3. **Créer un compte de service**
   - Allez dans "APIs & Services" > "Credentials"
   - Cliquez sur "Create Credentials" > "Service Account"
   - Donnez un nom au compte (ex: "dashboard-jeece")
   - Cliquez sur "Create and Continue"
   - Donnez le rôle "Viewer" (ou "Editor" si vous voulez écrire)
   - Cliquez sur "Done"

4. **Télécharger les credentials**
   - Cliquez sur le compte de service que vous venez de créer
   - Allez dans l'onglet "Keys"
   - Cliquez sur "Add Key" > "Create new key"
   - Choisissez le format JSON
   - Téléchargez le fichier et **renommez-le en `credentials.json`**
   - **Placez ce fichier dans le dossier `credentials/`**

5. **Partager votre Google Sheet**
   - Ouvrez votre Google Sheet
   - Cliquez sur "Partager"
   - Copiez l'email du compte de service (format: `nom@projet.iam.gserviceaccount.com`)
   - Ajoutez cet email avec les droits de lecture
   - Récupérez l'ID de votre spreadsheet (dans l'URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/...`)

### Étape 2: Format du Google Sheet

Votre Google Sheet doit avoir ce format:

| Nom | Prénom | Chiffre d'Affaires |
|-----|--------|-------------------|
| Dupont | Jean | 50000 |
| Martin | Sophie | 45000 |
| Bernard | Marc | 38000 |
| JEECE | TOTAL | 133000 |

**Notes importantes:**
- La première ligne contient les en-têtes (ils seront ignorés)
- Colonne A: Nom du CDP
- Colonne B: Prénom du CDP
- Colonne C: Chiffre d'affaires (peut contenir €, espaces, virgules)
- **La dernière ligne doit contenir le total avec "JEECE" ou "TOTAL" dans la colonne A**

### Étape 3: Configuration de l'application

1. **Modifier le fichier `.env`**
   ```bash
   nano .env
   ```

   Ajoutez votre `GOOGLE_SPREADSHEET_ID`:
   ```
   GOOGLE_SPREADSHEET_ID=votre_spreadsheet_id_ici
   GOOGLE_SHEET_RANGE=Sheet1!A1:C100
   UPDATE_INTERVAL_MINUTES=15
   ```

2. **Ajouter le logo JEECE**
   - Placez votre logo dans `frontend/public/images/logo.png`

3. **Ajouter les photos des CDP**
   - Placez les photos dans `frontend/public/images/cdp/`
   - Nommez-les par exemple: `jean_dupont.jpg`, `sophie_martin.jpg`
   - Formats supportés: PNG, JPG, JPEG
   - Résolution recommandée: 300x300px

   **Pour associer les photos aux CDP**, vous devrez modifier la base de données manuellement ou modifier le code pour inclure le nom du fichier photo dans votre Google Sheet.

### Étape 4: Déploiement (mode online)

**Sur votre machine locale (pour tester):**
```bash
# Modifier .env pour activer le mode online
# OFFLINE_MODE=false

docker-compose up --build
```

**Sur Raspberry Pi:**
```bash
# Cloner le projet sur le Raspberry Pi
git clone <votre-repo> Dashboard-JEECE
cd Dashboard-JEECE

# Ajouter vos fichiers de configuration
# - credentials/credentials.json
# - frontend/public/images/logo.png
# - frontend/public/images/cdp/*.jpg
# - Modifier .env: OFFLINE_MODE=false et ajouter SPREADSHEET_ID

# Lancer l'application
docker-compose up -d

# Vérifier les logs
docker-compose logs -f
```

L'application sera accessible sur:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## 📺 Configuration pour affichage TV

1. **Mode plein écran automatique**
   - Configurez votre navigateur (Chromium sur Raspberry Pi) en mode kiosk
   - Exemple avec Chromium:
     ```bash
     chromium-browser --kiosk --app=http://localhost:3000
     ```

2. **Démarrage automatique au boot**
   - Créez un script systemd ou modifiez l'autostart

3. **Désactiver la mise en veille**
   ```bash
   sudo apt-get install xscreensaver
   # Puis désactivez dans les paramètres
   ```

## 🔧 Configuration avancée

### Changer l'objectif annuel

Dans `config.json` (mode offline):
```json
{
  "objectif_annuel": 150000,  // Modifier ici
  ...
}
```

### Modifier l'intervalle de mise à jour

Dans le fichier `.env`, changez:
```
UPDATE_INTERVAL_MINUTES=15  # Mettre la valeur souhaitée
```

### Changer le range du Google Sheet (mode online)

Si vos données sont dans un autre onglet ou range:
```
GOOGLE_SHEET_RANGE=MonOnglet!A1:C200
```

### Personnaliser le frontend

Les couleurs et styles sont dans `frontend/src/App.css`.

### Passer du mode offline au mode online

Modifiez `.env`:
```bash
# Mode offline
OFFLINE_MODE=true

# Mode online
OFFLINE_MODE=false
GOOGLE_SPREADSHEET_ID=votre_id
```

Puis redémarrez:
```bash
docker-compose restart
```

## 📡 API Endpoints

- `GET /api/health` - Health check
- `GET /api/kpi` - Récupérer le CA total et objectif
- `GET /api/cdp` - Récupérer tous les CDP classés
- `GET /api/objectif` - Récupérer l'objectif annuel
- `GET /api/last-update` - Date de dernière synchronisation
- `POST /api/sync` - Forcer une synchronisation manuelle
- `GET /api/config` - Voir la configuration (mode, etc.)

## 🐛 Dépannage

### Mode offline : Les données ne s'affichent pas

1. Vérifiez que `config.json` est bien formaté (JSON valide)
2. Vérifiez les logs:
   ```bash
   docker-compose logs backend
   ```
3. Forcez une synchronisation:
   ```bash
   curl -X POST http://localhost:5000/api/sync
   ```

### Mode online : Les données ne se synchronisent pas

1. Vérifiez les logs:
   ```bash
   docker-compose logs backend
   ```

2. Vérifiez que le compte de service a accès au Google Sheet

3. Vérifiez que `OFFLINE_MODE=false` dans `.env`

4. Testez la synchronisation manuellement:
   ```bash
   curl -X POST http://localhost:5000/api/sync
   ```

### Les photos ne s'affichent pas

1. Vérifiez que les photos sont bien dans `frontend/public/images/cdp/`
2. Vérifiez les noms de fichiers (pas d'espaces, caractères spéciaux)
3. Vérifiez les logs du frontend

### Problème de performance sur Raspberry Pi

1. Réduisez la fréquence de mise à jour
2. Optimisez les images (compressez-les)
3. Utilisez un Raspberry Pi 4 avec au moins 2GB de RAM

## 🔄 Mise à jour de l'application

```bash
git pull
docker-compose down
docker-compose up --build -d
```

## 📝 Licence

Propriété de JEECE

## 👥 Support

Pour toute question, contactez l'administrateur système.
