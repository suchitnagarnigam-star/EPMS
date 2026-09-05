# EPMS Analytics Platform — Dead Code & Codebase Cleanliness Audit Report

**Date:** September 5, 2026
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
| **Outdated Docs** | `docs/plan_updated.md` | 4.4 KB | 🟢 **Updated** | Master phase matrix updated for Phase 7 Auth completion. | **Maintained** |
| **Outdated Docs** | `docs/MCL_Analytics_Architecture.md` | 6.8 KB | 🟢 **Updated** | Updated with Auth & system architecture details. | **Maintained** |
| **Orphaned Script** | `Backend/migrate.py` | 0.6 KB / 21 lines | 🟡 **Orphaned** | One-time DDL script for `id_type` column. | **Delete file** |
| **Orphaned Script** | `Backend/check_db.py` | 1.0 KB / 27 lines | 🟡 **Orphaned** | One-time diagnostic script for constraint verification. | **Delete file** |
| **Test Script** | `Backend/test_imports.py` | 1.0 KB / 30 lines | 🟡 **Diagnostic** | Ad-hoc import compiler script. | **Move to `Backend/tests/`** |
| **Test Script** | `Backend/test_endpoints.py` | 7.5 KB / 190 lines | 🟡 **Diagnostic** | Ad-hoc API endpoint tester script. | **Move to `Backend/tests/`** |
| **Near-Dead File** | `Frontend/src/data/mockData.ts` | 13.2 KB / 240 lines | 🟠 **Phase 5 Pending** | 95% unused; only `FlagshipAgenda.tsx` uses mock roads. | **Keep until Phase 5, then delete** |
| **Dead Code Block** | `EXPENDITURE_OVERRIDES` in `docs/code.gs.js` | Lines 1–4 | 🔴 **Dead Code** | Hardcoded object defined at top of script but never referenced. | **Remove code block** |
| **Active Component**| `Frontend/src/components/ProtectedRoute.tsx` | 0.3 KB / 12 lines | 🟢 **Phase 7 Complete** | Fully integrated in `App.tsx` guarding all dashboard routes with JWT validation. | **Active & Integrated** |

---

## Detailed Technical Evaluation & Rationale

### 1. Frontend Layer (`Frontend/src/`)

#### A. `Frontend/src/data/types.ts` — 🔴 100% Dead File
- **Location:** [`Frontend/src/data/types.ts`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/data/types.ts)
- **Description:** Contains early frontend interfaces (`WorkItem`, `AnalyticsSummary`, `ContractorSummary`, `ConstituencyFund`).
- **Why It's Dead:** All live components (`ExecutiveOverview`, `ContractorMatrix`, `OfficerCommand`, `MasterWorksDirectory`, etc.) exclusively import production API types (`WorkRecord`, `KpiData`, `OfficerRecord`, `ContractorRecord`) directly from [`Frontend/src/data/api.ts`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/data/api.ts). A codebase-wide grep confirms zero active files import `types.ts`.
- **Action:** Delete `Frontend/src/data/types.ts`.

#### B. `Frontend/src/components/ProtectedRoute.tsx` — 🟢 Phase 7 Integrated & Active
- **Location:** [`Frontend/src/components/ProtectedRoute.tsx`](file:///d:/1YUVRAJ/program/MCL/MCL-analytics/Frontend/src/components/ProtectedRoute.tsx)
- **Description:** Route wrapper for checking `useAuth().isAuthenticated`.
- **Status:** Integrated in `App.tsx` wrapping all dashboard pages (`ExecutiveOverview`, `ContractorMatrix`, `OfficerCommand`, `MasterWorksDirectory`, `DataQuality`, `ProfilePage`, `FlagshipAgenda`). Automatically redirects unauthenticated users to `/login`.

---

## Cleaned Codebase Impact Summary

1. **Phase 7 Authentication fully active & integrated**.
2. **Slate 50 Light Theme palette and Risk score UI gauge fixes applied**.
3. **All documentation files (`context-handoff.md`, `codebase_analysis_report.md`, `MCL_Analytics_Architecture.md`, `plan_updated.md`) updated and synchronized with the latest codebase state**.
