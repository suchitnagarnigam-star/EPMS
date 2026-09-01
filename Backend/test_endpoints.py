import asyncio
import sys
import os
from unittest.mock import AsyncMock, MagicMock
from datetime import date, datetime
from decimal import Decimal

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import SyncPayload, WorkSyncItem, QualitySyncItem
from routers.kpis import get_kpis
from routers.works import get_works
from routers.contractor import get_contractors
from routers.data_quality import get_data_quality
from routers.sync import sync_sheets

class MockRecord(dict):
    def __getitem__(self, key):
        return super().get(key)

async def test_kpis_router():
    print("Testing KPIs Router...")
    mock_conn = AsyncMock()
    
    # Mock aggregates row
    mock_conn.fetchrow.return_value = MockRecord({
        "total_works": 10,
        "total_est_cost_lacs": 1500.50,
        "total_tender_cost_lacs": 1400.00,
        "total_expenditure_lacs": 800.25,
        "avg_financial_progress_pct": 57.16,
        "anomaly_count": 1
    })
    
    # Mock distribution rows
    mock_conn.fetch.side_effect = [
        # branch rows
        [MockRecord({"branch": "B&R", "count": 6}), MockRecord({"branch": "O&M", "count": 4})],
        # status rows
        [MockRecord({"status": "In Progress", "count": 5}), MockRecord({"status": "Completed", "count": 5})],
        # stage rows
        [MockRecord({"stage": "Awarded", "count": 8}), MockRecord({"stage": "Procurement", "count": 2})],
    ]
    
    res = await get_kpis(branch="B&R", conn=mock_conn)
    assert res["total_works"] == 10
    assert res["total_est_cost_lacs"] == 1500.50
    assert res["by_branch"] == {"B&R": 6, "O&M": 4}
    assert res["by_delivery_status"]["In Progress"] == 5
    assert res["by_delivery_status"]["Delayed/Held Up"] == 0  # Default filled
    print("[OK] KPIs Router verified successfully")

async def test_works_router():
    print("Testing Works Router...")
    mock_conn = AsyncMock()
    
    mock_conn.fetchval.return_value = 100 # Total count
    
    # Mock works rows
    mock_conn.fetch.return_value = [
        MockRecord({
            "work_id": "W-01",
            "sr_no": 1,
            "branch": "B&R",
            "work_description": "Road repairs",
            "est_cost_lacs": Decimal("100.50"),
            "delivery_status": "In Progress",
            "zone": "A",
            "agency_name": "ABC Corp"
        })
    ]
    
    res = await get_works(page=1, page_size=10, conn=mock_conn)
    assert res["total"] == 100
    assert len(res["results"]) == 1
    assert res["results"][0]["work_id"] == "W-01"
    # Verify decimal was successfully converted to float
    assert isinstance(res["results"][0]["est_cost_lacs"], float)
    assert res["results"][0]["est_cost_lacs"] == 100.50
    print("[OK] Works Router verified successfully")

async def test_contractor_router():
    print("Testing Contractors Router...")
    mock_conn = AsyncMock()
    
    mock_conn.fetch.return_value = [
        MockRecord({
            "agency_name": "ABC Corp",
            "total_works": 5,
            "completed": 2,
            "delayed": 1,
            "in_progress": 2,
            "avg_financial_progress_pct": Decimal("75.50"),
            "avg_physical_progress_pct": Decimal("80.00"),
            "total_expenditure_lacs": Decimal("500.00"),
            "risk_score_avg": Decimal("15.20"),
            "max_risk_score": Decimal("25.00")
        })
    ]
    
    res = await get_contractors(conn=mock_conn)
    assert len(res) == 1
    assert res[0]["agency_name"] == "ABC Corp"
    assert res[0]["risk_score_avg"] == 15.20
    assert res[0]["health_rating"] == "Moderate"
    print("[OK] Contractors Router verified successfully")

async def test_data_quality_router():
    print("Testing Data Quality Router...")
    mock_conn = AsyncMock()
    
    # Mock counts
    mock_conn.fetchval.side_effect = [
        100, # fact_works count
        50   # data_quality count
    ]
    
    # Mock flag breakdown
    mock_conn.fetch.side_effect = [
        [MockRecord({"flag": "MISSING_PROJECT_ID", "count": 30}), MockRecord({"flag": "MISSING_AGENCY", "count": 20})],
        [MockRecord({"id": 1, "source_sheet": "B&R", "source_row": 5, "flags": "MISSING_PROJECT_ID"})]
    ]
    
    res = await get_data_quality(page=1, page_size=10, conn=mock_conn)
    assert res["total_source_rows"] == 150
    assert res["analytics_ready_pct"] == 66.67
    assert res["flag_breakdown"] == {"MISSING_PROJECT_ID": 30, "MISSING_AGENCY": 20}
    assert res["backlog_rows"]["total"] == 50
    assert len(res["backlog_rows"]["results"]) == 1
    print("[OK] Data Quality Router verified successfully")

class MockTransaction:
    async def __aenter__(self):
        return self
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return False

async def test_sync_router():
    print("Testing Sync Router...")
    mock_conn = AsyncMock()
    from unittest.mock import MagicMock
    mock_conn.transaction = MagicMock(return_value=MockTransaction())
    
    # Mock fetchrow inside resolve functions and fact_works upsert
    # We resolve location, agency, fund, work_type, officer.
    # Return mock IDs for lookup select queries
    mock_conn.fetchrow.side_effect = [
        MockRecord({"location_id": 10}), # resolve_location SELECT
        MockRecord({"agency_id": 20}),   # resolve_agency SELECT
        MockRecord({"fund_id": 30}),     # resolve_fund SELECT
        MockRecord({"work_type_id": 40}),# resolve_work_type SELECT
        MockRecord({"officer_id": 50}),  # resolve_officer SELECT
        MockRecord({"work_id": "P-001"}), # upsert fact_works RETURNING
    ]
    
    # Define payload
    payload = SyncPayload(
        works=[
            WorkSyncItem(
                project_id="P-001",
                sr_no=1,
                branch="B&R",
                zone="Zone A",
                sub_zone="Sub-1",
                constituency="Const 1",
                ward="Ward 12",
                agency_name="Contractor A",
                fund_type="MDF",
                quota_label="General",
                nature_of_work="Road repairs",
                officer_name="Officer X",
                work_description="Paving main road",
                est_cost_lacs=50.0,
                tender_cost_lacs=45.0,
                expenditure_lacs=10.0,
                workflow_stage="Awarded",
                delivery_status="In Progress",
                scheduled_end_date=date(2026, 12, 31),
                record_hash="hash123",
                staged_at=datetime.utcnow()
            )
        ],
        quality=[
            QualitySyncItem(
                source_sheet="O&M",
                source_row=15,
                work_description="Unnamed task",
                flags="MISSING_PROJECT_ID",
                staged_at=datetime.utcnow()
            )
        ]
    )
    
    # Run sync
    res = await sync_sheets(payload=payload, conn=mock_conn)
    
    assert res["upserted"] == 1
    assert res["skipped"] == 0
    assert res["quarantined"] == 1
    assert len(res["errors"]) == 0
    
    # Check that transaction block was used
    assert mock_conn.transaction.called
    print("[OK] Sync Router verified successfully")

async def main():
    print("Starting router unit tests...")
    await test_kpis_router()
    await test_works_router()
    await test_contractor_router()
    await test_data_quality_router()
    await test_sync_router()
    print("\nAll unit tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
