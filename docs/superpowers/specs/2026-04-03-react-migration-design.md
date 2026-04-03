# Melanin Contents Analyzer — React+Vite Migration Design

## Overview

Migrate the Streamlit melanin contents analyzer to a client-side React+Vite app deployed on GitHub Pages. Port the incucyte-analyzer's UX patterns (drag-select plate grid, stepper wizard, chart themes, export) while preserving the existing analysis pipeline exactly.

**URL:** `https://Googlehead123.github.io/melanin-contents-analyzer/`

## Architecture

```
[File Upload] → [XLS Parser (SheetJS)] → [Plate Grid (drag-select)]
     → [Standard Curve Config] → [Analysis Engine (jstat)]
     → [Bar Chart (Plotly.js)] → [Export (PNG/Excel)]
```

**Pattern:** 4-step wizard (ported from incucyte-analyzer)  
**State:** Monolithic App.jsx with useState hooks (same as incucyte)  
**Styling:** CSS-in-JS via inline styles (same as incucyte, no Tailwind/CSS modules)

## File Structure

```
melanin-contents-analyzer/
├── app.py                          # Streamlit app (unchanged)
├── utils/                          # Python analysis (unchanged)
├── web/                            # React+Vite app
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx                # React DOM entry
│   │   ├── index.css               # Global styles, fonts
│   │   ├── App.jsx                 # Wizard orchestrator, state management
│   │   ├── components/
│   │   │   ├── UploadStep.jsx      # File upload with drag-drop
│   │   │   ├── PlateMapStep.jsx    # 96-well grid + group management
│   │   │   ├── SettingsStep.jsx    # Standard curve, normalization, t-test config
│   │   │   └── ResultsStep.jsx     # Bar chart, statistics, export
│   │   └── utils/
│   │       ├── parser.js           # SheetJS-based XLS/XLSX parser
│   │       ├── analysis.js         # Concentration, normalization, stats, t-test
│   │       ├── constants.js        # Colors, themes, defaults
│   │       └── export.js           # PNG (html2canvas) + Excel (SheetJS) export
│   └── .github/
│       └── workflows/
│           └── deploy.yml          # GitHub Actions → GitHub Pages
```

## Step 1: Upload

- Drag-and-drop zone + file picker for .xls/.xlsx files
- Accept multiple files (repeated measurements of same plate)
- Parse each file using SheetJS → extract well absorbance data
- Primary parser: Plate_Page1 sheet (96-well grid layout)
- Fallback: List sheet (tabular format)
- Show file count and detected wells after upload
- Auto-advance to Step 2 on successful parse

**Parser logic (port from Python):**
1. Find sheet matching "Plate_Page" (case-insensitive)
2. Find row containing "Absorbance" keyword
3. Grid starts 3 rows after → rows A-H, columns 1-12
4. Extract all numeric cells → `{wellId: absorbance}`
5. Fallback: find sheet matching "List", scan for Well + Absorbance columns

## Step 2: Plate Map (core UX — ported from incucyte)

**Left panel — Group management:**
- Add/remove treatment groups (name + color)
- Drag-to-reorder groups
- Active group highlighted (click to select)
- Quick-assign buttons: assign entire row (B, C, ...) or column (2, 3, ...)
- Control group selector (for t-test comparison)
- Normalization reference selector

**Right panel — 96-well plate grid:**
- 8×12 circular well buttons
- Only detected wells are interactive (others grayed out)
- **Click:** Toggle single well assignment to active group
- **Drag:** Rectangle selection assigns all enclosed wells to active group
- **Visual feedback:** Active drag shows highlight with glow, selected count
- Color-coded wells by assigned group
- Unassigned detected wells shown as hollow circles

**State:**
- `conditions`: `[{id, name, color, wells: []}]`
- `activeConditionIdx`: currently selected group
- `controlConditionIdx`: t-test comparison group
- `normRefIdx`: normalization reference group index
- Drag state: `isDragging`, `dragStart`, `dragEnd`, `dragSelectedWells`

## Step 3: Settings

- **Standard curve parameters:**
  - Slope input (default: 0.00075)
  - Intercept input (default: 0.0348)
  - Live formula preview: `Conc = (Abs − intercept) / slope`
- **Analysis options:**
  - Normalization reference: dropdown (pre-selected from Step 2)
  - T-test comparison group: dropdown (pre-selected from Step 2)
- **Chart theme:** dark / white / black (for presentations/publications)
- Save/load configuration as JSON

## Step 4: Results

**Bar chart (Plotly.js):**
- X: treatment group names
- Y: normalized melanin content (% of reference)
- Error bars: ±SD
- Significance markers above bars (*, **, ***)
- Mean value labels on bars
- Color-coded by group
- Theme-aware (dark/white/black backgrounds)

**Statistics table:**
- Columns: Group, Mean, SD, N, p-value, Significance
- Highlighted rows for significant results

**Data tables (collapsible):**
- Absorbance values (per measurement × per group)
- Concentration values (per measurement × per group + mean)
- Normalized values (% of reference)

**Export:**
- PNG: bar chart at 3× resolution via html2canvas (theme-aware)
- Excel: 4-sheet workbook via SheetJS (Absorbance, Concentration, Normalized, Statistics)
- JSON: full analysis config (groups, params, results) for reproducibility

## Analysis Engine (exact port from Python)

All formulas preserved exactly:

```javascript
// Standard curve conversion
concentration = (absorbance - intercept) / slope

// Group concentration: mean absorbance of wells → convert
// For each file, for each group:
//   meanAbs = mean(absorbance values for group's wells)
//   conc = (meanAbs - intercept) / slope

// Normalization
refMean = mean(referenceGroup.concentrations)
normalized = (value / refMean) * 100  // for each individual value

// Statistics
mean = sum(values) / n
sd = sqrt(sum((v - mean)² for v in values) / (n - 1))  // Bessel's correction

// T-test: independent samples (Welch's via jstat)
// Significance: *** (p<0.001), ** (p<0.01), * (p<0.05), n.s.
```

## Theme System

Three chart themes (ported from incucyte):

| Theme | Background | Text | Grid | Use case |
|-------|-----------|------|------|----------|
| white (default) | #ffffff | #111827 | #e5e7eb | Publications, print |
| dark | #0f172a | #e2e8f0 | #334155 | Presentations |
| black | #000000 | #ffffff | #374151 | High contrast |

App shell always uses light theme. Only chart area changes with theme.

## Deployment

**vite.config.js:**
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/melanin-contents-analyzer/',
})
```

**GitHub Actions** (`.github/workflows/deploy.yml`):
- Trigger: push to master
- Build: `cd web && npm ci && npm run build`
- Deploy: upload `web/dist/` to GitHub Pages

## Dependencies

```json
{
  "react": "^19",
  "react-dom": "^19",
  "react-plotly.js": "^2",
  "plotly.js-dist-min": "^2",
  "xlsx": "^0.18",
  "jstat": "^1.9",
  "file-saver": "^2",
  "html2canvas": "^1.4"
}
```

Dev: `vite`, `@vitejs/plugin-react`, `gh-pages`

## What's NOT included (YAGNI)

- No authentication (public tool)
- No database/persistence (client-side only)
- No time course analysis (endpoint only)
- No admin panel
- No routing (single-page wizard)
- No AUC calculation
- No outlier filtering (not in current Streamlit app)
