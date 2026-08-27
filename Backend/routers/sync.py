from datetime import date, datetime
from typing import Optional
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from asyncpg import Connection

from database import get_db
from models import SyncPayload, SyncResponse, WorkSyncItem, QualitySyncItem

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/sync",
    tags=["sync"]
)

async def resolve_location(conn: Connection, zone: Optional[str], sub_zone: Optional[str], constituency: Optional[str], ward: Optional[str]) -> Optional[int]:
    zone = zone.strip() if zone else None
    sub_zone = sub_zone.strip() if sub_zone else None
    constituency = constituency.strip() if constituency else None
    ward = ward.strip() if ward else None

    if not any([zone, sub_zone, constituency, ward]):
        return None

    # SELECT first
    row = await conn.fetchrow(
        """
        SELECT location_id FROM dim_location
        WHERE (zone IS NOT DISTINCT FROM $1)
          AND (sub_zone IS NOT DISTINCT FROM $2)
          AND (constituency IS NOT DISTINCT FROM $3)
          AND (ward IS NOT DISTINCT FROM $4)
        """,
        zone, sub_zone, constituency, ward
    )
    if row:
        return row['location_id']

    # INSERT next
    try:
        loc_id = await conn.fetchval(
            """
            INSERT INTO dim_location (zone, sub_zone, constituency, ward)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (zone, sub_zone, constituency, ward) DO NOTHING
            RETURNING location_id
            """,
            zone, sub_zone, constituency, ward
        )
        if loc_id:
            return loc_id
        
        # Select again if ON CONFLICT DO NOTHING triggered
        return await conn.fetchval(
            """
            SELECT location_id FROM dim_location
            WHERE (zone IS NOT DISTINCT FROM $1)
              AND (sub_zone IS NOT DISTINCT FROM $2)
              AND (constituency IS NOT DISTINCT FROM $3)
              AND (ward IS NOT DISTINCT FROM $4)
            """,
            zone, sub_zone, constituency, ward
        )
    except Exception as e:
        logger.error(f"Error resolving dim_location: {e}")
        raise e

async def resolve_agency(conn: Connection, name: Optional[str]) -> Optional[int]:
    if not name or not name.strip():
        return None
    name = name.strip()

    row = await conn.fetchrow("SELECT agency_id FROM dim_agency WHERE agency_name = $1", name)
    if row:
        return row['agency_id']

    try:
        agency_id = await conn.fetchval(
            "INSERT INTO dim_agency (agency_name) VALUES ($1) ON CONFLICT (agency_name) DO NOTHING RETURNING agency_id",
            name
        )
        if agency_id:
            return agency_id
        return await conn.fetchval("SELECT agency_id FROM dim_agency WHERE agency_name = $1", name)
    except Exception as e:
        logger.error(f"Error resolving dim_agency: {e}")
        raise e

async def resolve_fund(conn: Connection, fund_type: Optional[str], quota_label: Optional[str]) -> Optional[int]:
    fund_type = fund_type.strip() if fund_type else None
    quota_label = quota_label.strip() if quota_label else None

    if not fund_type and not quota_label:
        return None

    row = await conn.fetchrow(
        "SELECT fund_id FROM dim_fund WHERE (fund_type IS NOT DISTINCT FROM $1) AND (quota_label IS NOT DISTINCT FROM $2)",
        fund_type, quota_label
    )
    if row:
        return row['fund_id']

    try:
        fund_id = await conn.fetchval(
            """
            INSERT INTO dim_fund (fund_type, quota_label) VALUES ($1, $2)
            ON CONFLICT (fund_type, quota_label) DO NOTHING RETURNING fund_id
            """,
            fund_type, quota_label
        )
        if fund_id:
            return fund_id
        return await conn.fetchval(
            "SELECT fund_id FROM dim_fund WHERE (fund_type IS NOT DISTINCT FROM $1) AND (quota_label IS NOT DISTINCT FROM $2)",
            fund_type, quota_label
        )
    except Exception as e:
        logger.error(f"Error resolving dim_fund: {e}")
        raise e

async def resolve_work_type(conn: Connection, branch: Optional[str], nature_of_work: Optional[str]) -> Optional[int]:
    branch = branch.strip() if branch else None
    nature_of_work = nature_of_work.strip() if nature_of_work else None

    if not branch and not nature_of_work:
        return None

    row = await conn.fetchrow(
        "SELECT work_type_id FROM dim_work_type WHERE (branch IS NOT DISTINCT FROM $1) AND (nature_of_work IS NOT DISTINCT FROM $2)",
        branch, nature_of_work
    )
    if row:
        return row['work_type_id']

    try:
        work_type_id = await conn.fetchval(
            """
            INSERT INTO dim_work_type (branch, nature_of_work) VALUES ($1, $2)
            ON CONFLICT (branch, nature_of_work) DO NOTHING RETURNING work_type_id
            """,
            branch, nature_of_work
        )
        if work_type_id:
            return work_type_id
        return await conn.fetchval(
            "SELECT work_type_id FROM dim_work_type WHERE (branch IS NOT DISTINCT FROM $1) AND (nature_of_work IS NOT DISTINCT FROM $2)",
            branch, nature_of_work
        )
    except Exception as e:
        logger.error(f"Error resolving dim_work_type: {e}")
        raise e

async def resolve_officer(conn: Connection, name: Optional[str]) -> Optional[int]:
    if not name or not name.strip():
        return None
    name = name.strip()

    row = await conn.fetchrow("SELECT officer_id FROM dim_officer WHERE officer_name = $1", name)
    if row:
        return row['officer_id']

    try:
        officer_id = await conn.fetchval(
            "INSERT INTO dim_officer (officer_name) VALUES ($1) ON CONFLICT (officer_name) DO NOTHING RETURNING officer_id",
            name
        )
        if officer_id:
            return officer_id
        return await conn.fetchval("SELECT officer_id FROM dim_officer WHERE officer_name = $1", name)
    except Exception as e:
        logger.error(f"Error resolving dim_officer: {e}")
        raise e

@router.post("/sheets", response_model=SyncResponse)
async def sync_sheets(payload: SyncPayload, conn: Connection = Depends(get_db)):
    upserted_count = 0
    skipped_count = 0
    quality_inserted_count = 0
    errors = []

    # Get local current date for calculations
    today = date.today()

    async with conn.transaction():
        # Process works
        for item in payload.works:
            try:
                # 1. Resolve dimensions
                loc_id = await resolve_location(conn, item.zone, item.sub_zone, item.constituency, item.ward)
                agency_id = await resolve_agency(conn, item.agency_name)
                fund_id = await resolve_fund(conn, item.fund_type, item.quota_label)
                work_type_id = await resolve_work_type(conn, item.branch, item.nature_of_work)
                officer_id = await resolve_officer(conn, item.officer_name)

                # 2. Pre-calculate days_overdue and risk_score
                days_overdue = 0
                if item.delivery_status != "Completed" and item.scheduled_end_date:
                    if item.scheduled_end_date < today:
                        days_overdue = (today - item.scheduled_end_date).days
                
                is_anomaly = item.fin_progress_anomaly if item.fin_progress_anomaly is not None else False
                risk_score = days_overdue * 0.5 + (20.0 if is_anomaly else 0.0)

                # 3. Upsert into fact_works
                # We check record_hash. If not exists or record_hash differs, we perform the update.
                row = await conn.fetchrow(
                    """
                    INSERT INTO fact_works (
                        work_id, sr_no, branch, location_id, agency_id, fund_id, work_type_id, officer_id,
                        work_description, length_rmt, road_width_ft, est_cost_lacs, tender_cost_lacs, expenditure_lacs,
                        workflow_stage, delivery_status, aa_approved, ts_approved, ts_accorded_by,
                        resolution_no_date, work_order_no_date, tender_float_date, tender_end_date, tech_eval_done, fin_eval_done,
                        start_date, time_limit_months, scheduled_end_date, actual_completion_date,
                        physical_progress_pct, financial_progress_pct, fin_progress_anomaly,
                        days_overdue, risk_score, issues_bottlenecks, remarks,
                        source_sheet, source_row, record_hash, data_quality_flags, pipeline_version, staged_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
                    )
                    ON CONFLICT (work_id) DO UPDATE
                    SET
                        sr_no = EXCLUDED.sr_no,
                        branch = EXCLUDED.branch,
                        location_id = EXCLUDED.location_id,
                        agency_id = EXCLUDED.agency_id,
                        fund_id = EXCLUDED.fund_id,
                        work_type_id = EXCLUDED.work_type_id,
                        officer_id = EXCLUDED.officer_id,
                        work_description = EXCLUDED.work_description,
                        length_rmt = EXCLUDED.length_rmt,
                        road_width_ft = EXCLUDED.road_width_ft,
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
                    item.work_id, item.sr_no, item.branch, loc_id, agency_id, fund_id, work_type_id, officer_id,
                    item.work_description, item.length_rmt, item.road_width_ft, item.est_cost_lacs, item.tender_cost_lacs, item.expenditure_lacs,
                    item.workflow_stage, item.delivery_status, item.aa_approved, item.ts_approved, item.ts_accorded_by,
                    item.resolution_no_date, item.work_order_no_date, item.tender_float_date, item.tender_end_date, item.tech_eval_done, item.fin_eval_done,
                    item.start_date, item.time_limit_months, item.scheduled_end_date, item.actual_completion_date,
                    item.physical_progress_pct, item.financial_progress_pct, item.fin_progress_anomaly,
                    days_overdue, risk_score, item.issues_bottlenecks, item.remarks,
                    item.source_sheet, item.source_row, item.record_hash, item.data_quality_flags, item.pipeline_version, item.staged_at
                )
                if row:
                    upserted_count += 1
                else:
                    skipped_count += 1
            except Exception as e:
                err_msg = f"Failed to upsert work_id {item.work_id}: {str(e)}"
                logger.error(err_msg)
                errors.append(err_msg)

        # Process quality
        for q_item in payload.quality:
            try:
                # Convert the entire Pydantic model to a raw json string natively supporting dates/datetimes
                raw_json = q_item.model_dump_json()
                
                await conn.execute(
                    """
                    INSERT INTO data_quality (
                        source_sheet, source_row, work_description, raw_zone, raw_ward, raw_status, flags, raw_json, staged_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """,
                    q_item.source_sheet, q_item.source_row, q_item.work_description, q_item.raw_zone, q_item.raw_ward, q_item.raw_status, q_item.flags, raw_json, q_item.staged_at
                )
                quality_inserted_count += 1
            except Exception as e:
                err_msg = f"Failed to insert quality row (sheet {q_item.source_sheet}, row {q_item.source_row}): {str(e)}"
                logger.error(err_msg)
                errors.append(err_msg)

    return SyncResponse(
        upserted=upserted_count,
        skipped=skipped_count,
        quality_inserted=quality_inserted_count,
        errors=errors
    )
