# Commandes Serveur - Dashboard JEECE

## Vérifier la migration de la base de données

```bash
# Vérifier le schéma et les données
docker-compose exec backend python3 check_db.py
```

**Résultat attendu :**
```
=== KPI_GLOBAL TABLE SCHEMA ===
  id                   INTEGER    DEFAULT=None
  chiffre_affaire      REAL       DEFAULT=None
  objectif_annuel      REAL       DEFAULT=100000
  timestamp            DATETIME   DEFAULT=CURRENT_TIMESTAMP
  objectif_decembre    REAL       DEFAULT=0
  wr                   REAL       DEFAULT=0

=== LATEST KPI ENTRY ===
  id                  : 361
  chiffre_affaire     : 21212.0
  objectif_annuel     : 100000.0
  timestamp           : 2025-10-14 14:34:13
  objectif_decembre   : 42000.0
  wr                  : 81000.0
```

Si vous ne voyez PAS les colonnes `objectif_decembre` et `wr`, exécutez la migration :

```bash
docker-compose exec backend python3 migrate_db.py
```

## Vérifier l'API directement

```bash
# Vérifier que l'API retourne les bonnes valeurs
curl -s http://localhost:5000/api/kpi | python3 -m json.tool
```

**Résultat attendu :**
```json
{
    "chiffre_affaire": 21212.0,
    "objectif_annuel": 100000.0,
    "objectif_decembre": 42000.0,
    "wr": 81000.0,
    "timestamp": "2025-10-14 14:34:13"
}
```

## Forcer une synchronisation

```bash
# Forcer un sync des données
curl -X POST http://localhost:5000/api/sync
```

## Redémarrer les services

```bash
# Redémarrer uniquement le backend
docker-compose restart backend

# Redémarrer tous les services
docker-compose restart

# Voir les logs en temps réel
docker-compose logs -f backend
```

## Accès depuis un autre PC

Le frontend doit être configuré pour pointer vers l'IP du serveur.

**Option 1 : Variable d'environnement (recommandé)**

Éditez le fichier `.env` à la racine :
```bash
REACT_APP_API_URL=http://IP_DU_SERVEUR:5000/api
```

Puis rebuild le frontend :
```bash
docker-compose up -d --build frontend
```

**Option 2 : Vérifier la configuration CORS**

Si vous avez des erreurs CORS, vérifiez que le backend a bien la configuration :
```bash
docker-compose logs backend | grep -i cors
```

## Troubleshooting

### Les objectifs n'apparaissent pas sur la jauge

1. Vérifier la DB : `docker-compose exec backend python3 check_db.py`
2. Vérifier l'API : `curl http://localhost:5000/api/kpi`
3. Migrer si nécessaire : `docker-compose exec backend python3 migrate_db.py`
4. Forcer un sync : `curl -X POST http://localhost:5000/api/sync`
5. Redémarrer : `docker-compose restart backend`

### Erreurs CORS depuis un autre PC

1. Vérifier que `REACT_APP_API_URL` pointe vers l'IP du serveur (pas localhost)
2. Rebuild le frontend : `docker-compose up -d --build frontend`
3. Vérifier les logs : `docker-compose logs backend`

### Page admin ne scroll pas

Le fix a été appliqué dans `frontend/src/Admin.css`. Rebuild si nécessaire :
```bash
docker-compose up -d --build frontend
```
