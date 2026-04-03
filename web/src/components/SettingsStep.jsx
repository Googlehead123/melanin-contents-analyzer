import React, { useCallback, useRef } from 'react';
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
};

export default function SettingsStep({
  slope,
  setSlope,
  intercept,
  setIntercept,
  conditions,
  normRefIdx,
  setNormRefIdx,
  controlConditionIdx,
  setControlConditionIdx,
  chartTheme,
  setChartTheme,
  onLoadConfig,
  onSaveConfig,
}) {
  const fileInputRef = useRef(null);

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
      setNormRefIdx(parseInt(e.target.value, 10));
    },
    [setNormRefIdx]
  );

  const handleControlChange = useCallback(
    (e) => {
      setControlConditionIdx(parseInt(e.target.value, 10));
    },
    [setControlConditionIdx]
  );

  const handleThemeSelect = useCallback(
    (key) => {
      setChartTheme(key);
    },
    [setChartTheme]
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
              value={normRefIdx}
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
              value={controlConditionIdx}
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
