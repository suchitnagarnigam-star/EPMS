import re
from datetime import date, datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, AliasChoices, field_validator

def parse_date_safe(v: Any) -> Optional[date]:
    if not v:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, str):
        v = v.strip()
        if not v or v.lower() in ('na', 'n/a', '-', '_', 'nil', 'null', 'none'):
            return None
        # Match YYYY-MM-DD
        m1 = re.match(r'^(\d{4})[/-](\d{1,2})[/-](\d{1,2})', v)
        if m1:
            try:
                return date(int(m1.group(1)), int(m1.group(2)), int(m1.group(3)))
            except ValueError:
                pass
        # Match DD/MM/YYYY or DD-MM-YYYY
        m2 = re.match(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})', v)
        if m2:
            try:
                return date(int(m2.group(3)), int(m2.group(2)), int(m2.group(1)))
            except ValueError:
                pass
        # Fallback to standard ISO parser
        try:
            return date.fromisoformat(v[:10])
        except ValueError:
            pass
    return None

def parse_datetime_safe(v: Any) -> Optional[datetime]:
    if not v:
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime(v.year, v.month, v.day)
    if isinstance(v, str):
        v = v.strip()
        if not v or v.lower() in ('na', 'n/a', '-', '_', 'nil', 'null', 'none'):
            return None
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            pass
        # Match YYYY-MM-DD HH:MM:SS
        m = re.match(r'^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})', v)
        if m:
            try:
                return datetime(
                    int(m.group(1)), int(m.group(2)), int(m.group(3)),
                    int(m.group(4)), int(m.group(5)), int(m.group(6))
                )
            except ValueError:
                pass
    return None

class WorkSyncItem(BaseModel):
    # Identity
    work_id: str = Field(..., validation_alias=AliasChoices('work_id', 'project_id', '_project_id'))
    id_type: Optional[str] = Field("REAL", validation_alias=AliasChoices('id_type'))
    synthetic_row_ref: Optional[int] = Field(None, validation_alias=AliasChoices('synthetic_row_ref'))
    sr_no: Optional[int] = Field(None, validation_alias=AliasChoices('sr_no', 'Sr No', 'sr_number'))
    branch: str  # B&R / O&M

    # Location
    zone: Optional[str] = None
    sub_zone: Optional[str] = Field(None, validation_alias=AliasChoices('sub_zone', 'subzone', 'Sub-Zone'))
    constituency: Optional[str] = None
    ward: Optional[str] = None

    # Agency
    agency_name: Optional[str] = Field(None, validation_alias=AliasChoices('agency_name', 'executing_agency', 'Executing Agency'))

    # Fund
    fund_type: Optional[str] = Field(None, validation_alias=AliasChoices('fund_type', 'source_of_funding', 'Source of Funding'))
    quota_label: Optional[str] = Field(None, validation_alias=AliasChoices('quota_label', 'quota', 'Quota'))

    # Work Type
    nature_of_work: Optional[str] = Field(None, validation_alias=AliasChoices('nature_of_work', 'nature', 'Nature of Work'))

    # Officer
    officer_id: Optional[int] = Field(None, validation_alias=AliasChoices('officer_id', 'officer_fk', 'OfficerId'))
    officer_name: Optional[str] = Field(None, validation_alias=AliasChoices('officer_name', 'officer', 'Officer Name', 'Name of Officer'))

    # Work Details
    work_description: Optional[str] = Field(None, validation_alias=AliasChoices('work_description', 'description', 'Work Description'))
    length_rmt: Optional[float] = Field(None, validation_alias=AliasChoices('length_rmt', 'length', 'Length (Rmt)'))
    road_width_ft: Optional[float] = Field(None, validation_alias=AliasChoices('road_width_ft', 'road_width', 'Road Width (Ft)'))

    # Financial
    est_cost_lacs: Optional[float] = Field(None, validation_alias=AliasChoices('est_cost_lacs', 'est_cost', 'Estimated Cost (Lacs)'))
    tender_cost_lacs: Optional[float] = Field(None, validation_alias=AliasChoices('tender_cost_lacs', 'tender_cost', 'Tender Cost (Lacs)'))
    expenditure_lacs: Optional[float] = Field(None, validation_alias=AliasChoices('expenditure_lacs', 'expenditure', 'Expenditure (Lacs)'))

    # Status
    workflow_stage: Optional[str] = Field(None, validation_alias=AliasChoices('workflow_stage', 'current_status', 'Current Status'))
    delivery_status: Optional[str] = Field(None, validation_alias=AliasChoices('delivery_status', 'status', 'Status'))

    # Lifecycle flags
    aa_approved: Optional[bool] = Field(None, validation_alias=AliasChoices('aa_approved', 'aa_accorded'))
    ts_approved: Optional[bool] = Field(None, validation_alias=AliasChoices('ts_approved', 'ts_accorded'))
    ts_accorded_by: Optional[str] = Field(None, validation_alias=AliasChoices('ts_accorded_by', 'ts_authority'))
    resolution_no_date: Optional[str] = Field(None, validation_alias=AliasChoices('resolution_no_date', 'resolution'))
    work_order_no_date: Optional[str] = Field(None, validation_alias=AliasChoices('work_order_no_date', 'work_order'))
    
    tender_float_date: Optional[date] = None
    tender_end_date: Optional[date] = None
    tech_eval_done: Optional[bool] = None
    fin_eval_done: Optional[bool] = None

    # Timeline
    start_date: Optional[date] = None
    time_limit_months: Optional[float] = None
    scheduled_end_date: Optional[date] = None
    actual_completion_date: Optional[date] = Field(None, validation_alias=AliasChoices(
        'actual_completion_date', 'actual_completion', 'Actual Completion Date',
        'Date of Completion', 'completion_date',
    ))

    # Progress
    physical_progress_pct: Optional[float] = Field(None, validation_alias=AliasChoices('physical_progress_pct', 'physical_progress'))
    financial_progress_pct: Optional[float] = Field(None, validation_alias=AliasChoices('financial_progress_pct', 'financial_progress'))
    fin_progress_anomaly: Optional[bool] = Field(None, validation_alias=AliasChoices('fin_progress_anomaly', 'financial_anomaly'))

    # Notes
    issues_bottlenecks: Optional[str] = Field(None, validation_alias=AliasChoices('issues_bottlenecks', 'bottlenecks'))
    remarks: Optional[str] = None

    # Pipeline metadata
    source_sheet: Optional[str] = Field(None, validation_alias=AliasChoices('source_sheet', '_source_sheet'))
    source_row: Optional[int] = Field(None, validation_alias=AliasChoices('source_row', '_source_row'))
    record_hash: Optional[str] = Field(None, validation_alias=AliasChoices('record_hash', '_record_hash'))
    data_quality_flags: Optional[str] = Field(None, validation_alias=AliasChoices('data_quality_flags', '_data_quality_flags', 'flags'))
    pipeline_version: Optional[str] = Field(None, validation_alias=AliasChoices('pipeline_version', '_pipeline_version'))
    staged_at: Optional[datetime] = Field(None, validation_alias=AliasChoices('staged_at', '_staged_at'))

    # Validators for dates
    @field_validator('tender_float_date', 'tender_end_date', 'start_date', 'scheduled_end_date', 'actual_completion_date', mode='before')
    @classmethod
    def validate_date(cls, v: Any) -> Optional[date]:
        return parse_date_safe(v)

    @field_validator('staged_at', mode='before')
    @classmethod
    def validate_datetime(cls, v: Any) -> Optional[datetime]:
        return parse_datetime_safe(v)

    @field_validator('ward', 'zone', 'delivery_status', 'workflow_stage', mode='before')
    @classmethod
    def coerce_to_str(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return str(v)

class QualitySyncItem(BaseModel):
    source_sheet: Optional[str] = Field(None, validation_alias=AliasChoices('source_sheet', '_source_sheet'))
    source_row: Optional[int] = Field(None, validation_alias=AliasChoices('source_row', '_source_row'))
    work_description: Optional[str] = Field(None, validation_alias=AliasChoices('work_description', 'description'))
    raw_zone: Optional[str] = Field(None, validation_alias=AliasChoices('raw_zone', 'zone', '_zone'))
    raw_ward: Optional[str] = Field(None, validation_alias=AliasChoices('raw_ward', 'ward', '_ward'))
    raw_status: Optional[str] = Field(None, validation_alias=AliasChoices('raw_status', 'status', '_status'))
    flags: Optional[str] = Field(None, validation_alias=AliasChoices('flags', '_data_quality_flags', 'data_quality_flags'))
    staged_at: Optional[datetime] = Field(None, validation_alias=AliasChoices('staged_at', '_staged_at'))

    @field_validator('staged_at', mode='before')
    @classmethod
    def validate_datetime(cls, v: Any) -> Optional[datetime]:
        return parse_datetime_safe(v)

    @field_validator('raw_ward', 'raw_zone', 'raw_status', mode='before')
    @classmethod
    def coerce_to_str(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return str(v)

    model_config = {
        "extra": "allow"
    }

class SyncPayload(BaseModel):
    works: List[WorkSyncItem]
    quality: List[QualitySyncItem]

class SyncResponse(BaseModel):
    upserted: int
    skipped: int
    quality_inserted: int
    errors: List[str]
