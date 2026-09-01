from typing import Optional, List
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from asyncpg import Connection

from database import get_db

router = APIRouter(
    prefix="/works",
    tags=["works"]
)

def record_to_dict(record) -> dict:
    d = dict(record)
    for k, v in d.items():
        if isinstance(v, Decimal):
            d[k] = float(v)
    return d

@router.get("")
async def get_works(
    branch: Optional[str] = None,
    zone: Optional[str] = None,
    constituency: Optional[str] = None,
    delivery_status: Optional[str] = None,
    workflow_stage: Optional[str] = None,
    risk_score_min: Optional[float] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "risk_score",
    sort_order: Optional[str] = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    conn: Connection = Depends(get_db)
):
    # Enforce page size limits
    if page_size > 200:
        page_size = 200

    conditions = []
    params = []

    if branch:
        params.append(branch)
        conditions.append(f"F.branch = ${len(params)}")

    if zone:
        params.append(zone)
        conditions.append(f"L.zone = ${len(params)}")

    if constituency and constituency.strip() and constituency.lower() != 'all':
        params.append(constituency.strip())
        conditions.append(f"INITCAP(TRIM(L.constituency)) = INITCAP(TRIM(${len(params)}))")

    if delivery_status:
        params.append(delivery_status)
        conditions.append(f"F.delivery_status = ${len(params)}")

    if workflow_stage:
        params.append(workflow_stage)
        conditions.append(f"F.workflow_stage = ${len(params)}")

    if risk_score_min is not None:
        params.append(risk_score_min)
        conditions.append(f"F.risk_score >= ${len(params)}")

    if search:
        params.append(f"%{search}%")
        conditions.append(
            f"(F.work_description ILIKE ${len(params)}"
            f" OR F.work_id ILIKE ${len(params)}"
            f" OR A.agency_name ILIKE ${len(params)})"
        )

    where_clause = " AND ".join(conditions) if conditions else "TRUE"

    valid_sorts = {
        "risk_score": "F.risk_score",
        "est_cost_lacs": "F.est_cost_lacs",
        "tender_cost_lacs": "F.tender_cost_lacs",
        "expenditure_lacs": "F.expenditure_lacs",
        "physical_progress_pct": "F.physical_progress_pct",
        "work_id": "F.work_id",
    }
    sort_col = valid_sorts.get(sort_by or "risk_score", "F.risk_score")
    order_dir = "ASC" if (sort_order or "").lower() == "asc" else "DESC"
    order_clause = f"ORDER BY {sort_col} {order_dir} NULLS LAST, F.work_id ASC"

    # 1. Total Count Query
    count_query = f"""
        SELECT COUNT(*)::integer
        FROM fact_works F
        LEFT JOIN dim_location L ON F.location_id = L.location_id
        LEFT JOIN dim_agency A ON F.agency_id = A.agency_id
        WHERE {where_clause}
    """
    total = await conn.fetchval(count_query, *params)

    # 2. Results Query
    results_query = f"""
        SELECT 
            F.work_id, F.sr_no, F.branch, F.location_id, F.agency_id, F.fund_id, F.work_type_id, F.officer_id,
            F.work_description, F.length_rmt, F.road_width_ft, F.est_cost_lacs, F.tender_cost_lacs, F.expenditure_lacs,
            F.workflow_stage, F.delivery_status, F.aa_approved, F.ts_approved, F.ts_accorded_by,
            F.resolution_no_date, F.work_order_no_date, F.tender_float_date, F.tender_end_date, F.tech_eval_done, F.fin_eval_done,
            F.start_date, F.time_limit_months, F.scheduled_end_date, F.actual_completion_date,
            CASE 
              WHEN F.delivery_status ILIKE '%complet%' AND COALESCE(F.physical_progress_pct, 0) = 0
              THEN 100.0
              ELSE F.physical_progress_pct 
            END AS physical_progress_pct,
            CASE 
              WHEN F.delivery_status ILIKE '%complet%' AND COALESCE(F.physical_progress_pct, 0) = 0
              THEN true ELSE false 
            END AS progress_inferred,
            F.financial_progress_pct, F.fin_progress_anomaly,
            F.days_overdue, F.risk_score, F.issues_bottlenecks, F.remarks,
            F.source_sheet, F.source_row, F.record_hash, F.data_quality_flags, F.pipeline_version, F.staged_at,
            L.zone, L.sub_zone, INITCAP(TRIM(L.constituency)) AS constituency, L.ward,
            A.agency_name,
            W.nature_of_work,
            O.officer_name,
            FD.fund_type, FD.quota_label
        FROM fact_works F
        LEFT JOIN dim_location L ON F.location_id = L.location_id
        LEFT JOIN dim_agency A ON F.agency_id = A.agency_id
        LEFT JOIN dim_work_type W ON F.work_type_id = W.work_type_id
        LEFT JOIN dim_officer O ON F.officer_id = O.officer_id
        LEFT JOIN dim_fund FD ON F.fund_id = FD.fund_id
        WHERE {where_clause}
        {order_clause}
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    """

    limit_val = page_size
    offset_val = (page - 1) * page_size
    
    rows = await conn.fetch(results_query, *params, limit_val, offset_val)
    results = [record_to_dict(row) for row in rows]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": results
    }

