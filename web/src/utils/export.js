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
 */
export function exportExcel(
  parsedData,
  conditions,
  concentrations,
  normalized,
  stats,
  ttestResults,
  filename = 'melanin_analysis_results.xlsx'
) {
  const wb = XLSX.utils.book_new();
  const filenames = Object.keys(parsedData);
  const groupNames = conditions.map((c) => c.name);

  // Sheet 1: Absorbance
  const absRows = filenames.map((fname) => {
    const row = { Measurement: fname };
    for (const cond of conditions) {
      const vals = cond.wells
        .filter((w) => w in parsedData[fname])
        .map((w) => parsedData[fname][w]);
      row[cond.name] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    return row;
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(absRows), 'Absorbance');

  // Sheet 2: Concentration
  const concRows = filenames.map((fname, i) => {
    const row = { Measurement: fname };
    for (const gname of groupNames) {
      const vals = concentrations[gname] || [];
      row[gname] = i < vals.length ? vals[i] : null;
    }
    return row;
  });
  const meanRow = { Measurement: 'Mean' };
  for (const gname of groupNames) {
    const vals = concentrations[gname] || [];
    meanRow[gname] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  concRows.push(meanRow);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(concRows), 'Concentration');

  // Sheet 3: Normalized
  const normRows = filenames.map((fname, i) => {
    const row = { Measurement: fname };
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
 */
export function exportConfigJSON(
  conditions,
  slope,
  intercept,
  normRefIdx,
  controlIdx,
  chartTheme,
  filename = 'melanin_config.json'
) {
  const config = {
    conditions: conditions.map((c) => ({ id: c.id, name: c.name, color: c.color, wells: c.wells })),
    standardCurve: { slope, intercept },
    normalizationReference: normRefIdx,
    controlGroup: controlIdx,
    chartTheme,
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
