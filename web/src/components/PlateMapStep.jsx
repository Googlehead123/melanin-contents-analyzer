import { useState, useCallback, useMemo, useRef } from 'react';
import { PLATE_ROWS, PLATE_COLS, GROUP_COLORS } from '../utils/constants';

function wellId(row, col) {
  return `${row}${String(col).padStart(2, '0')}`;
}

function getDragRect(start, end) {
  if (!start || !end) return null;
  return {
    minRow: Math.min(start.row, end.row),
    maxRow: Math.max(start.row, end.row),
    minCol: Math.min(start.col, end.col),
    maxCol: Math.max(start.col, end.col),
  };
}

export default function PlateMapStep({
  detectedWells,
  conditions,
  setConditions,
  activeConditionIdx,
  setActiveConditionIdx,
  controlConditionIdx,
  setControlConditionIdx,
  normRefIdx,
  setNormRefIdx,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const gridRef = useRef(null);

  const detectedSet = useMemo(() => new Set(detectedWells), [detectedWells]);

  const wellToCondition = useMemo(() => {
    const map = {};
    conditions.forEach((cond, idx) => {
      cond.wells.forEach((w) => {
        map[w] = idx;
      });
    });
    return map;
  }, [conditions]);

  const dragRect = useMemo(() => getDragRect(dragStart, dragEnd), [dragStart, dragEnd]);

  const dragPreviewWells = useMemo(() => {
    if (!dragRect) return new Set();
    const wells = new Set();
    for (let ri = dragRect.minRow; ri <= dragRect.maxRow; ri++) {
      for (let ci = dragRect.minCol; ci <= dragRect.maxCol; ci++) {
        const wid = wellId(PLATE_ROWS[ri], PLATE_COLS[ci]);
        if (detectedSet.has(wid)) {
          wells.add(wid);
        }
      }
    }
    return wells;
  }, [dragRect, detectedSet]);

  const assignWellsToActive = useCallback(
    (wellIds) => {
      if (activeConditionIdx === null || activeConditionIdx === undefined) return;
      if (activeConditionIdx < 0 || activeConditionIdx >= conditions.length) return;

      const toAssign = new Set(wellIds);
      const updated = conditions.map((cond, idx) => {
        if (idx === activeConditionIdx) {
          const existing = new Set(cond.wells);
          toAssign.forEach((w) => existing.add(w));
          return { ...cond, wells: Array.from(existing) };
        }
        return {
          ...cond,
          wells: cond.wells.filter((w) => !toAssign.has(w)),
        };
      });
      setConditions(updated);
    },
    [conditions, activeConditionIdx, setConditions],
  );

  const handleWellClick = useCallback(
    (wid) => {
      if (!detectedSet.has(wid)) return;
      if (activeConditionIdx === null || activeConditionIdx === undefined) return;
      if (activeConditionIdx < 0 || activeConditionIdx >= conditions.length) return;

      const currentOwner = wellToCondition[wid];
      if (currentOwner === activeConditionIdx) {
        const updated = conditions.map((cond, idx) => {
          if (idx === activeConditionIdx) {
            return { ...cond, wells: cond.wells.filter((w) => w !== wid) };
          }
          return cond;
        });
        setConditions(updated);
      } else {
        assignWellsToActive([wid]);
      }
    },
    [detectedSet, activeConditionIdx, conditions, wellToCondition, setConditions, assignWellsToActive],
  );

  const handleMouseDown = useCallback(
    (ri, ci) => {
      setIsDragging(true);
      setDragStart({ row: ri, col: ci });
      setDragEnd({ row: ri, col: ci });
    },
    [],
  );

  const handleMouseMove = useCallback(
    (ri, ci) => {
      if (!isDragging) return;
      setDragEnd({ row: ri, col: ci });
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragPreviewWells.size > 0) {
      assignWellsToActive(Array.from(dragPreviewWells));
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragPreviewWells, assignWellsToActive]);

  const handleAddGroup = useCallback(() => {
    const nextColorIdx = conditions.length % GROUP_COLORS.length;
    const newCondition = {
      id: Date.now(),
      name: `Group ${conditions.length + 1}`,
      color: GROUP_COLORS[nextColorIdx],
      wells: [],
    };
    setConditions([...conditions, newCondition]);
    setActiveConditionIdx(conditions.length);
  }, [conditions, setConditions, setActiveConditionIdx]);

  const handleDeleteGroup = useCallback(
    (idx) => {
      const updated = conditions.filter((_, i) => i !== idx);
      setConditions(updated);

      if (activeConditionIdx === idx) {
        setActiveConditionIdx(updated.length > 0 ? 0 : null);
      } else if (activeConditionIdx > idx) {
        setActiveConditionIdx(activeConditionIdx - 1);
      }

      if (controlConditionIdx === idx) {
        setControlConditionIdx(null);
      } else if (controlConditionIdx > idx) {
        setControlConditionIdx(controlConditionIdx - 1);
      }

      if (normRefIdx === idx) {
        setNormRefIdx(null);
      } else if (normRefIdx > idx) {
        setNormRefIdx(normRefIdx - 1);
      }
    },
    [
      conditions,
      setConditions,
      activeConditionIdx,
      setActiveConditionIdx,
      controlConditionIdx,
      setControlConditionIdx,
      normRefIdx,
      setNormRefIdx,
    ],
  );

  const handleNameChange = useCallback(
    (idx, name) => {
      const updated = conditions.map((cond, i) => (i === idx ? { ...cond, name } : cond));
      setConditions(updated);
    },
    [conditions, setConditions],
  );

  const handleRowAssign = useCallback(
    (row) => {
      const wells = PLATE_COLS.map((col) => wellId(row, col)).filter((wid) => detectedSet.has(wid));
      if (wells.length > 0) {
        assignWellsToActive(wells);
      }
    },
    [detectedSet, assignWellsToActive],
  );

  const handleClearAll = useCallback(() => {
    const updated = conditions.map((cond) => ({ ...cond, wells: [] }));
    setConditions(updated);
  }, [conditions, setConditions]);

  const detectedRows = useMemo(() => {
    const rows = new Set();
    detectedWells.forEach((wid) => rows.add(wid[0]));
    return PLATE_ROWS.filter((r) => rows.has(r));
  }, [detectedWells]);

  const activeGroup = activeConditionIdx !== null && activeConditionIdx >= 0 && activeConditionIdx < conditions.length
    ? conditions[activeConditionIdx]
    : null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 24,
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      {/* Left Panel — Group Management */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <button
          onClick={handleAddGroup}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          + Add Group
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {conditions.map((cond, idx) => (
            <div
              key={cond.id}
              onClick={() => setActiveConditionIdx(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                backgroundColor: '#ffffff',
                borderRadius: 8,
                border: idx === activeConditionIdx ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                borderLeft: idx === activeConditionIdx ? '3px solid #3b82f6' : '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: cond.color,
                  flexShrink: 0,
                }}
              />
              <input
                type="text"
                value={cond.name}
                onChange={(e) => handleNameChange(idx, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#1e293b',
                  backgroundColor: 'transparent',
                  minWidth: 0,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {cond.wells.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGroup(idx);
                }}
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  borderRadius: 4,
                  fontSize: 16,
                  lineHeight: 1,
                  flexShrink: 0,
                  padding: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {conditions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#64748b',
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Control Group (t-test)
              </label>
              <select
                value={controlConditionIdx ?? ''}
                onChange={(e) => setControlConditionIdx(e.target.value === '' ? null : Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  fontSize: 14,
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">-- Select --</option>
                {conditions.map((cond, idx) => (
                  <option key={cond.id} value={idx}>
                    {cond.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#64748b',
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Normalization Reference (100%)
              </label>
              <select
                value={normRefIdx ?? ''}
                onChange={(e) => setNormRefIdx(e.target.value === '' ? null : Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  fontSize: 14,
                  color: '#1e293b',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">-- Select --</option>
                {conditions.map((cond, idx) => (
                  <option key={cond.id} value={idx}>
                    {cond.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel — 96-well Plate Grid */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Quick-assign buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginRight: 4 }}>
            Quick assign:
          </span>
          {detectedRows.map((row) => (
            <button
              key={row}
              onClick={() => handleRowAssign(row)}
              disabled={!activeGroup}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontSize: 12,
                fontWeight: 600,
                cursor: activeGroup ? 'pointer' : 'default',
                opacity: activeGroup ? 1 : 0.5,
              }}
            >
              {row}
            </button>
          ))}
          <button
            onClick={handleClearAll}
            style={{
              padding: '4px 12px',
              height: 28,
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              backgroundColor: '#ffffff',
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: 8,
            }}
          >
            Clear All
          </button>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isDragging) handleMouseUp();
          }}
          style={{ display: 'inline-block' }}
        >
          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '28px repeat(12, 36px)',
              gap: 4,
              marginBottom: 4,
            }}
          >
            <div />
            {PLATE_COLS.map((col) => (
              <div
                key={col}
                style={{
                  textAlign: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#94a3b8',
                }}
              >
                {col}
              </div>
            ))}
          </div>

          {/* Rows */}
          {PLATE_ROWS.map((row, ri) => (
            <div
              key={row}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px repeat(12, 36px)',
                gap: 4,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#94a3b8',
                }}
              >
                {row}
              </div>
              {PLATE_COLS.map((col, ci) => {
                const wid = wellId(row, col);
                const detected = detectedSet.has(wid);
                const ownerIdx = wellToCondition[wid];
                const assigned = ownerIdx !== undefined;
                const inDragPreview = isDragging && dragPreviewWells.has(wid);
                const ownerColor = assigned ? conditions[ownerIdx].color : null;

                let bgColor = '#e2e8f0';
                let borderColor = '#e2e8f0';
                let opacity = 0.5;
                let cursor = 'default';

                if (detected) {
                  opacity = 1;
                  cursor = isDragging ? 'crosshair' : 'pointer';
                  if (assigned) {
                    bgColor = ownerColor;
                    borderColor = ownerColor;
                  } else {
                    bgColor = '#ffffff';
                    borderColor = '#cbd5e1';
                  }
                }

                const boxShadow = inDragPreview
                  ? '0 0 0 2px rgba(59, 130, 246, 0.5), 0 0 8px rgba(59, 130, 246, 0.3)'
                  : 'none';

                return (
                  <div
                    key={wid}
                    onMouseDown={(e) => {
                      if (!detected) return;
                      e.preventDefault();
                      handleMouseDown(ri, ci);
                    }}
                    onMouseMove={() => {
                      if (!detected && !isDragging) return;
                      handleMouseMove(ri, ci);
                    }}
                    onClick={(e) => {
                      if (isDragging) return;
                      e.stopPropagation();
                      handleWellClick(wid);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: bgColor,
                      border: `2px solid ${borderColor}`,
                      opacity,
                      cursor,
                      boxShadow,
                      transition: 'box-shadow 0.1s, background-color 0.1s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      color: assigned ? '#ffffff' : '#94a3b8',
                      fontWeight: 500,
                    }}
                  >
                    {detected ? wid : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {!activeGroup && conditions.length === 0 && (
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 16 }}>
            Add a group to start assigning wells.
          </p>
        )}
        {!activeGroup && conditions.length > 0 && (
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 16 }}>
            Select a group to start assigning wells.
          </p>
        )}
      </div>
    </div>
  );
}
