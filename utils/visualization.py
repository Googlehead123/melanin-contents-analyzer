"""Plotly visualizations for melanin content analysis."""

import plotly.graph_objects as go
import pandas as pd


# Clean, professional color palette
GROUP_COLORS = [
    "#B0BEC5",  # Gray (blank/reference)
    "#78909C",  # Dark gray (vehicle)
    "#42A5F5",  # Blue
    "#29B6F6",  # Light blue
    "#26C6DA",  # Cyan
    "#66BB6A",  # Green (positive control)
    "#FFA726",  # Orange
    "#EF5350",  # Red
    "#AB47BC",  # Purple
    "#8D6E63",  # Brown
]


def create_bar_chart(
    stats_df: pd.DataFrame,
    ttest_results: dict[str, dict],
    comparison_group: str,
    title: str = "Melanin Contents (% of Blank)",
    y_label: str = "Melanin Contents (% of Blank)",
) -> go.Figure:
    """Create a bar chart with error bars and significance markers.

    Args:
        stats_df: DataFrame with columns Group, Mean, SD, N.
        ttest_results: Dict of t-test results per group.
        comparison_group: Name of the group used for statistical comparison.
        title: Chart title.
        y_label: Y-axis label.
    """
    groups = stats_df["Group"].tolist()
    means = stats_df["Mean"].tolist()
    sds = stats_df["SD"].tolist()

    colors = [GROUP_COLORS[i % len(GROUP_COLORS)] for i in range(len(groups))]

    fig = go.Figure()

    fig.add_trace(
        go.Bar(
            x=groups,
            y=means,
            error_y=dict(type="data", array=sds, visible=True, thickness=1.5, width=6),
            marker_color=colors,
            marker_line_color="#37474F",
            marker_line_width=1,
            text=[f"{m:.1f}" for m in means],
            textposition="outside",
            textfont=dict(size=11),
        )
    )

    # Add significance markers
    annotations = []
    max_y = max(m + s for m, s in zip(means, sds)) if means else 100
    for i, group in enumerate(groups):
        ttest = ttest_results.get(group, {})
        sig = ttest.get("significance", "")
        if sig and sig not in ("-", "n/a", "n.s."):
            annotations.append(
                dict(
                    x=group,
                    y=means[i] + sds[i] + max_y * 0.04,
                    text=sig,
                    showarrow=False,
                    font=dict(size=14, color="#D32F2F", family="Arial Black"),
                    xanchor="center",
                )
            )

    fig.update_layout(
        title=dict(text=title, font=dict(size=16)),
        yaxis_title=y_label,
        xaxis_title="Treatment Group",
        template="plotly_white",
        annotations=annotations,
        showlegend=False,
        height=500,
        margin=dict(t=80, b=60, l=60, r=40),
        yaxis=dict(rangemode="tozero"),
        font=dict(family="Arial, sans-serif", size=12),
    )

    return fig


def create_plate_heatmap(
    well_data: dict[str, float],
    title: str = "Plate Absorbance Heatmap",
) -> go.Figure:
    """Create a 96-well plate heatmap from well data."""
    rows = list("ABCDEFGH")
    cols = list(range(1, 13))

    z = []
    text = []
    for row in rows:
        z_row = []
        t_row = []
        for col in cols:
            well = f"{row}{col:02d}"
            val = well_data.get(well)
            z_row.append(val)
            if val is not None:
                t_row.append(f"{well}<br>{val:.4f}")
            else:
                t_row.append(f"{well}<br>-")
        z.append(z_row)
        text.append(t_row)

    fig = go.Figure(
        data=go.Heatmap(
            z=z,
            x=[str(c) for c in cols],
            y=rows,
            text=text,
            hoverinfo="text",
            colorscale="YlOrRd",
            showscale=True,
            colorbar=dict(title="Abs"),
            zmin=0,
        )
    )

    fig.update_layout(
        title=dict(text=title, font=dict(size=14)),
        xaxis=dict(title="Column", dtick=1),
        yaxis=dict(title="Row", autorange="reversed"),
        height=350,
        template="plotly_white",
        margin=dict(t=50, b=40, l=40, r=40),
    )

    return fig
