import json
from typing import Optional, Dict
from fastapi import APIRouter, Depends
from asyncpg import Connection

from database import get_db

router = APIRouter(
    prefix="/kpis",
    tags=["kpis"]
)

@router.get("")
async def get_kpis(branch: Optional[str] = None, conn: Connection = Depends(get_db)):
    # 1. Fetch general aggregates and by_fund_type breakdown
    agg_row = await conn.fetchrow(
        """
        SELECT
            COUNT(*)::integer AS total_works,
            COALESCE(SUM(est_cost_lacs), 0)::float AS total_est_cost_lacs,
            COALESCE(SUM(tender_cost_lacs), 0)::float AS total_tender_cost_lacs,
            COALESCE(SUM(expenditure_lacs), 0)::float AS total_expenditure_lacs,
            COALESCE(AVG(CASE WHEN financial_progress_pct <= 100 THEN financial_progress_pct END), 0)::float AS avg_financial_progress_pct,
            COUNT(CASE WHEN fin_progress_anomaly = TRUE THEN 1 END)::integer AS anomaly_count,
            (
                SELECT json_object_agg(fund_type, total)
                FROM (
                    SELECT COALESCE(DF.fund_type, 'Unspecified') as fund_type, COUNT(*) as total
                    FROM fact_works F
                    LEFT JOIN dim_fund DF ON F.fund_id = DF.fund_id
                    WHERE ($1::varchar IS NULL OR F.branch = $1)
                    GROUP BY DF.fund_type
                ) t
            ) AS by_fund_type
        FROM fact_works
        WHERE ($1::varchar IS NULL OR branch = $1)
        """,
        branch
    )

    # 2. Fetch by_branch distribution
    branch_rows = await conn.fetch(
        """
        SELECT branch, COUNT(*)::integer AS count
        FROM fact_works
        WHERE ($1::varchar IS NULL OR branch = $1)
        GROUP BY branch
        """,
        branch
    )
    by_branch = {row['branch']: row['count'] for row in branch_rows}

    # 3. Fetch by_delivery_status — canonical values only
    status_rows = await conn.fetch(
        """
        SELECT delivery_status as status, COUNT(*)::integer AS count
        FROM fact_works
        WHERE ($1::varchar IS NULL OR branch = $1)
          AND delivery_status IN ('In Progress','Delayed/Held Up','Completed','Not Started','Procurement')
        GROUP BY delivery_status
        """,
        branch
    )
    by_delivery_status = {row['status']: row['count'] for row in status_rows}

    # Ensure required delivery status keys are initialized/present
    standard_delivery_statuses = ["In Progress", "Delayed/Held Up", "Completed", "Not Started", "Procurement"]
    for s in standard_delivery_statuses:
        if s not in by_delivery_status:
            by_delivery_status[s] = 0

    # 4. Fetch by_workflow_stage — canonical values only
    stage_rows = await conn.fetch(
        """
        SELECT workflow_stage as stage, COUNT(*)::integer AS count
        FROM fact_works
        WHERE ($1::varchar IS NULL OR branch = $1)
          AND workflow_stage IN ('Awarded','Work Order Issued','Procurement','Approval Pending','In Progress','Completed','Not Started','Delayed/Held Up')
        GROUP BY workflow_stage
        """,
        branch
    )
    by_workflow_stage = {row['stage']: row['count'] for row in stage_rows}

    by_fund_type_val = agg_row["by_fund_type"]
    if isinstance(by_fund_type_val, str):
        by_fund_type = json.loads(by_fund_type_val)
    elif by_fund_type_val is not None:
        by_fund_type = dict(by_fund_type_val)
    else:
        by_fund_type = {}

    return {
        "total_works": agg_row["total_works"],
        "total_est_cost_lacs": round(agg_row["total_est_cost_lacs"], 2),
        "total_tender_cost_lacs": round(agg_row["total_tender_cost_lacs"], 2),
        "total_expenditure_lacs": round(agg_row["total_expenditure_lacs"], 2),
        "avg_financial_progress_pct": round(agg_row["avg_financial_progress_pct"], 2),
        "anomaly_count": agg_row["anomaly_count"],
        "by_branch": by_branch,
        "by_delivery_status": by_delivery_status,
        "by_workflow_stage": by_workflow_stage,
        "by_fund_type": by_fund_type
    }


@router.get("/constituencies")
async def get_constituency_kpis(
    branch: Optional[str] = None,
    conn: Connection = Depends(get_db)
):
    conditions = []
    args = []
    if branch:
        args.append(branch)
        conditions.append(f"F.branch = ${len(args)}")
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = await conn.fetch(f"""
        SELECT
            COALESCE(L.constituency, 'Unassigned') AS constituency,
            COUNT(F.work_id)::integer                               AS total_works,
            COUNT(CASE WHEN F.branch = 'B&R' THEN 1 END)::integer   AS br_works,
            COUNT(CASE WHEN F.branch = 'O&M' THEN 1 END)::integer   AS om_works,
            COALESCE(SUM(F.est_cost_lacs), 0)::float                AS total_est_cost_lacs,
            COALESCE(SUM(F.tender_cost_lacs), 0)::float             AS total_tender_cost_lacs,
            COALESCE(SUM(F.expenditure_lacs), 0)::float             AS total_expenditure_lacs,
            COUNT(CASE WHEN F.risk_score > 50 THEN 1 END)::integer  AS critical_count,
            COUNT(CASE WHEN F.delivery_status = 'Completed' THEN 1 END)::integer AS completed_count
        FROM fact_works F
        LEFT JOIN dim_location L ON F.location_id = L.location_id
        {where}
        GROUP BY L.constituency
        ORDER BY total_works DESC
    """, *args)

    return [dict(r) for r in rows]


@router.get("/zones")
async def get_zone_kpis(
    branch: Optional[str] = None,
    conn: Connection = Depends(get_db)
):
    conditions = ["L.zone IS NOT NULL"]
    args = []
    if branch:
        args.append(branch)
        conditions.append(f"F.branch = ${len(args)}")
    where = f"WHERE {' AND '.join(conditions)}"

    rows = await conn.fetch(f"""
        SELECT
            L.zone,
            F.branch,
            COUNT(F.work_id)::integer                                            AS total_works,
            ROUND(AVG(F.physical_progress_pct)::numeric, 1)::float            AS avg_physical_progress,
            ROUND(AVG(F.financial_progress_pct)
                FILTER (WHERE F.financial_progress_pct <= 100)::numeric, 1)::float AS avg_financial_progress,
            COUNT(CASE WHEN F.delivery_status = 'Completed' THEN 1 END)::integer AS completed_count,
            COUNT(CASE WHEN F.risk_score > 50 THEN 1 END)::integer              AS high_risk_count
        FROM fact_works F
        JOIN dim_location L ON F.location_id = L.location_id
        {where}
        GROUP BY L.zone, F.branch
        ORDER BY L.zone, F.branch
    """, *args)

    return [dict(r) for r in rows]


@router.get("/fund-distribution")
async def get_fund_distribution(conn: Connection = Depends(get_db)):
    """Expenditure and estimate cost breakdown by fund type."""
    rows = await conn.fetch(
        """
        SELECT
            COALESCE(FD.fund_type, 'Unspecified') AS fund_type,
            COUNT(*)::integer AS total_works,
            COALESCE(SUM(F.expenditure_lacs), 0)::float AS total_expenditure_lacs,
            COALESCE(SUM(F.est_cost_lacs), 0)::float AS total_est_cost_lacs
        FROM fact_works F
        LEFT JOIN dim_fund FD ON F.fund_id = FD.fund_id
        GROUP BY FD.fund_type
        ORDER BY total_expenditure_lacs DESC
        """
    )
    return [
        {
            "fund_type": row["fund_type"],
            "total_works": row["total_works"],
            "total_expenditure_lacs": round(row["total_expenditure_lacs"], 2),
            "total_est_cost_lacs": round(row["total_est_cost_lacs"], 2),
        }
        for row in rows
    ]
