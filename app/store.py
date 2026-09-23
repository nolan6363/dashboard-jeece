"""Stockage des données du dashboard.

Toutes les données tiennent dans un seul fichier JSON : data/dashboard.json.
Les photos des chefs de projet sont dans data/photos/.
Le dossier data/ n'est pas versionné : c'est le seul dossier à sauvegarder.
"""
import json
import math
import os
import re
import secrets
import shutil
import threading
from datetime import datetime, timezone

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.getenv('DATA_DIR', os.path.join(RACINE, 'data'))
FICHIER_DONNEES = os.path.join(DATA_DIR, 'dashboard.json')
PHOTOS_DIR = os.path.join(DATA_DIR, 'photos')

# Anciennes données (version 1, avec React + SQLite), importées une seule fois.
# Avant la mise à jour, on copie l'ancien config.json et les photos dans
# migration_v1/ (dossier non suivi par git, voir README).
DOSSIER_MIGRATION = os.path.join(RACINE, 'migration_v1')
ANCIEN_CONFIG = os.path.join(DOSSIER_MIGRATION, 'config.json')
ANCIENS_DOSSIERS_PHOTOS = [
    os.path.join(DOSSIER_MIGRATION, 'photos'),
    # L'ancien upload enregistrait les photos ici par erreur.
    os.path.join(RACINE, 'backend', 'frontend', 'public', 'images', 'cdp'),
]

EXTENSIONS_PHOTO = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
NOM_PHOTO_VALIDE = re.compile(r'^[A-Za-z0-9_.-]+$')
COULEUR_VALIDE = re.compile(r'^#[0-9a-fA-F]{6}$')

DONNEES_PAR_DEFAUT = {
    'titre': 'Dashboard JEECE',
    'chiffre_affaire_total': 0,
    'total_automatique': False,
    'objectif_annuel': 100000,
    # Lignes affichées sur la jauge (objectif intermédiaire, record, etc.)
    'objectifs': [],
    'chefs_projet': [],
    'animations': True,
    'mis_a_jour_le': None,
}

_verrou = threading.Lock()


def init():
    """Crée le dossier de données, en important l'ancienne version si elle existe."""
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    if os.path.exists(FICHIER_DONNEES):
        return

    donnees = dict(DONNEES_PAR_DEFAUT)
    importe = False
    if os.path.exists(ANCIEN_CONFIG):
        with open(ANCIEN_CONFIG, encoding='utf-8') as f:
            donnees = _depuis_v1(json.load(f))
        _copier_anciennes_photos()
        importe = True

    donnees = normaliser(donnees)
    donnees['mis_a_jour_le'] = _maintenant()
    _ecrire(donnees)

    if importe:
        # Renommé pour éviter qu'on le modifie en croyant changer les données.
        os.replace(ANCIEN_CONFIG, ANCIEN_CONFIG + '.importe')
        print(f"Anciennes données importées depuis {ANCIEN_CONFIG}")


def charger():
    """Retourne les données actuelles."""
    for chemin in (FICHIER_DONNEES, FICHIER_DONNEES + '.bak'):
        try:
            with open(chemin, encoding='utf-8') as f:
                return {**DONNEES_PAR_DEFAUT, **json.load(f)}
        except (OSError, ValueError) as e:
            print(f"Lecture impossible de {chemin} : {e}")
    return dict(DONNEES_PAR_DEFAUT)


def enregistrer(donnees):
    """Valide puis enregistre les données. Lève ValueError si elles sont invalides."""
    donnees = normaliser(donnees)
    donnees['mis_a_jour_le'] = _maintenant()
    with _verrou:
        if os.path.exists(FICHIER_DONNEES):
            shutil.copyfile(FICHIER_DONNEES, FICHIER_DONNEES + '.bak')
        _ecrire(donnees)
    return donnees


def enregistrer_photo(fichier):
    """Enregistre une photo envoyée depuis l'admin et retourne son nom de fichier."""
    extension = os.path.splitext(fichier.filename or '')[1].lower()
    if extension not in EXTENSIONS_PHOTO:
        raise ValueError('Format de photo non accepté (JPG, PNG, WEBP ou GIF).')
    # Nom unique : une nouvelle photo ne remplace jamais une ancienne en cache.
    nom = secrets.token_hex(8) + extension
    fichier.save(os.path.join(PHOTOS_DIR, nom))
    return nom


def normaliser(donnees):
    """Vérifie les données reçues et les remet au bon format."""
    if not isinstance(donnees, dict):
        raise ValueError('Données invalides.')

    objectif_annuel = _nombre(donnees.get('objectif_annuel'), 'Objectif annuel')
    if objectif_annuel <= 0:
        raise ValueError("L'objectif annuel doit être supérieur à 0.")

    objectifs = []
    for i, obj in enumerate(donnees.get('objectifs') or [], start=1):
        nom = _texte(obj.get('nom'))
        if not nom:
            raise ValueError(f"L'objectif n°{i} n'a pas de nom.")
        couleur = obj.get('couleur') or ''
        objectifs.append({
            'nom': nom,
            'valeur': _nombre(obj.get('valeur'), f'Objectif « {nom} »'),
            'couleur': couleur if COULEUR_VALIDE.match(couleur) else '#ffffff',
        })

    chefs_projet = []
    for i, cdp in enumerate(donnees.get('chefs_projet') or [], start=1):
        prenom, nom = _texte(cdp.get('prenom')), _texte(cdp.get('nom'))
        if not prenom and not nom:
            raise ValueError(f"Le chef de projet n°{i} n'a ni prénom ni nom.")
        photo = cdp.get('photo') or None
        if photo and not NOM_PHOTO_VALIDE.match(photo):
            photo = None
        chefs_projet.append({
            'prenom': prenom,
            'nom': nom,
            'chiffre_affaire': _nombre(cdp.get('chiffre_affaire'), f'CA de {prenom} {nom}'),
            'photo': photo,
        })

    total_automatique = bool(donnees.get('total_automatique'))
    if total_automatique:
        total = _arrondir(sum(c['chiffre_affaire'] for c in chefs_projet))
    else:
        total = _nombre(donnees.get('chiffre_affaire_total'), "Chiffre d'affaires total")

    return {
        'titre': _texte(donnees.get('titre')) or DONNEES_PAR_DEFAUT['titre'],
        'chiffre_affaire_total': total,
        'total_automatique': total_automatique,
        'objectif_annuel': objectif_annuel,
        'objectifs': objectifs,
        'chefs_projet': chefs_projet,
        'animations': bool(donnees.get('animations', True)),
        'mis_a_jour_le': donnees.get('mis_a_jour_le'),
    }


def _depuis_v1(ancien):
    """Convertit l'ancien config.json (version 1) au nouveau format."""
    objectifs = []
    if ancien.get('objectif_decembre'):
        objectifs.append({'nom': 'Objectif déc.', 'valeur': ancien['objectif_decembre'], 'couleur': '#ffffff'})
    if ancien.get('wr'):
        objectifs.append({'nom': 'WR', 'valeur': ancien['wr'], 'couleur': '#f7b731'})
    for obj in ancien.get('autres_objectifs') or []:
        objectifs.append({'nom': obj.get('nom'), 'valeur': obj.get('valeur', 0), 'couleur': '#5bc97a'})

    return {
        **DONNEES_PAR_DEFAUT,
        'chiffre_affaire_total': ancien.get('chiffre_affaire_total', 0),
        'objectif_annuel': ancien.get('objectif_annuel', 100000),
        'objectifs': objectifs,
        'chefs_projet': [{
            'prenom': c.get('prenom'),
            'nom': c.get('nom'),
            'chiffre_affaire': c.get('chiffre_affaire', 0),
            'photo': c.get('photo_filename') or None,
        } for c in ancien.get('chefs_projet') or []],
    }


def _copier_anciennes_photos():
    for dossier in ANCIENS_DOSSIERS_PHOTOS:
        if not os.path.isdir(dossier):
            continue
        for nom in os.listdir(dossier):
            destination = os.path.join(PHOTOS_DIR, nom)
            if os.path.splitext(nom)[1].lower() in EXTENSIONS_PHOTO and not os.path.exists(destination):
                shutil.copyfile(os.path.join(dossier, nom), destination)


def _ecrire(donnees):
    # Écriture dans un fichier temporaire puis renommage : le fichier n'est
    # jamais à moitié écrit, même en cas de coupure de courant.
    temporaire = FICHIER_DONNEES + '.tmp'
    with open(temporaire, 'w', encoding='utf-8') as f:
        json.dump(donnees, f, indent=2, ensure_ascii=False)
        f.flush()
        os.fsync(f.fileno())
    os.replace(temporaire, FICHIER_DONNEES)


def _nombre(valeur, libelle):
    """Accepte 12500, "12 500", "12500,50", "12 500 €"..."""
    if isinstance(valeur, bool):
        raise ValueError(f'{libelle} : nombre invalide.')
    if isinstance(valeur, (int, float)):
        nombre = float(valeur)
    else:
        texte = re.sub(r'[\s€  ]', '', str(valeur or '0')).replace(',', '.')
        try:
            nombre = float(texte or 0)
        except ValueError:
            raise ValueError(f'{libelle} : « {valeur} » n\'est pas un nombre valide.')
    if not math.isfinite(nombre) or nombre < 0:
        raise ValueError(f'{libelle} : le montant doit être positif.')
    return _arrondir(nombre)


def _arrondir(nombre):
    nombre = round(float(nombre), 2)
    return int(nombre) if nombre.is_integer() else nombre


def _texte(valeur):
    return str(valeur or '').strip()[:80]


def _maintenant():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')
