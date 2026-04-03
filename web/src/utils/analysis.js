import { jStat } from 'jstat';

/**
 * Convert absorbance to melanin concentration using standard curve.
 * Conc = (Abs - intercept) / slope
 */
export function absorbanceToConcentration(absorbance, slope, intercept) {
  if (slope === 0) throw new Error('Slope cannot be zero.');
  return (absorbance - intercept) / slope;
}

/**
 * Calculate melanin concentrations for each group across all measurements.
 *
 * For each file, for each group: average the absorbance of assigned wells,
 * then convert to concentration via standard curve.
 *
 * @returns {{ [groupName]: number[] }} concentration per measurement
 */
export function calculateGroupConcentrations(parsedData, conditions, slope, intercept, excludedKeys = null) {
  const result = {};
  for (const cond of conditions) {
    result[cond.name] = [];
  }

  const filenames = Object.keys(parsedData);
  for (const fname of filenames) {
    const fileData = parsedData[fname];
    for (const cond of conditions) {
      const absValues = cond.wells
        .filter((w) => {
          if (!(w in fileData)) return false;
          if (excludedKeys && excludedKeys.has(`${w}:${fname}`)) return false;
          return true;
        })
        .map((w) => fileData[w]);

      if (absValues.length > 0) {
        const meanAbs = absValues.reduce((a, b) => a + b, 0) / absValues.length;
        const conc = absorbanceToConcentration(meanAbs, slope, intercept);
        result[cond.name].push(conc);
      }
    }
  }

  return result;
}

/**
 * Detect outlier wells within each group using the 2-SD method.
 * For each group, across all files, compute the mean and SD of absorbance.
 * Flag any well whose absorbance deviates > threshold * SD from the group mean.
 *
 * @returns {{ [groupName]: { well: string, file: string, value: number, groupMean: number, groupSD: number, zScore: number }[] }}
 */
export function detectOutliers(parsedData, conditions, threshold = 2) {
  const result = {};
  const filenames = Object.keys(parsedData);

  for (const cond of conditions) {
    const tuples = [];
    for (const fname of filenames) {
      const fileData = parsedData[fname];
      for (const well of cond.wells) {
        if (well in fileData) {
          tuples.push({ well, file: fname, value: fileData[well] });
        }
      }
    }

    if (tuples.length < 3) {
      result[cond.name] = [];
      continue;
    }

    const values = tuples.map((t) => t.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sumSqDiff = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
    const sd = Math.sqrt(sumSqDiff / (values.length - 1));

    if (sd === 0) {
      result[cond.name] = [];
      continue;
    }

    result[cond.name] = tuples
      .filter((t) => Math.abs(t.value - mean) > threshold * sd)
      .map((t) => ({
        well: t.well,
        file: t.file,
        value: t.value,
        groupMean: mean,
        groupSD: sd,
        zScore: (t.value - mean) / sd,
      }));
  }

  return result;
}

/**
 * Normalize all concentrations to the mean of the reference group.
 * Each value becomes (value / refMean) * 100.
 */
export function normalizeToReference(concentrations, referenceGroup) {
  const refValues = concentrations[referenceGroup];
  if (!refValues || refValues.length === 0) {
    throw new Error(`Reference group '${referenceGroup}' has no data.`);
  }

  const refMean = refValues.reduce((a, b) => a + b, 0) / refValues.length;
  if (refMean === 0) {
    throw new Error('Reference group mean is zero; cannot normalize.');
  }

  const normalized = {};
  for (const [groupName, values] of Object.entries(concentrations)) {
    normalized[groupName] = values.map((v) => (v / refMean) * 100);
  }

  return normalized;
}

/**
 * Calculate mean and SD for each group.
 * @returns {{ group: string, mean: number, sd: number, n: number }[]}
 */
export function calculateStatistics(normalized) {
  const stats = [];
  for (const [groupName, values] of Object.entries(normalized)) {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    let sd = 0;
    if (n > 1) {
      const sumSqDiff = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
      sd = Math.sqrt(sumSqDiff / (n - 1)); // Bessel's correction
    }
    stats.push({ group: groupName, mean, sd, n });
  }
  return stats;
}

/**
 * Run independent t-tests (Welch's) comparing each group against the comparison group.
 * @returns {{ [groupName]: { tStat: number|null, pValue: number|null, significance: string } }}
 */
export function runTTests(normalized, comparisonGroup) {
  const refValues = normalized[comparisonGroup];
  if (!refValues) {
    throw new Error(`Comparison group '${comparisonGroup}' not found.`);
  }

  const results = {};
  for (const [groupName, values] of Object.entries(normalized)) {
    if (groupName === comparisonGroup) {
      results[groupName] = { tStat: null, pValue: null, significance: '-' };
      continue;
    }

    if (values.length < 2 || refValues.length < 2) {
      results[groupName] = { tStat: null, pValue: null, significance: 'n/a' };
      continue;
    }

    // Welch's t-test
    const n1 = values.length;
    const n2 = refValues.length;
    const mean1 = values.reduce((a, b) => a + b, 0) / n1;
    const mean2 = refValues.reduce((a, b) => a + b, 0) / n2;
    const var1 = values.reduce((acc, v) => acc + (v - mean1) ** 2, 0) / (n1 - 1);
    const var2 = refValues.reduce((acc, v) => acc + (v - mean2) ** 2, 0) / (n2 - 1);

    const se = Math.sqrt(var1 / n1 + var2 / n2);
    if (se === 0) {
      results[groupName] = { tStat: 0, pValue: 1, significance: 'n.s.' };
      continue;
    }

    const tStat = (mean1 - mean2) / se;

    // Welch-Satterthwaite degrees of freedom
    const num = (var1 / n1 + var2 / n2) ** 2;
    const denom =
      (var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1);
    const df = num / denom;

    // Two-tailed p-value using jStat t-distribution
    const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(tStat), df));

    results[groupName] = {
      tStat,
      pValue,
      significance: significanceMarker(pValue),
    };
  }

  return results;
}

/**
 * Calculate concentrations across all plates.
 * For each group name, collects concentration values from all plates that have that group.
 *
 * @param {Array} plates - Array of { files, conditions } objects
 * @param {number} slope
 * @param {number} intercept
 * @param {Set|null} excludedKeys
 * @returns {{ [groupName]: number[] }} aggregated concentration per group
 */
export function calculateMultiPlateConcentrations(plates, slope, intercept, excludedKeys = null) {
  const result = {};
  for (const plate of plates) {
    const plateConcResult = calculateGroupConcentrations(
      plate.files,
      plate.conditions,
      slope,
      intercept,
      excludedKeys
    );
    for (const [groupName, values] of Object.entries(plateConcResult)) {
      if (!result[groupName]) result[groupName] = [];
      result[groupName].push(...values);
    }
  }
  return result;
}

/**
 * Nelder-Mead simplex optimizer for unconstrained minimization.
 * @param {function} objective - Function from number[] to number
 * @param {number[]} x0 - Initial parameter vector
 * @param {object} opts - { maxIter, tol }
 * @returns {number[]} Optimized parameter vector
 */
function nelderMead(objective, x0, { maxIter = 2000, tol = 1e-10 } = {}) {
  const n = x0.length;
  const alpha = 1.0, gamma = 2.0, rho = 0.5, sigma = 0.5;

  // Build initial simplex
  let simplex = [{ x: [...x0], f: objective(x0) }];
  for (let i = 0; i < n; i++) {
    const xi = [...x0];
    xi[i] = xi[i] !== 0 ? xi[i] * 1.05 : 0.00025;
    simplex.push({ x: xi, f: objective(xi) });
  }

  for (let iter = 0; iter < maxIter; iter++) {
    simplex.sort((a, b) => a.f - b.f);

    // Check convergence
    const fRange = Math.abs(simplex[n].f - simplex[0].f);
    if (fRange < tol) break;

    // Centroid of all points except worst
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        centroid[j] += simplex[i].x[j];
      }
    }
    for (let j = 0; j < n; j++) centroid[j] /= n;

    const worst = simplex[n];

    // Reflection
    const xr = centroid.map((c, j) => c + alpha * (c - worst.x[j]));
    const fr = objective(xr);

    if (fr < simplex[0].f) {
      // Expansion
      const xe = centroid.map((c, j) => c + gamma * (xr[j] - c));
      const fe = objective(xe);
      simplex[n] = fe < fr ? { x: xe, f: fe } : { x: xr, f: fr };
    } else if (fr < simplex[n - 1].f) {
      simplex[n] = { x: xr, f: fr };
    } else {
      // Contraction
      const xc = centroid.map((c, j) => c + rho * (worst.x[j] - c));
      const fc = objective(xc);
      if (fc < worst.f) {
        simplex[n] = { x: xc, f: fc };
      } else {
        // Shrink
        const best = simplex[0];
        for (let i = 1; i <= n; i++) {
          simplex[i].x = simplex[i].x.map((v, j) => best.x[j] + sigma * (v - best.x[j]));
          simplex[i].f = objective(simplex[i].x);
        }
      }
    }
  }

  simplex.sort((a, b) => a.f - b.f);
  return simplex[0].x;
}

/**
 * 4-Parameter Logistic (4PL) model:
 * y = D + (A - D) / (1 + (x / C)^B)
 *
 * A = minimum asymptote (bottom)
 * B = Hill slope (steepness)
 * C = EC50/IC50 (inflection point)
 * D = maximum asymptote (top)
 */
export function fourPL(x, params) {
  const { A, B, C, D } = params;
  if (C <= 0 || x <= 0) return D;
  return D + (A - D) / (1 + Math.pow(x / C, B));
}

/**
 * Fit 4PL model to dose-response data using Nelder-Mead optimization.
 *
 * @param {number[]} doses - Array of dose concentrations (must be > 0)
 * @param {number[]} responses - Array of response values (normalized %)
 * @returns {{ params: { A, B, C, D }, ec50: number, r2: number, fitted: { x: number[], y: number[] } } | null}
 */
export function fit4PL(doses, responses) {
  if (doses.length < 3 || doses.length !== responses.length) return null;

  // Filter out non-positive doses
  const paired = doses.map((d, i) => ({ d, r: responses[i] })).filter((p) => p.d > 0);
  if (paired.length < 3) return null;

  const ds = paired.map((p) => p.d);
  const rs = paired.map((p) => p.r);

  // Sort by dose for initial estimates
  const sorted = [...paired].sort((a, b) => a.d - b.d);
  const lowResponses = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 3))).map((p) => p.r);
  const highResponses = sorted.slice(-Math.max(1, Math.floor(sorted.length / 3))).map((p) => p.r);
  const lowMean = lowResponses.reduce((a, b) => a + b, 0) / lowResponses.length;
  const highMean = highResponses.reduce((a, b) => a + b, 0) / highResponses.length;

  // Initial estimates
  const initA = lowMean;
  const initD = highMean;
  const logDoses = ds.map((d) => Math.log(d));
  const initLogC = logDoses.reduce((a, b) => a + b, 0) / logDoses.length;
  const initB = initD > initA ? 1 : -1;

  // Objective: sum of squared residuals. Params = [A, B, logC, D]
  // We optimize logC instead of C to ensure C stays positive.
  const objective = (p) => {
    const params = { A: p[0], B: p[1], C: Math.exp(p[2]), D: p[3] };
    let sse = 0;
    for (let i = 0; i < ds.length; i++) {
      const predicted = fourPL(ds[i], params);
      sse += (rs[i] - predicted) ** 2;
    }
    // Penalty for extreme parameters
    if (Math.abs(p[1]) > 20) sse += (Math.abs(p[1]) - 20) ** 2 * 1000;
    return sse;
  };

  const x0 = [initA, initB, initLogC, initD];
  const optimized = nelderMead(objective, x0);

  const params = {
    A: optimized[0],
    B: optimized[1],
    C: Math.exp(optimized[2]),
    D: optimized[3],
  };

  // Calculate R-squared
  const meanResponse = rs.reduce((a, b) => a + b, 0) / rs.length;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < ds.length; i++) {
    const predicted = fourPL(ds[i], params);
    ssRes += (rs[i] - predicted) ** 2;
    ssTot += (rs[i] - meanResponse) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Generate smooth fitted curve (100 log-spaced points)
  const minDose = Math.min(...ds);
  const maxDose = Math.max(...ds);
  const logMin = Math.log10(minDose) - 0.3;
  const logMax = Math.log10(maxDose) + 0.3;
  const curveX = [];
  const curveY = [];
  for (let i = 0; i < 100; i++) {
    const logX = logMin + (logMax - logMin) * (i / 99);
    const xVal = Math.pow(10, logX);
    curveX.push(xVal);
    curveY.push(fourPL(xVal, params));
  }

  return {
    params,
    ec50: params.C,
    r2,
    fitted: { x: curveX, y: curveY },
  };
}

function significanceMarker(p) {
  if (p < 0.001) return '***';
  if (p < 0.01) return '**';
  if (p < 0.05) return '*';
  return 'n.s.';
}
