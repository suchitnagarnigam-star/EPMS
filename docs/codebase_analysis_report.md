# EPMS Analytics Platform — Codebase & Data Quality Audit Report

This report presents a comprehensive technical evaluation of the Executive Project Management System (EPMS) codebase, database architecture, ETL ingestion layer, and frontend analytics dashboard.

**Date:** September 5, 2026
**Status:** Phases 1–4, 6, 7 Complete ✅ | Phase 5 (SASCI-MDF Pipeline) Pending 🔄

---

## 1. System Inventory & Database Architecture

A direct database audit against the Neon PostgreSQL instance (`neondb` on Singapore region) reveals the following active data model and row counts:

| Table Name | Type | Row Count | Purpose / Description |
| :--- | :--- | :--- | :--- |
| `fact_works` | Fact Table | 1,120 | Primary work records storing financial parameters, timeline dates, progress %, risk scores, flags, and `ai_remarks`. |
| `dim_location` | Dimension | 208 | Geographical hierarchy (Zones, Sub-zones, Constituencies, Wards). Normalized via `INITCAP(TRIM())`. |
| `dim_agency` | Dimension | 264 | Contractors and executing agency records. |
| `dim_fund` | Dimension | 51 | Funding sources and allocation quota labels. |
| `dim_work_type` | Dimension | Active | Branch mapping (B&R vs. O&M) and nature of work classification. |
| `dim_officer` | Dimension | 61 | Clean individual supervising officer records (`officer_id`, `officer_name`, `designation`, `branch`). |
| `fact_works_officers` | Junction | 1,466 | Junction table linking multi-officer assignments (`work_id`, `officer_id`) per work order. |
| `dashboard_users` | Security | Active | Dashboard user access table with `password_hash`, `email`, `role`, and `is_active` fields. |
| `data_quality` | Audit Log | Active | Quarantined rows & ingestion anomaly flags (`source_sheet`, `source_row`, `flags`). |
| `sasci_mdf_works` | Fact Table | 0 | Special km-based road flagship projects tab (**Phase 5 Ingestion Pending**). |

---

## 2. Technical Architecture & Data Flow

```
Main Tracker (B&R / O&M tabs)
        ↓
  Apps Script ETL (code.gs.js) — Time-driven trigger (every 10 min)
  [Attaches X-API-Key header, clears & overwrites staging sheet on each run]
        ↓
  FastAPI Ingestion Webhook (/sync/sheets) — Render Hosted (DEV: http://localhost:8000)
  [X-API-Key middleware security check, differential hashing, parse_officers(), work order date fallback]
        ↓
  Neon PostgreSQL (Star Schema Database)
        ↓
  FastAPI REST Services (/auth/*, /kpis, /works, /contractors, /quality, /admin/users, /kpis/officers)
  [JWT Authentication dependency get_current_user enforced on all dashboard routes]
        ↓
  Vite + React + TypeScript + Tailwind CSS Frontend
  [JWT AuthContext, ProtectedRoute, Slate Light Theme & Dark Theme, Global WorkModalContext, Officer Command Dashboard]
```

---

## 3. Comprehensive Summary of Completed Features & Milestones ✅

### A. Database & Security Layer
- **Star Schema Implementation**: Deployed relational Star Schema with FK relationships and automated `update_updated_at` trigger.
- **Multi-Officer Junction Architecture**: Added `fact_works_officers` junction table to map multiple supervising officers (`JE`, `SDO`, `XEN`, `EE`, `SE`) to individual works (61 officers, 1,466 junction links).
- **Dashboard Authentication Table**: Updated `dashboard_users` DDL with `password_hash` column to support bcrypt password hashing.

### B. Security & Authentication (Phase 7 Complete)
- **FastAPI API Key Middleware (`verify_sync_api_key`)**: Enforces `X-API-Key` header matching `SYNC_API_KEY` environment variable on all `/sync/*` routes, returning HTTP 403 Forbidden on invalid/missing keys.
- **Apps Script Key Injection**: Updated `pushToFastAPI()` in `code.gs.js` to attach `'X-API-Key': SYNC_API_KEY` from script properties.
- **JWT Authentication Router (`Backend/routers/auth.py`)**:
  - `POST /auth/login`: Verifies bcrypt password hash against `dashboard_users` and issues an 8-hour HS256 JWT containing user `email` and `role`.
  - `POST /auth/refresh`: Refreshes valid JWTs.
  - `get_current_user`: FastAPI dependency validating `Authorization: Bearer` token. Applied to all routers (`/kpis`, `/works`, `/contractors`, `/quality`, `/admin`), while leaving `/health` and `/auth/*` public.
- **Admin Seeder CLI (`Backend/create_admin.py`)**: Standalone script to seed or update admin accounts with bcrypt hashes.
- **Frontend Auth Pipeline (`AuthContext.tsx`, `ProtectedRoute.tsx`, `Login.tsx`, `api.ts`)**:
  - `AuthContext`: Manages `mcl_auth_token` in `localStorage`. Evaluates `isTokenValid(savedToken)` synchronously on initial load to guarantee instant redirect to `/login` if token is missing/expired.
  - Active expiration monitor checks token validity every 10 seconds and on window focus.
  - `apiFetch` interceptor automatically clears token and redirects to `/login` on HTTP 401 Unauthorized responses.
  - `ProtectedRoute`: Guards all dashboard routes in `App.tsx`, directing unauthenticated users to `/login`.

### C. UI & Visual Design Polishing
- **Light Theme Redesign (`index.css`)**: Replaced warm beige with a soothing Slate 50 palette (`#f8fafc` backdrop, pure white cards `#ffffff`, Slate 200 borders `#e2e8f0`, Slate 900 `#0f172a` contrast text, soft badge tints).
- **Start Date Fallback (Work Order Date)**: If `start_date` is missing, extracts date string from `work_order_no_date` across UI (`WorkDetailModal.tsx`), GAS (`code.gs.js`), and Backend ETL (`sync.py` overdue calculation). Renders as `02-12-2024 (WO Date)` in modal.
- **Risk Score Circular SVG Gauge Fix (`WorkDetailModal.tsx`)**: Added SVG `viewBox="0 0 96 96"`, centered geometry, `stroke="var(--border)"` background ring, score number formatting (`riskScore.toFixed(1)` / integer string), and font size scaling to prevent text clipping/overlap (e.g. `281.5 SCORE`).

---

## 4. Next Steps & Remaining Work 🔄

### Phase 5 — SASCI-MDF Road Pipeline
- Create `Backend/routers/sasci.py` — new FastAPI router (`POST /sync/sasci`, `GET /sasci`).
- Add GAS section to read SASCI-MDF tab and push to `/sync/sasci`.
- Update `FlagshipAgenda.tsx` to consume live SASCI data instead of mock data.
