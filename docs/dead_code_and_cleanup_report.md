# EPMS Analytics Platform — Dead Code & Codebase Cleanliness Audit Report

**Date:** September 4, 2026
**Scope:** Full Repository Audit (`Backend/`, `Frontend/`, `docs/`)
**Objective:** Identify unused, dead, redundant, or deprecated files and code blocks with clear technical rationale and recommended cleanup actions.

---

## Executive Summary

A comprehensive audit of the **EPMS Analytics Platform** codebase was conducted across all **45 source files**. 
Overall, the core production pipeline (FastAPI backend, Neon PostgreSQL star schema, Vite + React + Tailwind frontend) is highly modular and active. However, as the platform evolved from initial mockups to live REST APIs, several legacy files, diagnostic scripts, unimported type definitions, and dead utility blocks were left behind.

### Audit Findings Overview

| Category | File / Code Component | Size / Lines | Status | Rationale | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dead File** | `Frontend/src/data/types.ts` | 1.7 KB / 68 lines | 🔴 **100% Dead** | Replaced by `api.ts`. Unimported across entire frontend. | **Delete file** |
| **Legacy Schema** | `docs/mcl_supabase_schema.sql` | 8.9 KB / 195 lines | 🔴 **Deprecated** | Early Supabase DDL. Production DB is Neon PostgreSQL. | **Delete file** |
| **Outdated Docs** | `docs/plan_updated.md` | 4.4 KB | 🔴 **Superseded** | Replaced by `context-handoff.md` and `codebase_analysis_report.md`. | **Archive or Delete** |
| **Outdated Docs** | `docs/MCL_Analytics_Architecture.md` | 6.8 KB | 🔴 **Superseded** | Early architecture draft, replaced by active reports. | **Archive or Delete** |
| **Orphaned Script** | `Backend/migrate.py` | 0.6 KB / 21 lines | 🟡 **Orphaned** | One-time DDL script for `id_type` column. | **Delete file** |
| **Orphaned Script** | `Backend/check_db.py` | 1.0 KB / 27 lines | 🟡 **Orphaned** | One-time diagnostic script for constraint verification. | **Move to `Backend/tools/` or Delete** |
| **Test Script** | `Backend/test_imports.py` | 1.0 KB / 30 lines | 🟡 **Diagnostic** | Ad-hoc import compiler script. | **Move to `Backend/tests/`** |
| **Test Script** | `Backend/test_endpoints.py` | 7.5 KB / 190 lines | 🟡 **Diagnostic** | Ad-hoc API endpoint tester script. | **Move to `Backend/tests/`** |
| **Near-Dead File** | `Frontend/src/data/mockData.ts` | 13.2 KB / 240 lines | 🟠 **Phase 5 Pending** | 95% unused; only `FlagshipAgenda.tsx` uses mock roads. | **Keep until Phase 5, then delete** |
| **Dead Code Block** | `EXPENDITURE_OVERRIDES` in `docs/code.gs.js` | Lines 1–4 | 🔴 **Dead Code** | Hardcoded object defined at top of script but never referenced. | **Remove code block** |
| **Inactive Component**| `Frontend/src/components/ProtectedRoute.tsx` | 0.3 KB / 12 lines | 🔵 **Phase 7 Pending** | Built for dashboard JWT auth; awaiting Phase 7 router integration. | **Retain for Phase 7** |

---

## Detailed Technical Evaluation & Rationale

### 1. Frontend Layer (`Frontend/src/`)

#### A. `Frontend/src/data/types.ts` — 🔴 100% Dead File
- **Location:** [`Frontend/src/data/types.ts`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/data/types.ts)
- **Description:** Contains early frontend interfaces (`WorkItem`, `AnalyticsSummary`, `ContractorSummary`, `ConstituencyFund`).
- **Why It's Dead:** All live components (`ExecutiveOverview`, `ContractorMatrix`, `OfficerCommand`, `MasterWorksDirectory`, etc.) exclusively import production API types (`WorkRecord`, `KpiData`, `OfficerRecord`, `ContractorRecord`) directly from [`Frontend/src/data/api.ts`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/data/api.ts). A codebase-wide grep confirms zero active files import `types.ts`.
- **Action:** Delete `Frontend/src/data/types.ts`.

#### B. `Frontend/src/data/mockData.ts` — 🟠 Near-Dead / Legacy Fallback
- **Location:** [`Frontend/src/data/mockData.ts`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/data/mockData.ts)
- **Description:** 13.2 KB static dataset (`MOCK_WORKS`, `MOCK_KPI_SUMMARY`, `MOCK_CONTRACTORS`, `MOCK_FLAGSHIP_ROADS`).
- **Why It's Near-Dead:** 8 out of 9 dashboard pages have been migrated to live REST endpoints via `useApi`. Only `FlagshipAgenda.tsx` currently imports `MOCK_FLAGSHIP_ROADS` while Phase 5 (SASCI-MDF road pipeline) is pending.
- **Action:** Retain temporarily for `FlagshipAgenda.tsx`. Once Phase 5 `GET /sasci` endpoint is connected, delete `mockData.ts` completely to save bundle size.

#### C. `Frontend/src/components/ProtectedRoute.tsx` — 🔵 Pending Feature Component
- **Location:** [`Frontend/src/components/ProtectedRoute.tsx`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/components/ProtectedRoute.tsx)
- **Description:** Route wrapper for checking `useAuth().token`.
- **Why It's Inactive:** Protected routes are not yet wrapped in `App.tsx` pending Phase 7 Dashboard Authentication.
- **Action:** Retain for Phase 7 implementation.

---

### 2. Backend Layer (`Backend/`)

#### A. One-Off Migration & Diagnostic Scripts — 🟡 Orphaned Scripts
- **Files:**
  - `Backend/migrate.py`: One-time script for adding `id_type` column to `fact_works`.
  - `Backend/check_db.py`: One-time script for verifying constraints on `data_quality` and `dashboard_users`.
- **Why They're Dead/Orphaned:** These scripts were written to execute specific DDL changes or diagnostic checks during development. They are not imported or executed by `main.py` or FastAPI routers.
- **Action:** Delete or move to a dedicated `Backend/scripts/` or `Backend/tools/` folder to keep the backend root clean.

#### B. Ad-Hoc Test Harness Scripts — 🟡 Non-Standard Test Files
- **Files:**
  - `Backend/test_imports.py`: Verifies module imports.
  - `Backend/test_endpoints.py`: Ad-hoc HTTP client testing script using `requests`.
- **Why They're Non-Standard:** Rather than standing in the backend root directory, standard Python projects organize test harnesses under `Backend/tests/`.
- **Action:** Create `Backend/tests/` directory and move these files there.

---

### 3. ETL Layer (`docs/code.gs.js`)

#### A. Dead Code Block: `EXPENDITURE_OVERRIDES` — 🔴 Dead Code
- **Location:** [`docs/code.gs.js`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/docs/code.gs.js#L1-L4)
- **Code Snippet:**
  ```javascript
  const EXPENDITURE_OVERRIDES = {
    "MCL-0351": 12.20,
    "MCL-0352": 12.20
  };
  ```
- **Why It's Dead:** Defined at lines 1–4 of `code.gs.js`, but never referenced anywhere in `cleanAndNormalize()`, `parseRow()`, or `pushToFastAPI()`. Expenditure overrides are now handled dynamically by the automated `EXPENDITURE_CONVERTED_FROM_RUPEES` conversion guard inside `cleanAndNormalize()`.
- **Action:** Remove lines 1–4 from `code.gs.js`.

---

### 4. Documentation & Schema Layer (`docs/`)

#### A. Deprecated Database Schema: `docs/mcl_supabase_schema.sql` — 🔴 Deprecated
- **Location:** [`docs/mcl_supabase_schema.sql`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/docs/mcl_supabase_schema.sql)
- **Why It's Deprecated:** Early DDL written during initial Supabase exploration. The production database is **Neon PostgreSQL** running the Star Schema DDL defined in `codebase_analysis_report.md`.
- **Action:** Delete `mcl_supabase_schema.sql`.

#### B. Outdated Working Plans — 🔴 Superseded
- **Files:**
  - `docs/plan_updated.md`
  - `docs/MCL_Analytics_Architecture.md`
- **Why They're Superseded:** Replaced by the comprehensive, live documentation set:
  1. [`docs/context-handoff.md`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/docs/context-handoff.md)
  2. [`docs/codebase_analysis_report.md`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/docs/codebase_analysis_report.md)
- **Action:** Archive or delete to maintain documentation clarity.

---

## Cleaned Codebase Impact Summary

Executing the recommended cleanups will:
1. **Reduce repository clutter** by removing 6 obsolete files (`types.ts`, `migrate.py`, `check_db.py`, `mcl_supabase_schema.sql`, `plan_updated.md`, `MCL_Analytics_Architecture.md`).
2. **Prevent Developer Confusion** by ensuring all TypeScript interfaces originate from a single source of truth ([`Frontend/src/data/api.ts`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/data/api.ts)).
3. **Clean Apps Script Execution** by removing unused variables in `code.gs.js`.
