# Municipal Corporation Ludhiana (MCL) — EPMS Analytics Platform

The Executive Project Management System (EPMS) is a full-stack analytics platform built to ingest, process, and visualize municipal works data (B&R and O&M branches) for Ludhiana. 

It provides real-time monitoring of project progress, financial expenditures, contractor performance, and data quality.

## Tech Stack
* **Frontend**: React, Vite, TypeScript, Tailwind CSS, Recharts, Lucide React
* **Backend**: FastAPI (Python), asyncpg, Pydantic
* **Database**: Neon PostgreSQL (Star Schema)
* **ETL Pipeline**: Google Apps Script (GAS)

## Project Structure
* `/Backend`: FastAPI web service handling data ingestion webhooks and analytics endpoints.
* `/Frontend`: React dashboard visualizing KPIs, contractor risk, fund distribution, and data quality.
* `/docs`: Architecture, handoff documents, database schemas, and implementation plans.

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
* **Phases 1-4 & 6**: Completed ✅ (Database, ETL, Backend, React Dashboard)
* **Phase 5**: Pending 🔄 (SASCI-MDF Road Ingestion Pipeline)
