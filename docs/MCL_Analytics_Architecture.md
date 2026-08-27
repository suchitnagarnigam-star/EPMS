# MCL Development Project Tracker — System Architecture
> Municipal Corporation Ludhiana | Analytics Platform Design
> Last updated: August 27, 2026 — End of Backend Implementation

---

## 1. Sheet Scope (Locked)

| Sheet | Role | Treatment |
|-------|------|-----------|
| **B&R** | Primary works data — Buildings & Roads | Primary ingestion |
| **O&M** | Primary works data — Operations & Maintenance | Primary ingestion |
| **SASCI-MDF** | Flagship road projects | Primary ingestion, separate model |
| **Master** | Unified reference snapshot | Reference + validation only |

### Why Master is reference-only

Master is not an independent dataset. The Project IDs prove it:

```
B&R:    451 unique Project IDs
O&M:    186 unique Project IDs
        ─────────────────────
Total:  637

Master: 637 unique Project IDs  ← exact match
```

Master = B&R + O&M combined. Ingesting from Master would mean ingesting a derived view when we already have the underlying sources. Instead, Master is used to cross-validate the B&R + O&M population after ingestion.

---

## 2. Rows ≠ Works

```
B&R:  717 rows  →  451 unique Project IDs
O&M:  450 rows  →  186 unique Project IDs
```

Many rows exist without a Project ID. These must NOT be silently dropped or blindly ingested as fact_works records. Instead, every row is classified on ingest:

```
Raw spreadsheet rows
        │
        ├── Has Project ID  →  fact_works (analytical dataset)
        │
        └── No Project ID   →  data_quality / backlog table
                                (flagged: MISSING_PROJECT_ID)
```

This also gives us a dashboard metric: **"What % of source data is analytics-ready?"**

---

## 3. Database Schema (Neon / PostgreSQL)

The database utilizes a **Star Schema** optimized for analytical read queries.

```
                    dim_location
                         │
dim_agency ────── fact_works ────── dim_fund
                         │
                   dim_work_type
                         │
                    dim_officer
```

### dimension Tables
* **dim_location**: unique combinations of `zone`, `sub_zone`, `constituency`, `ward`.
* **dim_agency**: executing agencies (e.g. contracting firms).
* **dim_fund**: unique combinations of `fund_type` and `quota_label`.
* **dim_work_type**: branch and nature of work classification.
* **dim_officer**: monitoring officers.

### fact_works Table
The central fact table containing numerical outlays, status states, approval dates, completion tracking, and calculated risk metrics. It maintains foreign keys pointing to all dimension tables.

### data_quality Table
Quarantine table storing rows that lack project IDs or fail validations, including the full row state preserved in a `JSONB` column named `raw_json` and pipe-separated error flags.

---

## 4. Entire Codebase Architecture

The backend is built as a modular FastAPI web service utilizing **raw asyncpg** for high-performance async query execution.

### Backend Structure
```
Backend/
├── .env                  # Environment configurations (DATABASE_URL)
├── requirements.txt      # Dependency manifest
├── main.py               # FastAPI entry point, lifespan manager, CORS middleware
├── database.py           # Connection pool manager and dependency injector
├── models.py             # Pydantic schema validation & date parsing utilities
├── test_imports.py       # Import sanity verification script
├── test_endpoints.py    # Mock database router unit tests
└── routers/              # Endpoint modules
    ├── __init__.py       # Package marker
    ├── sync.py           # Sheets ingestion & dimension resolution (/sync/sheets)
    ├── kpis.py           # Dashboard aggregate statistics (/kpis)
    ├── works.py          # Paginated works queries with dimension joins (/works)
    ├── contractor.py     # Contractor scorecard outlays & risk scores (/contractors)
    └── data_quality.py   # Backlog lists & quality flags frequency (/quality)
```

### Module Breakdown

#### A. Database Initialization (`database.py`)
Exposes database pool acquisition and dependencies.
- **Neon SSL Compatibility**: Cleans incoming `DATABASE_URL` by removing standard query parameters (like `sslmode=require`) that asyncpg does not natively support inside URIs. Instead, it injects `ssl="require"` directly into `asyncpg.create_pool` keyword arguments if `sslmode` or `neon.tech` is present.
- **Dependency `get_db`**: Yields a connection from the pool registered in `FastAPI.state.db_pool` on a per-request basis.

#### B. Pydantic Models & Caching (`models.py`)
- **Flexible Field Alias Matching**: Leverages `AliasChoices` to allow incoming payloads to map columns with leading underscores (e.g. `_staged_at`, `_record_hash`) or natural names seamlessly.
- **Robust Parsers**: Exposes `parse_date_safe` and `parse_datetime_safe` to parse dates formatted in ISO formats or typical Indian `DD/MM/YYYY` layouts while converting dash/N/A string values to `None`.

#### C. Endpoints & Business Logic

1. **Sheets Synchronizer (`routers/sync.py`)**
   - Exposes `POST /sync/sheets`.
   - Executes inside a SQL transaction block: `async with conn.transaction():`.
   - Resolves dimension foreign keys by running `INSERT ... ON CONFLICT DO NOTHING` followed by `SELECT` (utilizing `IS NOT DISTINCT FROM` comparison to safely match `NULL` columns).
   - Computes `days_overdue` (`today - scheduled_end_date` if not Completed) and `risk_score` (`days_overdue * 0.5 + 20` if a progress anomaly is flagged) directly in Python.
   - Upserts `fact_works` using `ON CONFLICT (work_id) DO UPDATE ... WHERE fact_works.record_hash IS DISTINCT FROM EXCLUDED.record_hash`. Returns `work_id` only if changes were made, enabling count tracking of `upserted` vs `skipped` rows.
   - Inserts failed/flagged rows to `data_quality`, serializing complete rows to `raw_json` using Pydantic's native `.model_dump_json()`.

2. **Dashboard KPIs (`routers/kpis.py`)**
   - Exposes `GET /kpis`.
   - Computes aggregated counters (`total_works`, `total_est_cost_lacs`, `total_tender_cost_lacs`, `total_expenditure_lacs`, `avg_financial_progress_pct`, `anomaly_count`).
   - Retrieves count distributions grouped by branch, delivery status, and workflow stage. Supports an optional `branch` query filter.

3. **Works Directory (`routers/works.py`)**
   - Exposes `GET /works`.
   - Returns a paginated list of project rows (`total`, `page`, `page_size`, `results`) joining `dim_location`, `dim_agency`, `dim_work_type`, `dim_officer`, and `dim_fund`.
   - Builds SQL conditions dynamically based on filters (`branch`, `zone`, `constituency`, `delivery_status`, `workflow_stage`, `search`).
   - Standardizes Python `Decimal` outputs to float values to avoid JSON serialization failures.

4. **Contractor scorecards (`routers/contractor.py`)**
   - Exposes `GET /contractors`.
   - Summarizes contractor stats (`total_works`, `completed`, `delayed`, `in_progress`, `avg_financial_progress_pct`, `total_expenditure_lacs`, `risk_score_avg`).
   - Joins `dim_agency` and groups by contractor, ordering by `risk_score_avg DESC` by default.

5. **Data Quality Backlog (`routers/data_quality.py`)**
   - Exposes `GET /quality`.
   - Computes overall counts and analytics-ready percentages.
   - Builds a frequency mapping of quality issue flags directly in PostgreSQL using `regexp_split_to_table(flags, '\|')` to split pipe-separated flag strings.
   - Serves paginated backlog details from the `data_quality` table.

---

## 5. End-to-End Data Flow

```
┌──────────────────────────────────────┐
│  B&R RAW / O&M RAW (Google Sheets)   │
└──────────────────┬───────────────────┘
                   │ apps script schedule
                   ▼
┌──────────────────────────────────────┐
│       Apps Staging Clean Sheet       │
└──────────────────┬───────────────────┘
                   │ webhook push payload
                   ▼
┌──────────────────────────────────────┐
│    FastAPI Backend (/sync/sheets)    │
│  - Parses Payload & Resolves FKs     │
│  - Calculates Risk & Overdue Metrics │
│  - Executes Transactional Database   │
└──────────────────┬───────────────────┘
                   │ SQL connection pool
                   ▼
┌──────────────────────────────────────┐
│     Neon PostgreSQL Star Schema      │
└──────────────────────────────────────┘
```

---

## 6. Verification and Testing

The backend includes test scripts to run checks without a live database dependency:
- **`test_imports.py`**: Validates syntactic correctness, dependency imports, and FastAPI startup configurations.
- **`test_endpoints.py`**: Mocks database queries and transaction states, asserting correct formats, defaults, conversions, and calculations for all routers.
