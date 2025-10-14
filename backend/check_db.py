#!/usr/bin/env python3
"""
Check database schema and latest KPI values
"""
import sqlite3
import os

DATABASE_PATH = os.getenv('DATABASE_PATH', '/app/data/jeece.db')

def check_database():
    """Check database schema and data"""
    print(f"Connecting to database: {DATABASE_PATH}")
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Check table schema
    print("\n=== KPI_GLOBAL TABLE SCHEMA ===")
    cursor.execute('PRAGMA table_info(kpi_global)')
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col['name']:20s} {col['type']:10s} DEFAULT={col['dflt_value']}")

    # Check latest KPI entry
    print("\n=== LATEST KPI ENTRY ===")
    cursor.execute('SELECT * FROM kpi_global ORDER BY timestamp DESC LIMIT 1')
    row = cursor.fetchone()
    if row:
        for key in row.keys():
            print(f"  {key:20s}: {row[key]}")
    else:
        print("  No data found")

    # Check total entries
    cursor.execute('SELECT COUNT(*) as count FROM kpi_global')
    count = cursor.fetchone()['count']
    print(f"\n=== TOTAL ENTRIES: {count} ===")

    conn.close()

if __name__ == '__main__':
    check_database()
