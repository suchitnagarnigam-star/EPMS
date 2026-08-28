# MCL Analytics Pipeline — Handoff Document
**Project:** MCL Development Project Tracker — Data Pipeline
**Date:** August 28, 2026
**Status:** Phases 1–6 Complete ✅ | Phase 7 (SASCI-MDF Pipeline) Pending 🔄

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
  React Frontend Dashboard — Vite + TypeScript + Tailwind (all 6 tabs live)
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
| `/kpis` | GET | Dashboard summary cards, distributions, fund breakdown | Optional: `branch` |
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

**Current DB state (as of Aug 28, 2026):**
| Table | Rows |
|---|---|
| `fact_works` | 637 |
| `data_quality` | 0 (truncated — rebuilds on next sync) |
| `dim_location` | 208 |
| `dim_agency` | 264 |
| `dim_fund` | 51 |

### Phase 2 — Google Apps Script ETL (`code.gs`)
- Reads B&R and O&M tabs from main tracker every 10 minutes.
- **OVERWRITE mode**: staging tab is fully cleared and rewritten on each sync — eliminates duplicate row accumulation.
- `writeToStaging()` and `sortSheetByProjectId()` removed; replaced with batch `setValues()` per tab.
- Cleans, normalizes, and writes rows into the clean staging sheet.
- Canonical maps for `nature_of_work`, `workflow_stage`, `delivery_status`.
- Flags: `MISSING_PROJECT_ID`, `UNMAPPED_*`, `UNRESOLVED_LOCATION`, `MISSING_AGENCY`, `FIN_PROGRESS_ANOMALY`, `EXPENDITURE_OUTLIER`, `EXPENDITURE_CONVERTED_FROM_RUPEES`.
- **Expenditure guard (updated)**: if `expenditure_lacs > tender_cost_lacs * 2`, attempts auto-conversion (`÷ 100000`). If converted value is plausible, uses it and flags `EXPENDITURE_CONVERTED_FROM_RUPEES`. If still implausible, nullifies and flags `EXPENDITURE_OUTLIER`.
- Calls `pushToFastAPI()` once at end of `scheduledSync()`.

### Phase 3 — FastAPI Backend (Render)
- Deployed at `https://epms-m755.onrender.com`
- asyncpg pool with Neon SSL compatibility.
- `POST /sync/sheets`: resolves dimension FKs, computes `days_overdue` + `risk_score`, upserts via `record_hash` differential, inserts quality backlog.
- `GET /kpis`: includes `by_fund_type` subquery.
- `GET /kpis/constituencies`, `GET /kpis/zones`, `GET /kpis/fund-distribution`: aggregation endpoints added in Phase 6.
- `GET /sync/status`: last synced timestamp from `fact_works.updated_at`.
- `GET /works`, `GET /contractors`, `GET /quality`: fully implemented.

### Phase 4 — GAS → FastAPI → Neon Pipeline Verified
- 637 works in `fact_works` (451 B&R + 186 O&M).
- Hash-based differential sync confirmed: unchanged rows skip, changed rows upsert.
- Known data issue: MCL-0351 and MCL-0352 had expenditure entered in full rupees. Auto-conversion guard now handles this going forward. Direct Neon SQL fix applied (`SET expenditure_lacs = 12.20`).

### Phase 5 — SASCI-MDF Road Pipeline
- ⏳ **NOT YET BUILT** — `sasci_mdf_works` table exists in schema but has no ingestion endpoint.
- FlagshipAgenda page shows mock data with "Live sync coming soon" banner.

### Phase 6 — React Dashboard (Complete)
- All 6 tabs connected to live backend.
- Stack: React + Vite + TypeScript + Tailwind.
- New infrastructure: `api.ts`, `useApi.ts`, `apiConfig.ts`, `LoadingSkeleton`, `ErrorState`, `SyncStatus`.
- New page: `DataQuality.tsx` — pass rate gauge, flag breakdown, paginated backlog register.
- Monthly spend chart replaced with Expenditure by Fund Type (real data from `/kpis/fund-distribution`).
- `FlagshipAgenda.tsx` stays on mock data (Phase 5 not built).

---

## 5. Data Quality Flags Reference

| Flag | Meaning | Action |
|---|---|---|
| `MISSING_PROJECT_ID` | Row has no project ID | Fix in source sheet |
| `UNMAPPED_NATURE_OF_WORK` | Nature of work not in canonical map | Add to `natureMap` in GAS |
| `UNMAPPED_WORKFLOW_STAGE` | Workflow stage not in canonical map | Add to `workflowMap` in GAS |
| `UNMAPPED_DELIVERY_STATUS` | Delivery status not in canonical map | Add to `deliveryMap` in GAS |
| `UNRESOLVED_LOCATION` | `sub_zone` is blank | Fix in source sheet |
| `MISSING_AGENCY` | `executing_agency` is blank | Fix in source sheet |
| `FIN_PROGRESS_ANOMALY` | `financial_progress_pct > 100` | Verify expenditure vs tender cost |
| `EXPENDITURE_OUTLIER` | `expenditure > tender_cost * 2` AND conversion implausible | Manual review required |
| `EXPENDITURE_CONVERTED_FROM_RUPEES` | Value was `> tender * 2` but plausible after `÷ 100000` | Auto-corrected — verify source sheet |

---

## 6. Canonical Value Maps (GAS)

### delivery_status
`In Progress`, `Delayed/Held Up`, `Completed`, `Not Started`, `Procurement`

### workflow_stage
`Awarded`, `Work Order Issued`, `Procurement`, `Approval Pending`, `In Progress`, `Completed`, `Not Started`, `Delayed/Held Up`

### nature_of_work
`Roads-ILT`, `Roads-RMC`, `Roads-Bituminous`, `Parks`, `Water Supply`, `Sewerage`, `Tubewell`, `Buildings`, `Others`

---

## 7. GAS Sync Architecture (Current)

```javascript
scheduledSync()
  └── forEach branch (B&R, O&M)
        ├── Read all rows from main sheet
        ├── Parse + cleanAndNormalize() each row → collect into cleanedRows[]
        ├── stagingSheet.clearContents()
        ├── Write HEADERS row
        └── setValues(cleanedRows)  ← single bulk write, no upsert logic
  └── pushToFastAPI()  ← once, after both tabs written
```

**Why overwrite instead of upsert:** Row-by-row upsert was causing duplicate accumulation in the staging sheet because no-project-ID rows matched inconsistently across syncs. Full overwrite guarantees the staging sheet always exactly mirrors the current main sheet state.

---

## 8. How to Run Locally

```bash
cd Backend
.venv\Scripts\activate
uvicorn main:app --reload
# API at http://localhost:8000
# Swagger at http://localhost:8000/docs
```

`.env` file required:
```
DATABASE_URL=postgresql://<user>:<password>@<host>/neondb?sslmode=require
```

---

## 9. Next Steps 🔄

### Phase 7 — SASCI-MDF Road Pipeline
- Create `Backend/routers/sasci.py` — new FastAPI router for road metrics.
- Endpoint: `POST /sync/sasci` — reads SASCI-MDF tab, writes to `sasci_mdf_works`.
- Add GAS section to read SASCI-MDF tab and push to `/sync/sasci`.
- `sasci_mdf_works` is km-based (not lacs-based) — different schema from `fact_works`.
- Once live, `FlagshipAgenda.tsx` connects to `GET /sasci` and drops mock data.

### Ongoing Maintenance
- If new `nature_of_work`, `workflow_stage`, or `delivery_status` values appear in source data, add them to the canonical maps in `code.gs`.
- If `EXPENDITURE_CONVERTED_FROM_RUPEES` flags appear in Data Quality dashboard, verify the source sheet entry and correct if needed.
- Monitor Data Quality dashboard pass rate — target >25% (currently limited by O&M rows lacking project IDs).
