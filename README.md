# Municipal Corporation Ludhiana (MCL) — EPMS Analytics Platform

The Executive Project Management System (EPMS) is a full-stack analytics platform built to ingest, process, and visualize municipal works data (B&R and O&M branches) for Ludhiana. 

It provides real-time monitoring of project progress, financial expenditures, contractor performance, officer workload matrices, data quality, and administrative user access management with JWT authentication.

## Tech Stack
* **Frontend**: React, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React, React Portals
* **Backend**: FastAPI (Python), asyncpg, Pydantic v2, python-jose, passlib[bcrypt], bcrypt
* **Database**: Neon PostgreSQL (Star Schema with Normalized Dimensions)
* **ETL Pipeline**: Google Apps Script (GAS) with API Key Authentication

## Project Structure
* `/Backend`: FastAPI web service handling data ingestion webhooks, JWT auth, analytics endpoints, and admin CRUD.
  * `/routers`: `auth.py`, `kpis.py`, `works.py`, `contractor.py`, `quality.py`, `sync.py`, `admin.py`
  * `create_admin.py`: Standalone CLI script to seed admin users into `dashboard_users`.
* `/Frontend`: React dashboard visualizing KPIs, contractor risk, officer command matrix, fund distribution, data quality, and admin profile.
* `/docs`: System architecture, handoff documents, analysis reports, and implementation plans.

## Key Features & Latest Updates
* **Phase 7 JWT Authentication & Security**: Secure login page (`/login`), JWT issuance (`POST /auth/login`, `/auth/refresh`), `ProtectedRoute` wrappers, initial synchronous reload token validation, active expiration check, and HTTP 401 automatic redirect. `X-API-Key` middleware header security for machine-to-machine sync webhooks (`/sync/*`).
* **Officer Performance Command Dashboard**: Dedicated officer matrix view (`/officers`) mirroring contractor analytics, featuring KPI summary cards, Recharts Top 20 bar chart, designation tabs (`JE`, `SDO`, `XEN`, `EE`), and multi-officer parsing (`parse_officers()`).
* **Work Order Start Date Fallback**: Automatically extracts date patterns from `work_order_no_date` when `start_date` is missing across UI, GAS, and Backend ETL.
* **Risk Score Circular Gauge UI Fix**: SVG `viewBox="0 0 96 96"` with centered geometry, theme-aware border rings, and clean number formatting (e.g. `281.5 SCORE`).
* **Executive Dashboard & Global Work Detail Modal**: High-level KPIs, clickable high-risk rows, dynamic modal view (`useWorkModal().openWorkModal`), and portal tooltips.
* **Slate Light & Dark Theme System**: Sleek Dark Glassmorphism mode and soothing Slate 50 Light Mode (`#f8fafc` backdrop, pure white cards, high-contrast Slate typography).

## Running Locally

The project is configured to run both the frontend and backend concurrently with a single command:

```bash
# Install dependencies
npm install

# Start the full stack (Frontend on 5173, Backend on 8000)
npm run dev:full
```

- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Current Status
* **Phases 1–4, 6, 7**: Completed ✅ (Database, ETL, Backend APIs, Officer Matrix, React Dashboard, JWT Auth, API Key Protection, Slate Theme Redesign)
* **Phase 5**: Pending 🔄 (SASCI-MDF Road Ingestion Pipeline)
