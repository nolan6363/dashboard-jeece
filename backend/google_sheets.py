import os
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

def get_google_sheets_service():
    """Create and return a Google Sheets API service."""
    creds_path = os.getenv('GOOGLE_CREDENTIALS_PATH', '/app/credentials/credentials.json')

    if not os.path.exists(creds_path):
        raise FileNotFoundError(
            f"Google credentials file not found at {creds_path}. "
            "Please add your credentials.json file to the credentials/ directory."
        )

    # Use service account credentials
    creds = service_account.Credentials.from_service_account_file(
        creds_path, scopes=SCOPES
    )

    service = build('sheets', 'v4', credentials=creds)
    return service

def fetch_kpi_data(spreadsheet_id, range_name):
    """
    Fetch KPI data from Google Sheets.

    Expected format:
    - First row: headers
    - Column A: Nom CDP
    - Column B: Prénom CDP
    - Column C: Chiffre d'affaire CDP
    - Last row should contain total in a specific cell

    Args:
        spreadsheet_id: The ID of the Google Sheet
        range_name: The range to fetch (e.g., 'Sheet1!A1:C100')

    Returns:
        dict with 'total' and 'cdp_list'
    """
    try:
        service = get_google_sheets_service()
        sheet = service.spreadsheets()
        result = sheet.values().get(
            spreadsheetId=spreadsheet_id,
            range=range_name
        ).execute()

        values = result.get('values', [])

        if not values:
            return {'total': 0, 'cdp_list': []}

        # Parse the data
        # Assuming: Row 1 = headers, Last row = total, middle rows = CDP data
        cdp_list = []
        total = 0

        # Skip header row
        for i, row in enumerate(values[1:], start=1):
            if len(row) >= 3:
                try:
                    # Check if this is the total row (you can customize this logic)
                    # For example, if first column is "TOTAL" or empty
                    if row[0].upper() == 'TOTAL' or row[0].upper() == 'JEECE':
                        total = float(row[2].replace(',', '.').replace(' ', '').replace('€', ''))
                    else:
                        nom = row[0].strip()
                        prenom = row[1].strip()
                        ca = float(row[2].replace(',', '.').replace(' ', '').replace('€', ''))

                        cdp_list.append({
                            'nom': nom,
                            'prenom': prenom,
                            'chiffre_affaire': ca
                        })
                except (ValueError, IndexError) as e:
                    # Skip malformed rows
                    print(f"Skipping row {i}: {e}")
                    continue

        return {
            'total': total,
            'cdp_list': cdp_list
        }

    except HttpError as error:
        print(f"An error occurred: {error}")
        raise error
    except Exception as e:
        print(f"Error fetching data from Google Sheets: {e}")
        raise e
