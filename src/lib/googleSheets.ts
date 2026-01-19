import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
];

export async function getGoogleSheet(dynamicSpreadsheetId?: string) {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const spreadsheetId = dynamicSpreadsheetId || process.env.GOOGLE_SHEET_ID;

    if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
        throw new Error('Missing Google Service Account credentials or Spreadsheet ID');
    }

    const jwt = new JWT({
        email: serviceAccountEmail,
        key: privateKey,
        scopes: SCOPES,
    });

    const doc = new GoogleSpreadsheet(spreadsheetId, jwt);
    await doc.loadInfo();
    return doc;
}
