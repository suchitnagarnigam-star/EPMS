from fastapi import APIRouter, Depends, HTTPException
from typing import Any
import asyncpg
import logging
import json
from datetime import date, datetime

from database import get_db
from models import SyncPayload, WorkSyncItem, QualitySyncItem

router = APIRouter(prefix="/sync", tags=["sync"])
logger = logging.getLogger(__name__)

@router.post("/sheets")
async def sync_sheets(payload: SyncPayload, conn=Depends(get_db)):
    """
    Receives validated payload from Google Apps Script.
    """
    results = {
        "upserted":    0,
        "skipped":     0,
        "reconciled":  0,
        "quarantined": 0,
        "errors":      [],
    }

    async with conn.transaction():
        # Process main works rows
        for row in payload.works:
            try:
                await process_work_row(conn, row, results)
            except Exception as e:
                logger.error(f"Error processing row {row.work_id}: {e}")
                results["errors"].append(str(e))

        # Insert quality/quarantine rows
        for row in payload.quality:
            try:
                await insert_quality_row(conn, row)
                results["quarantined"] += 1
            except Exception as e:
                logger.error(f"Error inserting quality row: {e}")
                results["errors"].append(str(e))

    return results


async def process_work_row(conn, row: WorkSyncItem, results: dict):
    work_id = row.work_id
    id_type = row.id_type or "REAL"
    row_ref = row.synthetic_row_ref
    branch  = row.branch

    # ── RECONCILIATION CHECK ──
    if id_type == "REAL" and row_ref and branch:
        prefix = "OM-ROW-" if branch == "O&M" else "BR-ROW-"
        old_syn_id = f"{prefix}{row_ref}"

        existing_synthetic = await conn.fetchrow(
            "SELECT work_id FROM fact_works WHERE work_id = $1 AND id_type = 'SYNTHETIC'",
            old_syn_id
        )

        if existing_synthetic:
            # Update to real ID
            await conn.execute(
                """
                UPDATE fact_works
                SET work_id  = $1,
                    id_type  = 'REAL',
                    data_quality_flags = REPLACE(COALESCE(data_quality_flags, ''), 'SYNTHETIC_ID', 'RECONCILED')
                WHERE work_id = $2
                """,
                work_id, old_syn_id
            )
            results["reconciled"] += 1
            logger.info(f"Reconciled: {old_syn_id} → {work_id}")

    # ── RESOLVE DIMENSIONS ──
    location_id  = await resolve_location(conn, row)
    agency_id    = await resolve_agency(conn, row)
    fund_id      = await resolve_fund(conn, row)
    work_type_id = await resolve_work_type(conn, row)
    officer_id   = await resolve_officer(conn, row)

    # ── COMPUTE RISK METRICS ──
    days_overdue = compute_days_overdue(row)
    risk_score   = compute_risk_score(row, days_overdue)

    # ── UPSERT ──
    result = await conn.fetchrow(
        """
        INSERT INTO fact_works (
            work_id, id_type, sr_no, branch,
            work_description, location_id, agency_id, fund_id, work_type_id, officer_id,
            est_cost_lacs, tender_cost_lacs, expenditure_lacs,
            workflow_stage, delivery_status,
            aa_approved, ts_approved, ts_accorded_by, resolution_no_date, work_order_no_date,
            tender_float_date, tender_end_date, tech_eval_done, fin_eval_done,
            start_date, time_limit_months, scheduled_end_date, actual_completion_date,
            physical_progress_pct, financial_progress_pct, fin_progress_anomaly,
            days_overdue, risk_score, issues_bottlenecks, remarks,
            source_sheet, source_row, record_hash, data_quality_flags, pipeline_version, staged_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41
        )
        ON CONFLICT (work_id) DO UPDATE SET
            id_type = EXCLUDED.id_type,
            sr_no = EXCLUDED.sr_no,
            branch = EXCLUDED.branch,
            work_description = EXCLUDED.work_description,
            location_id = EXCLUDED.location_id,
            agency_id = EXCLUDED.agency_id,
            fund_id = EXCLUDED.fund_id,
            work_type_id = EXCLUDED.work_type_id,
            officer_id = EXCLUDED.officer_id,
            est_cost_lacs = EXCLUDED.est_cost_lacs,
            tender_cost_lacs = EXCLUDED.tender_cost_lacs,
            expenditure_lacs = EXCLUDED.expenditure_lacs,
            workflow_stage = EXCLUDED.workflow_stage,
            delivery_status = EXCLUDED.delivery_status,
            aa_approved = EXCLUDED.aa_approved,
            ts_approved = EXCLUDED.ts_approved,
            ts_accorded_by = EXCLUDED.ts_accorded_by,
            resolution_no_date = EXCLUDED.resolution_no_date,
            work_order_no_date = EXCLUDED.work_order_no_date,
            tender_float_date = EXCLUDED.tender_float_date,
            tender_end_date = EXCLUDED.tender_end_date,
            tech_eval_done = EXCLUDED.tech_eval_done,
            fin_eval_done = EXCLUDED.fin_eval_done,
            start_date = EXCLUDED.start_date,
            time_limit_months = EXCLUDED.time_limit_months,
            scheduled_end_date = EXCLUDED.scheduled_end_date,
            actual_completion_date = EXCLUDED.actual_completion_date,
            physical_progress_pct = EXCLUDED.physical_progress_pct,
            financial_progress_pct = EXCLUDED.financial_progress_pct,
            fin_progress_anomaly = EXCLUDED.fin_progress_anomaly,
            days_overdue = EXCLUDED.days_overdue,
            risk_score = EXCLUDED.risk_score,
            issues_bottlenecks = EXCLUDED.issues_bottlenecks,
            remarks = EXCLUDED.remarks,
            source_sheet = EXCLUDED.source_sheet,
            source_row = EXCLUDED.source_row,
            record_hash = EXCLUDED.record_hash,
            data_quality_flags = EXCLUDED.data_quality_flags,
            pipeline_version = EXCLUDED.pipeline_version,
            staged_at = EXCLUDED.staged_at
        WHERE fact_works.record_hash IS DISTINCT FROM EXCLUDED.record_hash
        RETURNING work_id
        """,
        work_id, id_type, row.sr_no, branch,
        row.work_description, location_id, agency_id, fund_id, work_type_id, officer_id,
        row.est_cost_lacs, row.tender_cost_lacs, row.expenditure_lacs,
        row.workflow_stage, row.delivery_status,
        row.aa_approved, row.ts_approved, row.ts_accorded_by, row.resolution_no_date, row.work_order_no_date,
        row.tender_float_date, row.tender_end_date, row.tech_eval_done, row.fin_eval_done,
        row.start_date, row.time_limit_months, row.scheduled_end_date, row.actual_completion_date,
        row.physical_progress_pct, row.financial_progress_pct, row.fin_progress_anomaly,
        days_overdue, risk_score, row.issues_bottlenecks, row.remarks,
        row.source_sheet, row.source_row, row.record_hash, row.data_quality_flags, row.pipeline_version, row.staged_at
    )

    if result:
        results["upserted"] += 1
    else:
        results["skipped"] += 1


async def insert_quality_row(conn, row: QualitySyncItem):
    await conn.execute(
        """
        INSERT INTO data_quality (source_sheet, source_row, work_description, raw_zone, raw_ward, raw_status, flags, raw_json, staged_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        ON CONFLICT (source_sheet, source_row, flags) DO NOTHING
        """,
        row.source_sheet,
        row.source_row,
        row.work_description,
        row.raw_zone,
        row.raw_ward,
        row.raw_status,
        row.flags,
        row.model_dump_json(),
        row.staged_at,
    )


# ── DIMENSIONS ──

async def resolve_location(conn, row: WorkSyncItem) -> int | None:
    zone = row.zone.strip() if row.zone else None
    sub_zone = row.sub_zone.strip() if row.sub_zone else None
    constituency = row.constituency.strip().title() if row.constituency else None
    ward = str(row.ward).strip() if row.ward is not None else None

    if not zone and not constituency:
        return None
    res = await conn.fetchrow(
        "INSERT INTO dim_location (zone, sub_zone, constituency, ward) VALUES ($1, $2, $3, $4) ON CONFLICT (zone, sub_zone, constituency, ward) DO NOTHING RETURNING location_id",
        zone, sub_zone, constituency, ward
    )
    if not res:
        res = await conn.fetchrow(
            "SELECT location_id FROM dim_location WHERE zone IS NOT DISTINCT FROM $1 AND sub_zone IS NOT DISTINCT FROM $2 AND constituency IS NOT DISTINCT FROM $3 AND ward IS NOT DISTINCT FROM $4",
            zone, sub_zone, constituency, ward
        )
    return res["location_id"] if res else None

async def resolve_agency(conn, row: WorkSyncItem) -> int | None:
    if not row.agency_name:
        return None
    res = await conn.fetchrow(
        "INSERT INTO dim_agency (agency_name) VALUES ($1) ON CONFLICT (agency_name) DO NOTHING RETURNING agency_id",
        row.agency_name
    )
    if not res:
        res = await conn.fetchrow("SELECT agency_id FROM dim_agency WHERE agency_name = $1", row.agency_name)
    return res["agency_id"] if res else None

async def resolve_fund(conn, row: WorkSyncItem) -> int | None:
    if not row.fund_type:
        return None
    res = await conn.fetchrow(
        "INSERT INTO dim_fund (fund_type, quota_label) VALUES ($1, $2) ON CONFLICT (fund_type, quota_label) DO NOTHING RETURNING fund_id",
        row.fund_type, row.quota_label
    )
    if not res:
        res = await conn.fetchrow("SELECT fund_id FROM dim_fund WHERE fund_type IS NOT DISTINCT FROM $1 AND quota_label IS NOT DISTINCT FROM $2", row.fund_type, row.quota_label)
    return res["fund_id"] if res else None

async def resolve_work_type(conn, row: WorkSyncItem) -> int | None:
    if not row.nature_of_work:
        return None
    res = await conn.fetchrow(
        "INSERT INTO dim_work_type (branch, nature_of_work) VALUES ($1, $2) ON CONFLICT (branch, nature_of_work) DO NOTHING RETURNING work_type_id",
        row.branch, row.nature_of_work
    )
    if not res:
        res = await conn.fetchrow("SELECT work_type_id FROM dim_work_type WHERE branch IS NOT DISTINCT FROM $1 AND nature_of_work IS NOT DISTINCT FROM $2", row.branch, row.nature_of_work)
    return res["work_type_id"] if res else None

async def resolve_officer(conn, row: WorkSyncItem) -> int | None:
    if not row.officer_name:
        return None
    res = await conn.fetchrow(
        "INSERT INTO dim_officer (officer_name) VALUES ($1) ON CONFLICT (officer_name) DO NOTHING RETURNING officer_id",
        row.officer_name
    )
    if not res:
        res = await conn.fetchrow("SELECT officer_id FROM dim_officer WHERE officer_name = $1", row.officer_name)
    return res["officer_id"] if res else None


# ── METRICS ──

def compute_days_overdue(row: WorkSyncItem) -> int | None:
    if row.delivery_status == "Completed" or not row.scheduled_end_date:
        return None
    delta = (date.today() - row.scheduled_end_date).days
    if delta <= 0:
        return 0
    return min(delta, 3650)  # 10-year cap on overdue

def compute_risk_score(row: WorkSyncItem, days_overdue: int | None) -> float:
    score = 0.0
    if days_overdue and days_overdue > 0:
        score += days_overdue * 0.5
    exp = row.expenditure_lacs or 0
    est = row.est_cost_lacs or 1
    prog = (exp / est) * 100
    if prog < 10 and row.delivery_status not in ("Not Started", "Tendered", "Procurement"):
        score += 20
    return round(min(score, 999.0), 2)  # Hard cap at 999


@router.get("/status")
async def get_sync_status(conn=Depends(get_db)):
    row = await conn.fetchrow("""
        SELECT MAX(updated_at) AS last_synced_at,
               COUNT(*)        AS total_works
        FROM fact_works
    """)
    return {
        "last_synced_at": row["last_synced_at"].isoformat() if row["last_synced_at"] else None,
        "total_works": row["total_works"]
    }