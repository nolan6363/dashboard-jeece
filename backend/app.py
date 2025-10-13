import os
import json
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from werkzeug.utils import secure_filename
import database
import google_sheets

app = Flask(__name__)
CORS(app)

# Configuration
OFFLINE_MODE = os.getenv('OFFLINE_MODE', 'false').lower() == 'true'
CONFIG_FILE_PATH = os.getenv('CONFIG_FILE_PATH', '/app/config.json')
SPREADSHEET_ID = os.getenv('GOOGLE_SPREADSHEET_ID', '')
SHEET_RANGE = os.getenv('GOOGLE_SHEET_RANGE', 'Sheet1!A1:C100')
UPDATE_INTERVAL_MINUTES = int(os.getenv('UPDATE_INTERVAL_MINUTES', '15'))
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', '/app/frontend/public/images/cdp')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_config_file():
    """Load data from config.json file (offline mode)."""
    try:
        with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as f:
            config = json.load(f)

        total = config.get('chiffre_affaire_total', 0)
        cdp_list = config.get('chefs_projet', [])
        objectif = config.get('objectif_annuel', 100000)

        return {
            'total': total,
            'cdp_list': cdp_list,
            'objectif_annuel': objectif
        }
    except Exception as e:
        print(f"Error loading config file: {e}")
        raise e

def sync_data_from_sheets():
    """Fetch data from Google Sheets and update the database."""
    try:
        print(f"[{datetime.now()}] Starting data sync...")

        if OFFLINE_MODE:
            print("Running in OFFLINE mode - reading from config.json")
            data = load_config_file()
        else:
            print("Running in ONLINE mode - reading from Google Sheets")
            if not SPREADSHEET_ID:
                raise ValueError("GOOGLE_SPREADSHEET_ID not configured")

            # Fetch data from Google Sheets
            data = google_sheets.fetch_kpi_data(SPREADSHEET_ID, SHEET_RANGE)

        # Save global KPI with objectif
        database.save_kpi_global(data['total'], data.get('objectif_annuel', 100000))

        # Save each CDP
        for cdp in data['cdp_list']:
            database.save_chef_projet(
                nom=cdp['nom'],
                prenom=cdp['prenom'],
                chiffre_affaire=cdp['chiffre_affaire'],
                photo_filename=cdp.get('photo_filename')
            )

        # Log success
        mode = "OFFLINE" if OFFLINE_MODE else "ONLINE"
        database.log_update('success', f"[{mode}] Synced {len(data['cdp_list'])} CDPs, total: {data['total']}€")
        print(f"[{datetime.now()}] Data sync completed successfully")

    except Exception as e:
        error_msg = str(e)
        database.log_update('error', error_msg)
        print(f"[{datetime.now()}] Data sync failed: {error_msg}")

# API Endpoints
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/kpi', methods=['GET'])
def get_kpi():
    """Get the latest global KPI."""
    try:
        kpi = database.get_latest_kpi_global()
        if not kpi:
            return jsonify({'chiffre_affaire': 0, 'timestamp': None})
        return jsonify(kpi)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cdp', methods=['GET'])
def get_cdp():
    """Get all chefs de projet ranked by revenue."""
    try:
        cdps = database.get_all_chefs_projet()
        return jsonify(cdps)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/last-update', methods=['GET'])
def get_last_update():
    """Get the timestamp of the last successful update."""
    try:
        timestamp = database.get_last_update()
        return jsonify({'last_update': timestamp})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/sync', methods=['POST'])
def manual_sync():
    """Manually trigger a data sync."""
    try:
        sync_data_from_sheets()
        return jsonify({'status': 'success', 'message': 'Data sync completed'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get current configuration."""
    return jsonify({
        'offline_mode': OFFLINE_MODE,
        'spreadsheet_configured': bool(SPREADSHEET_ID),
        'update_interval_minutes': UPDATE_INTERVAL_MINUTES,
        'sheet_range': SHEET_RANGE
    })

@app.route('/api/objectif', methods=['GET'])
def get_objectif():
    """Get the annual objective."""
    try:
        objectif = database.get_objectif_annuel()
        return jsonify({'objectif_annuel': objectif})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/last-modified', methods=['GET'])
def get_last_modified():
    """Get the last modification timestamp of config.json."""
    try:
        if OFFLINE_MODE:
            import os
            mtime = os.path.getmtime(CONFIG_FILE_PATH)
            return jsonify({'last_modified': mtime})
        else:
            # En mode online, utiliser le timestamp de la dernière sync
            timestamp = database.get_last_update()
            if timestamp:
                from datetime import datetime
                dt = datetime.fromisoformat(timestamp)
                return jsonify({'last_modified': dt.timestamp()})
            return jsonify({'last_modified': 0})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/config', methods=['GET'])
def get_admin_config():
    """Get the current config.json for admin interface."""
    try:
        if not OFFLINE_MODE:
            return jsonify({'error': 'Admin interface only available in offline mode'}), 400

        # Load the raw config file for admin interface
        with open(CONFIG_FILE_PATH, 'r', encoding='utf-8') as f:
            config = json.load(f)

        return jsonify(config)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/config', methods=['PUT'])
def update_admin_config():
    """Update the config.json file from admin interface."""
    try:
        if not OFFLINE_MODE:
            return jsonify({'error': 'Admin interface only available in offline mode'}), 400

        new_config = request.get_json()

        # Validate the structure
        if 'objectif_annuel' not in new_config or 'chiffre_affaire_total' not in new_config or 'chefs_projet' not in new_config:
            return jsonify({'error': 'Invalid config structure'}), 400

        # Save to config.json
        with open(CONFIG_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(new_config, f, indent=2, ensure_ascii=False)

        # Log the update
        database.log_update('success', f"[ADMIN] Config updated via web interface")

        return jsonify({'status': 'success', 'message': 'Configuration updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/upload-photo', methods=['POST'])
def upload_photo():
    """Upload a CDP photo."""
    try:
        if not OFFLINE_MODE:
            return jsonify({'error': 'Photo upload only available in offline mode'}), 400

        # Check if the post request has the file part
        if 'photo' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['photo']

        # If no file is selected
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)

            # Create upload folder if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)

            # Save the file
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(file_path)

            return jsonify({
                'status': 'success',
                'filename': filename,
                'message': f'Photo {filename} uploaded successfully'
            })
        else:
            return jsonify({'error': 'File type not allowed. Only images are accepted.'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize database
    print("Initializing database...")
    database.init_db()

    # Set up scheduler for periodic updates
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=sync_data_from_sheets,
        trigger="interval",
        minutes=UPDATE_INTERVAL_MINUTES,
        id='sync_sheets',
        name='Sync data from Google Sheets',
        replace_existing=True
    )
    scheduler.start()

    # Initial sync
    try:
        sync_data_from_sheets()
    except Exception as e:
        print(f"Initial sync failed: {e}")
        print("The application will continue and retry at the next scheduled interval")

    # Run Flask app
    print(f"Starting Flask app on port 5000...")
    print(f"Data will sync every {UPDATE_INTERVAL_MINUTES} minutes")
    app.run(host='0.0.0.0', port=5000, debug=False)
