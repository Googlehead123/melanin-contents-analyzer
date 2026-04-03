import React, { useCallback, useRef, useMemo } from 'react';
import { CHART_THEMES } from '../utils/constants';
import { loadConfigJSON } from '../utils/export';

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
  fieldRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1 1 200px',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#475569',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '0.875rem',
    color: '#1e293b',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
    boxSizing: 'border-box',
  },
  formulaBox: {
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
    fontSize: '0.875rem',
    color: '#334155',
    margin: 0,
  },
  select: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '0.875rem',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
  },
  themeGrid: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  themeCard: {
    flex: '1 1 120px',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    minWidth: '120px',
  },
  themeCardActive: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)',
  },
  themeSwatch: {
    width: '100%',
    height: '40px',
    borderRadius: '6px',
    marginBottom: '8px',
    border: '1px solid #e2e8f0',
  },
  themeLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#334155',
    margin: 0,
  },
  themeColors: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
    marginTop: '6px',
  },
  themeColorDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '1px solid rgba(0,0,0,0.1)',
  },
  configRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '8px 20px',
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
    padding: '8px 20px',
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
  hiddenInput: {
    display: 'none',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  optionLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#475569',
  },
  optionControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rangeSlider: {
    width: '120px',
    cursor: 'pointer',
    accentColor: '#3b82f6',
  },
  rangeValue: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#1e293b',
    minWidth: '32px',
    textAlign: 'right',
  },
  numberInputSmall: {
    width: '72px',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '0.8125rem',
    color: '#1e293b',
    outline: 'none',
    textAlign: 'right',
    boxSizing: 'border-box',
  },
  textInputWide: {
    width: '280px',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '0.8125rem',
    color: '#1e293b',
    outline: 'none',
    boxSizing: 'border-box',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#3b82f6',
  },
  subsectionTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '12px 0 4px 0',
  },
  toggle: {
    position: 'relative',
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
    padding: 0,
    flexShrink: 0,
  },
  toggleKnob: {
    position: 'absolute',
    top: '2px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    transition: 'left 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
  },
  doseTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8125rem',
    marginTop: '12px',
  },
  doseTh: {
    padding: '8px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#475569',
    borderBottom: '2px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
  doseTd: {
    padding: '6px 12px',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
  },
  doseInput: {
    width: '120px',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '0.8125rem',
    color: '#1e293b',
    outline: 'none',
    textAlign: 'right',
    boxSizing: 'border-box',
  },
  doseHint: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '8px',
  },
};

export default function SettingsStep({
  slope,
  setSlope,
  intercept,
  setIntercept,
  conditions,
  setConditions,
  normRefIdx,
  setNormRefIdx,
  controlConditionIdx,
  setControlConditionIdx,
  chartTheme,
  setChartTheme,
  chartOptions,
  setChartOptions,
  doseResponseEnabled,
  setDoseResponseEnabled,
  onLoadConfig,
  onSaveConfig,
}) {
  const fileInputRef = useRef(null);

  // Clamp indices to valid range
  const safeNormRefIdx = conditions.length > 0 ? Math.min(Math.max(normRefIdx ?? 0, 0), conditions.length - 1) : 0;
  const safeControlIdx = conditions.length > 0 ? Math.min(Math.max(controlConditionIdx ?? 0, 0), conditions.length - 1) : 0;

  const handleSlopeChange = useCallback(
    (e) => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) {
        setSlope(val);
      }
    },
    [setSlope]
  );

  const handleInterceptChange = useCallback(
    (e) => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) {
        setIntercept(val);
      }
    },
    [setIntercept]
  );

  const handleNormRefChange = useCallback(
    (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val)) setNormRefIdx(val);
    },
    [setNormRefIdx]
  );

  const handleControlChange = useCallback(
    (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val)) setControlConditionIdx(val);
    },
    [setControlConditionIdx]
  );

  const handleThemeSelect = useCallback(
    (key) => {
      setChartTheme(key);
    },
    [setChartTheme]
  );

  const updateChartOption = useCallback(
    (key, value) => {
      setChartOptions((prev) => ({ ...prev, [key]: value }));
    },
    [setChartOptions]
  );

  const handleLoadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const config = await loadConfigJSON(file);
        onLoadConfig(config);
      } catch (err) {
        console.error('Failed to load config:', err.message);
      }
      e.target.value = '';
    },
    [onLoadConfig]
  );

  const handleDoseChange = useCallback(
    (conditionId, value) => {
      setConditions((prev) =>
        prev.map((c) =>
          c.id === conditionId
            ? { ...c, dose: value === '' ? null : parseFloat(value) || null }
            : c
        )
      );
    },
    [setConditions]
  );

  const dosesWithValues = useMemo(
    () => conditions.filter((c) => typeof c.dose === 'number' && c.dose > 0).length,
    [conditions]
  );

  const themeKeys = Object.keys(CHART_THEMES);

  return (
    <div style={styles.container}>
      {/* Standard Curve */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Standard Curve</h2>
        <div style={styles.fieldRow}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Slope</label>
            <input
              type="number"
              step={0.0001}
              value={slope.toFixed(6)}
              onChange={handleSlopeChange}
              style={styles.input}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Intercept</label>
            <input
              type="number"
              step={0.001}
              value={intercept.toFixed(4)}
              onChange={handleInterceptChange}
              style={styles.input}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            />
          </div>
        </div>
        <div style={styles.formulaBox}>
          Conc = (Abs &minus; {intercept.toFixed(4)}) / {slope.toFixed(6)}
        </div>
      </div>

      {/* Analysis Options */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Analysis Options</h2>
        <div style={styles.fieldRow}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Normalization Reference</label>
            <select
              style={styles.select}
              value={safeNormRefIdx}
              onChange={handleNormRefChange}
            >
              {conditions.map((cond, idx) => (
                <option key={cond.id} value={idx}>
                  {cond.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>T-test Comparison Group</label>
            <select
              style={styles.select}
              value={safeControlIdx}
              onChange={handleControlChange}
            >
              {conditions.map((cond, idx) => (
                <option key={cond.id} value={idx}>
                  {cond.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dose-Response Analysis */}
      <div style={styles.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: doseResponseEnabled ? '16px' : 0 }}>
          <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Dose-Response Analysis</h2>
          <button
            type="button"
            style={{
              ...styles.toggle,
              backgroundColor: doseResponseEnabled ? '#3b82f6' : '#cbd5e1',
            }}
            onClick={() => setDoseResponseEnabled((prev) => !prev)}
            role="switch"
            aria-checked={doseResponseEnabled}
            aria-label="Toggle dose-response analysis"
          >
            <div
              style={{
                ...styles.toggleKnob,
                left: doseResponseEnabled ? '22px' : '2px',
              }}
            />
          </button>
        </div>
        {doseResponseEnabled && (
          <>
            <table style={styles.doseTable}>
              <thead>
                <tr>
                  <th style={styles.doseTh}>Group</th>
                  <th style={{ ...styles.doseTh, textAlign: 'right' }}>Dose (concentration)</th>
                </tr>
              </thead>
              <tbody>
                {conditions.map((cond, i) => (
                  <tr key={cond.id} style={i % 2 === 1 ? { backgroundColor: '#f8fafc' } : {}}>
                    <td style={{ ...styles.doseTd, fontWeight: 500 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: cond.color,
                          marginRight: '8px',
                          verticalAlign: 'middle',
                        }}
                      />
                      {cond.name}
                    </td>
                    <td style={{ ...styles.doseTd, textAlign: 'right' }}>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="--"
                        value={typeof cond.dose === 'number' ? cond.dose : ''}
                        onChange={(e) => handleDoseChange(cond.id, e.target.value)}
                        style={styles.doseInput}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={styles.doseHint}>
              {dosesWithValues >= 3
                ? `${dosesWithValues} groups with doses set. Curve fitting will run on the Results step.`
                : `Set doses for at least 3 groups to enable 4PL curve fitting (${dosesWithValues}/3).`}
            </p>
          </>
        )}
      </div>

      {/* Chart Theme */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Chart Theme</h2>
        <div style={styles.themeGrid}>
          {themeKeys.map((key) => {
            const theme = CHART_THEMES[key];
            const isActive = chartTheme === key;
            return (
              <div
                key={key}
                style={{
                  ...styles.themeCard,
                  ...(isActive ? styles.themeCardActive : {}),
                }}
                onClick={() => handleThemeSelect(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleThemeSelect(key);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Select ${theme.name} theme`}
                aria-pressed={isActive}
              >
                <div
                  style={{
                    ...styles.themeSwatch,
                    backgroundColor: theme.background,
                  }}
                />
                <p style={styles.themeLabel}>{theme.name}</p>
                <div style={styles.themeColors}>
                  <span
                    style={{
                      ...styles.themeColorDot,
                      backgroundColor: theme.text,
                    }}
                    title="Text"
                  />
                  <span
                    style={{
                      ...styles.themeColorDot,
                      backgroundColor: theme.grid,
                    }}
                    title="Grid"
                  />
                  <span
                    style={{
                      ...styles.themeColorDot,
                      backgroundColor: theme.paper,
                    }}
                    title="Paper"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart Customization */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Chart Customization</h2>

        <p style={styles.subsectionTitle}>Font Sizes</p>
        <div style={styles.optionRow}>
          <span style={styles.optionLabel}>Title Font Size</span>
          <div style={styles.optionControl}>
            <input
              type="number"
              min={10}
              max={24}
              value={chartOptions.titleFontSize}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 10 && val <= 24) updateChartOption('titleFontSize', val);
              }}
              style={styles.numberInputSmall}
            />
          </div>
        </div>
        <div style={styles.optionRow}>
          <span style={styles.optionLabel}>Axis / Label Font Size</span>
          <div style={styles.optionControl}>
            <input
              type="number"
              min={8}
              max={18}
              value={chartOptions.fontSize}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 8 && val <= 18) updateChartOption('fontSize', val);
              }}
              style={styles.numberInputSmall}
            />
          </div>
        </div>

        <p style={styles.subsectionTitle}>Bar Options</p>
        <div style={styles.optionRow}>
          <span style={styles.optionLabel}>Bar Width</span>
          <div style={styles.optionControl}>
            <input
              type="range"
              min={0.2}
              max={1.0}
              step={0.1}
              value={chartOptions.barWidth}
              onChange={(e) => updateChartOption('barWidth', parseFloat(e.target.value))}
              style={styles.rangeSlider}
            />
            <span style={styles.rangeValue}>{chartOptions.barWidth.toFixed(1)}</span>
          </div>
        </div>
        <div style={styles.optionRow}>
          <span style={styles.optionLabel}>Bar Outline</span>
          <div style={styles.optionControl}>
            <input
              type="checkbox"
              checked={chartOptions.barOutline}
              onChange={(e) => updateChartOption('barOutline', e.target.checked)}
              style={styles.checkbox}
            />
          </div>
        </div>
        <div style={styles.optionRow}>
          <span style={styles.optionLabel}>Show Values on Bars</span>
          <div style={styles.optionControl}>
            <input
              type="checkbox"
              checked={chartOptions.showValues}
              onChange={(e) => updateChartOption('showValues', e.target.checked)}
              style={styles.checkbox}
            />
          </div>
        </div>

        <p style={styles.subsectionTitle}>Error Bars</p>
        <div style={styles.optionRow}>
          <span style={styles.optionLabel}>Show Error Bars</span>
          <div style={styles.optionControl}>
            <input
              type="checkbox"
              checked={chartOptions.showErrorBars}
              onChange={(e) => updateChartOption('showErrorBars', e.target.checked)}
              style={styles.checkbox}
            />
          </div>
        </div>

        <p style={styles.subsectionTitle}>Significance</p>
        <div style={styles.optionRow}>
          <span style={styles.optionLabel}>Show Significance Markers</span>
          <div style={styles.optionControl}>
            <input
              type="checkbox"
              checked={chartOptions.showSignificance}
              onChange={(e) => updateChartOption('showSignificance', e.target.checked)}
              style={styles.checkbox}
            />
          </div>
        </div>

        <p style={styles.subsectionTitle}>Y-Axis</p>
        <div style={styles.optionRow}>
          <span style={styles.optionLabel}>Y-Axis Min</span>
          <div style={styles.optionControl}>
            <input
              type="number"
              value={chartOptions.yAxisMin ?? ''}
              placeholder="Auto"
              onChange={(e) => {
                const raw = e.target.value.trim();
                updateChartOption('yAxisMin', raw === '' ? null : parseFloat(raw));
              }}
              style={styles.numberInputSmall}
            />
          </div>
        </div>
        <div style={styles.optionRow}>
          <span style={styles.optionLabel}>Y-Axis Max</span>
          <div style={styles.optionControl}>
            <input
              type="number"
              value={chartOptions.yAxisMax ?? ''}
              placeholder="Auto"
              onChange={(e) => {
                const raw = e.target.value.trim();
                updateChartOption('yAxisMax', raw === '' ? null : parseFloat(raw));
              }}
              style={styles.numberInputSmall}
            />
          </div>
        </div>
        <div style={{ ...styles.optionRow, borderBottom: 'none' }}>
          <span style={styles.optionLabel}>Y-Axis Label</span>
          <div style={styles.optionControl}>
            <input
              type="text"
              value={chartOptions.yAxisLabel}
              onChange={(e) => updateChartOption('yAxisLabel', e.target.value)}
              style={styles.textInputWide}
            />
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Configuration</h2>
        <div style={styles.configRow}>
          <button
            style={styles.btnPrimary}
            onClick={onSaveConfig}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            &#128190; Save Config
          </button>
          <button
            style={styles.btnSecondary}
            onClick={handleLoadClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.color = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#475569';
            }}
          >
            &#128194; Load Config
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={styles.hiddenInput}
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </div>
  );
}
