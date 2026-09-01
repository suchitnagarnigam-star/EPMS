from decimal import Decimal
from fastapi import APIRouter, Depends
from asyncpg import Connection

from database import get_db

router = APIRouter(
    prefix="/contractors",
    tags=["contractors"]
)

@router.get("")
async def get_contractors(conn: Connection = Depends(get_db)):
    query = """
        SELECT 
            A.agency_name,
            COUNT(*)::integer AS total_works,
            COUNT(CASE WHEN F.delivery_status = 'Completed' THEN 1 END)::integer AS completed,
            COUNT(CASE WHEN F.delivery_status = 'Delayed/Held Up' THEN 1 END)::integer AS delayed,
            COUNT(CASE WHEN F.delivery_status = 'In Progress' THEN 1 END)::integer AS in_progress,
            COALESCE(AVG(F.financial_progress_pct), 0)::numeric AS avg_financial_progress_pct,
            COALESCE(AVG(F.physical_progress_pct), 0)::numeric AS avg_physical_progress_pct,
            COALESCE(SUM(F.expenditure_lacs), 0)::numeric AS total_expenditure_lacs,
            COALESCE(AVG(F.risk_score), 0)::numeric AS risk_score_avg,
            COALESCE(MAX(F.risk_score), 0)::numeric AS max_risk_score
        FROM fact_works F
        INNER JOIN dim_agency A ON F.agency_id = A.agency_id
        GROUP BY A.agency_id, A.agency_name
        ORDER BY risk_score_avg DESC
    """
    
    rows = await conn.fetch(query)
    
    results = []
    for row in rows:
        max_risk = float(row["max_risk_score"])
        risk_avg = float(row["risk_score_avg"])
        if max_risk > 900:
            health = "DATA_ERROR"
            risk_avg = min(risk_avg, 999.0)
        elif risk_avg >= 30:
            health = "High Risk"
        elif risk_avg >= 15:
            health = "Moderate"
        else:
            health = "Healthy"

        results.append({
            "agency_name": row["agency_name"],
            "total_works": row["total_works"],
            "completed": row["completed"],
            "delayed": row["delayed"],
            "in_progress": row["in_progress"],
            "avg_financial_progress_pct": round(float(row["avg_financial_progress_pct"]), 2),
            "avg_physical_progress_pct": round(float(row["avg_physical_progress_pct"]), 2),
            "total_expenditure_lacs": round(float(row["total_expenditure_lacs"]), 2),
            "risk_score_avg": round(risk_avg, 2),
            "max_risk_score": round(max_risk, 2),
            "health_rating": health
        })
        
    return results

