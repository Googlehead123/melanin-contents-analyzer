"""Melanin content analysis: concentration, normalization, statistics, t-tests."""

import numpy as np
import pandas as pd
from scipy import stats


def absorbance_to_concentration(
    absorbance: float, slope: float, intercept: float
) -> float:
    """Convert absorbance to melanin concentration using standard curve.

    Standard curve: Abs = slope * Conc + intercept
    Therefore:      Conc = (Abs - intercept) / slope
    """
    if slope == 0:
        raise ValueError("Slope cannot be zero.")
    return (absorbance - intercept) / slope


def calculate_group_concentrations(
    parsed_data: dict[str, dict[str, float]],
    groups: dict[str, list[str]],
    slope: float,
    intercept: float,
) -> dict[str, list[float]]:
    """Calculate melanin concentrations for each group across all measurements.

    For each measurement file, for each group, averages the absorbance of
    all wells assigned to that group, then converts to concentration.
    Returns {group_name: [concentration_per_measurement]}.
    """
    result: dict[str, list[float]] = {name: [] for name in groups}

    for file_data in parsed_data.values():
        for group_name, wells in groups.items():
            abs_values = [file_data[w] for w in wells if w in file_data]
            if abs_values:
                mean_abs = np.mean(abs_values)
                conc = absorbance_to_concentration(mean_abs, slope, intercept)
                result[group_name].append(conc)

    return result


def normalize_to_reference(
    concentrations: dict[str, list[float]],
    reference_group: str,
) -> dict[str, list[float]]:
    """Normalize all concentrations to the mean of the reference group.

    Each individual value becomes (value / reference_mean) * 100.
    """
    if reference_group not in concentrations:
        raise ValueError(f"Reference group '{reference_group}' not found.")

    ref_values = concentrations[reference_group]
    if not ref_values:
        raise ValueError(f"Reference group '{reference_group}' has no data.")

    ref_mean = np.mean(ref_values)
    if ref_mean == 0:
        raise ValueError("Reference group mean is zero; cannot normalize.")

    normalized: dict[str, list[float]] = {}
    for group_name, values in concentrations.items():
        normalized[group_name] = [(v / ref_mean) * 100 for v in values]

    return normalized


def calculate_statistics(
    normalized: dict[str, list[float]],
) -> pd.DataFrame:
    """Calculate mean and SD for each group.

    Returns DataFrame with columns: Group, Mean, SD, N.
    """
    rows = []
    for group_name, values in normalized.items():
        arr = np.array(values)
        rows.append(
            {
                "Group": group_name,
                "Mean": np.mean(arr),
                "SD": np.std(arr, ddof=1) if len(arr) > 1 else 0.0,
                "N": len(arr),
            }
        )
    return pd.DataFrame(rows)


def run_ttests(
    normalized: dict[str, list[float]],
    comparison_group: str,
) -> dict[str, dict]:
    """Run independent t-tests comparing each group against the comparison group.

    Returns {group_name: {"t_stat": float, "p_value": float, "significance": str}}.
    """
    if comparison_group not in normalized:
        raise ValueError(f"Comparison group '{comparison_group}' not found.")

    ref_values = np.array(normalized[comparison_group])
    results: dict[str, dict] = {}

    for group_name, values in normalized.items():
        if group_name == comparison_group:
            results[group_name] = {
                "t_stat": None,
                "p_value": None,
                "significance": "-",
            }
            continue

        arr = np.array(values)
        if len(arr) < 2 or len(ref_values) < 2:
            results[group_name] = {
                "t_stat": None,
                "p_value": None,
                "significance": "n/a",
            }
            continue

        t_stat, p_value = stats.ttest_ind(arr, ref_values, equal_var=False)
        sig = _significance_marker(p_value)
        results[group_name] = {
            "t_stat": float(t_stat),
            "p_value": float(p_value),
            "significance": sig,
        }

    return results


def _significance_marker(p: float) -> str:
    if p < 0.001:
        return "***"
    elif p < 0.01:
        return "**"
    elif p < 0.05:
        return "*"
    else:
        return "n.s."


def build_results_dataframe(
    parsed_data: dict[str, dict[str, float]],
    groups: dict[str, list[str]],
    concentrations: dict[str, list[float]],
    normalized: dict[str, list[float]],
    stats_df: pd.DataFrame,
    ttest_results: dict[str, dict],
) -> pd.DataFrame:
    """Build a comprehensive results table for display and export."""
    group_names = list(groups.keys())
    filenames = list(parsed_data.keys())

    rows = []
    # Absorbance values per measurement
    for i, fname in enumerate(filenames):
        row = {"Measurement": f"M{i+1} ({fname})"}
        for gname in group_names:
            wells = groups[gname]
            abs_vals = [parsed_data[fname].get(w) for w in wells if w in parsed_data[fname]]
            row[f"{gname} (Abs)"] = np.mean(abs_vals) if abs_vals else None
        rows.append(row)

    # Concentration values
    for i in range(len(filenames)):
        row = {"Measurement": f"M{i+1} Conc."}
        for gname in group_names:
            vals = concentrations.get(gname, [])
            row[f"{gname} (Abs)"] = vals[i] if i < len(vals) else None
        rows.append(row)

    # Normalized values
    for i in range(len(filenames)):
        row = {"Measurement": f"M{i+1} Norm (%)"}
        for gname in group_names:
            vals = normalized.get(gname, [])
            row[f"{gname} (Abs)"] = vals[i] if i < len(vals) else None
        rows.append(row)

    return pd.DataFrame(rows)
