import sqlite3
import os
from datetime import datetime

DATABASE_PATH = os.getenv('DATABASE_PATH', '/app/data/jeece.db')

def get_db_connection():
    """Create a database connection."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize the database with required tables."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Table pour les KPI globaux
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS kpi_global (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chiffre_affaire REAL NOT NULL,
            objectif_annuel REAL DEFAULT 100000,
            objectif_decembre REAL DEFAULT 0,
            wr REAL DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Table pour les chefs de projet
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chef_projet (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            prenom TEXT NOT NULL,
            chiffre_affaire REAL NOT NULL,
            photo_filename TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(nom, prenom)
        )
    ''')

    # Table pour l'historique des mises à jour
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS update_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            status TEXT NOT NULL,
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Table pour les autres objectifs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS autres_objectifs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            valeur REAL NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

def save_kpi_global(chiffre_affaire, objectif_annuel=100000, objectif_decembre=0, wr=0):
    """Save global KPI data."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO kpi_global (chiffre_affaire, objectif_annuel, objectif_decembre, wr) VALUES (?, ?, ?, ?)',
        (chiffre_affaire, objectif_annuel, objectif_decembre, wr)
    )
    conn.commit()
    conn.close()

def get_latest_kpi_global():
    """Get the latest global KPI."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT * FROM kpi_global ORDER BY timestamp DESC LIMIT 1'
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            'chiffre_affaire': row['chiffre_affaire'],
            'objectif_annuel': row['objectif_annuel'],
            'objectif_decembre': row['objectif_decembre'] if 'objectif_decembre' in row.keys() else 0,
            'wr': row['wr'] if 'wr' in row.keys() else 0,
            'timestamp': row['timestamp']
        }
    return None

def get_objectif_annuel():
    """Get the latest annual objective."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT objectif_annuel FROM kpi_global ORDER BY timestamp DESC LIMIT 1'
    )
    row = cursor.fetchone()
    conn.close()

    return row['objectif_annuel'] if row else 100000

def save_chef_projet(nom, prenom, chiffre_affaire, photo_filename=None):
    """Save or update chef de projet data."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO chef_projet (nom, prenom, chiffre_affaire, photo_filename)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(nom, prenom)
            DO UPDATE SET
                chiffre_affaire = excluded.chiffre_affaire,
                photo_filename = COALESCE(excluded.photo_filename, chef_projet.photo_filename),
                timestamp = CURRENT_TIMESTAMP
        ''', (nom, prenom, chiffre_affaire, photo_filename))

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_all_chefs_projet():
    """Get all chefs de projet ordered by revenue (descending)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM chef_projet
        ORDER BY chiffre_affaire DESC
    ''')
    rows = cursor.fetchall()
    conn.close()

    return [{
        'id': row['id'],
        'nom': row['nom'],
        'prenom': row['prenom'],
        'chiffre_affaire': row['chiffre_affaire'],
        'photo_filename': row['photo_filename'],
        'timestamp': row['timestamp']
    } for row in rows]

def log_update(status, message=None):
    """Log an update attempt."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO update_log (status, message) VALUES (?, ?)',
        (status, message)
    )
    conn.commit()
    conn.close()

def get_last_update():
    """Get the last successful update timestamp."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT timestamp FROM update_log
        WHERE status = 'success'
        ORDER BY timestamp DESC
        LIMIT 1
    ''')
    row = cursor.fetchone()
    conn.close()

    return row['timestamp'] if row else None

def save_autre_objectif(nom, valeur):
    """Save a new 'autre objectif'."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO autres_objectifs (nom, valeur) VALUES (?, ?)',
        (nom, valeur)
    )
    conn.commit()
    conn.close()

def get_all_autres_objectifs():
    """Get all 'autres objectifs'."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM autres_objectifs ORDER BY timestamp DESC')
    rows = cursor.fetchall()
    conn.close()

    return [{
        'id': row['id'],
        'nom': row['nom'],
        'valeur': row['valeur'],
        'timestamp': row['timestamp']
    } for row in rows]

def delete_autre_objectif(objectif_id):
    """Delete an 'autre objectif' by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM autres_objectifs WHERE id = ?', (objectif_id,))
    conn.commit()
    conn.close()

def clear_autres_objectifs():
    """Clear all 'autres objectifs'."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM autres_objectifs')
    conn.commit()
    conn.close()
