# MCL Development Project Tracker — System Architecture
> Municipal Corporation Ludhiana | Analytics Platform Design
> Last updated: September 5, 2026 — End of Phase 7 Authentication & UI Polish

---

## 1. System Architecture

```
Main Tracker (B&R / O&M tabs)
        ↓
  Apps Script ETL (code.gs.js) — Time-driven trigger (every 10 min)
  [X-API-Key header attached, clear & overwrite staging sheet on each run]
        ↓
  FastAPI Ingestion Webhook (/sync/sheets) — Render Hosted (DEV: http://localhost:8000)
  [X-API-Key middleware security, differential hashing, parse_officers(), work order date fallback]
        ↓
  Neon PostgreSQL (Star Schema Database)
        ↓
  FastAPI REST Services (/auth/*, /kpis, /works, /contractors, /quality, /admin/users, /kpis/officers)
  [JWT Authentication dependency get_current_user enforced on all protected routers]
        ↓
  Vite + React + TypeScript + Tailwind CSS Frontend
  [JWT AuthContext, ProtectedRoute, Slate Light Theme & Dark Theme, Global WorkModalContext, Officer Command Dashboard]
```

---

## 2. Database Schema (Neon / PostgreSQL)

The database utilizes a **Star Schema** optimized for analytical read queries.

```
                    dim_location
                         │
dim_agency ────── fact_works ────── dim_fund
                         │
                   dim_work_type
                         │
                    dim_officer
                         │
                fact_works_officers
```

### Dimension & Security Tables
* **dim_location**: unique combinations of `zone`, `sub_zone`, `constituency`, `ward`.
* **dim_agency**: executing agencies (e.g. contracting firms).
* **dim_fund**: unique combinations of `fund_type` and `quota_label`.
* **dim_work_type**: branch and nature of work classification.
* **dim_officer**: clean monitoring officer names (`officer_id`, `officer_name`, `designation`, `branch`).
* **fact_works_officers**: junction table linking multi-officer assignments (`work_id`, `officer_id`).
* **dashboard_users**: authorized user accounts table storing `email`, `password_hash`, `role`, and `is_active`.

### fact_works Table
Central fact table containing numerical outlays, status states, approval dates, completion tracking, risk scores, quality flags, and `ai_remarks`.

---

## 3. Codebase Architecture

```
Backend/
├── .env                  # Environment configurations (DATABASE_URL, SYNC_API_KEY, JWT_SECRET)
├── requirements.txt      # Dependency manifest
├── main.py               # FastAPI entry point, verify_sync_api_key middleware, router registration
├── database.py           # Connection pool manager and dependency injector
├── models.py             # Pydantic schema validation, LoginRequest, TokenResponse & date utilities
├── create_admin.py       # Standalone admin user creation & seeding CLI script
└── routers/              # Endpoint modules
    ├── __init__.py       # Package marker
    ├── auth.py           # JWT Authentication router (/auth/login, /auth/refresh, get_current_user)
    ├── sync.py           # Sheets ingestion & dimension resolution (/sync/sheets), Sync status (/sync/status)
    ├── kpis.py           # Dashboard aggregates (/kpis, /kpis/constituencies, /kpis/zones, /kpis/officers)
    ├── works.py          # Paginated works queries with dimension joins (/works, /works/{work_id})
    ├── contractor.py     # Contractor scorecard outlays & risk scores (/contractors)
    ├── data_quality.py   # Backlog lists & quality flags frequency (/quality)
    └── admin.py          # Admin user management endpoints (/admin/users)

Frontend/
├── .env                  # Environment configurations (VITE_API_URL)
├── package.json          # Node dependencies
├── vite.config.ts        # Vite build config & local API proxy
├── src/
│   ├── App.tsx           # Router, AuthProvider, WorkModalProvider, ProtectedRoute wrapper
│   ├── components/       # Reusable UI elements (Layout, WorkDetailModal, ProtectedRoute, etc.)
│   ├── context/          # State providers (AuthContext, ThemeContext, WorkModalContext)
│   ├── data/             # API clients and Typed hooks (api.ts, useApi.ts)
│   └── pages/            # View components (Login, ExecutiveOverview, ContractorMatrix, OfficerCommand, etc.)
```

---

## 4. Security & Authentication Model

1. **Machine-to-Machine (GAS → FastAPI)**:
   - Protected by `X-API-Key` header matching `SYNC_API_KEY` in environment variables.
   - Enforced by FastAPI middleware on `/sync/*` routes.

2. **Dashboard User Authentication (Browser → FastAPI)**:
   - `POST /auth/login` verifies user email and bcrypt password hash against `dashboard_users`.
   - Returns 8-hour HS256 JWT access token.
   - `Authorization: Bearer <token>` header attached to all API requests via `api.ts`.
   - `AuthContext` validates JWT `exp` claim synchronously on initial load and clears token on expiry or 401 response, triggering redirect to `/login`.
