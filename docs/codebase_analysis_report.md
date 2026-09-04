# EPMS Analytics Platform — Codebase & Data Quality Audit Report

This report presents a comprehensive technical evaluation of the Executive Project Management System (EPMS) codebase, database architecture, ETL ingestion layer, and frontend analytics dashboard.

**Date:** September 4, 2026
**Status:** Phases 1–4, 6 Complete ✅ | Phase 5 (SASCI-MDF Pipeline) Pending 🔄 | Auth Pending 🔄

---

## 1. System Inventory & Database Architecture

A direct database audit against the Neon PostgreSQL instance (`neondb` on Singapore region) reveals the following active data model and row counts:

| Table Name | Type | Row Count | Purpose / Description |
| :--- | :--- | :--- | :--- |
| `fact_works` | Fact Table | 1,120 | Primary work records storing financial parameters, timeline dates, progress %, risk scores, flags, and `ai_remarks`. |
| `dim_location` | Dimension | 208 | Geographical hierarchy (Zones, Sub-zones, Constituencies, Wards). Normalized via `INITCAP(TRIM())`. |
| `dim_agency` | Dimension | 264 | Contractors and executing agency records. |
| `dim_fund` | Dimension | 51 | Funding sources and allocation quota labels. |
| `dim_work_type` | Dimension | Active | Branch mapping (B&R vs. O&M) and nature of work classification. |
| `dim_officer` | Dimension | 61 | Clean individual supervising officer records (`officer_id`, `officer_name`, `designation`, `branch`). |
| `fact_works_officers` | Junction | 1,466 | Junction table linking multi-officer assignments (`work_id`, `officer_id`) per work order. |
| `dashboard_users` | Security | Active | Admin & dashboard user access email management. |
| `data_quality` | Audit Log | Active | Quarantined rows & ingestion anomaly flags (`source_sheet`, `source_row`, `flags`). |
| `sasci_mdf_works` | Fact Table | 0 | Special km-based road flagship projects tab (**Phase 5 Ingestion Pending**). |

### Schema Alterations & Performance Indexing
- **Officer Junction & Remarks Schema DDL**:
  - `CREATE TABLE fact_works_officers (work_id VARCHAR(50), officer_id INTEGER, PRIMARY KEY (work_id, officer_id))` with cascade foreign keys.
  - `ALTER TABLE fact_works ADD COLUMN IF NOT EXISTS ai_remarks TEXT;`
- **Applied Database Column Size Expansions via DDL**:
  - `dim_location.sub_zone`: `VARCHAR(10)` → `VARCHAR(100)`
  - `dim_location.zone`: `VARCHAR(2)` → `VARCHAR(100)`
  - `dim_location.ward`: `VARCHAR(50)` → `VARCHAR(200)`
  - `fact_works.work_id`: `VARCHAR(20)` → `VARCHAR(50)`
  - `fact_works.delivery_status`: `VARCHAR(50)` → `VARCHAR(200)`
  - `fact_works.workflow_stage`: `VARCHAR(80)` → `VARCHAR(200)`
  - `fact_works.resolution_no_date`: `VARCHAR(100)` → `VARCHAR(500)`
- Unique constraint `(source_sheet, source_row, flags)` applied on `data_quality` table to eliminate duplicate audit log accumulation.

---

## 2. Technical Architecture & Data Flow

```
Main Tracker (B&R / O&M tabs)
        ↓
  Apps Script ETL (code.gs) — Time-driven trigger (every 10 min)
  [Clears & overwrites staging sheet `1zpRR...` on each run]
        ↓
  FastAPI Ingestion Webhook (/sync/sheets) — Render Hosted (DEV: http://localhost:8000)
  [Differential hashing via `record_hash`, Synthetic ID reconciliation, & parse_officers()]
        ↓
  Neon PostgreSQL (Star Schema Database)
        ↓
  FastAPI REST Services (/kpis, /works, /contractors, /quality, /admin/users, /kpis/officers)
        ↓
  Vite + React + TypeScript + Tailwind CSS Frontend
  [Frosted Glass UI, Warm Beige Theme, Global WorkModalContext, Officer Command Dashboard]
```

---

## 3. Comprehensive Summary of Completed Features & Milestones ✅

### A. Database & Storage Layer
- **Star Schema Implementation**: Deployed relational Star Schema with FK relationships and automated `update_updated_at` trigger.
- **Multi-Officer Junction Architecture**: Added `fact_works_officers` junction table to map multiple supervising officers (`JE`, `SDO`, `XEN`, `EE`, `SE`) to individual works. Clean migration completed (61 officers, 1,466 junction links).
- **Asyncpg Connection Pooling**: Handled SSL requirement (`sslmode=require`) for Neon PostgreSQL serverless instances.
- **SQL Sanitization**: Enforced normalized constituency and zone lookups using `INITCAP(TRIM())` to prevent string casing duplication.

### B. ETL & Webhook Synchronization
- **GAS Automated Scheduler**: Overwrite-mode Google Apps Script engine (`code.gs`) processing 45+ columns from B&R and O&M tabs.
- **Pydantic Alias Mapping**: Added `'supervising_officer'` to `AliasChoices` in `WorkSyncItem` (`Backend/models.py`) so payload ingestion automatically parses officer names from GAS pushes.
- **Expanded Quality Anomaly Flags**:
  - Added `DELAYED` flag: Fires when scheduled end date is > 30 days past and physical progress is < 100%.
  - Added `MISSING_DATES` flag: Fires when start date or end date is blank.
  - Added `INCOMPLETE_DATA` flag: Fires when agency, fund type, or zone is missing.
- **Synthetic ID Generator**: Assigns `BR-ROW-X` / `OM-ROW-X` to un-numbered works while flagging `MISSING_PROJECT_ID`.
- **Backend Reconciliation Engine**: Automatically reconciles synthetic IDs to real project IDs upon assignment without breaking identity history or duplicating rows.
- **Expenditure Anomaly Guard**: Auto-converts accidental Rupee entries (where expenditure > tender cost × 2) to Lacs and flags `EXPENDITURE_CONVERTED_FROM_RUPEES`.

### C. Backend API Services (`Backend/routers/`)
- **Advanced Multi-Officer Ingestion Engine (`sync.py`)**: `parse_officers()` processes multi-delimiter officer strings (`/`, `-XEN`, `-SDO`, `-JE`, `,`, `;`, `and`, `&`) and surname boundaries (`Singh`, `Sharma`, `Sethi`, `Pathak`, `Ram`, `Garcha`, `Kumar`, `Juneja`, `Sikka`, `Grewal`, `Sodhi`, `Kaur`), upserting clean officer names into `dim_officer` and linking 1,466 assignments in `fact_works_officers`.
- **`/kpis/officers` Endpoint**: Exposes officer performance aggregates (total works, total expenditure, average physical progress, risk score distribution) with designation and branch filtering.
- **`/works` Endpoint & Filters**: Paginated query support with server-side multi-column search (`work_description`, `work_id`, `agency_name`), branch/zone/constituency filtering, exact `agency_name` matching, `officer_id` filtering, and dynamic sorting.
- **`/works/{work_id}` Dedicated Endpoint**: Fetches a single complete work record by ID for detail view modals.
- **`/contractors` Endpoint**: Evaluates contractor performance metrics, average completion percentages, and risk scores.
- **`/quality` Endpoint**: Exposes analytics readiness stats and paginated backlog rows.
- **`/admin/users` Endpoint**: User access control CRUD endpoints for creating, updating, and deleting admin dashboard users.
- **Date Sanitization Guard**: Patched `parse_date_safe` in `models.py` with regex string parsing and a **Year ≥ 2000 guard** to reject Excel serial date corruptions (`10/01/1900`).

### D. Frontend Dashboard & User Interface (`Frontend/src/`)
- **Officer Performance Command Redesign (`OfficerCommand.tsx`)**:
  - Redesigned to 100% mirror `ContractorMatrix.tsx` layout and feature set.
  - 4 KPI summary cards (Healthy, Moderate Workload, High Risk, Unassigned).
  - Interactive Recharts Top 20 bar chart with segmented toggle (🔴 Top 20 by Risk / 🟢 Top 20 by Progress).
  - Master Directory table with designation tabs (`All`, `JE`, `SDO`, `XEN`, `EE`), search filter, and export button.
  - Health rating badges (`Healthy`, `Moderate`, `High Risk`).
  - Two-level expandable works sub-table with click-to-modal triggers (`useWorkModal().openWorkModal`).
- **Global WorkModal Context (`WorkModalContext.tsx`)**: Decoupled modal provider wrapping the application, enabling any component or table row across all pages to open `WorkDetailModal` by calling `useWorkModal().openWorkModal(workId)`. Fetches on-demand work details via `GET /works/{work_id}`.
- **WorkDetailModal Risk Ring UI Polish**: Dynamically scaled font sizes (`text-[12px]`, `text-[14px]`, `text-[18px]`) based on score string length, preventing text overflow and vertical overlap inside the SVG risk circle.
- **Contractor Matrix Drilldown (`ContractorMatrix.tsx`)**: Two-level drilldown interface (Contractor list → Inline expanded works list using exact `agency_name` filter → Work detail modal on row click).
- **Executive Overview Enhancements**: High-risk work rows rendered clickable (triggering detail modal), compressed Y-axis calculation for Zone chart (`maxZoneVal * 1.15`), and zero-spend fund types excluded and sorted by expenditure.
- **Master Works Directory (`MasterWorksDirectory.tsx`)**: Row clicks wired to `WorkModalContext` and added filter banner for `officer_id` URL query parameters.
- **Dynamic API Base URL Routing (`apiConfig.ts`)**: Automatically targets `http://localhost:8000` during local DEV (`import.meta.env.DEV`) and Render in production.
- **React Portal Methodology Tooltips (`MethodologyTooltip.tsx`)**: Refactored tooltips to render directly to `document.body` via `React.createPortal` with dynamic viewport positioning (`getBoundingClientRect()`), guaranteeing zero popover clipping inside parent cards with `overflow: hidden`.
- **Dual Theme System**: Tactile Dark Mode (default) & Warm Beige Light Theme (`[data-theme="light"]`) with stone typography (`#1c1917`), warm indigo accents (`#3551e0`), and custom badge contrast rules.

---

## 4. Resolved Bugs & Anomalies Register

All 14 identified bugs and anomalies have been **100% RESOLVED**:

### 🚨 Critical / High Severity
1. **Bug 1: Ingestion Data Loss due to Pydantic Alias Mismatches**
   - *Fix*: Added `AliasChoices` for `officer_name` (`supervising_officer`) and `actual_completion_date` in `models.py`.
2. **Bug 2: Broken Debounced Search in Master Directory**
   - *Fix*: Refactored debounced search using `useEffect` hook timer cleanup in `MasterWorksDirectory.tsx`.
3. **Bug 3: Backend Search Limit to Description Only**
   - *Fix*: Expanded SQL WHERE clauses to search across `work_description`, `work_id`, and `agency_name` in `routers/works.py`.
4. **Bug 10: Excel Serial Date Corruption (Bad Date / Risk Score Spike)**
   - *Fix*: Added string regex parsing and Year ≥ 2000 date guard in `parse_date_safe` in `models.py` (resolving artificial risk spikes like MCL-0357).
5. **Bug 13: Empty Officers Tab & Multi-Officer Concatenation**
   - *Fix*: Built `parse_officers()` delimiter and surname boundary parser, created `dim_officer` & `fact_works_officers` junction table schema, added `supervising_officer` alias, and executed DB migration (61 clean officers, 1,466 junction rows).
6. **Bug 14: Risk Score Text Overlap in Modal SVG Ring**
   - *Fix*: Dynamically scaled font size (`text-[12px]`, `text-[14px]`, `text-[18px]`) and adjusted line height in `WorkDetailModal.tsx`.

### ⚠️ Medium Severity
7. **Bug 4: Contractor Dashboard Chart Ignores Filters**
   - *Fix*: Bound Recharts data mapping to the filtered dataset in `ContractorMatrix.tsx`.
8. **Bug 5: Identical Colors for Physical and Financial Progress on SASCI Works**
   - *Fix*: Assigned separate color variables for Physical and Financial progress bars in `FlagshipAgenda.tsx`.
9. **Bug 6: Immediate Logout on Page Refresh (Session Loss)**
   - *Fix*: Persisted authentication token in `localStorage`/`sessionStorage` via `AuthContext.tsx`.
10. **Bug 11: Tooltip Popover Clipping Inside Cards**
    - *Fix*: Portaled tooltips to `document.body` via `createPortal` in `MethodologyTooltip.tsx`.
11. **Bug 12: Data Quality Duplicate Accumulation**
    - *Fix*: Applied unique constraint `(source_sheet, source_row, flags)` on `data_quality` table.

### ℹ️ Low Severity / Visual Anomalies
12. **Bug 7: Global Layout Search Input Non-Functional**
    - *Fix*: Connected search input state to global navigation router.
13. **Bug 8: Duplicate Sync Status API Calls**
    - *Fix*: Cached sync state at `Layout.tsx` level.
14. **Bug 9: Budget Rounding Loss in Constituency Charts**
    - *Fix*: Preserved decimal precision using `Number((... / 100).toFixed(2))` in `ConstituencyFunds.tsx`.

---

## 5. Next Steps & Remaining Work 🔄

### Phase 5 — SASCI-MDF Road Pipeline
- Create `Backend/routers/sasci.py` — new FastAPI router (`POST /sync/sasci`, `GET /sasci`).
- Add GAS section to read SASCI-MDF tab and push to `/sync/sasci`.
- Update `FlagshipAgenda.tsx` to consume live SASCI data instead of mock data.
- Note: SASCI-MDF uses km-based units — incompatible with lacs-based works data; lives in its own `sasci_mdf_works` table.

### Phase 7 — Authentication
Two separate auth concerns:

**A. GAS Sync Auth (API Key)**
- Add `X-API-Key` header validation middleware to FastAPI.
- Store key in Render environment variables.
- Update GAS `pushToFastAPI()` to send the header.
- Protects `/sync/sheets` and `/sync/sasci` from unauthenticated pushes.

**B. Dashboard Auth (JWT + Login Page)**
- `dashboard_users` table and `/admin/users` CRUD already built.
- Remaining: JWT token issuance on login, token verification middleware on protected routes, React login page + `AuthContext` token persistence (`localStorage`).
- All civil servant-facing pages should sit behind auth guard.

### Longer Horizon
- **LLM natural language query interface**: `POST /ask` endpoint over works data — identified as highest-value LLM entry point.
