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
| `/works` | GET | Paginated works list with dimension joins | `page`, `page_size`, `branch`, `zone`, `constituency`, `delivery_status`, `workflow_stage`, `search` |
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

### Phase 6 — React Dashboard
- Full frontend dashboard built using React, Vite, Tailwind CSS, Recharts.
- Connected all views (Executive Overview, Contractors, Works Directory, Constituency Funds, Data Quality) to live endpoints.
- Resilient API structure with loading/error states (`useApi.ts`, `api.ts`, `apiConfig.ts`).
- Components: `LoadingSkeleton`, `ErrorState`, `SyncStatus`, `DataQuality` page.
- Monthly spend chart replaced with **Expenditure by Fund Type** using real `dim_fund` data.
- `FlagshipAgenda` remains on mock data (Phase 5 not yet built).
- Latest commit: `95731c6` — tooltip bug fixes, glassmorphism upgrade, light theme softening, dead code cleanup.

---

## 5. Current Database State

| Table | Row Count | Notes |
|---|---|---|
| `fact_works` | 637 | Live production data |
| `dim_location` | 208 | |
| `dim_agency` | 264 | |
| `dim_fund` | 51 | |
| `dim_work_type` | — | |
| `dim_officer` | 0 | **Bug — not populated** (see open bugs) |
| `data_quality` | 0 | Truncated; quarantine count was ~2435 before fix |
| `sasci_mdf_works` | 0 | Phase 5 not yet built |

---

## 6. Open Bugs & Known Issues

Listed in priority order for next session:

1. **`dim_officer` empty** — `sync.py` resolves `officer_id` FK as an alias instead of upserting supervising officer strings into `dim_officer` the way `dim_agency` handles agency names. Needs to be brought in line with the dim table pattern.

2. **O&M `project_id` data quality metric is misleading** — Most O&M rows have no real project IDs (synthetic IDs are assigned instead). The pass rate metric conflates B&R and O&M. Consider separate B&R vs. O&M data quality metrics.

3. **Zone filter "All Zones" bug** — Frontend zone filter not working correctly when "All Zones" is selected.

4. **High Risk Works Monitoring shows "0 Flagged"** — Filtering logic issue in `ContractorMatrix.tsx`.

5. **Audit bugs 4, 6, 7, 8, 9** — Not yet addressed (from prior audit session; details in audit doc if preserved).

6. **Unresolved data fix** — Two records (MCL-0351, MCL-0352) had expenditure entered in full rupees instead of lacs. Fix requires manually clearing `_record_hash` cells in the clean sheet before re-running `testPushOnly()`. Status unconfirmed — verify in next session.

---

## 7. Key Architecture Decisions & Gotchas

- **Hash stability is the core risk for O&M identity**: Any edit to hashed fields on a synthetic-ID row breaks identity continuity. Reconciliation logic in `sync.py` must exist before any O&M rows are synced with real IDs, or duplicates will be created with no clean recovery path.
- **Stale `_record_hash` causes silent skips**: If `cleanAndNormalize()` isn't re-run after a manual correction, the old hash causes the upsert to skip the row — no error, just no update.
- **`DEALLOCATE ALL`** must be run against Neon after any `ALTER TABLE` column-size change, or asyncpg's cached prepared statements will throw `cached plan must not change result type`.
- **GAS overwrite mode**: `clearContents()` must be at the top of `scheduledSync()`, before any writes. If misplaced, quarantine counts balloon (was ~2435 instead of ~487 before fix).
- **`pushToFastAPI()` placement**: Must be called once after all tabs are processed, not inside per-row loops.

---

## 8. Next Steps 🔄

### Phase 5 — SASCI-MDF Road Pipeline (NOT STARTED)
- `sasci_mdf_works` table exists in schema but has no ingestion endpoint.
- Create `Backend/routers/sasci.py` — new FastAPI router (`POST /sync/sasci`, `GET /sasci`).
- Add GAS section to read SASCI-MDF tab and push to `/sync/sasci`.
- Update `FlagshipAgenda.tsx` to consume live SASCI data instead of mock data.

### Bug Fixes (Next Session Priority)
- Fix `dim_officer` population in `sync.py`.
- Fix Zone filter "All Zones" bug in frontend.
- Fix "0 Flagged" in `ContractorMatrix.tsx`.
- Verify MCL-0351 / MCL-0352 expenditure fix landed correctly.
- Address remaining audit bugs (4, 6, 7, 8, 9).

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
