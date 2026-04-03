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
};

export default function App() {
  const [step, setStep] = useState(0);
  const [parsedData, setParsedData] = useState({});
  const [conditions, setConditions] = useState([]);
  const [activeConditionIdx, setActiveConditionIdx] = useState(0);
  const [controlConditionIdx, setControlConditionIdx] = useState(0);
  const [normRefIdx, setNormRefIdx] = useState(0);
  const [slope, setSlope] = useState(DEFAULT_SLOPE);
  const [intercept, setIntercept] = useState(DEFAULT_INTERCEPT);
  const [chartTheme, setChartTheme] = useState('white');

  const detectedWells = useMemo(() => getAllWells(parsedData), [parsedData]);

  const handleFilesProcessed = useCallback((newParsedData) => {
    setParsedData(newParsedData);
  }, []);

  const handleLoadConfig = useCallback((config) => {
    if (config.conditions) setConditions(config.conditions);
    if (config.standardCurve) {
      setSlope(config.standardCurve.slope);
      setIntercept(config.standardCurve.intercept);
    }
    if (config.normalizationReference != null) setNormRefIdx(config.normalizationReference);
    if (config.controlGroup != null) setControlConditionIdx(config.controlGroup);
    if (config.chartTheme) setChartTheme(config.chartTheme);
  }, []);

  const handleSaveConfig = useCallback(() => {
    exportConfigJSON(conditions, slope, intercept, normRefIdx, controlConditionIdx, chartTheme);
  }, [conditions, slope, intercept, normRefIdx, controlConditionIdx, chartTheme]);

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return Object.keys(parsedData).length >= 1;
      case 1:
        return conditions.filter((c) => c.wells.length > 0).length >= 2;
      case 2:
        return slope !== 0;
      default:
        return false;
    }
  }, [step, parsedData, conditions, slope]);

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

  function renderStepContent() {
    switch (step) {
      case 0:
        return (
          <UploadStep
            parsedData={parsedData}
            onFilesProcessed={handleFilesProcessed}
            detectedWells={detectedWells}
          />
        );
      case 1:
        return (
          <PlateMapStep
            detectedWells={detectedWells}
            conditions={conditions}
            setConditions={setConditions}
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
            conditions={conditions}
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
            onLoadConfig={handleLoadConfig}
            onSaveConfig={handleSaveConfig}
          />
        );
      case 3:
        return (
          <ResultsStep
            parsedData={parsedData}
            conditions={conditions}
            slope={slope}
            intercept={intercept}
            controlConditionIdx={controlConditionIdx}
            normRefIdx={normRefIdx}
            chartTheme={chartTheme}
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
