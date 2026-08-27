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
    # 1. Fetch general aggregates
    agg_row = await conn.fetchrow(
        """
        SELECT
            COUNT(*)::integer AS total_works,
            COALESCE(SUM(est_cost_lacs), 0)::float AS total_est_cost_lacs,
            COALESCE(SUM(tender_cost_lacs), 0)::float AS total_tender_cost_lacs,
            COALESCE(SUM(expenditure_lacs), 0)::float AS total_expenditure_lacs,
            COALESCE(AVG(financial_progress_pct), 0)::float AS avg_financial_progress_pct,
            COUNT(CASE WHEN fin_progress_anomaly = TRUE THEN 1 END)::integer AS anomaly_count
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

    # 3. Fetch by_delivery_status distribution
    status_rows = await conn.fetch(
        """
        SELECT COALESCE(delivery_status, 'Unspecified') as status, COUNT(*)::integer AS count
        FROM fact_works
        WHERE ($1::varchar IS NULL OR branch = $1)
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

    # 4. Fetch by_workflow_stage distribution
    stage_rows = await conn.fetch(
        """
        SELECT COALESCE(workflow_stage, 'Unspecified') as stage, COUNT(*)::integer AS count
        FROM fact_works
        WHERE ($1::varchar IS NULL OR branch = $1)
        GROUP BY workflow_stage
        """,
        branch
    )
    by_workflow_stage = {row['stage']: row['count'] for row in stage_rows}

    return {
        "total_works": agg_row["total_works"],
        "total_est_cost_lacs": round(agg_row["total_est_cost_lacs"], 2),
        "total_tender_cost_lacs": round(agg_row["total_tender_cost_lacs"], 2),
        "total_expenditure_lacs": round(agg_row["total_expenditure_lacs"], 2),
        "avg_financial_progress_pct": round(agg_row["avg_financial_progress_pct"], 2),
        "anomaly_count": agg_row["anomaly_count"],
        "by_branch": by_branch,
        "by_delivery_status": by_delivery_status,
        "by_workflow_stage": by_workflow_stage
    }
