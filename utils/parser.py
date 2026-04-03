"""Parse plate reader .xls/.xlsx files for melanin absorbance data."""

import pandas as pd
import numpy as np


PLATE_ROWS = list("ABCDEFGH")
PLATE_COLS = list(range(1, 13))


def parse_plate_reader_file(file_or_path) -> dict[str, float]:
    """Parse a single plate reader export and return {well_id: absorbance}.

    Primary: parses the Plate_Page1 sheet (96-well grid layout).
    Fallback: parses the List sheet (tabular format) if Plate_Page1 fails.
    """
    try:
        xls = pd.ExcelFile(file_or_path)
    except Exception:
        raise ValueError("Could not read file. Ensure it is a valid .xls or .xlsx file.")

    # Try Plate_Page1 first
    plate_sheet = _find_sheet(xls, "plate_page")
    if plate_sheet is not None:
        try:
            well_data = _parse_plate_layout(xls, plate_sheet)
            if well_data:
                return well_data
        except Exception:
            pass

    # Fallback to List sheet
    list_sheet = _find_sheet(xls, "list") or xls.sheet_names[0]
    return _parse_list_sheet(xls, list_sheet)


def _find_sheet(xls: pd.ExcelFile, keyword: str) -> str | None:
    """Find a sheet name containing the keyword (case-insensitive)."""
    for name in xls.sheet_names:
        if keyword in name.lower():
            return name
    return None


def _parse_plate_layout(xls: pd.ExcelFile, sheet_name: str) -> dict[str, float]:
    """Parse the Plate_Page1 sheet with 96-well grid layout.

    Layout structure:
    - Rows 0-4: metadata (Plate, Repeat, temps, Absorbance header)
    - Row 5-6: column headers or empty
    - Rows 7-14: plate rows A-H (row 7 = B if A is empty, etc.)
    - DataFrame column index + 1 = plate column number
    - Values are absorbance readings; NaN = empty well
    """
    df = pd.read_excel(xls, sheet_name=sheet_name, header=None)

    # Find the absorbance header row to anchor the plate grid
    abs_row = None
    for idx, row in df.iterrows():
        cell = str(row.iloc[0]).lower() if pd.notna(row.iloc[0]) else ""
        if "absorbance" in cell:
            abs_row = idx
            break

    if abs_row is None:
        raise ValueError("Could not find 'Absorbance' header in plate layout sheet.")

    # Plate grid starts 3 rows after the absorbance header
    # abs_row + 1 = blank reference value, +2 = col headers or empty,
    # +3 = plate row A
    grid_start = abs_row + 3

    well_data: dict[str, float] = {}

    for row_offset, row_letter in enumerate(PLATE_ROWS):
        df_row = grid_start + row_offset
        if df_row >= len(df):
            break

        row_data = df.iloc[df_row]

        for col_idx in range(len(PLATE_COLS)):
            df_col = col_idx  # DataFrame column 0 = plate column 1
            if df_col >= len(row_data):
                break

            # Skip column 0 if it contains a row label (letter)
            cell = row_data.iloc[df_col]
            if isinstance(cell, str):
                continue

            if pd.notna(cell):
                try:
                    absorbance = float(cell)
                    plate_col = col_idx + 1  # plate columns are 1-indexed
                    well_id = f"{row_letter}{plate_col:02d}"
                    well_data[well_id] = absorbance
                except (ValueError, TypeError):
                    continue

    return well_data


def _parse_list_sheet(xls: pd.ExcelFile, sheet_name: str) -> dict[str, float]:
    """Parse the List sheet with tabular well data (fallback parser).

    Expected columns: Plate, Repeat, Well, Type, Time, Absorbance.
    """
    df = pd.read_excel(xls, sheet_name=sheet_name, header=None)

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
            "Could not find Well and Absorbance columns in List sheet."
        )

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
