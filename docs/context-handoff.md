# MCL Analytics Pipeline — Handoff Document
**Project:** MCL Development Project Tracker — Data Pipeline
**Date:** August 31, 2026
**Status:** Phases 1–4, 6 Complete ✅ | Phase 5 (SASCI-MDF Pipeline) Pending 🔄

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
  FastAPI Ingestion Webhook (/sync/sheets) — https://epms-m755.onrender.com
        ↓
  Neon PostgreSQL (Star Schema Database) — Singapore region, db: neondb
        ↓
  Analytics REST API (/kpis, /works, /contractors, /quality, /sync/status)
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
| `/works` | GET | Paginated works list with dimension joins | `page`, `page_size`, `branch`, `zone`, `constituency`, `delivery_status`, `workflow_stage`, `search`, `sort_by`, `sort_order` |
| `/contractors` | GET | Agency performance ranked by risk | None |
| `/quality` | GET | Analytics readiness stats + paginated backlog rows | `page`, `page_size` |
| `/health` | GET | DB connection health check | None |

---

## 4. What Has Been Completed ✅

### Phase 1 — Neon Star Schema Database
- All tables deployed: `fact_works`, `dim_location`, `dim_agency`, `dim_fund`, `dim_work_type`, `dim_officer`, `data_quality`, `sasci_mdf_works`
- Indexes, constraints, and `update_updated_at` trigger active.
- **Column size fixes applied this session** (all via `ALTER TABLE`):
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
- **OVERWRITE mode**: staging tab is fully cleared and rewritten on each sync (`clearContents()` at top of `scheduledSync()` before any writes).
- **Synthetic ID Generation**: Automatically assigns `OM-ROW-X` or `BR-ROW-X` to rows lacking a project ID, marking them with `id_type: "SYNTHETIC"`.
- The correct production version is the **45-column mature version** with full normalization maps. A broken stripped-down rewrite produced in a prior session should not be used.
- Canonical maps for `nature_of_work`, `workflow_stage`, `delivery_status`.
- Flags: `MISSING_PROJECT_ID`, `SYNTHETIC_ID`, `UNMAPPED_*`, `UNRESOLVED_LOCATION`, `MISSING_AGENCY`, `FIN_PROGRESS_ANOMALY`, `EXPENDITURE_OUTLIER`, `EXPENDITURE_CONVERTED_FROM_RUPEES`.
- **Expenditure guard**: handles cases where expenditure > tender cost × 2 by attempting auto-conversion (divide by 100,000).
- Calls `pushToFastAPI()` **once at end of `scheduledSync()`** — NOT inside `writeToStaging()` per row (the latter causes GAS to exceed max execution time).
- **GAS global scope rule**: All `.gs` files share one global scope — duplicate `const` declarations across files cause `SyntaxError: Identifier already declared`. Keep shared constants in `code.gs` only.

### Phase 3 — FastAPI Backend (`sync.py` and routers)
- Asyncpg pool with Neon SSL compatibility.
- **Synthetic ID Reconciliation**: When a real project ID is assigned to a previously synthetic row, the backend upgrades `OM-ROW-X` to the real ID without duplicating history.
- `POST /sync/sheets`: resolves dimension FKs, computes `days_overdue` + `risk_score`, upserts via `record_hash` differential, inserts quality backlog.
- `GET /kpis`, `GET /kpis/constituencies`, `GET /kpis/zones`, `GET /kpis/fund-distribution`, `GET /works`, `GET /contractors`, `GET /quality`, `GET /sync/status` endpoints built.
- **`sync.py` confirmed correct** this session — no changes needed to it. The correct version was document 6/6 from the prior session's recovery set.

### Phase 4 — GAS → FastAPI → Neon Pipeline Verified
- End-to-end pipeline functioning cleanly.
- **Verified sync result (August 31):** 1163 rows processed, 551 upserted, 612 skipped (hash-unchanged), 4 quarantined, 0 errors.

### Phase 6 — React Dashboard & Sprints 1–3 Enhancements
- Full frontend dashboard built using React, Vite, Tailwind CSS, Recharts.
- Connected all views (Executive Overview, Contractors, Works Directory, Constituency Funds, Data Quality, Admin Profile) to live endpoints.
- Resilient API structure with loading/error states (`useApi.ts`, `api.ts`, `apiConfig.ts`).
- **Methodology Registry & React Portal Tooltips**: Built centralized metric definitions registry (`methodology.ts`) and refactored `MethodologyTooltip.tsx` to render popovers via `createPortal` directly to `document.body` with viewport position calculation (`getBoundingClientRect()`) and scroll/resize repositioning. Completely immune to parent card `overflow: hidden` boundaries.
- **Master Works Directory Sorting**: Added dynamic sorting controls (Risk Score, Cost, Days Overdue, Physical Progress) and header tooltip integrations.
- **Admin Email Management UI**: Built `dashboard_users` Neon DB table, `/admin/users` CRUD REST endpoints in FastAPI, and `ProfilePage.tsx` interface for admin email access management.
- **Date Ingestion Sanitization**: Patched `parse_date_safe` in `models.py` with string regex extraction and a **Year ≥ 2000 guard** to reject Excel serial number errors (e.g. `10/01/1900`), fixing artificial risk score spikes (MCL-0357).
- **Warm Beige Theme Engine**: Redesigned Light Theme (`[data-theme="light"]`) with a warm beige stone color palette (`#f5f2eb`), rich stone typography (`#1c1917`), warm indigo accents (`#3551e0`), and warm amber/emerald/crimson status badges.

---

## 5. Current Database State

| Table | Row Count | Notes |
|---|---|---|
| `fact_works` | 1,120 | Live production data |
| `dim_location` | 208 | Normalized constituency names (`INITCAP(TRIM())`) |
| `dim_agency` | 264 | |
| `dim_fund` | 51 | |
| `dim_work_type` | — | |
| `dim_officer` | 0 | Supervising officer reference |
| `dashboard_users` | Active | Admin & user email access management table |
| `data_quality` | Active | Truncated legacy duplicates; unique constraint `(source_sheet, source_row, flags)` applied |
| `sasci_mdf_works` | 0 | Phase 5 pending |

---

## 6. Open Bugs & Resolved Issues

### Resolved Issues ✅
1. **MCL-0357 Bad Date / Risk Score Spike**: Fixed via regex string cleaning and Year ≥ 2000 date guard in `parse_date_safe`.
2. **Tooltip Popover Clipping**: Solved by portaling tooltips to `document.body` via `createPortal`.
3. **Data Quality Duplicate Accumulation**: Unique constraint applied to `data_quality` and table truncated in Neon.
4. **Constituency Name Inconsistency**: Cleaned in Neon DB via `INITCAP(TRIM())`.

### Pending Items 🔄
1. **Executive Overview Filter Audit**: Audit and wrap all `useApi` / `apiFetch` hooks in `ExecutiveOverview.tsx` to ensure `buildParams()` wraps all calls (KPI summary, works list, chart data) consistently.
2. **Phase 5 — SASCI-MDF Road Pipeline**: Road ingestion pipeline and `FlagshipAgenda.tsx` integration.
3. **`dim_officer` population**: Refine `sync.py` officer resolution to match dim table pattern.

---

## 7. Key Architecture Decisions & Gotchas

- **React Portals for Floating UI**: Floating popovers/tooltips must use `createPortal(..., document.body)` with `fixed` positioning and `getBoundingClientRect()` to prevent clipping inside cards with `overflow: hidden` or CSS stacking contexts (`backdrop-filter`, `transform`).
- **Date Validation Rule**: Any date parsed before year 2000 is rejected in `models.py` as Excel serial date corruption (`10/01/1900`).
- **Hash stability is the core risk for O&M identity**: Any edit to hashed fields on a synthetic-ID row breaks identity continuity. Reconciliation logic in `sync.py` must exist before any O&M rows are synced with real IDs.
- **`DEALLOCATE ALL`** must be run against Neon after any `ALTER TABLE` column-size change.
- **GAS overwrite mode**: `clearContents()` must be at the top of `scheduledSync()`.

---

## 8. Next Steps 🔄

### Phase 5 — SASCI-MDF Road Pipeline
- Create `Backend/routers/sasci.py` — new FastAPI router (`POST /sync/sasci`, `GET /sasci`).
- Add GAS section to read SASCI-MDF tab and push to `/sync/sasci`.
- Update `FlagshipAgenda.tsx` to consume live SASCI data instead of mock data.

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
