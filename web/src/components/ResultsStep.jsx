import React, { useMemo, useRef, useCallback } from 'react';
import { Plot } from '../utils/plotly';
import { CHART_THEMES, BAR_COLORS } from '../utils/constants';
import {
  calculateGroupConcentrations,
  normalizeToReference,
  calculateStatistics,
  runTTests,
} from '../utils/analysis';
import { exportExcel, exportConfigJSON, exportPlotlyPNG } from '../utils/export';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  errorBox: {
    padding: '16px 20px',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    fontSize: '0.875rem',
    border: '1px solid #fecaca',
  },
  infoBox: {
    padding: '16px 20px',
    borderRadius: '8px',
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    fontSize: '0.875rem',
    border: '1px solid #bfdbfe',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8125rem',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
  },
  trEven: {
    backgroundColor: '#f8fafc',
  },
  trSignificant: {
    backgroundColor: '#f0fdf4',
  },
  exportRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  btnSecondary: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  details: {
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  summary: {
    padding: '12px 16px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '0.875rem',
    color: '#334155',
    backgroundColor: '#f8fafc',
    userSelect: 'none',
  },
  detailsBody: {
    padding: '16px',
    overflowX: 'auto',
  },
};

function formatPValue(p) {
  if (p === null || p === undefined) return '-';
  if (p < 0.001) return p.toExponential(2);
  if (p < 0.01) return p.toExponential(2);
  return p.toFixed(4);
}

export default function ResultsStep({
  parsedData,
  conditions,
  slope,
  intercept,
  normRefIdx,
  controlConditionIdx,
  chartTheme,
}) {
  const plotRef = useRef(null);

  const hasWells = conditions.some((c) => c.wells.length > 0);
  const hasData = Object.keys(parsedData).length > 0;

  const analysis = useMemo(() => {
    if (!hasWells || !hasData) return null;

    try {
      const concentrations = calculateGroupConcentrations(
        parsedData,
        conditions,
        slope,
        intercept
      );
      const safeNormIdx = Math.min(Math.max(normRefIdx ?? 0, 0), conditions.length - 1);
      const safeCtrlIdx = Math.min(Math.max(controlConditionIdx ?? 0, 0), conditions.length - 1);
      const refName = conditions[safeNormIdx]?.name;
      const ctrlName = conditions[safeCtrlIdx]?.name;

      if (!refName || !ctrlName) {
        return { error: 'Invalid normalization or control group index.' };
      }

      const normalized = normalizeToReference(concentrations, refName);
      const stats = calculateStatistics(normalized);
      const ttestResults = runTTests(normalized, ctrlName);

      return { concentrations, normalized, stats, ttestResults, error: null };
    } catch (err) {
      return { error: err.message || 'Analysis failed.' };
    }
  }, [
    parsedData,
    conditions,
    slope,
    intercept,
    normRefIdx,
    controlConditionIdx,
    hasWells,
    hasData,
  ]);

  const handleExportPNG = useCallback(() => {
    exportPlotlyPNG(plotRef, 'melanin_chart.png');
  }, []);

  const handleExportExcel = useCallback(() => {
    if (!analysis || analysis.error) return;
    exportExcel(
      parsedData,
      conditions,
      analysis.concentrations,
      analysis.normalized,
      analysis.stats,
      analysis.ttestResults
    );
  }, [parsedData, conditions, analysis]);

  const handleExportConfig = useCallback(() => {
    exportConfigJSON(
      conditions,
      slope,
      intercept,
      normRefIdx,
      controlConditionIdx,
      chartTheme
    );
  }, [conditions, slope, intercept, normRefIdx, controlConditionIdx, chartTheme]);

  if (!hasWells) {
    return (
      <div style={styles.container}>
        <div style={styles.infoBox}>
          No conditions have wells assigned. Go back to the Well Mapping step to
          assign wells to treatment groups.
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div style={styles.container}>
        <div style={styles.infoBox}>
          No plate reader data uploaded. Go back to the Upload step to add
          measurement files.
        </div>
      </div>
    );
  }

  if (!analysis || analysis.error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          Analysis failed: {analysis?.error || 'Unknown error occurred.'}
        </div>
      </div>
    );
  }

  const { concentrations, normalized, stats, ttestResults } = analysis;
  const theme = CHART_THEMES[chartTheme] || CHART_THEMES.white;
  const groupNames = conditions.map((c) => c.name);
  const filenames = Object.keys(parsedData);

  // Build Plotly chart data
  const chartData = [
    {
      type: 'bar',
      x: stats.map((s) => s.group),
      y: stats.map((s) => s.mean),
      error_y: {
        type: 'data',
        array: stats.map((s) => s.sd),
        visible: true,
        thickness: 1.5,
        width: 4,
        color: theme.text,
      },
      marker: {
        color: stats.map((_, i) => BAR_COLORS[i % BAR_COLORS.length]),
        line: { width: 0 },
      },
      text: stats.map((s) => s.mean.toFixed(2)),
      textposition: 'outside',
      textfont: { color: theme.text, size: 11 },
      hovertemplate: '%{x}<br>Mean: %{y:.2f} ± %{error_y.array:.2f}<extra></extra>',
    },
  ];

  // Significance annotations
  const annotations = [];
  const maxY = Math.max(...stats.map((s) => s.mean + s.sd));
  stats.forEach((s) => {
    const ttest = ttestResults[s.group];
    if (ttest && ttest.significance && ttest.significance !== '-' && ttest.significance !== 'n.s.' && ttest.significance !== 'n/a') {
      annotations.push({
        x: s.group,
        y: s.mean + s.sd + maxY * 0.08,
        text: ttest.significance,
        showarrow: false,
        font: { size: 14, color: theme.text, weight: 'bold' },
        xanchor: 'center',
        yanchor: 'bottom',
      });
    }
  });

  const chartLayout = {
    template: 'none',
    height: 500,
    margin: { t: 40, r: 30, b: 60, l: 60 },
    paper_bgcolor: theme.paper,
    plot_bgcolor: theme.background,
    font: { color: theme.text, family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    xaxis: {
      title: { text: 'Treatment Group', font: { size: 13 } },
      tickfont: { size: 11 },
      gridcolor: theme.grid,
      linecolor: theme.grid,
    },
    yaxis: {
      title: { text: 'Melanin Content (% of Reference)', font: { size: 13 } },
      tickfont: { size: 11 },
      gridcolor: theme.grid,
      linecolor: theme.grid,
      zeroline: false,
    },
    annotations,
    bargap: 0.3,
  };

  const chartConfig = {
    displayModeBar: false,
    responsive: true,
  };

  return (
    <div style={styles.container}>
      {/* Bar Chart */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Melanin Content Analysis</h2>
        <Plot
          ref={plotRef}
          data={chartData}
          layout={chartLayout}
          config={chartConfig}
          style={{ width: '100%' }}
          useResizeHandler
        />
      </div>

      {/* Statistics Table */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Statistics</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Group</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Mean (%)</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>SD</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>N</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>p-value</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Significance</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => {
                const ttest = ttestResults[s.group] || {};
                const sig = ttest.significance || '-';
                const isSignificant = sig === '*' || sig === '**' || sig === '***';
                const rowBg = isSignificant
                  ? styles.trSignificant
                  : i % 2 === 0
                  ? {}
                  : styles.trEven;
                return (
                  <tr key={s.group} style={rowBg}>
                    <td style={{ ...styles.td, fontWeight: 500 }}>{s.group}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {s.mean.toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {s.sd.toFixed(2)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{s.n}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatPValue(ttest.pValue)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: isSignificant ? 600 : 400 }}>
                      {sig}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collapsible Data Tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Absorbance Table */}
        <details style={styles.details}>
          <summary style={styles.summary}>Absorbance (per measurement)</summary>
          <div style={styles.detailsBody}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Measurement</th>
                  {groupNames.map((name) => (
                    <th key={name} style={{ ...styles.th, textAlign: 'right' }}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filenames.map((fname, i) => (
                  <tr key={fname} style={i % 2 === 1 ? styles.trEven : {}}>
                    <td style={{ ...styles.td, fontWeight: 500, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fname}
                    </td>
                    {conditions.map((cond) => {
                      const vals = cond.wells
                        .filter((w) => w in parsedData[fname])
                        .map((w) => parsedData[fname][w]);
                      const meanAbs =
                        vals.length > 0
                          ? vals.reduce((a, b) => a + b, 0) / vals.length
                          : null;
                      return (
                        <td
                          key={cond.id}
                          style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {meanAbs !== null ? meanAbs.toFixed(4) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        {/* Concentration Table */}
        <details style={styles.details}>
          <summary style={styles.summary}>
            Concentration (per measurement)
          </summary>
          <div style={styles.detailsBody}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Measurement</th>
                  {groupNames.map((name) => (
                    <th key={name} style={{ ...styles.th, textAlign: 'right' }}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filenames.map((fname, i) => (
                  <tr key={fname} style={i % 2 === 1 ? styles.trEven : {}}>
                    <td style={{ ...styles.td, fontWeight: 500, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fname}
                    </td>
                    {groupNames.map((gname) => {
                      const vals = concentrations[gname] || [];
                      const val = i < vals.length ? vals[i] : null;
                      return (
                        <td
                          key={gname}
                          style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {val !== null ? val.toFixed(2) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Mean row */}
                <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 600 }}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>Mean</td>
                  {groupNames.map((gname) => {
                    const vals = concentrations[gname] || [];
                    const mean =
                      vals.length > 0
                        ? vals.reduce((a, b) => a + b, 0) / vals.length
                        : null;
                    return (
                      <td
                        key={gname}
                        style={{ ...styles.td, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {mean !== null ? mean.toFixed(2) : '-'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </details>

        {/* Normalized Table */}
        <details style={styles.details}>
          <summary style={styles.summary}>
            Normalized (% of reference)
          </summary>
          <div style={styles.detailsBody}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Measurement</th>
                  {groupNames.map((name) => (
                    <th key={name} style={{ ...styles.th, textAlign: 'right' }}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filenames.map((fname, i) => (
                  <tr key={fname} style={i % 2 === 1 ? styles.trEven : {}}>
                    <td style={{ ...styles.td, fontWeight: 500, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fname}
                    </td>
                    {groupNames.map((gname) => {
                      const vals = normalized[gname] || [];
                      const val = i < vals.length ? vals[i] : null;
                      return (
                        <td
                          key={gname}
                          style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {val !== null ? val.toFixed(2) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      {/* Export Buttons */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Export</h2>
        <div style={styles.exportRow}>
          <button
            style={styles.btnPrimary}
            onClick={handleExportPNG}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            &#128247; Export PNG
          </button>
          <button
            style={styles.btnPrimary}
            onClick={handleExportExcel}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            &#128202; Export Excel
          </button>
          <button
            style={styles.btnSecondary}
            onClick={handleExportConfig}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.color = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#475569';
            }}
          >
            &#128190; Export JSON Config
          </button>
        </div>
      </div>
    </div>
  );
}
