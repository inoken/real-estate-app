/**
 * Google Apps Script Web API for real-estate-db
 * - POST: property data save
 * - GET : property data list
 *
 * Spreadsheet name: real-estate-db
 */

const SPREADSHEET_NAME = 'real-estate-db';
const SHEET_NAME = 'properties';

const HEADERS = [
  'savedAt',
  'name',
  'location',
  'propertyUrl',
  'price',
  'rent',
  'managementFee',
  'loan',
  'expenses',
  'equity'
];

/**
 * GET /exec
 * Returns:
 * {
 *   "ok": true,
 *   "data": [ ... ]
 * }
 */
function doGet() {
  try {
    const sheet = getOrCreateSheet_();
    const values = sheet.getDataRange().getValues();

    if (values.length <= 1) {
      return json_({ ok: true, data: [] });
    }

    const headers = values[0];
    const rows = values.slice(1).map(function (row) {
      const obj = {};
      headers.forEach(function (key, i) {
        obj[key] = row[i];
      });
      return obj;
    });

    return json_({ ok: true, data: rows });
  } catch (err) {
    return json_({
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

/**
 * POST /exec
 * Request body JSON:
 * {
 *   "name": "物件名",
 *   "location": "所在地",
 *   "propertyUrl": "https://...",
 *   "price": 10000000,
 *   "rent": 70000,
 *   "managementFee": 5000,
 *   "loan": 30000,
 *   "expenses": 8000,
 *   "equity": 2000000
 * }
 */
function doPost(e) {
  try {
    const payload = parsePayload_(e);
    validatePayload_(payload);

    const sheet = getOrCreateSheet_();
    const record = normalizeRecord_(payload);

    sheet.appendRow([
      record.savedAt,
      record.name,
      record.location,
      record.propertyUrl,
      record.price,
      record.rent,
      record.managementFee,
      record.loan,
      record.expenses,
      record.equity
    ]);

    return json_({ ok: true, data: record });
  } catch (err) {
    return json_({
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function parsePayload_(e) {
  if (!e) throw new Error('リクエストが空です。');

  // Standard JSON body
  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }

  // Fallback: ?payload={"name":"..."}
  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  throw new Error('POSTデータが見つかりません。');
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('不正なJSONです。');
  }
  if (!String(payload.name || '').trim()) {
    throw new Error('name（物件名）は必須です。');
  }
  if (!String(payload.location || '').trim()) {
    throw new Error('location（所在地）は必須です。');
  }
}

function normalizeRecord_(payload) {
  return {
    savedAt: new Date(),
    name: String(payload.name || '').trim(),
    location: String(payload.location || '').trim(),
    propertyUrl: String(payload.propertyUrl || '').trim(),
    price: toNumber_(payload.price),
    rent: toNumber_(payload.rent),
    managementFee: toNumber_(payload.managementFee),
    loan: toNumber_(payload.loan),
    expenses: toNumber_(payload.expenses),
    equity: toNumber_(payload.equity)
  };
}

function toNumber_(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function getOrCreateSheet_() {
  const ss = getSpreadsheetByName_(SPREADSHEET_NAME);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  ensureHeader_(sheet);
  return sheet;
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    return;
  }

  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const mismatch = HEADERS.some(function (h, i) {
    return String(firstRow[i] || '') !== h;
  });

  if (mismatch) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function getSpreadsheetByName_(name) {
  const files = DriveApp.getFilesByName(name);
  if (!files.hasNext()) {
    throw new Error('Spreadsheet "' + name + '" が見つかりません。');
  }
  const file = files.next();
  return SpreadsheetApp.openById(file.getId());
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
