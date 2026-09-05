# MCL Analytics Pipeline — Handoff Document
**Project:** MCL Development Project Tracker — Data Pipeline
**Date:** September 5, 2026
**Status:** Phases 1–4, 6, 7 Complete ✅ | Phase 5 (SASCI-MDF Pipeline) Pending 🔄

---

## 1. System Architecture

```
Main Tracker (B&R / O&M tabs)
        ↓
  Apps Script ETL (code.gs.js) — every 10 minutes via time-based trigger
  [OVERWRITE mode — full tab rewrite each sync, X-API-Key protected payload]
        ↓
  Clean Staging Sheet (B&R & O&M tabs) — Sheet ID: 1zpRR55bZywWpwy8iDbgiLrYHRCScc8vPQHkUEYuEgiQ
        ↓
  FastAPI Ingestion Webhook (/sync/sheets) — https://epms-m755.onrender.com (DEV: http://localhost:8000)
  [X-API-Key middleware security enforced]
        ↓
  Neon PostgreSQL (Star Schema Database) — Singapore region, db: neondb
        ↓
  Analytics REST API (/auth/*, /kpis, /works, /contractors, /quality, /kpis/officers, /admin/users)
        ↓
  React Frontend Dashboard — Vite + TS + Tailwind (JWT Auth, ProtectedRoutes, Slate Light & Dark Themes)
```

---

## 2. Key IDs & URLs

| Resource | Value |
|---|---|
| Main Tracker Sheet | `1ZmN57IxVr3yOEntADZI5Dcr2WhsM8XbQFbn8clf33Fo` |
| Clean Staging Sheet | `1zpRR55bZywWpwy8iDbgiLrYHRCScc8vPQHkUEYuEgiQ` |
| FastAPI Backend (Render) | `https://epms-m755.onrender.com` |
| Local Backend Server | `http://localhost:8000` |
| Neon DB | `neondb`, user: `neondb_owner`, region: Singapore |
| GAS Trigger | `scheduledSync` every 10 minutes |
| Default Admin Credentials | `admin@mcl.gov.in` / `admin123` (seeded via `create_admin.py`) |

---

## 3. API Endpoint Reference

| Endpoint | Method | Purpose | Key Parameters / Security |
|---|---|---|---|
| `/auth/login` | POST | Authenticates user & issues 8h HS256 JWT | `{ email, password }` |
| `/auth/refresh` | POST | Issues refreshed JWT for active session | `Authorization: Bearer <token>` |
| `/sync/sheets` | POST | Ingestion webhook, upserts to DB | `X-API-Key` Header required |
| `/sync/status` | GET | Returns last synced timestamp + total works | `X-API-Key` Header required |
| `/kpis` | GET | Summary cards & distributions | JWT `Authorization: Bearer` required |
| `/kpis/constituencies` | GET | Constituency aggregate metrics | JWT `Authorization: Bearer` required |
| `/kpis/zones` | GET | Zone-level avg progress by branch | JWT `Authorization: Bearer` required |
| `/kpis/fund-distribution` | GET | Expenditure breakdown by fund type | JWT `Authorization: Bearer` required |
| `/kpis/officers` | GET | Supervising officer metrics & workload | JWT `Authorization: Bearer` required |
| `/works` | GET | Paginated works list with dimension joins | `page`, `page_size`, `branch`, `zone`, `officer_id`, `agency_id`, etc. |
| `/works/{work_id}` | GET | Fetch single work details by ID | `work_id` |
| `/contractors` | GET | Agency performance ranked by risk | JWT `Authorization: Bearer` required |
| `/quality` | GET | Analytics readiness stats & backlog rows | JWT `Authorization: Bearer` required |
| `/admin/users` | GET/POST/PATCH/DELETE | Admin user access management | JWT `Authorization: Bearer` required |
| `/health` | GET | DB connection health check | Public (no auth required) |

---

## 4. What Has Been Completed ✅

### Phase 1 — Neon Star Schema Database
- All tables deployed: `fact_works`, `dim_location`, `dim_agency`, `dim_fund`, `dim_work_type`, `dim_officer`, `fact_works_officers`, `dashboard_users`, `data_quality`, `sasci_mdf_works`.
- Schema DDL columns updated (`password_hash` added to `dashboard_users`).

### Phase 2 — Google Apps Script ETL (`code.gs.js`)
- `pushToFastAPI()` updated to include `'X-API-Key': SYNC_API_KEY` header loaded from `PropertiesService.getScriptProperties().getProperty('SYNC_API_KEY')`.
- Start date fallback: parses dates from `work_order_no_date` when `start_date` is empty before checking quality flags.

### Phase 3 & 7 — FastAPI Backend (`main.py`, `routers/auth.py`, `sync.py`)
- **Part A — GAS Sync API Key Protection**:
  - Middleware `verify_sync_api_key` enforces `X-API-Key` header matching `SYNC_API_KEY` environment variable on all `/sync/*` requests. Returns HTTP 403 Forbidden if missing or invalid. Bypasses for `/health` and dashboard APIs.
- **Part B — Dashboard JWT Authentication**:
  - Dependencies installed: `python-jose[cryptography]`, `passlib[bcrypt]`, `bcrypt`.
  - `Backend/routers/auth.py`: Implemented `/auth/login` (verifies bcrypt password hashes, issues 8-hour HS256 JWTs), `/auth/refresh`, and `get_current_user` dependency.
  - Registered `auth.router` and applied `Depends(get_current_user)` to all dashboard routers (`/kpis`, `/works`, `/contractors`, `/quality`, `/admin`). `/health` and `/auth/*` remain public.
  - CLI Seeder (`Backend/create_admin.py`): Standalone script to seed or update admin users with bcrypt hashed passwords in `dashboard_users`.
- **Date Fallback in Sync**:
  - Updated `compute_days_overdue` in `sync.py` to derive target end dates using `work_order_no_date` + `time_limit_months` when explicit scheduled end dates are missing.

### Phase 4 & 6 — React Dashboard & UI Enhancements
- **JWT Auth Context & Protection (`AuthContext.tsx`, `ProtectedRoute.tsx`)**:
  - `AuthContext`: Manages `mcl_auth_token` in `localStorage`. Evaluates `isTokenValid(savedToken)` synchronously on initial load to ensure instant redirect to `/login` if token is missing or expired.
  - Active expiration monitor checks token validity every 10 seconds and on window focus.
  - `apiFetch` interceptor automatically clears token and redirects to `/login` on HTTP 401 Unauthorized responses.
  - `ProtectedRoute`: Guards all dashboard routes in `App.tsx`, directing unauthenticated users to `/login`.
- **Light Theme Redesign (`index.css`)**:
  - Replaced warm beige with a soothing Slate 50 palette (`#f8fafc` backdrop, pure white cards `#ffffff`, Slate 200 borders `#e2e8f0`, Slate 900 `#0f172a` contrast text, soft badge tints).
- **Start Date Fallback in UI (`WorkDetailModal.tsx`)**:
  - Automatically extracts date from `work_order_no_date` if `start_date` is empty and displays as `02-12-2024 (WO Date)`.
- **Risk Score Circular Gauge UI Fix (`WorkDetailModal.tsx`)**:
  - SVG `viewBox="0 0 96 96"`, centered geometry, `stroke="var(--border)"` background ring, score number formatting (`riskScore.toFixed(1)` / integer string), font scaling to prevent text clipping/overlap (e.g. `281.5 SCORE`).

---

## 5. Current Database State

| Table | Row Count | Notes |
|---|---|---|
| `fact_works` | 1,120 | Live production data |
| `dim_location` | 208 | Normalized constituency names (`INITCAP(TRIM())`) |
| `dim_agency` | 264 | Executing agency dimension |
| `dim_fund` | 51 | Fund type dimension |
| `dim_officer` | 61 | Clean individual officer records |
| `fact_works_officers` | 1,466 | Multi-officer assignment junction table |
| `dashboard_users` | Active | User accounts table with `password_hash` column |
| `data_quality` | Active | Quarantined rows & ingestion anomaly flags |
| `sasci_mdf_works` | 0 | Phase 5 pending |

---

## 6. Next Steps & Remaining Work 🔄

### Phase 5 — SASCI-MDF Road Pipeline
- Create `Backend/routers/sasci.py` — new FastAPI router (`POST /sync/sasci`, `GET /sasci`).
- Add GAS section to read SASCI-MDF tab and push to `/sync/sasci`.
- Update `FlagshipAgenda.tsx` to consume live SASCI data instead of mock data.

---

## 7. How to Run Locally

```bash
# From project root — starts frontend (port 5173) and backend (port 8000) concurrently
npm run dev:full
```

Environment variables needed in `Backend/.env`:
```env
DATABASE_URL=postgresql://neondb_owner:...@epms...singapore.aws.neon.tech/neondb?sslmode=require
SYNC_API_KEY=your_random_sync_api_key_32_chars
JWT_SECRET=your_random_jwt_secret_32_chars
```
