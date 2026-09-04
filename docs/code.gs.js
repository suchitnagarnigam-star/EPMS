const EXPENDITURE_OVERRIDES = {
  "MCL-0351": 12.20,
  "MCL-0352": 12.20
};

// ============================================================
// CONFIGURATION
// ============================================================
const MAIN_SHEET_ID  = "1ZmN57IxVr3yOEntADZI5Dcr2WhsM8XbQFbn8clf33Fo";
const CLEAN_SHEET_ID = "1zpRR55bZywWpwy8iDbgiLrYHRCScc8vPQHkUEYuEgiQ";
const SOURCE_SHEETS  = ["B&R", "O&M"];
const FASTAPI_URL    = "https://epms-m755.onrender.com";

const HEADERS = [
  "project_id", "sr_no", "branch", "zone", "sub_zone", "constituency", "ward",
  "nature_of_work", "eoffice_no", "work_description", "length_rmt", "road_width_ft",
  "no_of_units", "fund_type", "quota_label", "workflow_stage", "delivery_status",
  "est_cost_lacs", "tender_cost_lacs", "expenditure_lacs", "financial_progress_pct",
  "fin_progress_anomaly", "resolution_no_date", "aa_approved", "ts_approved",
  "ts_accorded_by", "accounts_cert", "tender_float_date", "tender_end_date",
  "tech_eval", "fin_eval", "work_order_no_date", "executing_agency", "start_date",
  "time_limit_months", "scheduled_end_date", "actual_completion", "supervising_officer",
  "third_party_insp", "completion_cert", "physical_progress", "oas_pct",
  "issues", "remarks", "geo_photo_link", "last_updated_on",
  "id_type", "synthetic_row_ref", // NEW ADDITIONS FOR SYNTHETIC RECONCILIATION
  "_source_sheet", "_source_row", "_project_id", "_staged_at",
  "_record_hash", "_data_quality_flags", "_pipeline_version"
];

// ============================================================
// TRIGGER SETUP
// ============================================================
function createTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("scheduledSync")
    .timeBased()
    .everyMinutes(10)
    .create();
  Logger.log("✅ Trigger created — scheduledSync every 10 minutes");
}

// ============================================================
// SCHEDULED SYNC
// ============================================================
function scheduledSync() {
  const mainSS  = SpreadsheetApp.openById(MAIN_SHEET_ID);
  const cleanSS = SpreadsheetApp.openById(CLEAN_SHEET_ID); // Fix: use explicit ID

  SOURCE_SHEETS.forEach(branch => {
    const sourceSheet = mainSS.getSheetByName(branch);
    if (!sourceSheet) {
      Logger.log("Source tab not found: " + branch);
      return;
    }

    const lastRow = sourceSheet.getLastRow();
    const lastCol = sourceSheet.getLastColumn();
    if (lastRow < 2) return;

    const allData    = sourceSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const cleanedRows = [];

    allData.forEach((rowData, i) => {
      const sourceRowNum = i + 2;
      if (rowData.every(c => c === "" || c === null || c === undefined)) return;
      try {
        const raw     = parseRow(rowData);
        const cleaned = cleanAndNormalize(raw, branch, sourceRowNum);
        cleanedRows.push(HEADERS.map(h => {
          const val = cleaned[h];
          return (val === null || val === undefined) ? "" : val;
        }));
      } catch (err) {
        Logger.log("Error on " + branch + " row " + sourceRowNum + ": " + err.message);
      }
    });

    let stagingSheet = cleanSS.getSheetByName(branch);
    if (!stagingSheet) {
      stagingSheet = cleanSS.insertSheet(branch);
    }

    stagingSheet.clearContents();
    stagingSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    if (cleanedRows.length > 0) {
      stagingSheet.getRange(2, 1, cleanedRows.length, HEADERS.length).setValues(cleanedRows);
    }

    Logger.log(branch + " staging overwrite complete — " + cleanedRows.length + " rows written.");
  });

  pushToFastAPI();
}

function testSync() {
  scheduledSync();
}

function testPushOnly() {
  pushToFastAPI();
}

// ============================================================
// PUSH TO FASTAPI
// ============================================================
function pushToFastAPI() {
  const ss    = SpreadsheetApp.openById(CLEAN_SHEET_ID);
  const works   = [];
  const quality = [];

  ["B&R", "O&M"].forEach(function(tabName) {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return;

    const headers = data[0];
    const rows    = data.slice(1);

    rows.forEach(function(row) {
      const obj = {};
      headers.forEach(function(h, i) {
        obj[h] = row[i] === "" ? null : row[i];
      });

      ["ward", "zone", "sr_no", "sub_zone"].forEach(function(f) {
        if (obj[f] !== null && obj[f] !== undefined) obj[f] = String(obj[f]);
      });

      // Synthetic IDs are populated as 'project_id', but we still want to flag truly empty/missing WORK NAMES to quality
      if (obj["project_id"] && String(obj["project_id"]).trim() !== "" && obj["work_description"] && String(obj["work_description"]).trim() !== "") {
        works.push(obj);
      } else {
        quality.push({
          source_sheet:     tabName,
          source_row:       obj["_source_row"]        || null,
          work_description: obj["work_description"]   || null,
          raw_zone:         obj["zone"]                || null,
          raw_ward:         obj["ward"]                || null,
          raw_status:       obj["delivery_status"]     || null,
          flags:            obj["_data_quality_flags"] || null,
          raw_json:         JSON.stringify(obj),
          staged_at:        obj["_staged_at"]          || new Date().toISOString()
        });
      }
    });
  });

  Logger.log("📦 Payload: " + works.length + " works, " + quality.length + " quality rows");

  const payload = JSON.stringify({ works: works, quality: quality });
  const options = {
    method:             "post",
    contentType:        "application/json",
    payload:            payload,
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(FASTAPI_URL + "/sync/sheets", options);
    const code     = response.getResponseCode();
    const body     = response.getContentText();
    if (code === 200) {
      Logger.log("✅ FastAPI sync success: " + body);
    } else {
      Logger.log("❌ FastAPI sync failed [" + code + "]: " + body);
    }
  } catch (e) {
    Logger.log("❌ FastAPI fetch error: " + e.message);
  }
}

// ============================================================
// HELPER — numeric parser
// ============================================================
function toNum(val) {
  if (val === null || val === undefined || val === "" || val === "-" ||
      String(val).trim() === "-" || String(val).trim().toLowerCase() === "na" ||
      String(val).trim().toLowerCase() === "nil") return null;
  const n = parseFloat(String(val).replace(/[,%]/g, ""));
  return isNaN(n) ? null : n;
}

// ============================================================
// ROW PARSER
// ============================================================
function parseRow(row) {
  return {
    sr_no:               row[0],
    project_id:          String(row[1]  || "").trim(),
    branch_raw:          row[2],
    zone:                String(row[3]  || "").trim(),
    sub_zone:            String(row[4]  || "").trim(),
    constituency:        String(row[5]  || "").trim(),
    ward:                String(row[6]  || "").trim(),
    nature_of_work:      String(row[7]  || "").trim(),
    eoffice_no:          String(row[8]  || "").trim(),
    work_description:    String(row[9]  || "").trim(),
    length_rmt:          toNum(row[10]),
    road_width_ft:       toNum(row[11]),
    no_of_units:         toNum(row[12]),
    fund_type:           String(row[13] || "").trim(),
    quota_label:         String(row[14] || "").trim(),
    current_status_raw:  String(row[15] || "").trim(),
    est_cost_lacs:       toNum(row[16]),
    oas_pct:             toNum(row[17]),
    resolution_no_date:  String(row[18] || "").trim(),
    aa_approved:         String(row[19] || "").trim(),
    ts_approved:         String(row[20] || "").trim(),
    ts_accorded_by:      String(row[21] || "").trim(),
    accounts_cert:       String(row[22] || "").trim(),
    tender_float_date:   row[23],
    tender_end_date:     row[24],
    tech_eval:           String(row[25] || "").trim(),
    fin_eval:            String(row[26] || "").trim(),
    work_order_no_date:  String(row[27] || "").trim(),
    executing_agency:    String(row[28] || "").trim(),
    tender_cost_lacs:    toNum(row[29]),
    start_date:          row[30],
    time_limit_months:   toNum(row[31]),
    scheduled_end_date:  row[32],
    actual_completion:   row[33],
    supervising_officer: String(row[34] || "").trim(),
    third_party_insp:    String(row[35] || "").trim(),
    completion_cert:     String(row[36] || "").trim(),
    physical_progress:   toNum(row[37]),
    expenditure_lacs:    toNum(row[39]),
    status_raw:          String(row[40] || "").trim(),
    issues:              String(row[41] || "").trim(),
    remarks:             String(row[42] || "").trim(),
    geo_photo_link:      String(row[43] || "").trim(),
    last_updated_on:     row[44],
  };
}

// ============================================================
// CLEANER & NORMALIZER
// ============================================================
function cleanAndNormalize(raw, branch, sourceRow) {
  const flags = [];

  // SYNTHETIC ID LOGIC
  let project_id = raw.project_id;
  let id_type = "REAL";
  let synthetic_row_ref = null;

  if (!project_id || project_id === "-" || project_id === "N/A") {
    project_id = (branch === "O&M" ? "OM-ROW-" : "BR-ROW-") + sourceRow;
    id_type = "SYNTHETIC";
    synthetic_row_ref = sourceRow;
    flags.push("SYNTHETIC_ID");
  }
  
  if (!raw.work_description) flags.push("MISSING_WORK_NAME");

  const natureMap = {
    "i/tiles":                       "Roads-ILT",
    "interlocking tiles":            "Roads-ILT",
    "roads - interlocking tiles":    "Roads-ILT",
    "rmc":                           "Roads-RMC",
    "rmc m-30":                      "Roads-RMC",
    "roads - rmc":                   "Roads-RMC",
    "roads - rmc / cement concrete": "Roads-RMC",
    "bituminous":                    "Roads-Bituminous",
    "roads - bituminous":            "Roads-Bituminous",
    "parks":                         "Parks",
    "park":                          "Parks",
    "parks & green belts":           "Parks",
    "water supply":                  "Water Supply",
    "water":                         "Water Supply",
    "sewerage":                      "Sewerage",
    "tubewell":                      "Tubewell",
    "t/well":                        "Tubewell",
    "buildings":                     "Buildings",
    "building":                      "Buildings",
    "others":                        "Others",
  };
  const natureKey      = raw.nature_of_work.toLowerCase();
  const nature_of_work = natureMap[natureKey] || raw.nature_of_work;
  if (!natureMap[natureKey] && raw.nature_of_work) flags.push("UNMAPPED_NATURE_OF_WORK");

  const workflowMap = {
    "awarded":                "Awarded",
    "work order issued":      "Work Order Issued",
    "tenders invited":        "Procurement",
    "tenders received":       "Procurement",
    "tender evaluation":      "Procurement",
    "sent to f&cc":           "Approval Pending",
    "workorder to be issued": "Approval Pending",
    "aa pending":             "Approval Pending",
    "held up":                "Delayed/Held Up",
    "in progress":            "In Progress",
    "not started":            "Not Started",
    "completed":              "Completed",
  };
  const workflowKey    = raw.current_status_raw.toLowerCase();
  const workflow_stage = workflowMap[workflowKey] || raw.current_status_raw;
  if (!workflowMap[workflowKey] && raw.current_status_raw) flags.push("UNMAPPED_WORKFLOW_STAGE");

  const deliveryMap = {
    "in progress":                                 "In Progress",
    "ongoing":                                     "In Progress",
    "work in progress":                            "In Progress",
    "delayed":                                     "Delayed/Held Up",
    "delayed-held up":                             "Delayed/Held Up",
    "delayed/held up":                             "Delayed/Held Up",
    "held up":                                     "Delayed/Held Up",
    "stalled":                                     "Delayed/Held Up",
    "not started":                                 "Not Started",
    "yet to start":                                "Not Started",
    "completed":                                   "Completed",
    "done":                                        "Completed",
    "100%":                                        "Completed",
    "tenders invited":                             "Procurement",
    "tenders received":                            "Procurement",
    "work done":                                   "Completed",
    "work completed":                              "Completed",
    "balance work will be done after monsoon":     "Delayed/Held Up",
  };
  const deliveryKey     = raw.status_raw.toLowerCase();
  const delivery_status = deliveryMap[deliveryKey] || raw.status_raw;
  if (!deliveryMap[deliveryKey] && raw.status_raw) flags.push("UNMAPPED_DELIVERY_STATUS");

  // Expenditure guard
  let safe_expenditure = raw.expenditure_lacs;
  if (
    safe_expenditure !== null &&
    raw.tender_cost_lacs !== null &&
    raw.tender_cost_lacs > 0 &&
    safe_expenditure > raw.tender_cost_lacs * 2
  ) {
    const converted = parseFloat((safe_expenditure / 100000).toFixed(2));
    if (converted <= raw.tender_cost_lacs * 2) {
      safe_expenditure = converted;
      flags.push("EXPENDITURE_CONVERTED_FROM_RUPEES");
    } else {
      flags.push("EXPENDITURE_OUTLIER");
      safe_expenditure = null;
    }
  }

  // Financial progress
  let financial_progress_pct = null;
  let fin_progress_anomaly   = null;
  const tender      = parseFloat(raw.tender_cost_lacs);
  const expenditure = parseFloat(safe_expenditure);
  if (!isNaN(tender) && tender > 0 && !isNaN(expenditure)) {
    financial_progress_pct = parseFloat(((expenditure / tender) * 100).toFixed(2));
    fin_progress_anomaly   = financial_progress_pct > 100;
    if (fin_progress_anomaly) flags.push("FIN_PROGRESS_ANOMALY");
  }

  if (!raw.sub_zone)         flags.push("UNRESOLVED_LOCATION");
  if (!raw.executing_agency) flags.push("MISSING_AGENCY");

  // Start Date Fallback from Work Order Date
  let effective_start_date = raw.start_date;
  if ((!effective_start_date || effective_start_date === "-" || String(effective_start_date).trim() === "") && raw.work_order_no_date) {
    const match = String(raw.work_order_no_date).match(/\b(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})\b/);
    if (match) {
      const day = match[1].padStart(2, "0");
      const month = match[2].padStart(2, "0");
      let year = match[3];
      if (year.length === 2) year = "20" + year;
      effective_start_date = `${year}-${month}-${day}`;
    }
  }

  // Additional Quality Flags
  if (!raw.scheduled_end_date || !effective_start_date) {
    flags.push("MISSING_DATES");
  }

  if (!raw.executing_agency || !raw.fund_type || !raw.zone) {
    flags.push("INCOMPLETE_DATA");
  }

  if (raw.scheduled_end_date && delivery_status !== "Completed") {
    let schedEnd = null;
    if (raw.scheduled_end_date instanceof Date) {
      schedEnd = raw.scheduled_end_date;
    } else {
      const parsed = Date.parse(String(raw.scheduled_end_date));
      if (!isNaN(parsed)) schedEnd = new Date(parsed);
    }
    if (schedEnd) {
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - schedEnd.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
        flags.push("DELAYED");
      }
    }
  }

  const toBoolean = (val) => {
    const v = String(val).trim().toLowerCase();
    if (v === "y" || v === "yes") return true;
    if (v === "n" || v === "no") return false;
    return null;
  };

  const hashInput = [
    project_id, branch, raw.work_description,
    raw.expenditure_lacs, raw.physical_progress,
    raw.status_raw, raw.current_status_raw
  ].join("|");
  const record_hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.MD5, hashInput
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');

  return {
    project_id,
    sr_no:               raw.sr_no,
    branch,
    zone:                raw.zone,
    sub_zone:            raw.sub_zone,
    constituency:        raw.constituency,
    ward:                raw.ward,
    nature_of_work,
    eoffice_no:          raw.eoffice_no,
    work_description:    raw.work_description,
    length_rmt:          raw.length_rmt,
    road_width_ft:       raw.road_width_ft,
    no_of_units:         raw.no_of_units,
    fund_type:           raw.fund_type,
    quota_label:         raw.quota_label,
    workflow_stage,
    delivery_status,
    est_cost_lacs:       raw.est_cost_lacs,
    tender_cost_lacs:    raw.tender_cost_lacs,
    expenditure_lacs:    safe_expenditure,
    financial_progress_pct,
    fin_progress_anomaly,
    resolution_no_date:  raw.resolution_no_date,
    aa_approved:         toBoolean(raw.aa_approved),
    ts_approved:         toBoolean(raw.ts_approved),
    ts_accorded_by:      raw.ts_accorded_by,
    accounts_cert:       toBoolean(raw.accounts_cert),
    tender_float_date:   raw.tender_float_date,
    tender_end_date:     raw.tender_end_date,
    tech_eval:           toBoolean(raw.tech_eval),
    fin_eval:            toBoolean(raw.fin_eval),
    work_order_no_date:  raw.work_order_no_date,
    executing_agency:    raw.executing_agency,
    start_date:          raw.start_date,
    time_limit_months:   raw.time_limit_months,
    scheduled_end_date:  raw.scheduled_end_date,
    actual_completion:   raw.actual_completion,
    supervising_officer: raw.supervising_officer,
    third_party_insp:    toBoolean(raw.third_party_insp),
    completion_cert:     toBoolean(raw.completion_cert),
    physical_progress:   raw.physical_progress,
    oas_pct:             raw.oas_pct,
    issues:              raw.issues,
    remarks:             raw.remarks,
    geo_photo_link:      raw.geo_photo_link,
    last_updated_on:     raw.last_updated_on,
    id_type:             id_type,
    synthetic_row_ref:   synthetic_row_ref,
    _source_sheet:       branch,
    _source_row:         sourceRow,
    _project_id:         raw.project_id, // Original raw project ID
    _staged_at:          new Date().toISOString(),
    _record_hash:        record_hash,
    _data_quality_flags: flags.join("|"),
    _pipeline_version:   "v1.1",
  };
}

// ============================================================
// CLEAR STAGING — manual utility
// ============================================================
function clearStaging() {
  const ss = SpreadsheetApp.openById(CLEAN_SHEET_ID);
  ["B&R", "O&M"].forEach(tab => {
    const sheet = ss.getSheetByName(tab);
    if(sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }
    }
  });
}
