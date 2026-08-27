# MCL Analytics Pipeline — Handoff Document
**Project:** MCL Development Project Tracker — Data Pipeline
**Date:** August 27, 2026
**Status:** Phase 1, 2, 3 & 4 Complete ✅ | Phase 5 & 6 Pending 🔄

---

## 1. System Architecture

```
Main Tracker (B&R / O&M tabs)
        ↓
  Apps Script ETL (code.gs) — every 10 minutes via time-based trigger
        ↓
  Clean Staging Sheet (B&R & O&M tabs) — Sheet ID: 1zpRR55bZywWpwy8iDbgiLrYHRCScc8vPQHkUEYuEgiQ
        ↓
  FastAPI Ingestion Webhook (/sync/sheets) — https://epms-m755.onrender.com
        ↓
  Neon PostgreSQL (Star Schema Database) — ap-southeast-1, db: neondb
        ↓
  Analytics REST API (/kpis, /works, /contractors, /quality)
        ↓
  React Frontend Dashboard (Visualizations & Directory) — NOT YET BUILT
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
| `/kpis` | GET | Dashboard summary cards and distributions | Optional: `branch` |
| `/works` | GET | Paginated works list with dimension joins | `page`, `page_size`, `branch`, `zone`, `constituency`, `delivery_status`, `workflow_stage`, `search` |
| `/contractors` | GET | Agency performance ranked by risk | None |
| `/quality` | GET | Analytics readiness stats + backlog rows | `page`, `page_size` |
| `/health` | GET | DB connection health check | None |

---

## 4. What Has Been Completed ✅

### Phase 1 — Neon Star Schema Database
- All tables deployed: `fact_works`, `dim_location`, `dim_agency`, `dim_fund`, `dim_work_type`, `dim_officer`, `data_quality`, `sasci_mdf_works`
- Indexes, constraints, and `update_updated_at` trigger active.

### Phase 2 — Google Apps Script ETL (`code.gs`)
- Reads B&R and O&M tabs from main tracker every 10 minutes.
- Cleans, normalizes, and upserts rows into the clean staging sheet.
- Canonical maps for `nature_of_work`, `workflow_stage`, `delivery_status`.
- Flags: `MISSING_PROJECT_ID`, `UNMAPPED_*`, `UNRESOLVED_LOCATION`, `MISSING_AGENCY`, `FIN_PROGRESS_ANOMALY`, `EXPENDITURE_OUTLIER`.
- **Expenditure outlier guard**: if `expenditure_lacs > tender_cost_lacs * 2`, nullifies expenditure and flags `EXPENDITURE_OUTLIER` — prevents data entry errors from corrupting KPI totals.
- Calls `pushToFastAPI()` once at end of `scheduledSync()` (not per row).

### Phase 3 — FastAPI Backend (Render)
- Deployed at `https://epms-m755.onrender.com`
- asyncpg pool with Neon SSL compatibility.
- `POST /sync/sheets`: resolves dimension FKs, computes `days_overdue` + `risk_score`, upserts via `record_hash` differential (skips unchanged rows), inserts quality backlog.
- `GET /kpis`: avg financial progress excludes anomaly rows (`CASE WHEN financial_progress_pct <= 100`). Status/stage distributions filter to canonical values only.
- `GET /works`, `GET /contractors`, `GET /quality`: fully implemented.
- `models.py`: `ward`, `zone`, `delivery_status`, `workflow_stage` coerced to string via `field_validator`. `time_limit_months` accepts float. `raw_status` in quality items coerced to string.

### Phase 4 — GAS → FastAPI → Neon Pipeline Verified
- 637 works in `fact_works` (451 B&R + 186 O&M) — matches architecture doc exactly.
- 487 quality backlog rows in `data_quality`.
- Hash-based differential sync confirmed working: unchanged rows return `skipped`, changed rows return `upserted`.
- Known data issue: MCL-0351 and MCL-0352 have expenditure entered in full rupees — flagged as `EXPENDITURE_OUTLIER`, expenditure nullified in pipeline. Source sheet should be corrected.

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
| `EXPENDITURE_OUTLIER` | `expenditure > tender_cost * 2` | Likely entered in rupees, not lacs |

---

## 6. Canonical Value Maps (GAS)

### delivery_status
`In Progress`, `Delayed/Held Up`, `Completed`, `Not Started`, `Procurement`

### workflow_stage
`Awarded`, `Work Order Issued`, `Procurement`, `Approval Pending`, `In Progress`, `Completed`, `Not Started`, `Delayed/Held Up`

### nature_of_work
`Roads-ILT`, `Roads-RMC`, `Roads-Bituminous`, `Parks`, `Water Supply`, `Sewerage`, `Tubewell`, `Buildings`, `Others`

---

## 7. How to Run Locally

```bash
cd Backend
.venv\Scripts\activate
uvicorn main:app --reload
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

`.env` file required:
```
DATABASE_URL=postgresql://<user>:<password>@<host>/neondb?sslmode=require
```

---

## 8. Next Steps 🔄

### Phase 5 — SASCI-MDF Road Pipeline
- Create a separate FastAPI router (`routers/sasci.py`) for road metrics.
- Add GAS script section to read SASCI-MDF tab and push to `/sync/sasci`.
- Write records to `sasci_mdf_works` table (km-based, not lacs-based).

### Phase 6 — React Dashboard
Six tabs to build, all hitting the Render backend:

| Tab | Endpoint(s) | Key Components |
|---|---|---|
| Command Console | `/kpis` | KPI cards, status funnel chart, outlay bar chart |
| Contractor Scorecards | `/contractors` | Risk-ranked agency table |
| Constituency & Ward Funds | `/works` grouped | Outlay distribution by constituency |
| Master Works Directory | `/works` | Paginated filterable grid |
| MDF/SASCI Flagships | `/sasci` (Phase 5) | Road progress tracking |
| Data Quality Dashboard | `/quality` | Flag breakdown, backlog table |
