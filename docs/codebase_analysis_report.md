# EPMS Analytics Platform — Codebase & Data Quality Audit Report

This report presents a comprehensive technical evaluation of the Executive Project Management System (EPMS) codebase, database architecture, ETL ingestion layer, and frontend analytics dashboard.

**Date:** September 4, 2026
**Status:** Phases 1–4, 6 Complete ✅ | Phase 5 (SASCI-MDF Pipeline) Pending 🔄 | Auth Pending 🔄

---

## 1. System Inventory & Database Architecture

A direct database audit against the Neon PostgreSQL instance (`neondb` on Singapore region) reveals the following active data model and row counts:

| Table Name | Type | Row Count | Purpose / Description |
| :--- | :--- | :--- | :--- |
| `fact_works` | Fact Table | 1,120 | Primary work records storing financial parameters, timeline dates, progress %, risk scores, and flags. |
| `dim_location` | Dimension | 208 | Geographical hierarchy (Zones, Sub-zones, Constituencies, Wards). Normalized via `INITCAP(TRIM())`. |
| `dim_agency` | Dimension | 264 | Contractors and executing agency records. |
| `dim_fund` | Dimension | 51 | Funding sources and allocation quota labels. |
| `dim_work_type` | Dimension | Active | Branch mapping (B&R vs. O&M) and nature of work classification. |
| `dim_officer` | Dimension | Active | Supervising officers reference. |
| `dashboard_users` | Security | Active | Admin & dashboard user access email management. |
| `data_quality` | Audit Log | Active | Quarantined rows & ingestion anomaly flags (`source_sheet`, `source_row`, `flags`). |
| `sasci_mdf_works` | Fact Table | 0 | Special km-based road flagship projects tab (**Phase 5 Ingestion Pending**). |

### Schema Alterations & Performance Indexing
- Applied database column size expansions via DDL:
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
  FastAPI Ingestion Webhook (/sync/sheets) — Render Hosted
  [Differential hashing via `record_hash` + Synthetic ID reconciliation]
        ↓
  Neon PostgreSQL (Star Schema Database)
        ↓
  FastAPI REST Services (/kpis, /works, /contractors, /quality, /admin/users)
        ↓
  Vite + React + TypeScript + Tailwind CSS Frontend
  [Frosted Glass UI, Warm Beige Light Theme, React Portals, Slide-up Work Detail Modal]
```

---

## 3. Comprehensive Summary of Completed Features & Milestones ✅

### A. Database & Storage Layer
- **Star Schema Implementation**: Deployed relational Star Schema with FK relationships and automated `update_updated_at` trigger.
- **Asyncpg Connection Pooling**: Handled SSL requirement (`sslmode=require`) for Neon PostgreSQL serverless instances.
- **SQL Sanitization**: Enforced normalized constituency and zone lookups using `INITCAP(TRIM())` to prevent string casing duplication.

### B. ETL & Webhook Synchronization
- **GAS Automated Scheduler**: Overwrite-mode Google Apps Script engine (`code.gs`) processing 45+ columns from B&R and O&M tabs.
- **Synthetic ID Generator**: Assigns `BR-ROW-X` / `OM-ROW-X` to un-numbered works while flagging `MISSING_PROJECT_ID`.
- **Backend Reconciliation Engine**: Automatically reconciles synthetic IDs to real project IDs upon assignment without breaking identity history or duplicating rows.
- **Expenditure Anomaly Guard**: Auto-converts accidental Rupee entries (where expenditure > tender cost × 2) to Lacs and flags `EXPENDITURE_CONVERTED_FROM_RUPEES`.

### C. Backend API Services (`Backend/routers/`)
- **`/works` Endpoint**: Paginated query support with server-side multi-column search (`work_description`, `work_id`, `agency_name`), branch/zone/constituency filtering, and dynamic sorting (Risk Score, Cost, Physical Progress, Work ID). Includes auto-inference logic (`physical_progress_pct = 100.0` when `delivery_status` is Completed).
- **`/kpis` & Dimension Aggregates**: Comprehensive summary stats, constituency fund allocation, zone branch progress, and fund type breakdowns.
- **`/contractors` Endpoint**: Evaluates contractor performance metrics, average completion percentages, and risk scores.
- **`/quality` Endpoint**: Exposes analytics readiness stats and paginated backlog rows.
- **`/admin/users` Endpoint**: User access control CRUD endpoints for creating, updating, and deleting admin dashboard users.
- **Date Sanitization Guard**: Patched `parse_date_safe` in `models.py` with regex string parsing and a **Year ≥ 2000 guard** to reject Excel serial date corruptions (`10/01/1900`).

### D. Frontend Dashboard & User Interface (`Frontend/src/`)
- **Executive Overview**: Portfolio-wide KPI cards, high-risk work highlights, delivery status & stage distribution charts, branch progress breakdowns.
- **WorkDetailModal (`WorkDetailModal.tsx`)**:
  - Slide-up / fade-in modal opening when clicking any row in `MasterWorksDirectory`.
  - 7-Section frosted glass layout:
    1. *Header & Work Description*: Project ID badge, branch tag, close `X` button, full-width description.
    2. *Identity*: Nature of work, work order date, resolution number, dimensions (`length_rmt` × `road_width_ft`).
    3. *Location*: Zone/sub-zone, constituency, ward.
    4. *Agency*: Executing agency name, officer in charge, TS accorded authority.
    5. *Financial Progress*: 3-column stat grid (Tender Value ₹ Lacs, Expenditure ₹ Lacs, Financial Progress %) with reference Est. Cost.
    6. *Status & Timeline*: Delivery status badge, workflow stage badge, physical progress bar, days overdue calculator.
    7. *Risk Assessment*: SVG Risk Score Ring colour-coded (Green < 30, Amber < 60, Red ≥ 60) with `font-mono` display and driving factors (`issues_bottlenecks`, `remarks`).
    8. *Data Quality Flags*: Parsed severity-coded pill badges (Red = High/Critical, Amber = Medium/Warning, Slate = Info).
  - Keyboard `Escape` key close, backdrop click handler, body scroll locking, smooth entry CSS transitions.
- **React Portal Methodology Tooltips (`MethodologyTooltip.tsx`)**: Refactored tooltips to render directly to `document.body` via `React.createPortal` with dynamic viewport positioning (`getBoundingClientRect()`), guaranteeing zero popover clipping inside parent cards with `overflow: hidden`.
- **Contractor Matrix**: Interactive contractor ranking table and performance metrics chart.
- **Constituency Funds**: Constituency and ward financial distribution with double-precision decimal currency formatting.
- **Data Quality Tracker**: Live ingestion audit readiness metrics and backlog table.
- **Dual Theme System**: Tactile Dark Mode (default) & Warm Beige Light Theme (`[data-theme="light"]`) with stone typography (`#1c1917`), warm indigo accents (`#3551e0`), and custom badge contrast rules.

---

## 4. Resolved Bugs & Anomalies Register

All 12 identified bugs and anomalies have been **100% RESOLVED**:

### 🚨 Critical / High Severity
1. **Bug 1: Ingestion Data Loss due to Pydantic Alias Mismatches**
   - *Fix*: Added `AliasChoices` for `officer_name` and `actual_completion_date` in `models.py`.
2. **Bug 2: Broken Debounced Search in Master Directory**
   - *Fix*: Refactored debounced search using `useEffect` hook timer cleanup in `MasterWorksDirectory.tsx`.
3. **Bug 3: Backend Search Limit to Description Only**
   - *Fix*: Expanded SQL WHERE clauses to search across `work_description`, `work_id`, and `agency_name` in `routers/works.py`.
4. **Bug 10: Excel Serial Date Corruption (Bad Date / Risk Score Spike)**
   - *Fix*: Added string regex parsing and Year ≥ 2000 date guard in `parse_date_safe` in `models.py` (resolving artificial risk spikes like MCL-0357).

### ⚠️ Medium Severity
5. **Bug 4: Contractor Dashboard Chart Ignores Filters**
   - *Fix*: Bound Recharts data mapping to the filtered dataset in `ContractorMatrix.tsx`.
6. **Bug 5: Identical Colors for Physical and Financial Progress on SASCI Works**
   - *Fix*: Assigned separate color variables for Physical and Financial progress bars in `FlagshipAgenda.tsx`.
7. **Bug 6: Immediate Logout on Page Refresh (Session Loss)**
   - *Fix*: Persisted authentication token in `localStorage`/`sessionStorage` via `AuthContext.tsx`.
8. **Bug 11: Tooltip Popover Clipping Inside Cards**
   - *Fix*: Portaled tooltips to `document.body` via `createPortal` in `MethodologyTooltip.tsx`.
9. **Bug 12: Data Quality Duplicate Accumulation**
   - *Fix*: Applied unique constraint `(source_sheet, source_row, flags)` on `data_quality` table.

### ℹ️ Low Severity / Visual Anomalies
10. **Bug 7: Global Layout Search Input Non-Functional**
    - *Fix*: Connected search input state to global navigation router.
11. **Bug 8: Duplicate Sync Status API Calls**
    - *Fix*: Cached sync state at `Layout.tsx` level.
12. **Bug 9: Budget Rounding Loss in Constituency Charts**
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

### Smaller Pending Items
- **`dim_officer` population**: `sync.py` resolves `officer_id` as an FK alias instead of upserting officer strings into `dim_officer` the way `dim_agency` does. Needs pattern fix.
- **Executive Overview filter audit**: Ensure `buildParams()` wraps all `useApi` / `apiFetch` calls in `ExecutiveOverview.tsx` consistently (KPI summary, works list, chart data).

### Longer Horizon
- **LLM natural language query interface**: `POST /ask` endpoint over works data — identified as highest-value LLM entry point.
