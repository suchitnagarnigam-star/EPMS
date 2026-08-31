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

### Phase 2 — Google Apps Script ETL (`code.gs`)
- Reads B&R and O&M tabs from main tracker every 10 minutes.
- **OVERWRITE mode**: staging tab is fully cleared and rewritten on each sync.
- **Synthetic ID Generation**: Automatically assigns `OM-ROW-X` or `BR-ROW-X` to rows lacking a project ID so they can be tracked, marking them with `id_type: "SYNTHETIC"`.
- Cleans, normalizes, and writes rows into the clean staging sheet.
- Canonical maps for `nature_of_work`, `workflow_stage`, `delivery_status`.
- Flags: `MISSING_PROJECT_ID`, `SYNTHETIC_ID`, `UNMAPPED_*`, `UNRESOLVED_LOCATION`, `MISSING_AGENCY`, `FIN_PROGRESS_ANOMALY`, `EXPENDITURE_OUTLIER`, `EXPENDITURE_CONVERTED_FROM_RUPEES`.
- **Expenditure guard**: handles cases where expenditure > tender cost * 2 by attempting auto-conversion.
- Calls `pushToFastAPI()` once at end of `scheduledSync()`.

### Phase 3 — FastAPI Backend
- Asyncpg pool with Neon SSL compatibility.
- **Synthetic ID Reconciliation**: When a real project ID is assigned to a previously synthetic row, the backend seamlessly upgrades `OM-ROW-X` to the real ID without duplicating history.
- `POST /sync/sheets`: resolves dimension FKs, computes `days_overdue` + `risk_score`, upserts via `record_hash` differential, inserts quality backlog.
- `GET /kpis`, `GET /kpis/constituencies`, `GET /kpis/zones`, `GET /kpis/fund-distribution`, `GET /works`, `GET /contractors`, `GET /quality`, `GET /sync/status` endpoints built.

### Phase 4 — GAS → FastAPI → Neon Pipeline Verified
- Sync pipeline is functioning and writing to database cleanly using hash-based differential logic.

### Phase 6 — React Dashboard
- Full frontend dashboard built using React, Vite, Tailwind CSS, Recharts.
- Connected all views (Executive Overview, Contractors, Works Directory, Constituency Funds, Data Quality) to live endpoints.
- Developed resilient frontend API structure with loading/error states.

---

## 5. Next Steps 🔄

### Phase 5 — SASCI-MDF Road Pipeline
- ⏳ **NOT YET BUILT** — `sasci_mdf_works` table exists in schema but has no ingestion endpoint.
- Create `Backend/routers/sasci.py` — new FastAPI router for road metrics (`POST /sync/sasci`, `GET /sasci`).
- Add GAS section to read SASCI-MDF tab and push to `/sync/sasci`.
- Update `FlagshipAgenda.tsx` to consume live SASCI data instead of mock data.

---

## 6. How to Run Locally

You can launch both the frontend and backend simultaneously using the `concurrently` script.

```bash
# Ensure you are at the project root
npm run dev:full
```

This starts:
- Frontend on `http://localhost:5173`
- Backend on `http://localhost:8000`
