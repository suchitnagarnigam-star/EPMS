from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel
import logging

from database import get_db
from routers.auth import get_current_user

router = APIRouter(tags=["sasci"])
logger = logging.getLogger(__name__)


class SasciWorkIn(BaseModel):
    sr_no: int
    name_of_road: Optional[str] = None
    type_of_road: Optional[str] = None
    source_of_funding: Optional[str] = None
    constituency: Optional[str] = None
    est_cost_crores: Optional[float] = None
    est_cost_lacs: Optional[float] = None
    total_length_km: Optional[float] = None
    completed_length_km: Optional[float] = None
    pct_length_completed: Optional[float] = None
    white_line_target_km: Optional[float] = None
    white_line_done_km: Optional[float] = None
    progress_as_of: Optional[str] = None
    target_completion_date: Optional[date] = None
    remarks: Optional[str] = None
    record_hash: Optional[str] = None
    pipeline_version: Optional[str] = "v1.0"


@router.post("/sync/sasci")
async def sync_sasci_mdf(items: List[SasciWorkIn], conn=Depends(get_db)):
    """
    Receives SASCI-MDF road works array from Google Apps Script.
    Upserts on sr_no conflict if record_hash has changed.
    """
    upserted = 0
    skipped = 0

    async with conn.transaction():
        for item in items:
            # If est_cost_lacs is not provided, calculate from est_cost_crores
            est_lacs = item.est_cost_lacs
            if est_lacs is None and item.est_cost_crores is not None:
                est_lacs = round(item.est_cost_crores * 100, 2)

            res = await conn.fetchrow(
                """
                INSERT INTO sasci_mdf_works (
                    sr_no, name_of_road, type_of_road, source_of_funding, constituency,
                    est_cost_crores, est_cost_lacs, total_length_km, completed_length_km,
                    pct_length_completed, white_line_target_km, white_line_done_km,
                    progress_as_of, target_completion_date, remarks, record_hash, pipeline_version
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9,
                    $10, $11, $12,
                    $13, $14, $15, $16, $17
                )
                ON CONFLICT (sr_no) DO UPDATE SET
                    name_of_road = EXCLUDED.name_of_road,
                    type_of_road = EXCLUDED.type_of_road,
                    source_of_funding = EXCLUDED.source_of_funding,
                    constituency = EXCLUDED.constituency,
                    est_cost_crores = EXCLUDED.est_cost_crores,
                    est_cost_lacs = EXCLUDED.est_cost_lacs,
                    total_length_km = EXCLUDED.total_length_km,
                    completed_length_km = EXCLUDED.completed_length_km,
                    pct_length_completed = EXCLUDED.pct_length_completed,
                    white_line_target_km = EXCLUDED.white_line_target_km,
                    white_line_done_km = EXCLUDED.white_line_done_km,
                    progress_as_of = EXCLUDED.progress_as_of,
                    target_completion_date = EXCLUDED.target_completion_date,
                    remarks = EXCLUDED.remarks,
                    record_hash = EXCLUDED.record_hash,
                    pipeline_version = EXCLUDED.pipeline_version,
                    last_updated = NOW()
                WHERE sasci_mdf_works.record_hash IS DISTINCT FROM EXCLUDED.record_hash
                RETURNING id
                """,
                item.sr_no, item.name_of_road, item.type_of_road, item.source_of_funding, item.constituency,
                item.est_cost_crores, est_lacs, item.total_length_km, item.completed_length_km,
                item.pct_length_completed, item.white_line_target_km, item.white_line_done_km,
                item.progress_as_of, item.target_completion_date, item.remarks, item.record_hash, item.pipeline_version
            )

            if res:
                upserted += 1
            else:
                skipped += 1

    return {
        "upserted": upserted,
        "skipped": skipped,
        "total": len(items)
    }


@router.get("/sasci", dependencies=[Depends(get_current_user)])
async def get_sasci_mdf_works(conn=Depends(get_db)):
    """
    Returns all SASCI-MDF works ordered by source_of_funding, sr_no, along with aggregated KPIs.
    Protected by JWT.
    """
    rows = await conn.fetch(
        """
        SELECT
            id, sr_no, name_of_road, type_of_road, source_of_funding, constituency,
            est_cost_crores, est_cost_lacs, total_length_km, completed_length_km,
            pct_length_completed, white_line_target_km, white_line_done_km,
            progress_as_of, target_completion_date, remarks, record_hash,
            pipeline_version, last_updated, created_at
        FROM sasci_mdf_works
        ORDER BY source_of_funding ASC, sr_no ASC
        """
    )

    works = []
    total_km = 0.0
    completed_km = 0.0
    pct_sum = 0.0
    pct_count = 0
    mdf_count = 0
    sasci_count = 0

    for r in rows:
        w_dict = dict(r)
        # Format dates / timestamps to string
        if isinstance(w_dict.get("target_completion_date"), date):
            w_dict["target_completion_date"] = w_dict["target_completion_date"].isoformat()
        if isinstance(w_dict.get("last_updated"), datetime):
            w_dict["last_updated"] = w_dict["last_updated"].isoformat()
        if isinstance(w_dict.get("created_at"), datetime):
            w_dict["created_at"] = w_dict["created_at"].isoformat()

        # Convert numerics to float if present
        for num_col in ("est_cost_crores", "est_cost_lacs", "total_length_km", "completed_length_km", "pct_length_completed", "white_line_target_km", "white_line_done_km"):
            if w_dict.get(num_col) is not None:
                w_dict[num_col] = float(w_dict[num_col])

        works.append(w_dict)

        # Aggregations
        tot = w_dict.get("total_length_km") or 0.0
        comp = w_dict.get("completed_length_km") or 0.0
        pct = w_dict.get("pct_length_completed")

        total_km += tot
        completed_km += comp

        if pct is not None:
            pct_sum += pct
            pct_count += 1

        funding = (w_dict.get("source_of_funding") or "").upper()
        if "MDF" in funding:
            mdf_count += 1
        elif "SASCI" in funding:
            sasci_count += 1

    total_works = len(works)
    avg_pct = round(pct_sum / pct_count, 2) if pct_count > 0 else 0.0

    kpis = {
        "total_works": total_works,
        "total_km": round(total_km, 2),
        "completed_km": round(completed_km, 2),
        "avg_pct_complete": avg_pct,
        "mdf_count": mdf_count,
        "sasci_count": sasci_count
    }

    return {
        "works": works,
        "kpis": kpis
    }
