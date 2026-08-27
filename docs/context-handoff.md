# MCL Analytics Pipeline — Handoff Document
**Project:** MCL Development Project Tracker — Data Pipeline
**Date:** August 27, 2026
**Status:** Phase 1, Phase 2, & Phase 3 Complete ✅ | Phase 4, 5, & 6 Pending 🔄

---

## 1. System Architecture

The data pipeline runs end-to-end as follows:

```
Main Tracker (B&R / O&M tabs)
        ↓
  Apps Script (ETL & Clean)
        ↓
  Clean Staging Sheet (B&R & O&M tabs)
        ↓
  FastAPI Ingestion Webhook (/sync/sheets)
        ↓
  Neon PostgreSQL (Star Schema Database)
        ↓
  Analytics REST API (/kpis, /works, /contractors, /quality)
        ↓
  React Frontend Dashboard (Visualizations & Directory)
```

---

## 2. Ingestion API Endpoint Reference

The backend runs locally on port `8000` (or your deployed URL) and exposes the following endpoints:

| Endpoint | Method | Purpose | Key Parameters / Payload |
|---|---|---|---|
| `/sync/sheets` | `POST` | Receives clean staging rows and synchronizes them to DB. | JSON payload: `{ works: [...], quality: [...] }` |
| `/kpis` | `GET` | Computes summary card numbers and distribution ratios. | Optional: `branch` (filter by B&R or O&M) |
| `/works` | `GET` | Retrieves paginated projects with full dimension joins. | Pagination: `page`, `page_size`. Filters: `branch`, `zone`, `constituency`, `delivery_status`, `workflow_stage`, `search`. |
| `/contractors` | `GET` | Scores contractors/agencies by project volumes and average risk. | None |
| `/quality` | `GET` | Exposes analytics readiness stats and paginated quality backlog rows. | Pagination: `page`, `page_size`. |
| `/health` | `GET` | Standard endpoint indicating database health state. | None |

---

## 3. What Has Been Completed ✅

### A. Phase 1 — Google Apps Script ETL
- Automated formatting, cleaning, nature of work matching, and status normalizations are running.
- Clean rows are staged to Google Sheet ID: `1fuj1JAkzqCkcAB7NI3a26a3r3I4vovHWq51sHLtd9HM`.

### B. Phase 2 — Star Schema Database Setup
- Database tables (`fact_works`, `dim_location`, `dim_agency`, `dim_fund`, `dim_work_type`, `dim_officer`, `data_quality`, `sasci_mdf_works`), constraints, and performance indexes are successfully deployed on Neon.

### C. Phase 3 — FastAPI Backend API
- ** lifecycled database pool**: Built using `asyncpg.create_pool` with explicit SSL configuration for Neon compatibilities.
- **Transactional sheet sync**: Resolves dimensions on conflict, calculates days overdue/risk ratings, performs differential updates based on `record_hash`, and registers data quality backlog items.
- **Reporting services**: KPIs aggregates, paginated searches, contractor scoring, and quality flag counts are fully written and verified.
- **Unit test suite**: Verified all modules in `test_endpoints.py` using mock connection parameters.

---

## 4. How to Run & Verify the Backend

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Create or configure `Backend/.env` with your Neon database URL:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require
   ```
3. Run the import compilation test:
   ```bash
   .venv\Scripts\python test_imports.py
   ```
4. Run the unit test suite:
   ```bash
   .venv\Scripts\python test_endpoints.py
   ```
5. Start the uvicorn development server:
   ```bash
   .venv\Scripts\activate
   uvicorn main:app --reload
   ```

---

## 5. Next Steps (Action Items) 🔄

1. **Connect Google Apps Script Webhook**:
   - Update `code.gs` in the Staging Google Sheet to call `POST https://<your-backend-url>/sync/sheets` after running its cleaning routines.
   - Pass the cleaned rows array as `works` and flagged rows as `quality`.

2. **SASCI-MDF Road Pipeline Ingestion**:
   - Create a separate router inside the backend to handle road metrics from the SASCI-MDF spreadsheet and load them into the `sasci_mdf_works` table.

3. **Develop React Frontend Dashboard**:
   - Build the UI components linking to `/kpis`, `/works`, `/contractors`, and `/quality`.
