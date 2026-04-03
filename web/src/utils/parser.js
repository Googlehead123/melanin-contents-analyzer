import * as XLSX from 'xlsx';
import { PLATE_ROWS, PLATE_COLS } from './constants';

/**
 * Parse a plate reader .xls/.xlsx file and return { wellId: absorbance }.
 * Primary: Plate_Page sheet (96-well grid layout).
 * Fallback: List sheet (tabular format).
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const result = parseWorkbook(workbook);
        resolve(result);
      } catch (err) {
        reject(new Error(`Failed to parse ${file.name}: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

function parseWorkbook(workbook) {
  // Try Plate_Page sheet first
  const plateSheet = findSheet(workbook, 'plate_page');
  if (plateSheet) {
    const wellData = parsePlateLayout(workbook, plateSheet);
    if (wellData && Object.keys(wellData).length > 0) {
      return wellData;
    }
  }

  // Fallback to List sheet
  const listSheet = findSheet(workbook, 'list') || workbook.SheetNames[0];
  return parseListSheet(workbook, listSheet);
}

function findSheet(workbook, keyword) {
  const lowerKeyword = keyword.toLowerCase();
  for (const name of workbook.SheetNames) {
    if (name.toLowerCase().includes(lowerKeyword)) {
      return name;
    }
  }
  return null;
}

/**
 * Parse Plate_Page sheet with 96-well grid layout.
 *
 * Layout:
 * - Find row containing "Absorbance" keyword
 * - Grid starts 3 rows after
 * - Rows A-H, columns 1-12
 * - Skip string cells (row labels)
 */
function parsePlateLayout(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  // Find the absorbance header row
  let absRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const firstCell = rows[i]?.[0];
    if (firstCell != null && String(firstCell).toLowerCase().includes('absorbance')) {
      absRow = i;
      break;
    }
  }

  if (absRow === -1) {
    throw new Error('Could not find Absorbance header in plate layout sheet.');
  }

  // Grid starts 3 rows after absorbance header
  const gridStart = absRow + 3;
  const wellData = {};

  for (let rowOffset = 0; rowOffset < PLATE_ROWS.length; rowOffset++) {
    const rowLetter = PLATE_ROWS[rowOffset];
    const dfRow = gridStart + rowOffset;
    if (dfRow >= rows.length) break;

    const rowData = rows[dfRow];
    if (!rowData) continue;

    for (let colIdx = 0; colIdx < PLATE_COLS.length; colIdx++) {
      const cell = rowData[colIdx];

      // Skip string cells (row labels like 'A', 'B', etc.)
      if (typeof cell === 'string') continue;
      if (cell == null) continue;

      const absorbance = Number(cell);
      if (!isNaN(absorbance)) {
        const plateCol = colIdx + 1; // plate columns are 1-indexed
        const wellId = `${rowLetter}${String(plateCol).padStart(2, '0')}`;
        wellData[wellId] = absorbance;
      }
    }
  }

  return wellData;
}

/**
 * Parse List sheet with tabular well data (fallback).
 * Expected columns: Plate, Repeat, Well, Type, Time, Absorbance.
 */
function parseListSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  let headerIdx = -1;
  let wellCol = -1;
  let absCol = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    for (let ci = 0; ci < row.length; ci++) {
      const val = String(row[ci] ?? '').toLowerCase();
      if (val.includes('well')) wellCol = ci;
      if (val.includes('absorbance')) absCol = ci;
    }
    if (wellCol >= 0 && absCol >= 0) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1 || wellCol === -1 || absCol === -1) {
    throw new Error('Could not find Well and Absorbance columns in List sheet.');
  }

  const wellData = {};
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const well = String(row[wellCol] ?? '').trim();
    const absorbance = Number(row[absCol]);
    if (well && well !== 'null' && well !== 'undefined' && well !== 'NaN' && well !== 'nan' && !isNaN(absorbance)) {
      wellData[well] = absorbance;
    }
  }

  return wellData;
}

/**
 * Get sorted list of all unique well IDs across all parsed files.
 */
export function getAllWells(parsedData) {
  const wells = new Set();
  for (const fileData of Object.values(parsedData)) {
    for (const wellId of Object.keys(fileData)) {
      wells.add(wellId);
    }
  }
  return Array.from(wells).sort((a, b) => {
    const rowA = a[0], rowB = b[0];
    const colA = parseInt(a.slice(1), 10);
    const colB = parseInt(b.slice(1), 10);
    if (rowA !== rowB) return rowA.localeCompare(rowB);
    return colA - colB;
  });
}
