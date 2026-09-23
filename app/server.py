"""Serveur du dashboard JEECE : sert les pages (dossier static/) et une petite API JSON.

Lancement en local, sans Docker :
    pip install -r app/requirements.txt
    python app/server.py
puis ouvrir http://localhost:3000 (dashboard) et http://localhost:3000/admin.
"""
import os
import time

from flask import Flask, jsonify, request, send_from_directory

import store

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
PORT = int(os.getenv('PORT', '3000'))

# Change à chaque démarrage : le dashboard se recharge seul après une mise à jour du code.
VERSION_SERVEUR = str(int(time.time()))

app = Flask(__name__, static_folder=None)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
# Pas de cache navigateur sur les pages : une mise à jour est visible immédiatement.
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

store.init()


@app.get('/')
def page_dashboard():
    return send_from_directory(STATIC_DIR, 'index.html')


@app.get('/admin')
def page_admin():
    return send_from_directory(STATIC_DIR, 'admin.html')


@app.get('/static/<path:nom>')
def fichier_statique(nom):
    return send_from_directory(STATIC_DIR, nom)


@app.get('/photos/<path:nom>')
def photo(nom):
    # Chaque photo a un nom unique, le navigateur peut donc la garder en cache.
    return send_from_directory(store.PHOTOS_DIR, nom, max_age=30 * 24 * 3600)


@app.get('/api/donnees')
def lire_donnees():
    return jsonify({'donnees': store.charger(), 'version_serveur': VERSION_SERVEUR})


@app.put('/api/donnees')
def modifier_donnees():
    try:
        donnees = store.enregistrer(request.get_json(force=True))
    except ValueError as e:
        return jsonify({'erreur': str(e)}), 400
    return jsonify({'donnees': donnees})


@app.get('/api/sauvegarde')
def telecharger_sauvegarde():
    return send_from_directory(store.DATA_DIR, 'dashboard.json', as_attachment=True,
                               download_name='sauvegarde-dashboard.json')


@app.post('/api/photos')
def envoyer_photo():
    fichier = request.files.get('photo')
    if not fichier:
        return jsonify({'erreur': 'Aucune photo reçue.'}), 400
    try:
        nom = store.enregistrer_photo(fichier)
    except ValueError as e:
        return jsonify({'erreur': str(e)}), 400
    return jsonify({'photo': nom})


@app.errorhandler(413)
def photo_trop_lourde(_):
    return jsonify({'erreur': 'Fichier trop volumineux (10 Mo maximum).'}), 413


if __name__ == '__main__':
    from waitress import serve

    print(f'Dashboard disponible sur http://localhost:{PORT} (admin : /admin)')
    print(f'Données : {store.FICHIER_DONNEES}')
    serve(app, host='0.0.0.0', port=PORT, threads=4)
