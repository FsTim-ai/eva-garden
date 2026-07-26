import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';

const SHEET_COLUMNS = [
  { header: 'Tanggal', key: 'date', width: 14 },
  { header: 'Jam', key: 'time', width: 10 },
  { header: 'Suhu (°C)', key: 'temperature', width: 12 },
  { header: 'pH', key: 'ph', width: 10 },
  { header: 'Water Level (%)', key: 'water_level', width: 16 },
  { header: 'Oxygen (mg/L)', key: 'oxygen', width: 14 },
  { header: 'Humidity (%)', key: 'humidity', width: 14 },
];

// ExcelJS's column `key` mapping only exists on the in-memory workbook that
// defined it — it doesn't round-trip through a saved .xlsx file, so a
// worksheet loaded via readFile() has no keys and object-keyed addRow()
// silently drops every value. Building rows by explicit column order avoids
// depending on that metadata surviving a reload (e.g. after a server restart).
const COLUMN_ORDER = SHEET_COLUMNS.map((c) => c.key);

const SYSTEM_SHEET_NAMES = {
  fish: 'Fish Tank',
  lobster: 'Lobster Farm',
  hydroponics: 'Hydroponics',
};

// One row per system per snapshot, using each system's most recently
// received reading for every sensor type (readings arrive independently,
// e.g. only pH from the lobster ESP32, so most columns come from whatever
// was last reported for that system).
export function createExcelLogger({ db, systemId, filePath, validSystems }) {
  const workbook = new ExcelJS.Workbook();

  async function ensureSheets() {
    mkdirSync(path.dirname(filePath), { recursive: true });
    if (existsSync(filePath)) {
      await workbook.xlsx.readFile(filePath);
    }
    for (const sys of validSystems) {
      const name = SYSTEM_SHEET_NAMES[sys] ?? sys;
      if (!workbook.getWorksheet(name)) {
        workbook.addWorksheet(name).columns = SHEET_COLUMNS;
      }
    }
  }

  async function latestReadingsBySystem() {
    const snap = await db
      .collection(`systems/${systemId}/sensors`)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    const latest = {}; // { [system]: { [type]: value } }
    for (const doc of snap.docs) {
      const { system, type, value } = doc.data();
      latest[system] ??= {};
      if (!(type in latest[system])) latest[system][type] = value;
    }
    return latest;
  }

  async function snapshot() {
    const latest = await latestReadingsBySystem();
    const now = new Date();
    const date = now.toLocaleDateString('id-ID');
    const time = now.toLocaleTimeString('id-ID');

    for (const sys of validSystems) {
      const sheet = workbook.getWorksheet(SYSTEM_SHEET_NAMES[sys] ?? sys);
      const readings = { date, time, ...(latest[sys] ?? {}) };
      sheet.addRow(COLUMN_ORDER.map((key) => readings[key]));
    }

    await workbook.xlsx.writeFile(filePath);
    console.log(`[excel] snapshot saved ${date} ${time} -> ${filePath}`);
  }

  return { ensureSheets, snapshot, filePath };
}
