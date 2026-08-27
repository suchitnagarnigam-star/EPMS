import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from asyncpg import Connection

from database import get_db

router = APIRouter(
    prefix="/quality",
    tags=["quality"]
)

def record_to_dict(record) -> dict:
    d = dict(record)
    if "raw_json" in d and isinstance(d["raw_json"], str):
        try:
            d["raw_json"] = json.loads(d["raw_json"])
        except ValueError:
            pass
    return d

@router.get("")
async def get_data_quality(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    conn: Connection = Depends(get_db)
):
    if page_size > 200:
        page_size = 200

    # 1. Fetch counts
    fact_count = await conn.fetchval("SELECT COUNT(*)::integer FROM fact_works")
    dq_count = await conn.fetchval("SELECT COUNT(*)::integer FROM data_quality")

    total_source_rows = fact_count + dq_count
    analytics_ready_count = fact_count
    backlog_count = dq_count
    
    analytics_ready_pct = 0.0
    if total_source_rows > 0:
        analytics_ready_pct = round((analytics_ready_count / total_source_rows) * 100, 2)

    # 2. Fetch flag breakdown using PostgreSQL regexp_split_to_table
    flag_breakdown_query = """
        SELECT TRIM(flag) AS flag, COUNT(*)::integer AS count
        FROM (
            SELECT regexp_split_to_table(flags, '\\|') AS flag
            FROM data_quality
            WHERE flags IS NOT NULL AND flags != ''
        ) sub
        GROUP BY flag
        ORDER BY count DESC
    """
    flag_rows = await conn.fetch(flag_breakdown_query)
    flag_breakdown = {row["flag"]: row["count"] for row in flag_rows}

    # 3. Paginated backlog list
    offset_val = (page - 1) * page_size
    backlog_rows_query = """
        SELECT id, source_sheet, source_row, work_description, raw_zone, raw_ward, raw_status, flags, raw_json, staged_at, created_at
        FROM data_quality
        ORDER BY id DESC
        LIMIT $1 OFFSET $2
    """
    dq_rows = await conn.fetch(backlog_rows_query, page_size, offset_val)
    backlog_results = [record_to_dict(row) for row in dq_rows]

    return {
        "total_source_rows": total_source_rows,
        "analytics_ready_count": analytics_ready_count,
        "backlog_count": backlog_count,
        "analytics_ready_pct": analytics_ready_pct,
        "flag_breakdown": flag_breakdown,
        "backlog_rows": {
            "total": backlog_count,
            "page": page,
            "page_size": page_size,
            "results": backlog_results
        }
    }
