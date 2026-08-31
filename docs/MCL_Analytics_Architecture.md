# MCL Development Project Tracker — System Architecture
> Municipal Corporation Ludhiana | Analytics Platform Design
> Last updated: August 31, 2026 — End of Frontend Dashboard Integration

---

## 1. Sheet Scope (Locked)

| Sheet | Role | Treatment |
|-------|------|-----------|
| **B&R** | Primary works data — Buildings & Roads | Primary ingestion |
| **O&M** | Primary works data — Operations & Maintenance | Primary ingestion |
| **SASCI-MDF** | Flagship road projects | Primary ingestion, separate model |
| **Master** | Unified reference snapshot | Reference + validation only |

### Why Master is reference-only

Master is not an independent dataset. Master = B&R + O&M combined. Ingesting from Master would mean ingesting a derived view when we already have the underlying sources. Instead, Master is used to cross-validate the B&R + O&M population after ingestion.

---

## 2. Rows ≠ Works

Many rows in the source sheets exist without a Project ID. These must NOT be silently dropped or blindly ingested as fact_works records. Instead, every row is classified on ingest:

```
Raw spreadsheet rows
        │
        ├── Has Project ID  →  fact_works (analytical dataset)
        │
        └── No Project ID   →  data_quality / backlog table
                                (flagged: MISSING_PROJECT_ID)
```

This also provides a dashboard metric: **"What % of source data is analytics-ready?"**

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

The project consists of a React/Vite Frontend and a modular FastAPI Backend utilizing **raw asyncpg** for high-performance async query execution.

### Backend Structure
```
Backend/
├── .env                  # Environment configurations (DATABASE_URL)
├── requirements.txt      # Dependency manifest
├── main.py               # FastAPI entry point, lifespan manager, CORS middleware
├── database.py           # Connection pool manager and dependency injector
├── models.py             # Pydantic schema validation & date parsing utilities
├── test_imports.py       # Import sanity verification script
├── test_endpoints.py     # Mock database router unit tests
└── routers/              # Endpoint modules
    ├── __init__.py       # Package marker
    ├── sync.py           # Sheets ingestion & dimension resolution (/sync/sheets), Sync status (/sync/status)
    ├── kpis.py           # Dashboard aggregates (/kpis, /kpis/constituencies, /kpis/zones, /kpis/fund-distribution)
    ├── works.py          # Paginated works queries with dimension joins (/works)
    ├── contractor.py     # Contractor scorecard outlays & risk scores (/contractors)
    └── data_quality.py   # Backlog lists & quality flags frequency (/quality)
```

### Frontend Structure
```
Frontend/
├── .env                  # Environment configurations (VITE_API_URL)
├── package.json          # Node dependencies
├── vite.config.ts        # Vite build config & local API proxy
├── src/
│   ├── App.tsx           # Router and Theme provider
│   ├── components/       # Reusable UI elements (Layout, LoadingSkeleton, SyncStatus, etc.)
│   ├── context/          # State providers (AuthContext, ThemeContext)
│   ├── data/             # API clients and Typed hooks (api.ts, useApi.ts)
│   └── pages/            # View components (ExecutiveOverview, ContractorMatrix, MasterWorksDirectory, etc.)
```

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
└──────────────────┬───────────────────┘
                   │ REST API (/kpis, /works, etc.)
                   ▼
┌──────────────────────────────────────┐
│       React / Vite Frontend          │
└──────────────────────────────────────┘
```

---

## 6. Concurrent Execution

For local development, the root directory orchestrates both servers using the `concurrently` package. Running `npm run dev:full` at the root level concurrently spawns the Vite dev server and the Uvicorn ASGI server.
