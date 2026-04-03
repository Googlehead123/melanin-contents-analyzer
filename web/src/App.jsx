import React, { useState, useMemo, useCallback } from 'react';
import { DEFAULT_SLOPE, DEFAULT_INTERCEPT } from './utils/constants';
import { getAllWells } from './utils/parser';
import { exportConfigJSON } from './utils/export';
import UploadStep from './components/UploadStep';
import PlateMapStep from './components/PlateMapStep';
import SettingsStep from './components/SettingsStep';
import ResultsStep from './components/ResultsStep';

const STEPS = [
  { label: 'Upload', icon: '\u2B06' },
  { label: 'Plate Map', icon: '\uD83D\uDDFA' },
  { label: 'Settings', icon: '\u2699' },
  { label: 'Results', icon: '\uD83D\uDCCA' },
];

function createPlate(id, name) {
  return {
    id,
    name,
    files: {},
    conditions: [],
  };
}

const styles = {
  appShell: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 24px 48px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '32px',
  },
  headerIcon: {
    fontSize: '28px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  stepperBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '32px',
    padding: '0 16px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  stepItemDisabled: {
    cursor: 'default',
    opacity: 0.5,
  },
  stepCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
    transition: 'background-color 0.2s, color 0.2s',
  },
  stepCircleActive: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  },
  stepCircleCompleted: {
    backgroundColor: '#22c55e',
    color: '#ffffff',
  },
  stepCircleUpcoming: {
    backgroundColor: '#e2e8f0',
    color: '#94a3b8',
  },
  stepLabel: {
    fontSize: '14px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  stepLabelActive: {
    color: '#3b82f6',
  },
  stepLabelCompleted: {
    color: '#22c55e',
  },
  stepLabelUpcoming: {
    color: '#94a3b8',
  },
  stepConnector: {
    flex: 1,
    height: '2px',
    margin: '0 12px',
    minWidth: '24px',
  },
  stepConnectorCompleted: {
    backgroundColor: '#22c55e',
  },
  stepConnectorUpcoming: {
    backgroundColor: '#e2e8f0',
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    padding: '32px',
    minHeight: '400px',
  },
  navBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '24px',
    padding: '0 4px',
  },
  btnBack: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  },
  btnNext: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 24px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s, opacity 0.15s',
  },
  btnNextDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  btnHidden: {
    visibility: 'hidden',
  },
  // Plate selector tab bar
  plateBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  plateTab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  },
  plateTabActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 600,
  },
  plateTabFileCount: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    borderRadius: '10px',
    padding: '1px 6px',
    minWidth: '16px',
    textAlign: 'center',
  },
  plateTabFileCountActive: {
    backgroundColor: '#bfdbfe',
    color: '#1d4ed8',
  },
  plateTabRemove: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1,
    padding: '0 0 0 2px',
    display: 'inline-flex',
    alignItems: 'center',
  },
  plateAddBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '1px dashed #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
    flexShrink: 0,
  },
};

export default function App() {
  const [step, setStep] = useState(0);
  const [plates, setPlates] = useState([createPlate(Date.now(), 'Plate 1')]);
  const [activePlateIdx, setActivePlateIdx] = useState(0);
  const [activeConditionIdx, setActiveConditionIdx] = useState(0);
  const [controlConditionIdx, setControlConditionIdx] = useState(0);
  const [normRefIdx, setNormRefIdx] = useState(0);
  const [slope, setSlope] = useState(DEFAULT_SLOPE);
  const [intercept, setIntercept] = useState(DEFAULT_INTERCEPT);
  const [chartTheme, setChartTheme] = useState('white');
  const [excludedWells, setExcludedWells] = useState(new Set());
  const [doseResponseEnabled, setDoseResponseEnabled] = useState(false);
  const [chartOptions, setChartOptions] = useState({
    fontSize: 12,
    titleFontSize: 16,
    barWidth: 0.6,
    showValues: true,
    showErrorBars: true,
    showSignificance: true,
    yAxisMin: null,
    yAxisMax: null,
    yAxisLabel: 'Melanin Content (% of Reference)',
    xAxisLabel: 'Treatment Group',
    chartTitle: '',
    barOutline: true,
    barColors: {},  // { groupName: '#hex' } — overrides BAR_COLORS defaults
  });

  // Active plate derived state
  const activePlate = plates[activePlateIdx] || plates[0];
  const activePlateFiles = activePlate?.files || {};
  const activePlateConditions = activePlate?.conditions || [];

  const detectedWells = useMemo(() => getAllWells(activePlateFiles), [activePlateFiles]);

  // Collect all unique conditions across plates for SettingsStep
  const allConditions = useMemo(() => {
    const seen = new Set();
    const result = [];
    for (const plate of plates) {
      for (const cond of plate.conditions) {
        if (!seen.has(cond.name)) {
          seen.add(cond.name);
          result.push(cond);
        }
      }
    }
    return result;
  }, [plates]);

  // --- Plate management ---
  const handleAddPlate = useCallback(() => {
    const newPlate = createPlate(Date.now(), `Plate ${plates.length + 1}`);
    setPlates((prev) => [...prev, newPlate]);
    setActivePlateIdx(plates.length);
    setActiveConditionIdx(0);
  }, [plates.length]);

  const handleRemovePlate = useCallback(
    (idx) => {
      const plate = plates[idx];
      const hasData = Object.keys(plate.files).length > 0 || plate.conditions.length > 0;
      if (hasData && !window.confirm(`Remove "${plate.name}"? This plate has data that will be lost.`)) {
        return;
      }
      if (plates.length <= 1) return; // Keep at least one plate
      setPlates((prev) => prev.filter((_, i) => i !== idx));
      if (activePlateIdx >= idx && activePlateIdx > 0) {
        setActivePlateIdx((prev) => prev - 1);
      }
      setActiveConditionIdx(0);
    },
    [plates, activePlateIdx]
  );

  const handleRenamePlate = useCallback(
    (idx, newName) => {
      setPlates((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, name: newName } : p))
      );
    },
    []
  );

  const handleSelectPlate = useCallback(
    (idx) => {
      setActivePlateIdx(idx);
      setActiveConditionIdx(0);
    },
    []
  );

  // --- Active plate file/condition updates ---
  const handleFilesChange = useCallback(
    (newFiles) => {
      setPlates((prev) =>
        prev.map((p, i) => (i === activePlateIdx ? { ...p, files: newFiles } : p))
      );
    },
    [activePlateIdx]
  );

  const setActivePlateConditions = useCallback(
    (conditionsOrUpdater) => {
      setPlates((prev) =>
        prev.map((p, i) => {
          if (i !== activePlateIdx) return p;
          const newConditions =
            typeof conditionsOrUpdater === 'function'
              ? conditionsOrUpdater(p.conditions)
              : conditionsOrUpdater;
          return { ...p, conditions: newConditions };
        })
      );
    },
    [activePlateIdx]
  );

  // --- Config load/save ---
  const handleLoadConfig = useCallback((config) => {
    // Multi-plate config
    if (Array.isArray(config.plates) && config.plates.length > 0) {
      setPlates(
        config.plates.map((p, pi) => ({
          id: p.id || Date.now() + pi,
          name: p.name || `Plate ${pi + 1}`,
          files: {}, // Files are not saved in config
          conditions: Array.isArray(p.conditions)
            ? p.conditions.map((c, ci) => ({
                id: c.id || Date.now() + pi * 100 + ci,
                name: c.name || `Group ${ci + 1}`,
                color: c.color || '#3b82f6',
                wells: Array.isArray(c.wells) ? c.wells : [],
                dose: typeof c.dose === 'number' ? c.dose : null,
              }))
            : [],
        }))
      );
      setActivePlateIdx(0);
    } else if (Array.isArray(config.conditions)) {
      // Backwards compatibility: single-plate config
      setPlates([
        {
          id: Date.now(),
          name: 'Plate 1',
          files: {},
          conditions: config.conditions.map((c, i) => ({
            id: c.id || Date.now() + i,
            name: c.name || `Group ${i + 1}`,
            color: c.color || '#3b82f6',
            wells: Array.isArray(c.wells) ? c.wells : [],
            dose: typeof c.dose === 'number' ? c.dose : null,
          })),
        },
      ]);
      setActivePlateIdx(0);
    }
    if (config.standardCurve) {
      if (typeof config.standardCurve.slope === 'number') setSlope(config.standardCurve.slope);
      if (typeof config.standardCurve.intercept === 'number') setIntercept(config.standardCurve.intercept);
    }
    if (typeof config.normalizationReference === 'number') setNormRefIdx(config.normalizationReference);
    if (typeof config.controlGroup === 'number') setControlConditionIdx(config.controlGroup);
    if (typeof config.doseResponseEnabled === 'boolean') setDoseResponseEnabled(config.doseResponseEnabled);
    if (config.chartTheme) setChartTheme(config.chartTheme);
    if (config.chartOptions) setChartOptions((prev) => ({ ...prev, ...config.chartOptions }));
  }, []);

  const handleSaveConfig = useCallback(() => {
    exportConfigJSON(plates, slope, intercept, normRefIdx, controlConditionIdx, chartTheme, chartOptions);
  }, [plates, slope, intercept, normRefIdx, controlConditionIdx, chartTheme, chartOptions]);

  // --- Wizard step prerequisites ---
  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        // At least one plate with at least 1 file
        return plates.some((p) => Object.keys(p.files).length >= 1);
      case 1:
        // At least one plate with at least 2 conditions with wells
        return plates.some(
          (p) => p.conditions.filter((c) => c.wells.length > 0).length >= 2
        );
      case 2:
        return slope !== 0;
      default:
        return false;
    }
  }, [step, plates, slope]);

  const handleStepClick = useCallback(
    (targetStep) => {
      if (targetStep <= step) {
        setStep(targetStep);
      }
    },
    [step]
  );

  const handleBack = useCallback(() => {
    setStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (canAdvance) {
      setStep((prev) => Math.min(STEPS.length - 1, prev + 1));
    }
  }, [canAdvance]);

  // Show plate selector on Upload (step 0) and Plate Map (step 1) steps
  const showPlateSelector = step === 0 || step === 1;

  function renderPlateSelector() {
    return (
      <div style={styles.plateBar}>
        {plates.map((plate, idx) => {
          const isActive = idx === activePlateIdx;
          const fileCount = Object.keys(plate.files).length;
          return (
            <div
              key={plate.id}
              style={{
                ...styles.plateTab,
                ...(isActive ? styles.plateTabActive : {}),
              }}
              onClick={() => handleSelectPlate(idx)}
              role="button"
              tabIndex={0}
              aria-label={`${plate.name} (${fileCount} files)${isActive ? ' - active' : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectPlate(idx);
                }
              }}
            >
              <span
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onBlur={(e) => {
                  const newName = e.currentTarget.textContent.trim();
                  if (newName && newName !== plate.name) {
                    handleRenamePlate(idx, newName);
                  } else {
                    e.currentTarget.textContent = plate.name;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ outline: 'none', minWidth: '24px' }}
              >
                {plate.name}
              </span>
              <span
                style={{
                  ...styles.plateTabFileCount,
                  ...(isActive ? styles.plateTabFileCountActive : {}),
                }}
              >
                {fileCount}
              </span>
              {plates.length > 1 && (
                <button
                  style={styles.plateTabRemove}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemovePlate(idx);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                  title={`Remove ${plate.name}`}
                  aria-label={`Remove ${plate.name}`}
                >
                  &#x2715;
                </button>
              )}
            </div>
          );
        })}
        <button
          style={styles.plateAddBtn}
          onClick={handleAddPlate}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.color = '#3b82f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.color = '#64748b';
          }}
          title="Add plate"
          aria-label="Add plate"
        >
          +
        </button>
      </div>
    );
  }

  function renderStepContent() {
    switch (step) {
      case 0:
        return (
          <UploadStep
            files={activePlateFiles}
            onFilesChange={handleFilesChange}
            detectedWells={detectedWells}
          />
        );
      case 1:
        return (
          <PlateMapStep
            parsedData={activePlateFiles}
            detectedWells={detectedWells}
            conditions={activePlateConditions}
            setConditions={setActivePlateConditions}
            activeConditionIdx={activeConditionIdx}
            setActiveConditionIdx={setActiveConditionIdx}
            controlConditionIdx={controlConditionIdx}
            setControlConditionIdx={setControlConditionIdx}
            normRefIdx={normRefIdx}
            setNormRefIdx={setNormRefIdx}
          />
        );
      case 2:
        return (
          <SettingsStep
            conditions={allConditions}
            setConditions={setActivePlateConditions}
            slope={slope}
            setSlope={setSlope}
            intercept={intercept}
            setIntercept={setIntercept}
            controlConditionIdx={controlConditionIdx}
            setControlConditionIdx={setControlConditionIdx}
            normRefIdx={normRefIdx}
            setNormRefIdx={setNormRefIdx}
            chartTheme={chartTheme}
            setChartTheme={setChartTheme}
            chartOptions={chartOptions}
            setChartOptions={setChartOptions}
            doseResponseEnabled={doseResponseEnabled}
            setDoseResponseEnabled={setDoseResponseEnabled}
            onLoadConfig={handleLoadConfig}
            onSaveConfig={handleSaveConfig}
          />
        );
      case 3:
        return (
          <ResultsStep
            plates={plates}
            slope={slope}
            intercept={intercept}
            controlConditionIdx={controlConditionIdx}
            normRefIdx={normRefIdx}
            chartTheme={chartTheme}
            chartOptions={chartOptions}
            excludedWells={excludedWells}
            setExcludedWells={setExcludedWells}
            doseResponseEnabled={doseResponseEnabled}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div style={styles.appShell}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerIcon} role="img" aria-label="beaker">
            &#x1F9EA;
          </span>
          <h1 style={styles.headerTitle}>Melanin Contents Analyzer</h1>
        </div>

        {/* Stepper */}
        <div style={styles.stepperBar}>
          {STEPS.map((s, i) => {
            const isCompleted = i < step;
            const isActive = i === step;
            const isClickable = i <= step;

            const circleStyle = {
              ...styles.stepCircle,
              ...(isCompleted
                ? styles.stepCircleCompleted
                : isActive
                ? styles.stepCircleActive
                : styles.stepCircleUpcoming),
            };

            const labelStyle = {
              ...styles.stepLabel,
              ...(isCompleted
                ? styles.stepLabelCompleted
                : isActive
                ? styles.stepLabelActive
                : styles.stepLabelUpcoming),
            };

            const itemStyle = {
              ...styles.stepItem,
              ...(!isClickable ? styles.stepItemDisabled : {}),
            };

            return (
              <React.Fragment key={i}>
                <div
                  style={itemStyle}
                  onClick={() => handleStepClick(i)}
                  role="button"
                  tabIndex={isClickable ? 0 : -1}
                  aria-label={`Step ${i + 1}: ${s.label}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}`}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && isClickable) {
                      e.preventDefault();
                      handleStepClick(i);
                    }
                  }}
                >
                  <div style={circleStyle}>
                    {isCompleted ? '\u2713' : i + 1}
                  </div>
                  <span style={labelStyle}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      ...styles.stepConnector,
                      ...(i < step
                        ? styles.stepConnectorCompleted
                        : styles.stepConnectorUpcoming),
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Plate Selector (between stepper and content) */}
        {showPlateSelector && renderPlateSelector()}

        {/* Content */}
        <div style={styles.contentCard}>{renderStepContent()}</div>

        {/* Navigation */}
        <div style={styles.navBar}>
          <button
            style={{
              ...styles.btnBack,
              ...(step === 0 ? styles.btnHidden : {}),
            }}
            onClick={handleBack}
            aria-label="Go to previous step"
          >
            &#8592; Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              style={{
                ...styles.btnNext,
                ...(!canAdvance ? styles.btnNextDisabled : {}),
              }}
              onClick={handleNext}
              disabled={!canAdvance}
              aria-label="Go to next step"
            >
              Next &#8594;
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
