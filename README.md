# Municipal Corporation Ludhiana (MCL) — EPMS Analytics Platform

The Executive Project Management System (EPMS) is a full-stack analytics platform built to ingest, process, and visualize municipal works data (B&R and O&M branches) for Ludhiana. 

It provides real-time monitoring of project progress, financial expenditures, contractor performance, data quality, and administrative user access management.

## Tech Stack
* **Frontend**: React, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React, React Portals
* **Backend**: FastAPI (Python), asyncpg, Pydantic v2
* **Database**: Neon PostgreSQL (Star Schema with Normalized Dimensions)
* **ETL Pipeline**: Google Apps Script (GAS)

## Project Structure
* `/Backend`: FastAPI web service handling data ingestion webhooks, analytics endpoints, and admin CRUD.
  * `/routers`: `kpis.py`, `works.py`, `contractors.py`, `quality.py`, `sync.py`, `admin.py`
* `/Frontend`: React dashboard visualizing KPIs, contractor risk, fund distribution, data quality, and admin profile.
* `/docs`: Architecture, handoff documents, database schemas, and implementation plans.

## Key Features & Latest Updates
* **Executive Dashboard**: High-level KPIs, zone/constituency aggregates, fund distribution charts with unified filter guards.
* **Master Works Directory**: Paginated grid with search, multi-field filters, dynamic sorting (Risk Score, Cost, Days Overdue, Progress), and inline methodology tooltips.
* **Methodology Registry & React Portals**: Standardized metric definitions rendered via React Portals (`createPortal` to `document.body`) to prevent card clipping.
* **Data Quality & Ingestion Guards**: Robust date cleaning (stripping string prefixes and filtering Excel 1900 date anomalies) and synthetic ID reconciliation.
* **Admin & User Management**: Simple admin page (`/profile`) with CRUD REST endpoints (`/admin/users`) for managing dashboard access lists.
* **Dual Theme Engine**: Supports sleek dark glassmorphism mode and warm beige stone light mode.

## Running Locally

The project is configured to run both the frontend and backend concurrently with a single command. 

Ensure you have Node.js and Python installed, and have set up your `.env` files in both the root/Backend and Frontend directories.

```bash
# Install root dependencies for concurrently
npm install

# Start the full stack
npm run dev:full
```

- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Current Status
* **Phases 1–4, 6 & Sprints 1–3**: Completed ✅ (Database, ETL, Backend, React Dashboard, Admin CRUD, Date Cleaning Guards, Methodology Portals)
* **Phase 5**: Pending 🔄 (SASCI-MDF Road Ingestion Pipeline)
