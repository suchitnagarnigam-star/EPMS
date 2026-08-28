# EPMS Analytics Platform — Codebase & Data Quality Audit Report

This report presents a thorough, strict evaluation of the Executive Project Management System (EPMS) codebase, database records, and integration layers. It identifies structural inconsistencies, functional discrepancies, and rendering bugs across the stack.

---

## 1. System Inventory & Database Statistics

A direct database row count query against the Neon PostgreSQL instance reveals the following data inventory:

| Table Name | Row Count | Purpose / Description |
| :--- | :---: | :--- |
| `fact_works` | **637** | Central unified records containing project parameters, financial metrics, and progress. |
| `dim_location` | **208** | Geographical dimensions (Zones, Sub-zones, Constituencies, Wards). |
| `dim_agency` | **264** | Contractors and executing agencies. |
| `dim_fund` | **51** | Funding sources and allocation quotas. |
| `dim_work_type` | **34** | Branch mapping (B&R vs. O&M) and nature of work classification. |
| `dim_officer` | **0** | Supervising officers. **[CRITICAL AUDIT FINDING - EMPTY]** |
| `data_quality` | **974** | Quarantined spreadsheet rows failing project ID identification. |
| `sasci_mdf_works` | **0** | Special km-based road flagship projects. **[PENDING IMPLEMENTATION]** |

---

## 2. Technical Architecture Overview

The EPMS application consists of:
1. **ETL Layer (Google Apps Script)**: Fetches raw rows from B&R and O&M tabs on the Main Tracker, cleans values against canonical maps, validates structures, and pushes JSON payloads to the FastAPI backend webhook.
2. **FastAPI Backend (Python)**: Runs on Render, utilizing `asyncpg` to perform database upserts via differential hashing and exposing KPIs, paginated work lists, contractor matriculation records, and quality stats.
3. **Frontend Dashboard (Vite + React + TS)**: Visualizes the portfolios via Recharts with dark mode aesthetic styling, client-side pagination, filters, and dynamic layout.

---

## 3. Strict Bugs & Anomalies Register

We have conducted a thorough source code and database validation check. Below is the comprehensive register of issues that require immediate remediation:

### 🚨 Critical / High Severity Bugs

#### Bug 1: Ingestion Data Loss due to Pydantic Alias Mismatches
*   **Location**: [`models.py`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Backend/models.py#L65-L138)
*   **Root Cause**: The raw JSON payload pushed from the Google Sheets Apps Script contains keys that do not match the expected field names or validation aliases in the FastAPI Pydantic schemas:
    1.  The payload contains `"supervising_officer": "Er. Ranjit Singh"`, but `WorkSyncItem` expects `'officer_name'`, `'officer'`, `'Officer Name'`, or `'Name of Officer'`.
    2.  The payload contains `"actual_completion": null`, but `WorkSyncItem` expects `actual_completion_date` with **no alias configured**.
*   **Impact**: When Pydantic parses incoming rows, it silently discards these fields and sets them to `None`. Consequently:
    *   `dim_officer` is completely empty (**0 rows**), and every work in `fact_works` has `officer_id = NULL`.
    *   No actual completion dates are ever recorded in the database (`with_actual_completion: 0`).
*   **Remediation**: Add correct `AliasChoices` for these fields:
    ```python
    officer_name: Optional[str] = Field(None, validation_alias=AliasChoices('officer_name', 'officer', 'supervising_officer', 'Officer Name', 'Name of Officer'))
    actual_completion_date: Optional[date] = Field(None, validation_alias=AliasChoices('actual_completion_date', 'actual_completion'))
    ```

#### Bug 2: Broken Debounced Search in Master Directory
*   **Location**: [`MasterWorksDirectory.tsx`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/pages/MasterWorksDirectory.tsx#L19-L27)
*   **Root Cause**: The debounced search handler returns a cleanup function from the callback:
    ```typescript
    const handleSearchChange = useCallback((value: string) => {
      setSearch(value);
      setPage(1);
      const timer = setTimeout(() => setDebouncedSearch(value), 400);
      return () => clearTimeout(timer); // <--- INEFFECTIVE CLEANUP
    }, []);
    ```
    Since React input `onChange` handlers ignore the returned value, **the timeout timer is never cleared on subsequent keypresses**.
*   **Impact**: If a user types `"Ludhiana"`, 8 separate timeouts are scheduled and allowed to fire, triggering multiple redundant backend query requests and UI re-renders, causing severe network noise.
*   **Remediation**: Use a `useEffect` hook to handle debouncing state updates, which properly cleans up standard timers.

#### Bug 3: Backend Search Limit to Description Only (UX Mismatch)
*   **Location**: [`works.py`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Backend/routers/works.py#L59-L61)
*   **Root Cause**: The frontend placeholder claims `"Search ID, description, agency..."`, but the backend implementation only queries `F.work_description`:
    ```python
    if search:
        params.append(f"%{search}%")
        conditions.append(f"F.work_description ILIKE ${len(params)}")
    ```
*   **Impact**: Searching for a specific project ID (e.g. `MCL-0001`) or contractor name in the directory results in 0 rows or completely incorrect results, rendering the directory search useless for lookup queries.
*   **Remediation**: Expand backend conditions to check other text fields:
    ```python
    conditions.append(f"(F.work_description ILIKE ${len(params)} OR F.work_id ILIKE ${len(params)} OR A.agency_name ILIKE ${len(params)})")
    ```

---

### ⚠️ Medium Severity Bugs

#### Bug 4: Contractor Dashboard Chart Ignores Filters
*   **Location**: [`ContractorMatrix.tsx`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/pages/ContractorMatrix.tsx#L89-L93)
*   **Root Cause**: The Recharts bar chart maps `chartData` directly from `enriched` (the unfiltered contractor list) rather than the `filtered` list:
    ```typescript
    const chartData = enriched.map(c => ({ ... })); // Should be filtered.map(...)
    ```
*   **Impact**: When a user filters contractors (e.g., searches for a specific contractor name or selects "High Risk"), the table updates, but the **progress chart remains static**, showing every single contractor in the database.
*   **Remediation**: Map `chartData` from the `filtered` variable.

#### Bug 5: Identical Colors for Physical and Financial Progress on SASCI works
*   **Location**: [`FlagshipAgenda.tsx`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/pages/FlagshipAgenda.tsx#L115-L120) and [line 162](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/pages/FlagshipAgenda.tsx#L162)
*   **Root Cause**: Physical bar fill uses `#3d9bd4` (teal) if it's SASCI. Financial progress bar is hardcoded to `#3d9bd4` (teal).
*   **Impact**: For SASCI road flagship works, both the Physical Progress bar and the Financial Progress bar are colored exactly the same teal shade, rendering them completely visually indistinguishable in the comparison chart.
*   **Remediation**: Use separate color mappings for Physical and Financial bars (e.g., Blue for Physical, Teal for Financial) regardless of the funding source.

#### Bug 6: Immediate Logout on Page Refresh (Session Loss)
*   **Location**: [`AuthContext.tsx`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/context/AuthContext.tsx)
*   **Root Cause**: Authentication state is stored strictly in memory (`useState(false)`). There is no hook to save the token/username in `localStorage` or `sessionStorage`.
*   **Impact**: Refreshing the browser instantly logs out the administrator and forces a redirect back to `/login`.
*   **Remediation**: Save/load authentication state from `sessionStorage` or cookies on initialization.

---

### ℹ️ Low Severity / Visual Anomalies

#### Bug 7: Global Layout Search Input Non-Functional
*   **Location**: [`Layout.tsx`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/components/Layout.tsx#L140-L154)
*   **Root Cause**: The search bar in the top layout header has no state value or onChange binding. It is a visual-only element.
*   **Impact**: Users typing in the top global search bar receive no feedback.
*   **Remediation**: Bind this input to a search context state that filters the directory pages or remove it to avoid confusion.

#### Bug 8: Duplicate Sync Status API Calls
*   **Location**: [`Layout.tsx`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/components/Layout.tsx#L123) and [line 162](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/components/Layout.tsx#L162)
*   **Root Cause**: The `<SyncStatus />` component is mounted twice (in the sidebar footer and the topbar).
*   **Impact**: On layout load, two duplicate queries hit `/sync/status` simultaneously.
*   **Remediation**: Share data via a single layout Context or query once at the app root level.

#### Bug 9: Budget Rounding Loss in Constituency Charts
*   **Location**: [`ConstituencyFunds.tsx`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/pages/ConstituencyFunds.tsx#L86-L91)
*   **Root Cause**: Budgets in lakhs are converted to crores (`/ 100`) and rounded to the nearest integer:
    ```typescript
    sanctioned: Math.round(c.total_est_cost_lacs / 100)
    ```
*   **Impact**: Budgets of smaller constituencies (e.g. ₹50 Lacs / ₹0.5 Cr) are rounded down to `0 Cr` or up to `1 Cr`, creating significant visual errors on charts.
*   **Remediation**: Preserve decimal precision using `Number((c.total_est_cost_lacs / 100).toFixed(2))`.
