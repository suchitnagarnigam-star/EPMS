export interface MethodologyEntry {
  label: string;
  formula: string;
  source: string;
  notes: string;
}

export const methodology: Record<string, MethodologyEntry> = {
  total_works: {
    label: "Total Sanctioned Works",
    formula: "COUNT of all rows in fact_works",
    source: "B&R tab + O&M tab, MCL Development Project Tracker",
    notes: "Rows without project IDs (synthetic ID rows) are excluded from this count and appear in Data Quality backlog instead."
  },
  sanctioned_budget: {
    label: "Sanctioned Budget Outlay",
    formula: "SUM(sanctioned_cost_lacs) ÷ 100 = Crores",
    source: "Column: 'Sanctioned Estimate Cost' — B&R and O&M tabs",
    notes: "NULL values treated as ₹0. Expressed in Crores on dashboard cards, Lacs in detail tables."
  },
  allotted_contract_value: {
    label: "Allotted Contract Value",
    formula: "SUM(tender_cost_lacs) ÷ 100 = Crores",
    source: "Column: 'Tender Cost' — B&R and O&M tabs",
    notes: "Represents the contracted amount post-tendering. Will be less than sanctioned cost if tender came in under estimate."
  },
  verified_disbursed: {
    label: "Verified Disbursed Payment",
    formula: "SUM(expenditure_lacs) ÷ 100 = Crores",
    source: "Column: 'Expenditure' — B&R and O&M tabs",
    notes: "Values exceeding 2× tender cost are auto-flagged EXPENDITURE_OUTLIER and excluded. Values detected as full rupees (not lacs) are auto-converted by dividing by 100,000 and flagged EXPENDITURE_CONVERTED_FROM_RUPEES."
  },
  financial_progress: {
    label: "Financial Progress %",
    formula: "expenditure_lacs / tender_cost_lacs × 100",
    source: "Computed field — not sourced from sheet",
    notes: "The source sheet's own '% Progress' column is nearly always null. This % is always recomputed from expenditure and tender cost."
  },
  physical_progress: {
    label: "Physical Progress %",
    formula: "Taken directly from source sheet",
    source: "Column: 'Physical Progress %' — B&R and O&M tabs",
    notes: "Self-reported by field officers. For works with Completed status and missing progress value, 100% is inferred and marked with an asterisk."
  },
  risk_score: {
    label: "Risk Score",
    formula: "days_overdue × weight + anomaly penalties",
    source: "Computed from: delivery_status, expected_completion_date, physical_progress, financial_progress",
    notes: "Capped at 999. Scores above 900 indicate a likely data entry error (bad date or unit mismatch) in the source sheet. ≥30 = High Risk."
  },
  risk_score_formula: {
    label: "Risk Score Calculation",
    formula: "min(days_overdue × 0.5 + (utilization < 10% ? 20 : 0), 999.0)",
    source: "Computed pipeline metric derived from completion dates & financial progress",
    notes: "Overdue days capped at 3,650 (10 years). Total score hard-capped at 999. Scores >900 signify data entry anomalies."
  },
  physical_progress_source: {
    label: "Physical Progress Data Source",
    formula: "Raw sheet value, or 100% inferred if Completed with 0% recorded",
    source: "Column: 'Physical Progress %' — self-reported by field engineers",
    notes: "Asterisk (*) indicates 100% physical progress was inferred because delivery_status is 'Completed'."
  },
  utilization_pct: {
    label: "Budget Utilisation %",
    formula: "expenditure_lacs / tender_cost_lacs × 100",
    source: "Computed from expenditure and tender cost fields",
    notes: "Low utilisation on in-progress works is expected early in project lifecycle. Low utilisation on overdue works triggers risk flags."
  }
};
