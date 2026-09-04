# MCL Analytics Pipeline — Handoff Document
**Project:** MCL Development Project Tracker — Data Pipeline
**Date:** September 4, 2026
**Status:** Phases 1–4, 6 Complete ✅ | Phase 5 (SASCI-MDF Pipeline) Pending 🔄 | Auth Pending 🔄

---

## 1. System Architecture

```
Main Tracker (B&R / O&M tabs)
        ↓
  Apps Script ETL (code.gs) — every 10 minutes via time-based trigger
  [OVERWRITE mode — full tab rewrite each sync, no row-by-row upsert]
        ↓
  Clean Staging Sheet (B&R & O&M tabs) — Sheet ID: 1zpRR55bZywWpwy8iDbgiLrYHRCScc8vPQHkUEYuEgiQ
        ↓
  FastAPI Ingestion Webhook (/sync/sheets) — https://epms-m755.onrender.com (DEV: http://localhost:8000)
        ↓
  Neon PostgreSQL (Star Schema Database) — Singapore region, db: neondb
        ↓
  Analytics REST API (/kpis, /works, /contractors, /quality, /kpis/officers, /sync/status)
        ↓
  React Frontend Dashboard — Vite + TypeScript + Tailwind (Live UI connected to backend)
```

---

## 2. Key IDs & URLs

| Resource | Value |
|---|---|
| Main Tracker Sheet | `1ZmN57IxVr3yOEntADZI5Dcr2WhsM8XbQFbn8clf33Fo` |
| Clean Staging Sheet | `1zpRR55bZywWpwy8iDbgiLrYHRCScc8vPQHkUEYuEgiQ` |
| FastAPI Backend (Render) | `https://epms-m755.onrender.com` |
| Local Backend Server | `http://localhost:8000` |
| Neon DB | `neondb`, user: `neondb_owner`, region: Singapore |
| GAS Trigger | `scheduledSync` every 10 minutes |

---

## 3. API Endpoint Reference

| Endpoint | Method | Purpose | Key Parameters |
|---|---|---|---|
| `/sync/sheets` | POST | Receives clean staging rows, upserts to DB | `{ works: [...], quality: [...] }` |
| `/sync/status` | GET | Returns last synced timestamp + total works count | None |
| `/kpis` | GET | Dashboard summary cards, distributions | Optional: `branch` |
| `/kpis/constituencies` | GET | Constituency-level aggregates (cost, expenditure, counts) | Optional: `branch` |
| `/kpis/zones` | GET | Zone-level avg physical/financial progress by branch | Optional: `branch` |
| `/kpis/fund-distribution` | GET | Expenditure breakdown by fund type | None |
| `/kpis/officers` | GET | Supervising officer metrics & workload breakdown | Optional: `designation`, `branch` |
| `/works` | GET | Paginated works list with dimension joins | `page`, `page_size`, `branch`, `zone`, `constituency`, `delivery_status`, `workflow_stage`, `search`, `officer_id`, `agency_id`, `agency_name`, `sort_by`, `sort_order` |
| `/works/{work_id}` | GET | Fetch single work details by unique ID | `work_id` |
| `/contractors` | GET | Agency performance ranked by risk | None |
| `/quality` | GET | Analytics readiness stats + paginated backlog rows | `page`, `page_size` |
| `/health` | GET | DB connection health check | None |

---

## 4. What Has Been Completed ✅

### Phase 1 — Neon Star Schema Database
- All tables deployed: `fact_works`, `dim_location`, `dim_agency`, `dim_fund`, `dim_work_type`, `dim_officer`, `fact_works_officers`, `dashboard_users`, `data_quality`, `sasci_mdf_works`.
- Indexes, constraints, and `update_updated_at` trigger active.
- **Junction Table & Officers Schema**:
  - `dim_officer`: Stores parsed officer entries (`officer_id`, `officer_name`, `designation`, `branch`).
  - `fact_works_officers`: Junction table for multi-officer assignments (`work_id`, `officer_id`).
  - `fact_works.ai_remarks`: Added text column for AI summaries/insights.
- **Column size fixes applied** (all via `ALTER TABLE`):
  - `dim_location.sub_zone`: varchar(10) → 100
  - `dim_location.zone`: varchar(2) → 100
  - `dim_location.ward`: varchar(50) → 200
  - `fact_works.work_id`: varchar(20) → 50
  - `fact_works.delivery_status`: varchar(50) → 200
  - `fact_works.workflow_stage`: varchar(80) → 200
  - `fact_works.resolution_no_date`: varchar(100) → 500
- `DEALLOCATE ALL` required after schema changes to clear asyncpg statement cache.

### Phase 2 — Google Apps Script ETL (`code.gs`)
- Reads B&R and O&M tabs from main tracker every 10 minutes.
- **OVERWRITE mode**: staging tab is fully cleared and rewritten on each sync (`clearContents()` at top of `scheduledSync()`).
- **Synthetic ID Generation**: Automatically assigns `OM-ROW-X` or `BR-ROW-X` to rows lacking a project ID, marking them with `id_type: "SYNTHETIC"`.
- Canonical maps for `nature_of_work`, `workflow_stage`, `delivery_status`.
- **Expanded Data Quality Flags**:
  - `MISSING_PROJECT_ID`, `SYNTHETIC_ID`, `UNMAPPED_*`, `UNRESOLVED_LOCATION`, `MISSING_AGENCY`, `FIN_PROGRESS_ANOMALY`, `EXPENDITURE_OUTLIER`, `EXPENDITURE_CONVERTED_FROM_RUPEES`.
  - `DELAYED`: Scheduled end date > 30 days past and physical progress < 100%.
  - `MISSING_DATES`: Start date or end date is blank/missing.
  - `INCOMPLETE_DATA`: Agency, fund type, or zone is missing.
- **Expenditure guard**: Auto-converts values when expenditure > tender cost × 2 by dividing by 100,000.
- Calls `pushToFastAPI()` **once at end of `scheduledSync()`**.

### Phase 3 — FastAPI Backend (`sync.py` and routers)
- Asyncpg pool with Neon SSL compatibility.
- **Multi-Officer Parsing (`parse_officers()`)**:
  - Parses multi-officer strings containing roles (`JE`, `SDO`, `XEN`, `EE`, `OTHER`).
  - Upserts distinct officer names into `dim_officer`, updates primary officer FK `fact_works.officer_id`, and populates `fact_works_officers` junction table.
- **Synthetic ID Reconciliation**: Upgrades `OM-ROW-X` to real project IDs without duplicating history.
- `GET /kpis/officers`: Provides aggregate metrics per officer filtered by designation or branch.
- `GET /works/{work_id}`: Dedicated detail endpoint for single work lookup.
- `GET /works` enhancements: Added `officer_id`, `agency_id`, and exact `agency_name` filtering.

### Phase 4 — GAS → FastAPI → Neon Pipeline Verified
- End-to-end pipeline functioning cleanly.
- Sync processing verified with automated hash-differential row upserts and quarantine logic.

### Phase 6 — React Dashboard & Sprints 1–4 Enhancements
- Full frontend dashboard built using React, Vite, Tailwind CSS, Recharts.
- **Global WorkModal Context (`WorkModalContext.tsx`)**: Application-wide provider to trigger `WorkDetailModal` from any component/table row via `useWorkModal().openWorkModal(workId)`. Fetches fresh record on demand via `GET /works/{work_id}`.
- **Officer Command Dashboard (`OfficerCommand.tsx`)**: Interactive officer tracking page with performance cards, designation tabs (`JE`, `SDO`, `XEN`, `EE`, `All`), search filter, risk badges, and direct drill-through links to Works Directory.
- **Contractor Matrix Drilldown (`ContractorMatrix.tsx`)**: Two-level drilldown (Contractor list → Inline expanded works using exact `agency_name` filter → Work detail modal).
- **Executive Overview Enhancements (`ExecutiveOverview.tsx`)**: Clickable high-risk rows, dynamic Y-axis calculation for Zone chart (`maxZoneVal * 1.15`), filtered 0-expenditure fund types sorted by spend.
- **Master Works Directory (`MasterWorksDirectory.tsx`)**: Integrated global modal context and added banner notification for `officer_id` URL query filter.
- **Dynamic API Routing (`apiConfig.ts`)**: DEV builds automatically target local backend (`http://localhost:8000`) while PROD targets Render.
- **Warm Beige Theme Engine**: Light theme (`[data-theme="light"]`) with warm stone palette (`#f5f2eb`), dark stone typography (`#1c1917`), and warm indigo accents (`#3551e0`).
- **React Portal Tooltips (`MethodologyTooltip.tsx`)**: Renders metric popovers via `createPortal` to `document.body`, immune to `overflow: hidden` containers.

---

## 5. Current Database State

| Table | Row Count | Notes |
|---|---|---|
| `fact_works` | 1,120 | Live production data |
| `dim_location` | 208 | Normalized constituency names (`INITCAP(TRIM())`) |
| `dim_agency` | 264 | |
| `dim_fund` | 51 | |
| `dim_work_type` | — | |
| `dim_officer` | Active | Populates on next sync via `parse_officers()` |
| `fact_works_officers` | Active | Junction table linking multi-officer assignments |
| `dashboard_users` | Active | Admin & user email access management table |
| `data_quality` | Active | Unique constraint `(source_sheet, source_row, flags)` applied |
| `sasci_mdf_works` | 0 | Phase 5 pending |

---

## 6. Open Bugs & Resolved Issues

### Resolved Issues ✅
1. **Empty Officers Dropdown / Drilldown**: Added `parse_officers()` logic in `sync.py`, created `dim_officer` and `fact_works_officers` schema, and built `GET /kpis/officers`.
2. **Contractor Works Count Mismatch**: Replaced broad text `search` with exact `agency_name` filter in `GET /works`.
3. **MCL-0357 Bad Date / Risk Score Spike**: Fixed via regex string cleaning and Year ≥ 2000 date guard in `parse_date_safe`.
4. **Tooltip Popover Clipping**: Solved by portaling tooltips to `document.body` via `createPortal`.
5. **Data Quality Duplicate Accumulation**: Unique constraint applied to `data_quality`.

### Pending Items 🔄
1. **Officer Data Ingestion Run**: Trigger/run next GAS sync to execute `parse_officers()` across existing 1,120 works and populate `dim_officer` and `fact_works_officers`.
2. **Executive Overview Filter Audit**: Ensure all custom filter hooks wrap dashboard summary cards and chart endpoints consistently.

---

## 7. Key Architecture Decisions & Gotchas

- **Global Work Detail Modal**: Uses `WorkModalContext` to decouple modal state from individual table components. Modal fetches single work data on demand using `GET /works/{work_id}`.
- **Exact Agency Matching**: Searching by agency name in query parameters uses `agency_name` exact match rather than `search` text search to prevent partial string collisions across contractors.
- **React Portals for Floating UI**: Floating popovers/tooltips must use `createPortal(..., document.body)` with `fixed` positioning and `getBoundingClientRect()` to prevent clipping inside cards.
- **Date Validation Rule**: Any date parsed before year 2000 is rejected in `models.py` as Excel serial date corruption (`10/01/1900`).
- **`DEALLOCATE ALL`**: Must be run against Neon after any `ALTER TABLE` column-size change.

---

## 8. Next Steps & Remaining Work 🔄

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

**B. Dashboard Auth (JWT / Sessions)**
- Add user authentication (login page, JWT tokens, protected routes).
- Wire `dashboard_users` table with login & role-based access control.

---

## 9. How to Run Locally

```bash
# From project root — starts frontend (port 5173) and backend (port 8000) concurrently
npm run dev:full
```

Backend `.env` at `Backend/.env`:
```env
DATABASE_URL=postgresql://<user>:<password>@<host>/neondb?sslmode=require
```
