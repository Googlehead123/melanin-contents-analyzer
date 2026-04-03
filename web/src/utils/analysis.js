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
export function calculateGroupConcentrations(parsedData, conditions, slope, intercept) {
  const result = {};
  for (const cond of conditions) {
    result[cond.name] = [];
  }

  const files = Object.values(parsedData);
  for (const fileData of files) {
    for (const cond of conditions) {
      const absValues = cond.wells
        .filter((w) => w in fileData)
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

function significanceMarker(p) {
  if (p < 0.001) return '***';
  if (p < 0.01) return '**';
  if (p < 0.05) return '*';
  return 'n.s.';
}
