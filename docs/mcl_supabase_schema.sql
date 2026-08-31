-- ============================================================
-- MCL Analytics Platform — Supabase Schema
-- Run this entire script in Supabase SQL Editor (New Query)
-- ============================================================

-- ────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ────────────────────────────────────────
-- DIMENSION TABLES
-- ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dim_location (
  location_id    SERIAL PRIMARY KEY,
  zone           VARCHAR(2),
  sub_zone       VARCHAR(10),
  constituency   VARCHAR(100),
  ward           VARCHAR(50),
  UNIQUE (zone, sub_zone, constituency, ward)
);

CREATE TABLE IF NOT EXISTS dim_agency (
  agency_id      SERIAL PRIMARY KEY,
  agency_name    VARCHAR(200) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_fund (
  fund_id        SERIAL PRIMARY KEY,
  fund_type      VARCHAR(100),
  quota_label    VARCHAR(100),
  UNIQUE (fund_type, quota_label)
);

CREATE TABLE IF NOT EXISTS dim_work_type (
  work_type_id   SERIAL PRIMARY KEY,
  branch         VARCHAR(10),        -- B&R or O&M
  nature_of_work VARCHAR(100),       -- canonical value only
  UNIQUE (branch, nature_of_work)
);

CREATE TABLE IF NOT EXISTS dim_officer (
  officer_id     SERIAL PRIMARY KEY,
  officer_name   VARCHAR(200) UNIQUE NOT NULL
);


-- ────────────────────────────────────────
-- FACT TABLE
-- ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fact_works (

  -- Identity
  work_id                VARCHAR(20) PRIMARY KEY,   -- Project ID from source
  id_type                VARCHAR(20) DEFAULT 'REAL', -- "REAL" or "SYNTHETIC"
  sr_no                  INTEGER,
  branch                 VARCHAR(10) NOT NULL,       -- B&R / O&M (denormalized for fast filter)

  -- Dimension FKs (nullable — row may arrive before dim is populated)
  location_id            INTEGER REFERENCES dim_location(location_id)   ON DELETE SET NULL,
  agency_id              INTEGER REFERENCES dim_agency(agency_id)        ON DELETE SET NULL,
  fund_id                INTEGER REFERENCES dim_fund(fund_id)            ON DELETE SET NULL,
  work_type_id           INTEGER REFERENCES dim_work_type(work_type_id)  ON DELETE SET NULL,
  officer_id             INTEGER REFERENCES dim_officer(officer_id)      ON DELETE SET NULL,

  -- Work Details
  work_description       TEXT,
  length_rmt             NUMERIC,
  road_width_ft          NUMERIC,

  -- Financial
  est_cost_lacs          NUMERIC,
  tender_cost_lacs       NUMERIC,
  expenditure_lacs       NUMERIC,

  -- Status (two separate concepts — never merge)
  workflow_stage         VARCHAR(80),   -- from "Current Status" col: Awarded, Procurement, etc.
  delivery_status        VARCHAR(50),   -- from "Status" col: In Progress, Delayed/Held Up, etc.

  -- Lifecycle flags
  aa_approved            BOOLEAN,
  ts_approved            BOOLEAN,
  ts_accorded_by         VARCHAR(100),
  resolution_no_date     VARCHAR(100),
  work_order_no_date     VARCHAR(100),
  tender_float_date      DATE,
  tender_end_date        DATE,
  tech_eval_done         BOOLEAN,
  fin_eval_done          BOOLEAN,

  -- Timeline
  start_date             DATE,
  time_limit_months      INTEGER,
  scheduled_end_date     DATE,
  actual_completion_date DATE,

  -- Progress
  physical_progress_pct  NUMERIC,
  financial_progress_pct NUMERIC,      -- COMPUTED by GAS: expenditure / tender_cost × 100
  fin_progress_anomaly   BOOLEAN,      -- TRUE if financial_progress_pct > 100

  -- Risk (computed by FastAPI, not GAS)
  days_overdue           INTEGER,
  risk_score             NUMERIC,

  -- Notes
  issues_bottlenecks     TEXT,
  remarks                TEXT,

  -- Pipeline metadata (from GAS)
  source_sheet           VARCHAR(10),
  source_row             INTEGER,
  record_hash            VARCHAR(64),
  data_quality_flags     TEXT,         -- pipe-separated: MISSING_AGENCY|UNRESOLVED_LOCATION
  pipeline_version       VARCHAR(20),
  staged_at              TIMESTAMPTZ,

  -- DB bookkeeping
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);


-- ────────────────────────────────────────
-- DATA QUALITY / BACKLOG TABLE
-- Rows from source that have no Project ID
-- or fail structural validation
-- ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_quality (
  id               SERIAL PRIMARY KEY,
  source_sheet     VARCHAR(20),
  source_row       INTEGER,
  work_description TEXT,
  raw_zone         VARCHAR(100),
  raw_ward         VARCHAR(100),
  raw_status       VARCHAR(200),
  flags            TEXT,            -- pipe-separated flag list
  raw_json         JSONB,           -- full cleaned row preserved as JSON
  staged_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ────────────────────────────────────────
-- SASCI-MDF TABLE
-- Separate — km-based, not lacs-based
-- Built after B&R/O&M pipeline is stable
-- ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sasci_mdf_works (
  id                     SERIAL PRIMARY KEY,
  sr_no                  INTEGER,
  name_of_road           TEXT,
  type_of_road           VARCHAR(50),
  source_of_funding      VARCHAR(50),
  constituency           VARCHAR(100),
  est_cost_crores        NUMERIC,
  total_length_km        NUMERIC,
  completed_length_km    NUMERIC,
  pct_length_completed   NUMERIC,
  white_line_target_km   NUMERIC,
  white_line_done_km     NUMERIC,
  target_completion_date DATE,
  remarks                TEXT,
  record_hash            VARCHAR(64),
  pipeline_version       VARCHAR(20),
  last_updated           TIMESTAMPTZ DEFAULT NOW(),
  created_at             TIMESTAMPTZ DEFAULT NOW()
);


-- ────────────────────────────────────────
-- INDEXES (for dashboard query performance)
-- ────────────────────────────────────────

-- Filters used in every dashboard tab
CREATE INDEX IF NOT EXISTS idx_fact_works_branch           ON fact_works (branch);
CREATE INDEX IF NOT EXISTS idx_fact_works_workflow_stage   ON fact_works (workflow_stage);
CREATE INDEX IF NOT EXISTS idx_fact_works_delivery_status  ON fact_works (delivery_status);
CREATE INDEX IF NOT EXISTS idx_fact_works_location_id      ON fact_works (location_id);
CREATE INDEX IF NOT EXISTS idx_fact_works_agency_id        ON fact_works (agency_id);
CREATE INDEX IF NOT EXISTS idx_fact_works_fund_id          ON fact_works (fund_id);
CREATE INDEX IF NOT EXISTS idx_fact_works_work_type_id     ON fact_works (work_type_id);

-- For sync: detect changed records by hash
CREATE INDEX IF NOT EXISTS idx_fact_works_record_hash      ON fact_works (record_hash);

-- For data quality tab
CREATE INDEX IF NOT EXISTS idx_data_quality_source_sheet   ON data_quality (source_sheet);
CREATE INDEX IF NOT EXISTS idx_data_quality_staged_at      ON data_quality (staged_at);


-- ────────────────────────────────────────
-- AUTO-UPDATE updated_at ON fact_works
-- ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fact_works_updated_at ON fact_works;
CREATE TRIGGER trg_fact_works_updated_at
  BEFORE UPDATE ON fact_works
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ────────────────────────────────────────
-- VERIFY (run after the above)
-- Should return all 7 tables
-- ────────────────────────────────────────

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

