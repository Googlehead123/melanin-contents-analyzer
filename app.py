"""
Melanin Contents Analyzer
=========================
Streamlit app for analyzing melanin content from plate reader absorbance data.

Workflow:
1. Upload plate reader .xls/.xlsx files (repeated measurements)
2. Configure well-to-treatment group mapping via plate grid editor
3. Input standard curve parameters
4. View analysis: concentrations, normalization, statistics, charts

Run: streamlit run app.py
"""

import io
import json
import streamlit as st
import pandas as pd
import numpy as np

from utils.parser import parse_plate_reader_file, get_all_wells
from utils.analysis import (
    calculate_group_concentrations,
    normalize_to_reference,
    calculate_statistics,
    run_ttests,
)
from utils.visualization import create_bar_chart, create_plate_heatmap

PLATE_ROWS = list("ABCDEFGH")
PLATE_COLS = list(range(1, 13))

# Distinct colors for up to 12 groups
GROUP_PALETTE = [
    "#E3F2FD", "#FFF3E0", "#E8F5E9", "#FCE4EC", "#F3E5F5",
    "#E0F7FA", "#FFF8E1", "#EDE7F6", "#E8EAF6", "#FBE9E7",
    "#F1F8E9", "#EFEBE9",
]

st.set_page_config(
    page_title="Melanin Contents Analyzer",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Session state initialization ─────────────────────────────────────────────
if "plate_grid" not in st.session_state:
    st.session_state.plate_grid = None


def _build_plate_grid(
    detected_wells: set[str],
    preset: dict[str, list[str]] | None = None,
) -> pd.DataFrame:
    """Build an 8x12 plate grid DataFrame for editing.

    Cells with detected wells are empty (editable), others are marked '-'.
    If preset is provided, pre-fill group names into assigned wells.
    """
    # Build reverse lookup: well -> group name
    well_to_group: dict[str, str] = {}
    if preset:
        for group_name, wells in preset.items():
            for w in wells:
                well_to_group[w] = group_name

    grid = {}
    for col_num in PLATE_COLS:
        col_vals = []
        for row_letter in PLATE_ROWS:
            well_id = f"{row_letter}{col_num:02d}"
            if well_id in detected_wells:
                col_vals.append(well_to_group.get(well_id, ""))
            else:
                col_vals.append("-")
        grid[str(col_num)] = col_vals

    return pd.DataFrame(grid, index=PLATE_ROWS)


def _grid_to_groups(grid_df: pd.DataFrame) -> dict[str, list[str]]:
    """Extract {group_name: [well_ids]} from the edited plate grid."""
    groups: dict[str, list[str]] = {}
    for row_letter in PLATE_ROWS:
        if row_letter not in grid_df.index:
            continue
        for col_num in PLATE_COLS:
            col_key = str(col_num)
            if col_key not in grid_df.columns:
                continue
            val = str(grid_df.loc[row_letter, col_key]).strip()
            if val and val != "-" and val != "" and val != "nan":
                well_id = f"{row_letter}{col_num:02d}"
                if val not in groups:
                    groups[val] = []
                groups[val].append(well_id)
    return groups


def _colorize_plate_grid(grid_df: pd.DataFrame):
    """Apply background colors to the plate grid based on group names."""
    # Collect unique group names (excluding '-' and empty)
    unique_groups = []
    for val in grid_df.values.flatten():
        s = str(val).strip()
        if s and s != "-" and s != "nan" and s not in unique_groups:
            unique_groups.append(s)

    color_map = {g: GROUP_PALETTE[i % len(GROUP_PALETTE)] for i, g in enumerate(unique_groups)}

    def _styler(val):
        s = str(val).strip()
        if s in color_map:
            return f"background-color: {color_map[s]}; font-weight: 600"
        if s == "-":
            return "color: #ccc"
        return ""

    return grid_df.style.map(_styler)


# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Melanin Contents Analyzer")

    st.subheader("1. Upload Raw Data")
    uploaded_files = st.file_uploader(
        "Plate reader files (.xls / .xlsx)",
        type=["xls", "xlsx"],
        accept_multiple_files=True,
        help="Upload repeated measurement files of the same plate.",
    )

    st.divider()
    st.subheader("2. Standard Curve")
    st.caption("Abs = slope × Conc + intercept")
    col_s, col_i = st.columns(2)
    with col_s:
        slope = st.number_input("Slope", value=0.00075, format="%.6f", step=0.0001)
    with col_i:
        intercept = st.number_input("Intercept", value=0.0348, format="%.4f", step=0.001)

    if slope != 0:
        st.caption(f"Conc = (Abs − {intercept}) / {slope}")

    st.divider()
    st.subheader("3. Load/Save Config")

    config_file = st.file_uploader(
        "Load group config (JSON)",
        type=["json"],
        help="Load a previously saved well-to-group mapping.",
    )
    if config_file is not None:
        try:
            loaded_groups = json.load(config_file)
            st.session_state["loaded_preset"] = loaded_groups
            st.success(f"Loaded {len(loaded_groups)} groups")
        except Exception as e:
            st.error(f"Invalid config: {e}")


# ── Parse uploaded files ─────────────────────────────────────────────────────
parsed_data: dict[str, dict[str, float]] = {}
if uploaded_files:
    for f in uploaded_files:
        try:
            well_data = parse_plate_reader_file(f)
            parsed_data[f.name] = well_data
        except Exception as e:
            st.error(f"Error parsing {f.name}: {e}")

all_wells = get_all_wells(parsed_data) if parsed_data else []
detected_well_set = set(all_wells)

# ── Main content ─────────────────────────────────────────────────────────────
if not parsed_data:
    st.title("Melanin Contents Analyzer")
    st.info("Upload plate reader files in the sidebar to begin.")
    st.stop()

st.title("Melanin Contents Analyzer")

tab_raw, tab_groups, tab_results = st.tabs(
    ["📊 Raw Data", "⚙️ Group Configuration", "📈 Results"]
)

# ── Tab 1: Raw Data ──────────────────────────────────────────────────────────
with tab_raw:
    st.subheader("Uploaded Measurements")
    st.caption(f"{len(parsed_data)} file(s) loaded, {len(all_wells)} wells detected")

    # Summary table
    summary_rows = []
    for fname, wells in parsed_data.items():
        for well, absorbance in sorted(wells.items()):
            summary_rows.append(
                {"File": fname, "Well": well, "Absorbance (490nm)": absorbance}
            )
    summary_df = pd.DataFrame(summary_rows)

    # Pivot: wells as rows, files as columns
    if summary_rows:
        pivot_df = summary_df.pivot(
            index="Well", columns="File", values="Absorbance (490nm)"
        )
        pivot_df["Mean"] = pivot_df.mean(axis=1)
        pivot_df["SD"] = pivot_df.std(axis=1, ddof=1)
        st.dataframe(
            pivot_df.style.format("{:.6f}").background_gradient(
                subset=["Mean"], cmap="YlOrRd"
            ),
            use_container_width=True,
        )

    # Plate heatmap of first file
    st.subheader("Plate Heatmap (first file)")
    first_file = list(parsed_data.keys())[0]
    fig_heatmap = create_plate_heatmap(
        parsed_data[first_file], title=f"Absorbance — {first_file}"
    )
    st.plotly_chart(fig_heatmap, use_container_width=True)


# ── Tab 2: Group Configuration ───────────────────────────────────────────────
with tab_groups:
    st.subheader("Plate Layout — Group Assignment")
    st.caption(
        "Type a group name into each well to assign it. "
        "Wells with the same name form a group. "
        "Wells marked **-** have no data. Empty cells are unassigned."
    )

    # Reference: show absorbance heatmap above editor
    with st.expander("Absorbance reference (first file)", expanded=False):
        fig_ref = create_plate_heatmap(
            parsed_data[first_file], title="Absorbance Reference"
        )
        st.plotly_chart(fig_ref, use_container_width=True)

    # Build initial grid
    preset = st.session_state.get("loaded_preset")
    initial_grid = _build_plate_grid(detected_well_set, preset)

    # Editable plate grid
    edited_grid = st.data_editor(
        initial_grid,
        use_container_width=True,
        key="plate_editor",
        height=330,
    )

    # Extract groups from edited grid
    groups = _grid_to_groups(edited_grid)
    st.session_state.groups = groups

    # Show color-coded preview
    if groups:
        st.subheader("Group Preview")
        st.dataframe(
            _colorize_plate_grid(edited_grid),
            use_container_width=True,
            height=330,
        )

        # Group summary
        col_summary, col_controls = st.columns([2, 1])
        with col_summary:
            for gname, wells in groups.items():
                st.caption(f"**{gname}**: {', '.join(wells)}")

        with col_controls:
            config_json = json.dumps(groups, indent=2)
            st.download_button(
                "Save group config",
                data=config_json,
                file_name="melanin_group_config.json",
                mime="application/json",
            )

    st.divider()

    # Reference and comparison group selectors
    group_names = list(groups.keys())
    if len(group_names) >= 2:
        col_ref, col_comp = st.columns(2)
        with col_ref:
            norm_ref = st.selectbox(
                "Normalization reference (= 100%)",
                options=group_names,
                index=0,
                help="All values will be expressed as % of this group's mean.",
            )
        with col_comp:
            comp_group = st.selectbox(
                "T-test comparison group",
                options=group_names,
                index=min(1, len(group_names) - 1),
                help="Statistical significance calculated vs this group.",
            )
        st.session_state["norm_ref"] = norm_ref
        st.session_state["comp_group"] = comp_group
    else:
        st.info("Assign at least 2 groups to configure analysis.")


# ── Tab 3: Results ───────────────────────────────────────────────────────────
with tab_results:
    groups = st.session_state.groups
    norm_ref = st.session_state.get("norm_ref")
    comp_group = st.session_state.get("comp_group")

    if not groups or len(groups) < 2:
        st.info("Configure at least 2 treatment groups in the Group Configuration tab.")
        st.stop()

    if not norm_ref or norm_ref not in groups:
        st.error("Select a valid normalization reference group.")
        st.stop()

    if not comp_group or comp_group not in groups:
        st.error("Select a valid comparison group for t-test.")
        st.stop()

    if slope == 0:
        st.error("Slope cannot be zero.")
        st.stop()

    # ── Run analysis ─────────────────────────────────────────────────────────
    concentrations = calculate_group_concentrations(parsed_data, groups, slope, intercept)
    normalized = normalize_to_reference(concentrations, norm_ref)
    stats_df = calculate_statistics(normalized)
    ttest_results = run_ttests(normalized, comp_group)

    # ── Bar chart ────────────────────────────────────────────────────────────
    st.subheader("Melanin Contents")
    fig = create_bar_chart(
        stats_df,
        ttest_results,
        comp_group,
        title=f"Melanin Contents (% of {norm_ref})",
        y_label=f"Melanin Contents (% of {norm_ref})",
    )
    st.plotly_chart(fig, use_container_width=True)

    # ── Data tables ──────────────────────────────────────────────────────────
    st.subheader("Detailed Results")

    group_names = list(groups.keys())
    filenames = list(parsed_data.keys())

    # Absorbance table
    with st.expander("Absorbance Values", expanded=False):
        abs_rows = []
        for fname in filenames:
            row = {"Measurement": fname}
            for gname in group_names:
                wells = groups[gname]
                vals = [parsed_data[fname].get(w) for w in wells if w in parsed_data[fname]]
                row[gname] = np.mean(vals) if vals else None
            abs_rows.append(row)
        abs_df = pd.DataFrame(abs_rows).set_index("Measurement")
        st.dataframe(abs_df.style.format("{:.6f}"), use_container_width=True)

    # Concentration table
    with st.expander("Concentration Values", expanded=False):
        conc_rows = []
        for i, fname in enumerate(filenames):
            row = {"Measurement": fname}
            for gname in group_names:
                vals = concentrations.get(gname, [])
                row[gname] = vals[i] if i < len(vals) else None
            conc_rows.append(row)
        mean_row = {"Measurement": "Mean"}
        for gname in group_names:
            vals = concentrations.get(gname, [])
            mean_row[gname] = np.mean(vals) if vals else None
        conc_rows.append(mean_row)
        conc_df = pd.DataFrame(conc_rows).set_index("Measurement")
        st.dataframe(conc_df.style.format("{:.2f}"), use_container_width=True)

    # Normalized values table
    with st.expander("Normalized Values (% of reference)", expanded=True):
        norm_rows = []
        for i, fname in enumerate(filenames):
            row = {"Measurement": fname}
            for gname in group_names:
                vals = normalized.get(gname, [])
                row[gname] = vals[i] if i < len(vals) else None
            norm_rows.append(row)
        norm_df = pd.DataFrame(norm_rows).set_index("Measurement")
        st.dataframe(norm_df.style.format("{:.2f}"), use_container_width=True)

    # Statistics summary
    st.subheader("Statistics")
    col_stats, col_ttest = st.columns(2)

    with col_stats:
        st.caption(f"Normalized to {norm_ref}")
        display_stats = stats_df.copy()
        display_stats["Mean"] = display_stats["Mean"].map("{:.2f}".format)
        display_stats["SD"] = display_stats["SD"].map("{:.2f}".format)
        display_stats["N"] = display_stats["N"].astype(int)
        st.dataframe(display_stats, use_container_width=True, hide_index=True)

    with col_ttest:
        st.caption(f"T-test vs {comp_group}")
        ttest_rows = []
        for gname in group_names:
            res = ttest_results.get(gname, {})
            p = res.get("p_value")
            ttest_rows.append(
                {
                    "Group": gname,
                    "p-value": f"{p:.2e}" if p is not None else "-",
                    "Significance": res.get("significance", "-"),
                }
            )
        ttest_df = pd.DataFrame(ttest_rows)
        st.dataframe(ttest_df, use_container_width=True, hide_index=True)

    # ── Export ────────────────────────────────────────────────────────────────
    st.divider()
    st.subheader("Export")

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        abs_df_export = pd.DataFrame(
            [{gname: np.mean([parsed_data[fname].get(w) for w in groups[gname] if w in parsed_data[fname]] or [0])
              for gname in group_names}
             for fname in filenames],
            index=filenames,
        )
        abs_df_export.index.name = "Measurement"
        abs_df_export.to_excel(writer, sheet_name="Absorbance")
        conc_df.to_excel(writer, sheet_name="Concentration")
        norm_df.to_excel(writer, sheet_name="Normalized")

        stats_export = stats_df.copy()
        for gname in group_names:
            res = ttest_results.get(gname, {})
            stats_export.loc[stats_export["Group"] == gname, "p-value"] = res.get("p_value")
            stats_export.loc[stats_export["Group"] == gname, "Significance"] = res.get("significance", "-")
        stats_export.to_excel(writer, sheet_name="Statistics", index=False)

    st.download_button(
        "Download Results (Excel)",
        data=buffer.getvalue(),
        file_name="melanin_analysis_results.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
