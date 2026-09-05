# MPLADS Dashboard - Feature Verification Checklist

## Build Status
✅ Frontend builds successfully (no errors)
✅ JSON has all 50 records with complete fields
✅ Detection script runs without errors

## What Should Be Visible

### 1. Header Section
- **Title**: "MPLADS Fund Utilization & Delay Risk Prototype"
- **District Badge**: "Pune (Maharashtra)"
- **Watermark**: "SYNTHETIC DATA — FOR DEMONSTRATION" (yellow badge)

### 2. KPI Cards Row (8 cards)
- Total Works: **50**
- Total Sanctioned: **₹13.73 Cr**
- Total Expenditure: **₹11.02 Cr** (80.3% of sanctioned)
- % Flagged: **20.0%** (10 of 50 works)
- High + Critical: **9** (red)
- Avg Progress: **63.2%**
- Budget Remaining: **₹2.71 Cr**
- Delayed Works: **5** (>365 days & incomplete)

### 3. Action Grouping Cards (4 clickable cards)
- **Immediate Review** (CRITICAL): 8 works
- **High Attention** (HIGH): 1 work
- **Monitor** (MEDIUM): 1 work
- **No Action Required** (LOW): 40 works

### 4. Priority Action Queue Table (Top 10)
**Columns**: Rank (#), Work ID, Category, Agency, Risk Band, Score, % Utilized, % Progress, Days Overdue, Primary Reason, Recommended Action, Status

**Expected Top 10**:
1. WK-014 (CRITICAL, 100, 307 days overdue)
2. WK-033 (CRITICAL, 100, 147 days overdue)
3. WK-041 (CRITICAL, 100, 85 days overdue)
4. WK-019 (CRITICAL, 100, 0 days overdue)
5. WK-038 (CRITICAL, 100, 0 days overdue)
6. WK-011 (CRITICAL, 95, 0 days overdue)
7. WK-047 (CRITICAL, 93, 0 days overdue)
8. WK-027 (CRITICAL, 87, 0 days overdue)
9. WK-049 (HIGH, 67.8, 169 days overdue)
10. WK-022 (MEDIUM, 58.6, 113 days overdue)

Each row should have a **Status dropdown** (Pending Review / Under Review / Reviewed).

### 5. Quick Action Filters Bar
6 buttons: All Works | Immediate Review | High Attention | Delayed Works | Utilization Mismatch | Overspend

### 6. Two Scatter Charts (side-by-side on desktop)
**Left**: Progress vs Fund Utilization (with y=x parity line)
**Right**: Delay Analysis (with vertical 365-day line)

Both charts should be clickable to open drill-down.

### 7. Category Analysis & Agency Table (side-by-side)
**Left**: Bar chart showing Works/Avg Progress/Avg Score per category
**Right**: Agency table sorted by High/Critical count

### 8. Comprehensive Risk Table
**Columns**: Work ID, Agency, Category, Sanctioned, Expenditure, % Utilized, % Progress, Progress Gap, Days Open, Risk Band & Score, Primary Reason

- Default sort: overall_score descending
- Should show all 50 works initially
- Filters above table: Risk Band pills, Category dropdown, Status dropdown, Search box, Clear Filters button

### 9. Drill-Down Modal (click any work row or chart point)
**Should display**:
- Work ID badge, Category, Risk Band, Project Health badges
- Overall Score banner with triggered rules
- **Score Breakdown** (only if bonus > 0): Base Score + Corroboration Bonus = Final Score
- **Action Status dropdown**: Pending Review / Under Review / Reviewed
- Recommended Action (blue box)
- Detailed risk reasons (one per triggered rule)
- Financial Breakdown grid (6 metrics)
- Physical Progress & Timeline grid (6 metrics)
- Timeline visualization (3 steps: Sanction → 365d Norm → Current)
- Footer notice: "Risk indicator — requires human review, not a finding of fraud."

### 10. Fixed Footer
"Risk indicator — requires human review, not a finding of fraud."

---

## Testing Instructions

To verify the dashboard is working:

1. **Start dev server**:
   ```bash
   cd frontend
   npm run dev
   ```
   Open http://localhost:5174 in browser

2. **Check KPIs**: All 8 cards should show numbers (not "0" or "NaN")

3. **Click Action Group**: Click "Immediate Review" → table should filter to 8 CRITICAL works

4. **Click Quick Filter**: Click "Delayed Works" → table should filter to works with Rule C

5. **Click Priority Queue row**: Should open modal with full work details

6. **Change Status**: In Priority Queue or modal, change dropdown from "Pending Review" to "Under Review" → badge should update

7. **Click Chart Point**: Click any point on scatter chart → should open drill-down modal

8. **Sort Table**: Click "Risk Band & Score" column header → should re-sort works

9. **Search**: Type "WK-014" in search box → should show only that work

10. **Clear Filters**: Click "Clear All Filters" → should reset to showing all 50 works

---

## Common Issues & Fixes

### If KPI cards show "0" or "NaN":
- Check browser console (F12) for JavaScript errors
- Verify `riskScoredWorks` array has 50 items: `console.log(riskScoredWorks.length)`

### If Priority Queue is empty:
- Verify JSON file exists at `frontend/src/data/risk_scored_works.json`
- Check if sorting works: `console.log(priorityQueue.length)` should be 10

### If charts don't render:
- Recharts dependency issue - verify `npm list recharts` shows version 3.10.1
- Try clearing cache: `npm run build` then refresh

### If modal doesn't open:
- Check console for errors
- Verify `selectedWork` state updates: add `console.log(selectedWork)` on row click

### If filters don't work:
- Check `filteredWorks.length` in console
- Verify filter state: `console.log({selectedBands, activeActionGroup, activeQuickFilter})`

### If Status dropdown doesn't change:
- This is UI-only state (not persisted) - should work within current session
- Verify `actionStatuses` object updates on dropdown change

---

## Run Full Test

```bash
cd "c:/Users/Rudra/Documents/SIH 2026"

# Verify detection script
python scripts/detect.py

# Verify output
python -c "import json; data=json.load(open('output/risk_scored_works.json', encoding='utf-8')); print(f'Records: {len(data)}'); print(f'Top work: {data[0][\"work_id\"]}')"

# Build and run frontend
cd frontend
npm run build
npm run dev
```

Then open browser to http://localhost:5174 and follow Testing Instructions above.
