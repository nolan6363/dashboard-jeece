#!/usr/bin/env python3
"""
Database migration script to add objectif_decembre and wr columns
"""
import sqlite3
import os

DATABASE_PATH = os.getenv('DATABASE_PATH', '/app/data/jeece.db')

def migrate_database():
    """Add missing columns to kpi_global table"""
    print(f"Connecting to database: {DATABASE_PATH}")
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Add missing columns
    try:
        cursor.execute('ALTER TABLE kpi_global ADD COLUMN objectif_decembre REAL DEFAULT 0')
        print('✓ Added objectif_decembre column')
    except sqlite3.OperationalError as e:
        if 'duplicate column name' in str(e).lower():
            print('✓ Column objectif_decembre already exists')
        else:
            print(f'✗ Error adding objectif_decembre: {e}')
            raise

    try:
        cursor.execute('ALTER TABLE kpi_global ADD COLUMN wr REAL DEFAULT 0')
        print('✓ Added wr column')
    except sqlite3.OperationalError as e:
        if 'duplicate column name' in str(e).lower():
            print('✓ Column wr already exists')
        else:
            print(f'✗ Error adding wr: {e}')
            raise

    conn.commit()
    conn.close()
    print('✓ Database migration completed successfully')

if __name__ == '__main__':
    migrate_database()
