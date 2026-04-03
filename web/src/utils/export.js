import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Plotly } from './plotly';

/**
 * Export Plotly chart as PNG at 3x resolution.
 */
export function exportPlotlyPNG(plotlyRef, filename = 'melanin_chart.png') {
  const el = plotlyRef?.current?.el;
  if (!el) return;
  Plotly.downloadImage(el, {
    format: 'png',
    width: 1200,
    height: 600,
    scale: 3,
    filename: filename.replace('.png', ''),
  });
}

/**
 * Export results as 4-sheet Excel workbook.
 * Sheets: Absorbance, Concentration, Normalized, Statistics
 *
 * Supports multi-plate: plates is an array of { name, files, conditions }.
 * Each absorbance/concentration/normalized row includes a Plate column.
 */
export function exportExcel(
  plates,
  concentrations,
  normalized,
  stats,
  ttestResults,
  filename = 'melanin_analysis_results.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // Collect all unique group names across all plates (preserving order)
  const groupNameSet = new Set();
  for (const plate of plates) {
    for (const cond of plate.conditions) {
      groupNameSet.add(cond.name);
    }
  }
  const groupNames = Array.from(groupNameSet);

  // Sheet 1: Absorbance (per plate, per file)
  const absRows = [];
  for (const plate of plates) {
    const filenames = Object.keys(plate.files);
    for (const fname of filenames) {
      const row = { Plate: plate.name, Measurement: fname };
      for (const cond of plate.conditions) {
        const vals = cond.wells
          .filter((w) => w in plate.files[fname])
          .map((w) => plate.files[fname][w]);
        row[cond.name] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      }
      absRows.push(row);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(absRows), 'Absorbance');

  // Sheet 2: Concentration (aggregated across plates — indexed by row)
  // Build a flat measurement list across all plates
  const measurementList = [];
  for (const plate of plates) {
    const filenames = Object.keys(plate.files);
    for (const fname of filenames) {
      measurementList.push({ plate: plate.name, fname });
    }
  }
  const concRows = measurementList.map((m, i) => {
    const row = { Plate: m.plate, Measurement: m.fname };
    for (const gname of groupNames) {
      const vals = concentrations[gname] || [];
      row[gname] = i < vals.length ? vals[i] : null;
    }
    return row;
  });
  const meanRow = { Plate: '', Measurement: 'Mean' };
  for (const gname of groupNames) {
    const vals = concentrations[gname] || [];
    meanRow[gname] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  concRows.push(meanRow);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(concRows), 'Concentration');

  // Sheet 3: Normalized
  const normRows = measurementList.map((m, i) => {
    const row = { Plate: m.plate, Measurement: m.fname };
    for (const gname of groupNames) {
      const vals = normalized[gname] || [];
      row[gname] = i < vals.length ? vals[i] : null;
    }
    return row;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(normRows), 'Normalized');

  // Sheet 4: Statistics
  const statsRows = stats.map((s) => {
    const ttest = ttestResults[s.group] || {};
    return {
      Group: s.group,
      Mean: s.mean,
      SD: s.sd,
      N: s.n,
      'p-value': ttest.pValue ?? '-',
      Significance: ttest.significance ?? '-',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsRows), 'Statistics');

  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbOut], { type: 'application/octet-stream' }), filename);
}

/**
 * Export full analysis config as JSON for reproducibility.
 * Saves the full plates array for multi-plate support.
 */
export function exportConfigJSON(
  plates,
  slope,
  intercept,
  normRefIdx,
  controlIdx,
  chartTheme,
  chartOptions,
  filename = 'melanin_config.json'
) {
  const config = {
    plates: plates.map((p) => ({
      id: p.id,
      name: p.name,
      conditions: p.conditions.map((c) => ({ id: c.id, name: c.name, color: c.color, wells: c.wells })),
    })),
    // Keep flat conditions for backwards compatibility (from first plate)
    conditions: plates.length > 0
      ? plates[0].conditions.map((c) => ({ id: c.id, name: c.name, color: c.color, wells: c.wells }))
      : [],
    standardCurve: { slope, intercept },
    normalizationReference: normRefIdx,
    controlGroup: controlIdx,
    chartTheme,
    chartOptions,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  saveAs(blob, filename);
}

/**
 * Load config from JSON file.
 */
export function loadConfigJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        resolve(config);
      } catch (err) {
        reject(new Error('Invalid JSON config file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read config file.'));
    reader.readAsText(file);
  });
}
