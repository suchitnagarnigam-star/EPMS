# ============================================================
#  MCL Analytics — FastAPI Sync Router
#  File: routers/sync.py
#
#  Handles POST /sync/sheets
#  Receives cleaned rows from Google Apps Script and writes
#  them to the Neon PostgreSQL database.
#
#  KEY FEATURE: Synthetic ID reconciliation
#  When a row that was previously stored as OM-ROW-47 later
#  gets a real MCL project ID, this code detects that and
#  updates the existing row instead of creating a duplicate.
# ============================================================

from fastapi import APIRouter, Depends, HTTPException
from typing import Any
import asyncpg
import logging
from datetime import date, datetime

from database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================
#  POST /sync/sheets
#  Entry point — called by Google Apps Script every 10 mins
# ============================================================
@router.post("/sync/sheets")
async def sync_sheets(payload: dict[str, Any], conn=Depends(get_db)):
    """
    Receives:
      {
        "works":   [ ...cleaned rows from GAS... ],
        "quality": [ ...broken rows from GAS... ]
      }

    For each work row:
      1. Check if it already exists in fact_works
      2. If it's a REAL ID row that previously existed as SYNTHETIC → reconcile
      3. Otherwise → normal upsert (insert or update if changed)

    Returns a summary of what happened.
    """

    works   = payload.get("works",   [])
    quality = payload.get("quality", [])

    results = {
        "upserted":    0,  # rows inserted or updated
        "skipped":     0,  # rows with no changes (hash match)
        "reconciled":  0,  # synthetic → real ID upgrades
        "quarantined": 0,  # rows sent to data_quality table
        "errors":      [],
    }

    async with conn.transaction():

        # ── STEP 1: Process main works rows ─────────────────
        for row in works:
            try:
                await process_work_row(conn, row, results)
            except Exception as e:
                logger.error(f"Error processing row {row.get('work_id')}: {e}")
                results["errors"].append(str(e))

        # ── STEP 2: Insert quality/quarantine rows ───────────
        for row in quality:
            try:
                await insert_quality_row(conn, row)
                results["quarantined"] += 1
            except Exception as e:
                logger.error(f"Error inserting quality row: {e}")
                results["errors"].append(str(e))

    return results


# ============================================================
#  PROCESS A SINGLE WORK ROW
#  This is where the synthetic ID logic lives
# ============================================================
async def process_work_row(conn, row: dict, results: dict):
    """
    Decision tree for each incoming row:

    Case A — Real ID, first time we've seen it
      → Normal insert

    Case B — Real ID, but we previously stored it as SYNTHETIC
      → This means MCL finally assigned a real ID to an O&M row
      → Find the old synthetic row, update its work_id to the real one
      → This is called "reconciliation"

    Case C — Synthetic ID (OM-ROW-47), already in DB
      → Normal update if data changed

    Case D — Synthetic ID, first time
      → Normal insert with id_type = 'SYNTHETIC'
    """

    work_id      = row.get("work_id")       # e.g. "MCL-0323" or "OM-ROW-47"
    id_type      = row.get("id_type")       # "REAL" or "SYNTHETIC"
    row_ref      = row.get("synthetic_row_ref")  # e.g. 47 (only set for synthetic rows)
    branch       = row.get("branch")        # "O&M" or "B&R"

    # ── RECONCILIATION CHECK ─────────────────────────────────
    # Only needed when GAS sends a REAL id_type.
    # We check: does a SYNTHETIC row exist for the same sheet row number?
    # If yes → this is an upgrade (MCL assigned a real ID to a previously
    #           synthetic row). We update instead of inserting fresh.

    if id_type == "REAL" and row_ref and branch:
        # Build what the old synthetic ID would have been
        prefix     = "OM-ROW-" if branch == "O&M" else "BR-ROW-"
        old_syn_id = f"{prefix}{row_ref}"

        existing_synthetic = await conn.fetchrow(
            "SELECT work_id FROM fact_works WHERE work_id = $1 AND id_type = 'SYNTHETIC'",
            old_syn_id
        )

        if existing_synthetic:
            # ── RECONCILE: rename synthetic row to real ID ───
            await conn.execute(
                """
                UPDATE fact_works
                SET work_id  = $1,
                    id_type  = 'REAL',
                    flags    = REPLACE(COALESCE(flags, ''), 'SYNTHETIC_ID', 'RECONCILED')
                WHERE work_id = $2
                """,
                work_id, old_syn_id
            )
            results["reconciled"] += 1
            logger.info(f"Reconciled: {old_syn_id} → {work_id}")

            # Now fall through to the normal upsert below to update
            # the rest of the fields (cost, status, etc.)

    # ── RESOLVE DIMENSION FOREIGN KEYS ──────────────────────
    # These look up or create entries in dim_location, dim_agency, etc.
    location_id  = await resolve_location(conn, row)
    agency_id    = await resolve_agency(conn, row)
    fund_id      = await resolve_fund(conn, row)

    # ── COMPUTE RISK METRICS ─────────────────────────────────
    days_overdue = compute_days_overdue(row)
    risk_score   = compute_risk_score(row, days_overdue)

    # ── BUILD RECORD HASH ────────────────────────────────────
    # This is a fingerprint of the row's data. If the hash hasn't
    # changed since last sync, we skip the update (nothing changed).
    record_hash = build_record_hash(row)

    # ── UPSERT INTO fact_works ───────────────────────────────
    # ON CONFLICT means: if work_id already exists, update it.
    # The WHERE clause at the end means: only update if data changed
    # (i.e. the hash is different from what's already stored).
    result = await conn.fetchrow(
        """
        INSERT INTO fact_works (
            work_id, id_type, branch,
            work_name, location_id, agency_id, fund_id,
            est_cost_lacs, tender_cost_lacs, expenditure_lacs,
            delivery_status, start_date, scheduled_end_date,
            days_overdue, risk_score, flags, record_hash
        ) VALUES (
            $1, $2, $3,
            $4, $5, $6, $7,
            $8, $9, $10,
            $11, $12, $13,
            $14, $15, $16, $17
        )
        ON CONFLICT (work_id) DO UPDATE SET
            id_type             = EXCLUDED.id_type,
            branch              = EXCLUDED.branch,
            work_name           = EXCLUDED.work_name,
            location_id         = EXCLUDED.location_id,
            agency_id           = EXCLUDED.agency_id,
            fund_id             = EXCLUDED.fund_id,
            est_cost_lacs       = EXCLUDED.est_cost_lacs,
            tender_cost_lacs    = EXCLUDED.tender_cost_lacs,
            expenditure_lacs    = EXCLUDED.expenditure_lacs,
            delivery_status     = EXCLUDED.delivery_status,
            start_date          = EXCLUDED.start_date,
            scheduled_end_date  = EXCLUDED.scheduled_end_date,
            days_overdue        = EXCLUDED.days_overdue,
            risk_score          = EXCLUDED.risk_score,
            flags               = EXCLUDED.flags,
            record_hash         = EXCLUDED.record_hash
        WHERE fact_works.record_hash IS DISTINCT FROM EXCLUDED.record_hash
        RETURNING work_id
        """,
        work_id, id_type, branch,
        row.get("work_name"), location_id, agency_id, fund_id,
        to_float(row.get("est_cost_lacs")),
        to_float(row.get("tender_cost_lacs")),
        to_float(row.get("expenditure_lacs")),
        row.get("delivery_status"),
        parse_date(row.get("start_date")),
        parse_date(row.get("scheduled_end_date")),
        days_overdue, risk_score,
        row.get("flags"),
        record_hash,
    )

    if result:
        results["upserted"] += 1
    else:
        results["skipped"] += 1


# ============================================================
#  INSERT INTO data_quality TABLE
#  For rows that are broken (missing work name, etc.)
# ============================================================
async def insert_quality_row(conn, row: dict):
    import json
    await conn.execute(
        """
        INSERT INTO data_quality (work_id, branch, flags, raw_json)
        VALUES ($1, $2, $3, $4::jsonb)
        ON CONFLICT DO NOTHING
        """,
        row.get("work_id"),
        row.get("branch"),
        row.get("flags"),
        json.dumps(row),
    )


# ============================================================
#  DIMENSION RESOLUTION HELPERS
#  These look up or create a row in the dimension tables.
#  Returns the integer ID to store in fact_works.
# ============================================================

async def resolve_location(conn, row) -> int | None:
    zone         = row.get("zone") or None
    constituency = row.get("constituency") or None
    if not zone and not constituency:
        return None
    result = await conn.fetchrow(
        """
        INSERT INTO dim_location (zone, constituency)
        VALUES ($1, $2)
        ON CONFLICT (zone, constituency) DO NOTHING
        RETURNING location_id;
        """,
        zone, constituency
    )
    if not result:
        result = await conn.fetchrow(
            "SELECT location_id FROM dim_location WHERE zone IS NOT DISTINCT FROM $1 AND constituency IS NOT DISTINCT FROM $2",
            zone, constituency
        )
    return result["location_id"] if result else None


async def resolve_agency(conn, row) -> int | None:
    name = row.get("agency_name") or None
    if not name:
        return None
    result = await conn.fetchrow(
        "INSERT INTO dim_agency (agency_name) VALUES ($1) ON CONFLICT (agency_name) DO NOTHING RETURNING agency_id",
        name
    )
    if not result:
        result = await conn.fetchrow("SELECT agency_id FROM dim_agency WHERE agency_name = $1", name)
    return result["agency_id"] if result else None


async def resolve_fund(conn, row) -> int | None:
    fund_type = row.get("fund_type") or None
    if not fund_type:
        return None
    result = await conn.fetchrow(
        "INSERT INTO dim_fund (fund_type) VALUES ($1) ON CONFLICT (fund_type) DO NOTHING RETURNING fund_id",
        fund_type
    )
    if not result:
        result = await conn.fetchrow("SELECT fund_id FROM dim_fund WHERE fund_type = $1", fund_type)
    return result["fund_id"] if result else None


# ============================================================
#  RISK & OVERDUE CALCULATIONS
# ============================================================

def compute_days_overdue(row) -> int | None:
    status     = row.get("delivery_status", "")
    end_date   = parse_date(row.get("scheduled_end_date"))
    if status == "Completed" or not end_date:
        return None
    delta = (date.today() - end_date).days
    return delta if delta > 0 else 0


def compute_risk_score(row, days_overdue) -> float:
    score = 0.0
    if days_overdue and days_overdue > 0:
        score += days_overdue * 0.5
    # Add 20 points if financial progress is suspiciously low
    exp  = to_float(row.get("expenditure_lacs")) or 0
    est  = to_float(row.get("est_cost_lacs")) or 1
    prog = (exp / est) * 100
    if prog < 10 and row.get("delivery_status") not in ("Not Started", "Tendered"):
        score += 20
    return round(score, 2)


# ============================================================
#  UTILITY HELPERS
# ============================================================

def build_record_hash(row: dict) -> str:
    """
    Creates a fingerprint string from the key fields.
    If none of these fields changed, the row is skipped on sync.
    """
    import hashlib
    fields = "|".join([
        str(row.get("work_name") or ""),
        str(row.get("est_cost_lacs") or ""),
        str(row.get("tender_cost_lacs") or ""),
        str(row.get("expenditure_lacs") or ""),
        str(row.get("delivery_status") or ""),
        str(row.get("scheduled_end_date") or ""),
    ])
    return hashlib.md5(fields.encode()).hexdigest()


def parse_date(value) -> date | None:
    if not value or value in ("-", "N/A", "None", ""):
        return None
    if isinstance(value, date):
        return value
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    return None


def to_float(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None