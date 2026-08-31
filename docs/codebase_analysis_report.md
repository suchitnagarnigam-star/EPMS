# EPMS Analytics Platform — Codebase & Data Quality Audit Report

This report presents a thorough evaluation of the Executive Project Management System (EPMS) codebase, database records, and integration layers. It identifies structural inconsistencies, functional discrepancies, and rendering bugs across the stack.

**Status Update (August 31, 2026):** All bugs and visual anomalies listed in this report were **RESOLVED** during the Phase 6 (React Dashboard Integration) and Backend finalization milestones. This document remains as a historical audit record.

---

## 1. System Inventory & Database Statistics

A direct database row count query against the Neon PostgreSQL instance reveals the following data inventory:

| Table Name | Purpose / Description |
| :--- | :--- |
| `fact_works` | Central unified records containing project parameters, financial metrics, and progress. |
| `dim_location` | Geographical dimensions (Zones, Sub-zones, Constituencies, Wards). |
| `dim_agency` | Contractors and executing agencies. |
| `dim_fund` | Funding sources and allocation quotas. |
| `dim_work_type` | Branch mapping (B&R vs. O&M) and nature of work classification. |
| `dim_officer` | Supervising officers. |
| `data_quality` | Quarantined spreadsheet rows failing project ID identification. |
| `sasci_mdf_works` | Special km-based road flagship projects. **[PENDING IMPLEMENTATION]** |

---

## 2. Technical Architecture Overview

The EPMS application consists of:
1. **ETL Layer (Google Apps Script)**: Fetches raw rows from B&R and O&M tabs on the Main Tracker, cleans values against canonical maps, validates structures, and pushes JSON payloads to the FastAPI backend webhook.
2. **FastAPI Backend (Python)**: Runs on Render, utilizing `asyncpg` to perform database upserts via differential hashing and exposing KPIs, paginated work lists, contractor matriculation records, and quality stats.
3. **Frontend Dashboard (Vite + React + TS)**: Visualizes the portfolios via Recharts with dark mode aesthetic styling, client-side pagination, filters, and dynamic layout.

---

## 3. Strict Bugs & Anomalies Register (RESOLVED)

### 🚨 Critical / High Severity Bugs

#### Bug 1: Ingestion Data Loss due to Pydantic Alias Mismatches
*   **Root Cause**: The raw JSON payload pushed from the Google Sheets Apps Script contained keys that did not match the expected field names or validation aliases in the FastAPI Pydantic schemas.
*   **Status**: **RESOLVED**. Added correct `AliasChoices` for `officer_name` and `actual_completion_date` in `models.py`.

#### Bug 2: Broken Debounced Search in Master Directory
*   **Root Cause**: The debounced search handler returned a cleanup function from the callback but React input `onChange` handlers ignore the returned value, so the timeout timer was never cleared.
*   **Status**: **RESOLVED**. Used a `useEffect` hook to handle debouncing state updates properly in `MasterWorksDirectory.tsx`.

#### Bug 3: Backend Search Limit to Description Only (UX Mismatch)
*   **Root Cause**: The backend implementation only queried `F.work_description`, causing Project ID or Agency searches to fail.
*   **Status**: **RESOLVED**. Expanded backend conditions to check `work_id` and `agency_name` in `routers/works.py`.

---

### ⚠️ Medium Severity Bugs

#### Bug 4: Contractor Dashboard Chart Ignores Filters
*   **Root Cause**: The Recharts bar chart mapped `chartData` directly from the unfiltered contractor list rather than the `filtered` list.
*   **Status**: **RESOLVED**. Data mapping fixed to use the `filtered` variable in `ContractorMatrix.tsx`.

#### Bug 5: Identical Colors for Physical and Financial Progress on SASCI works
*   **Root Cause**: Both the Physical Progress bar and the Financial Progress bar were colored exactly the same teal shade if it was a SASCI work.
*   **Status**: **RESOLVED**. Used separate color mappings for Physical and Financial bars in `FlagshipAgenda.tsx`.

#### Bug 6: Immediate Logout on Page Refresh (Session Loss)
*   **Root Cause**: Authentication state was stored strictly in memory (`useState(false)`).
*   **Status**: **RESOLVED**. Saved/loaded authentication state from `sessionStorage`/`localStorage` in `AuthContext.tsx`.

---

### ℹ️ Low Severity / Visual Anomalies

#### Bug 7: Global Layout Search Input Non-Functional
*   **Root Cause**: The search bar in the top layout header had no state value or onChange binding.
*   **Status**: **RESOLVED**. Search bar integrated and made fully functional across necessary views.

#### Bug 8: Duplicate Sync Status API Calls
*   **Root Cause**: The `<SyncStatus />` component was mounted twice, triggering duplicate API calls.
*   **Status**: **RESOLVED**. Query state shared at the layout level / cached to prevent duplicate fetches.

#### Bug 9: Budget Rounding Loss in Constituency Charts
*   **Root Cause**: Budgets in lakhs were converted to crores and rounded to the nearest integer, losing precision for smaller constituencies.
*   **Status**: **RESOLVED**. Preserved decimal precision using `Number((... / 100).toFixed(2))` in `ConstituencyFunds.tsx`.
