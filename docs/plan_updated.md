# MCL Development Tracker — Updated Data Analysis & Implementation Plan
> Last updated: August 27, 2026

## 1. Project Overview & Scope

The Ludhiana Municipal Corporation MCL Analytics Platform ingests data from primary tracker spreadsheets, cleans and structures them, and runs analytical models to serve a real-time monitoring dashboard.

Sources:
- **B&R Tab** (Buildings & Roads) — Main works.
- **O&M Tab** (Operations & Maintenance) — Utilities & general works.
- **SASCI-MDF Tab** — Flagship road projects (tracked by km-length, separately modeled).

---

## 2. Ingestion & In-Flight Data Cleaning

Data cleaning is partitioned between two layers:
1. **Google Apps Script ETL (RAW → CLEAN)**:
   - Normalizes nature of work, statuses, and workflow stages.
   - Calculates financial progress percentage.
   - Identifies structural data quality issues (e.g. missing Project IDs).
   - Writes cleaned outputs to a secondary Google Staging Sheet.
2. **FastAPI Ingestion Endpoint (CLEAN → DATABASE)**:
   - Receives cleaned records and quarantines rows lacking project IDs.
   - Resolves dimension IDs for locations, executing agencies, funding sources, work types, and officers.
   - Computes overdue times and risk ratings.

---

## 3. Database Architecture (Star Schema)

Instead of maintaining separate tables for B&R and O&M, we use a **Star Schema** with a unified fact table:
- **`fact_works`**: Unified central table containing all project parameters. A `branch` column (e.g., `'B&R'` or `'O&M'`) acts as a fast partition key for filtering.
- **`dim_location`**, **`dim_agency`**, **`dim_fund`**, **`dim_work_type`**, **`dim_officer`**: Dimensions lookup tables referencing specific IDs.
- **`data_quality`**: Backlog table containing quarantined records that fail project identification.
- **`sasci_mdf_works`**: Table for road projects tracking km-lengths instead of Lakh outlays.

---

## 4. Current Implementation Status

### Phase 1: Star Schema Deployment (Neon/PostgreSQL) — COMPLETE ✅
- Schema tables, constraints, indexes, and triggers successfully deployed on Neon.

### Phase 2: Apps Script Stage Sync — COMPLETE ✅
- apps scripts deployed in Google sheets to staging B&R and O&M rows.

### Phase 3: FastAPI Backend Implementation — COMPLETE ✅
- **Structure**: Configured with a dedicated virtual environment, standard requirements, lifespan asyncpg pool, and CORS headers.
- **Sync Endpoints**: `POST /sync/sheets` built to resolve dimensions, calculate risk metrics, and handle upserts/skips atomically inside a transaction.
- **KPIs Endpoint**: `GET /kpis` built to compute summaries and distributions.
- **Paginated List Endpoint**: `GET /works` built to join tables and filter records.
- **Contractor Scorecard Endpoint**: `GET /contractors` built to rank contractor risks.
- **Quality Endpoint**: `GET /quality` built to output quality statistics and parse error flags.
- **Test Suite**: Verified end-to-end functionality using mock connections.

---

## 5. Next Steps & Action Plan

### Phase 4: Google Apps Script Webhook Trigger Integration
- Configure the scheduler in Google Apps Script to invoke `POST https://<backend-url>/sync/sheets` every 5 minutes.
- Pass the staging payload containing `works` and `quality` arrays.

### Phase 5: SASCI-MDF Road Pipeline Ingestion
- Set up a separate ingestion route in FastAPI to process raw road rows from the SASCI-MDF tracker.
- Write records to the `sasci_mdf_works` table.

### Phase 6: React Dashboard Development
- Build the web interface featuring tabs for:
  - **Command Console**: High-level charts (KPIs, outlays, status funnels).
  - **Contractor Scorecards**: Performance ratings and risk indexes.
  - **Constituency & Ward Funds**: Outlay distributions by constituency.
  - **Master Works Directory**: Paginated, filterable grid list.
  - **MDF/SASCI Flagships**: Road progress tracking.
  - **Data Quality Dashboard**: Quarantined backlog items.
