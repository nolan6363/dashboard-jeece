# Dashboard JEECE

Dashboard affiché sur une TV (Raspberry Pi) : chiffre d'affaires de l'année, jauge vers l'objectif annuel, et classement des chefs de projet (CDP).

- **Dashboard** : `http://<ip-de-la-pi>:3000`
- **Administration** (saisie des chiffres, CDP, photos, objectifs) : `http://<ip-de-la-pi>:3000/admin`

## Utilisation au quotidien

Tout se fait depuis la page **/admin** : modifier les montants, ajouter ou supprimer un CDP, changer une photo (clic sur la photo), gérer les objectifs affichés sur la jauge. Il faut ensuite cliquer sur **Enregistrer**. La TV se met à jour toute seule en moins de 10 secondes.

Pour accéder à l'admin, ton ordinateur ou ton téléphone doit être sur le même réseau Wi‑Fi que la Pi. Voir [RASPBERRY_PI.md](RASPBERRY_PI.md#réseau).

## Fonctionnement

L'application est volontairement minimale : **un seul conteneur Docker**, sans base de données et sans étape de compilation.

```
app/
  server.py        Serveur Flask : sert les pages et l'API (/api/donnees, /api/photos)
  store.py         Lecture / écriture des données (un fichier JSON)
  static/          Pages web en HTML/CSS/JS, modifiables directement
    index.html, dashboard.js, dashboard.css   → le dashboard (TV)
    admin.html,  admin.js,     admin.css      → la page d'administration
    commun.js                                 → fonctions partagées
  Dockerfile, requirements.txt
data/              ⚠ Les données (non versionné) : À SAUVEGARDER
  dashboard.json   Tous les chiffres, CDP et objectifs
  photos/          Photos des CDP envoyées depuis l'admin
raspberry/
  kiosque.sh       Lance Firefox en plein écran au démarrage de la Pi
mettre-a-jour.sh   Met à jour le code sur la Pi
```

- Le dossier `data/` est sur la carte SD de la Pi, **en dehors** du conteneur. Les données et les photos sont donc conservées en cas de redémarrage, de reconstruction du conteneur ou de mise à jour. Elles ne sont pas sur GitHub.
- Le code (`app/`) est monté dans le conteneur. Après une modification, un redémarrage suffit, sans reconstruction.
- Chaque enregistrement conserve la version précédente dans `data/dashboard.json.bak`.
- Le lien **« Télécharger une sauvegarde »** de l'admin télécharge `dashboard.json`. Pour une sauvegarde complète avec les photos, copie tout le dossier `data/`.

## Mettre à jour le code sur la Pi

```bash
cd ~/Dashboard-JEECE      # dossier du projet sur la Pi
./mettre-a-jour.sh
```

Le script fait `git pull` puis redémarre le conteneur. Ça prend quelques secondes. La TV se recharge toute seule quand le serveur redémarre.

## Développer sur son ordinateur

Pas besoin de Docker :

```bash
python3 -m venv venv
venv/bin/pip install -r app/requirements.txt
venv/bin/python app/server.py
```

Ouvrir ensuite http://localhost:3000 et http://localhost:3000/admin. Les données de test vont dans `data/` (ignoré par git). Pour les pages HTML/CSS/JS, il suffit de recharger le navigateur. Après une modification d'un fichier Python, il faut relancer le serveur.

Avec Docker : `docker compose up -d --build`.

### Exemples de personnalisation

- **Objectifs sur la jauge** (objectif intermédiaire, record…) : depuis l'admin, sans toucher au code.
- **Graduations de la jauge** (25 / 50 / 75 % de l'objectif) : `GRADUATIONS` dans `app/static/dashboard.js`.
- **Fréquence de rafraîchissement de la TV** : `INTERVALLE_RAFRAICHISSEMENT` dans `app/static/dashboard.js`.
- **Couleurs et tailles** : variables en haut de `app/static/dashboard.css`.
- **Logo** : remplacer `app/static/logo.png`.
- **Ajouter une donnée** (ex. un nouveau chiffre) : ajouter le champ dans `DONNEES_PAR_DEFAUT` et `normaliser()` de `app/store.py`, puis dans `admin.html` (un `<input data-champ="…">` suffit) et l'afficher dans `dashboard.js`.

## Passage depuis l'ancienne version (React + SQLite), une seule fois

L'ancienne version stockait les données dans `config.json` et les photos dans `frontend/public/images/cdp/`, deux emplacements suivis par git. Il faut les mettre à l'abri avant le `git pull`, qui les supprime. Sur la Pi :

```bash
cd ~/Dashboard-JEECE
docker-compose down                      # arrête l'ancienne version

# 1. Mettre les anciennes données à l'abri dans migration_v1/ (ignoré par git)
mkdir -p migration_v1/photos
cp config.json migration_v1/
cp frontend/public/images/cdp/* migration_v1/photos/

# 2. Récupérer la nouvelle version
git checkout -- .                        # annule les modifications locales (config.json)
git pull

# 3. Démarrer : les données et photos de migration_v1/ sont importées dans data/
docker-compose up -d --build --remove-orphans
```

Vérifie ensuite sur `/admin` que tout est bien là. Tu peux alors supprimer `migration_v1/`, l'ancienne base `data/jeece.db` et les anciennes images Docker (`docker image prune -a`). Les photos envoyées depuis l'ancienne page admin (dans `backend/frontend/public/images/cdp/`) sont aussi récupérées automatiquement.
