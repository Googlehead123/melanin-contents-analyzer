"""Parse plate reader .xls/.xlsx files for melanin absorbance data."""

import pandas as pd
from pathlib import Path


def parse_plate_reader_file(file_or_path) -> dict[str, float]:
    """Parse a single plate reader export and return {well_id: absorbance}.

    Reads the first sheet (typically 'List ; Plates 1 - 1') which contains
    tabular data with columns: Plate, Repeat, Well, Type, Time, Absorbance.
    """
    try:
        xls = pd.ExcelFile(file_or_path)
    except Exception:
        raise ValueError("Could not read file. Ensure it is a valid .xls or .xlsx file.")

    # Find the data sheet — look for 'List' in name, fall back to first sheet
    data_sheet = None
    for name in xls.sheet_names:
        if "list" in name.lower():
            data_sheet = name
            break
    if data_sheet is None:
        data_sheet = xls.sheet_names[0]

    df = pd.read_excel(xls, sheet_name=data_sheet, header=None)

    # Find the header row (contains 'Well' and 'Absorbance')
    header_idx = None
    abs_col = None
    well_col = None
    for idx, row in df.iterrows():
        row_str = [str(v).lower() for v in row.values]
        for ci, val in enumerate(row_str):
            if "well" in val:
                well_col = ci
            if "absorbance" in val:
                abs_col = ci
        if well_col is not None and abs_col is not None:
            header_idx = idx
            break

    if header_idx is None or well_col is None or abs_col is None:
        raise ValueError(
            "Could not find Well and Absorbance columns. "
            "Expected plate reader export with 'Well' and 'Absorbance' headers."
        )

    # Parse data rows
    well_data: dict[str, float] = {}
    for idx in range(header_idx + 1, len(df)):
        row = df.iloc[idx]
        well = str(row.iloc[well_col]).strip()
        try:
            absorbance = float(row.iloc[abs_col])
        except (ValueError, TypeError):
            continue
        if well and well != "nan":
            well_data[well] = absorbance

    return well_data


def parse_multiple_files(uploaded_files: list) -> dict[str, dict[str, float]]:
    """Parse multiple plate reader files.

    Returns {filename: {well_id: absorbance}}.
    """
    all_data: dict[str, dict[str, float]] = {}
    for f in uploaded_files:
        name = f.name if hasattr(f, "name") else str(f)
        well_data = parse_plate_reader_file(f)
        all_data[name] = well_data
    return all_data


def get_all_wells(parsed_data: dict[str, dict[str, float]]) -> list[str]:
    """Get sorted list of all unique well IDs across all files."""
    wells: set[str] = set()
    for file_data in parsed_data.values():
        wells.update(file_data.keys())
    return sorted(wells, key=_well_sort_key)


def _well_sort_key(well: str) -> tuple[str, int]:
    """Sort wells by row letter then column number (B02 < B10 < C02)."""
    row = well[0]
    try:
        col = int(well[1:])
    except ValueError:
        col = 0
    return (row, col)
