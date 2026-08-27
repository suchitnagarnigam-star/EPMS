import type { Work, Contractor, Constituency, FlagshipWork } from './types';

export const works: Work[] = [
  { id: 'MCL-842', name: 'Upgradation of main sewerage line from Clock Tower to Jagraon Bridge', branch: 'O&M', zone: 'Zone C', ac: 'Ludhiana Central', ward: 'Ward 54', fundSource: 'SFC', agency: 'O&M Cell', stage: 'Delayed', estimateCost: 285.50, tenderValue: 264.20, paidAmount: 98.30, physicalProgress: 65, riskScore: 85, daysElapsed: 142 },
  { id: 'MCL-915', name: 'Construction of RCC road in Focal Point Phase VIII industrial area', branch: 'B&R', zone: 'Zone B', ac: 'Ludhiana East', ward: 'Ward 22', fundSource: 'PIDB', agency: 'B&R Branch', stage: 'Stalled', estimateCost: 420.75, tenderValue: 398.40, paidAmount: 65.10, physicalProgress: 22, riskScore: 92, daysElapsed: 213 },
  { id: 'MCL-733', name: 'Installation of new tubewells in outer colonies of Zone C', branch: 'O&M', zone: 'Zone C', ac: 'Ludhiana West', ward: 'Multiple', fundSource: 'SFC', agency: 'O&M Cell', stage: 'Delayed', estimateCost: 120.00, tenderValue: 112.50, paidAmount: 45.20, physicalProgress: 45, riskScore: 72, daysElapsed: 98 },
  { id: 'MCL-612', name: 'Construction of CC Flooring in Ward 45 main market area', branch: 'B&R', zone: 'Zone A', ac: 'Ludhiana Central', ward: 'Ward 45', fundSource: 'MDF', agency: 'Singh Infrastructure', stage: 'In Progress', estimateCost: 45.50, tenderValue: 43.20, paidAmount: 28.10, physicalProgress: 65, riskScore: 32, daysElapsed: 56 },
  { id: 'MCL-701', name: 'LED Street lights replacement in Zone C residential areas', branch: 'Light', zone: 'Zone C', ac: 'Ludhiana South', ward: 'Ward 22,23', fundSource: 'SASCI', agency: 'Ludhiana Municipal Works', stage: 'Completed', estimateCost: 120.00, tenderValue: 115.00, paidAmount: 115.00, physicalProgress: 100, riskScore: 5, daysElapsed: 180 },
  { id: 'MCL-558', name: 'Laying of water supply line from reservoir to Phase 3 colony', branch: 'O&M', zone: 'Zone A', ac: 'Ludhiana East', ward: 'Ward 12', fundSource: 'PIDB', agency: 'Gupta & Sons Engineering', stage: 'Delayed', estimateCost: 285.75, tenderValue: 271.46, paidAmount: 42.72, physicalProgress: 15, riskScore: 78, daysElapsed: 190 },
  { id: 'MCL-489', name: 'Development of green belt and jogging track near canal road', branch: 'Horticulture', zone: 'Zone D', ac: 'Ludhiana West', ward: 'Ward 78', fundSource: 'MDF', agency: 'Singh Infrastructure', stage: 'Not Started', estimateCost: 65.20, tenderValue: 61.94, paidAmount: 0, physicalProgress: 0, riskScore: 45, daysElapsed: 30 },
  { id: 'MCL-390', name: 'Repair and recoating of BT roads in Zone B market zones', branch: 'B&R', zone: 'Zone B', ac: 'Ludhiana North', ward: 'Ward 31,32', fundSource: 'Municipal', agency: 'Rajendra Builders', stage: 'In Progress', estimateCost: 95.00, tenderValue: 90.25, paidAmount: 31.59, physicalProgress: 58, riskScore: 55, daysElapsed: 75 },
  { id: 'MCL-344', name: 'Construction of new community hall in Sector 32', branch: 'B&R', zone: 'Zone A', ac: 'Ludhiana North', ward: 'Ward 8', fundSource: 'SFC', agency: 'Singh Infrastructure', stage: 'Tender Issued', estimateCost: 180.00, tenderValue: 171.00, paidAmount: 0, physicalProgress: 0, riskScore: 20, daysElapsed: 12 },
  { id: 'MCL-280', name: 'Solid waste management infrastructure in Zone E', branch: 'SWM', zone: 'Zone E', ac: 'Ludhiana South', ward: 'Multiple', fundSource: 'SASCI', agency: 'Ludhiana Municipal Works', stage: 'In Progress', estimateCost: 240.00, tenderValue: 228.00, paidAmount: 79.80, physicalProgress: 72, riskScore: 28, daysElapsed: 88 },
  { id: 'MCL-215', name: 'Road widening and drain construction on Model Town Link Road', branch: 'B&R', zone: 'Zone B', ac: 'Ludhiana Central', ward: 'Ward 55', fundSource: 'PIDB', agency: 'Rajendra Builders', stage: 'Delayed', estimateCost: 350.00, tenderValue: 332.50, paidAmount: 82.13, physicalProgress: 38, riskScore: 68, daysElapsed: 160 },
  { id: 'MCL-167', name: 'Tubewell rehabilitation and pumping station upgradation Zone D', branch: 'O&M', zone: 'Zone D', ac: 'Ludhiana West', ward: 'Ward 62,63', fundSource: 'SFC', agency: 'O&M Cell', stage: 'Completed', estimateCost: 88.00, tenderValue: 83.60, paidAmount: 83.60, physicalProgress: 100, riskScore: 4, daysElapsed: 120 },
];

export const contractors: Contractor[] = [
  { id: 'C001', name: 'Singh Infrastructure Projects', class: 'Class A', branch: 'O&M', health: 'Healthy', totalWorks: 56, inProgress: 24, criticalFlagged: 2, completed: 30, tenderValue: 4250, paidAmount: 1870, avgProgress: 78 },
  { id: 'C002', name: 'Rajendra Builders & Co.', class: 'Class A', branch: 'B&R', health: 'High Risk', totalWorks: 42, inProgress: 18, criticalFlagged: 12, completed: 12, tenderValue: 2820, paidAmount: 680, avgProgress: 41 },
  { id: 'C003', name: 'Gupta & Sons Engineering', class: 'Class B', branch: 'B&R', health: 'Moderate', totalWorks: 28, inProgress: 15, criticalFlagged: 6, completed: 7, tenderValue: 1480, paidAmount: 385, avgProgress: 54 },
  { id: 'C004', name: 'Ludhiana Municipal Works Corp', class: 'Class A', branch: 'O&M', health: 'Healthy', totalWorks: 35, inProgress: 8, criticalFlagged: 0, completed: 27, tenderValue: 5500, paidAmount: 4400, avgProgress: 91 },
  { id: 'C005', name: 'Punjab Road Contractors Ltd', class: 'Class B', branch: 'B&R', health: 'Moderate', totalWorks: 19, inProgress: 11, criticalFlagged: 3, completed: 5, tenderValue: 1250, paidAmount: 310, avgProgress: 47 },
  { id: 'C006', name: 'Sharma Civil Works', class: 'Class C', branch: 'B&R', health: 'High Risk', totalWorks: 12, inProgress: 7, criticalFlagged: 5, completed: 1, tenderValue: 620, paidAmount: 95, avgProgress: 29 },
  { id: 'C007', name: 'Northern Infra Pvt Ltd', class: 'Class A', branch: 'O&M', health: 'Healthy', totalWorks: 22, inProgress: 10, criticalFlagged: 0, completed: 12, tenderValue: 3100, paidAmount: 2100, avgProgress: 82 },
  { id: 'C008', name: 'City Builders Group', class: 'Class B', branch: 'B&R', health: 'Unassigned', totalWorks: 4, inProgress: 0, criticalFlagged: 0, completed: 0, tenderValue: 290, paidAmount: 0, avgProgress: 0 },
];

export const constituencies: Constituency[] = [
  { name: 'Ludhiana East',    totalWorks: 198, brWorks: 112, omWorks: 86,  sanctionedCost: 14550, tenderValue: 13822, expenditure: 11220, criticalCount: 8  },
  { name: 'Ludhiana West',    totalWorks: 165, brWorks: 89,  omWorks: 76,  sanctionedCost: 10500, tenderValue: 9975,  expenditure: 6510,  criticalCount: 5  },
  { name: 'Ludhiana Central', totalWorks: 210, brWorks: 128, omWorks: 82,  sanctionedCost: 18200, tenderValue: 17290, expenditure: 15800, criticalCount: 4  },
  { name: 'Ludhiana North',   totalWorks: 143, brWorks: 78,  omWorks: 65,  sanctionedCost: 8430,  tenderValue: 8008,  expenditure: 3880,  criticalCount: 7  },
  { name: 'Ludhiana South',   totalWorks: 172, brWorks: 94,  omWorks: 78,  sanctionedCost: 11820, tenderValue: 11229, expenditure: 9150,  criticalCount: 3  },
  { name: 'Ludhiana Rural',   totalWorks: 270, brWorks: 155, omWorks: 115, sanctionedCost: 19500, tenderValue: 18525, expenditure: 12100, criticalCount: 6  },
];

export const flagshipMDF: FlagshipWork[] = [
  { id: 'MDF-001', name: 'Widening of Pakhowal Road from Sarabha Nagar to Gill Road', roadType: 'BT Road', totalKm: 4.2, completedKm: 3.1, estimateCost: 820, tenderCost: 779, billsPaid: 420, physicalProgress: 74, financialProgress: 54, fundSource: 'MDF', supervisorNotes: 'On schedule, utility shifting pending 200m stretch' },
  { id: 'MDF-002', name: 'Four-lane construction of Ferozepur Road arterial — Phase I', roadType: 'CC Road', totalKm: 6.8, completedKm: 2.9, estimateCost: 1840, tenderCost: 1748, billsPaid: 580, physicalProgress: 43, financialProgress: 33, fundSource: 'MDF', supervisorNotes: 'Delayed — land acquisition dispute at km 3.2' },
  { id: 'MDF-003', name: 'Improvement of BDT Chowk to Civil Lines under-bridge approach road', roadType: 'BT Road', totalKm: 1.4, completedKm: 1.4, estimateCost: 245, tenderCost: 232, billsPaid: 232, physicalProgress: 100, financialProgress: 100, fundSource: 'MDF', supervisorNotes: 'Completed and handed over' },
  { id: 'MDF-004', name: 'Construction of ROB at Tibba Road railway crossing', roadType: 'ROB / Bridge', totalKm: 0.8, completedKm: 0.2, estimateCost: 2400, tenderCost: 2280, billsPaid: 342, physicalProgress: 25, financialProgress: 15, fundSource: 'MDF', supervisorNotes: 'Pile foundation stage; railway NOC obtained' },
  { id: 'MDF-005', name: 'Resurfacing of all arterial roads in Focal Point Phase IV-VII', roadType: 'BT Road', totalKm: 12.5, completedKm: 8.9, estimateCost: 950, tenderCost: 902, billsPaid: 614, physicalProgress: 71, financialProgress: 68, fundSource: 'MDF', supervisorNotes: 'Satisfactory progress' },
  { id: 'MDF-006', name: 'Elevated road from Sherpur Chowk to Hambran Road junction', roadType: 'Elevated / Flyover', totalKm: 2.1, completedKm: 0.0, estimateCost: 4800, tenderCost: 4560, billsPaid: 0, physicalProgress: 0, financialProgress: 0, fundSource: 'MDF', supervisorNotes: 'Tender finalized; mobilization pending' },
  { id: 'MDF-007', name: 'Improvement of internal roads in Basti Jodhewal & Basti Bawa Khel', roadType: 'CC Road', totalKm: 5.3, completedKm: 4.1, estimateCost: 620, tenderCost: 589, billsPaid: 420, physicalProgress: 77, financialProgress: 71, fundSource: 'MDF', supervisorNotes: 'Minor punch-list items remaining' },
  { id: 'MDF-008', name: 'Construction of storm drain along Tajpur Road — Package B', roadType: 'Drain / Civil', totalKm: 3.6, completedKm: 2.1, estimateCost: 380, tenderCost: 361, billsPaid: 180, physicalProgress: 58, financialProgress: 50, fundSource: 'MDF', supervisorNotes: 'On track' },
  { id: 'MDF-009', name: 'Upgrade of Ludhiana-Jagraon bypass: BT overlay + line marking', roadType: 'BT Road', totalKm: 8.2, completedKm: 5.6, estimateCost: 730, tenderCost: 693, billsPaid: 450, physicalProgress: 68, financialProgress: 65, fundSource: 'MDF', supervisorNotes: 'Line marking pending final approval' },
  { id: 'MDF-010', name: 'CC road in newly developed colony Dugri Phase III — all sectors', roadType: 'CC Road', totalKm: 3.0, completedKm: 0.8, estimateCost: 310, tenderCost: 294, billsPaid: 58, physicalProgress: 27, financialProgress: 20, fundSource: 'MDF', supervisorNotes: 'Rain delay; sub-grade work in progress' },
];

export const flagshipSASCI: FlagshipWork[] = [
  { id: 'SCI-001', name: 'Widening of Buddha Nallah service road — north bank Package A', roadType: 'BT Road', totalKm: 5.5, completedKm: 4.2, estimateCost: 960, tenderCost: 912, billsPaid: 638, physicalProgress: 76, financialProgress: 70, fundSource: 'SASCI', supervisorNotes: 'Final layer pending' },
  { id: 'SCI-002', name: 'Construction of CC road in Haibowal dairy complex internal roads', roadType: 'CC Road', totalKm: 2.8, completedKm: 1.5, estimateCost: 420, tenderCost: 399, billsPaid: 160, physicalProgress: 54, financialProgress: 40, fundSource: 'SASCI', supervisorNotes: 'Moderate progress' },
  { id: 'SCI-003', name: 'Improvement of sector roads in BRS Nagar & Sarabha Nagar', roadType: 'BT Road', totalKm: 7.2, completedKm: 7.2, estimateCost: 640, tenderCost: 608, billsPaid: 608, physicalProgress: 100, financialProgress: 100, fundSource: 'SASCI', supervisorNotes: 'Completed — defect liability period active' },
  { id: 'SCI-004', name: 'Multi-level parking structure near Ludhiana Bus Stand', roadType: 'Parking / Civil', totalKm: 0.2, completedKm: 0.04, estimateCost: 1850, tenderCost: 1757, billsPaid: 200, physicalProgress: 18, financialProgress: 11, fundSource: 'SASCI', supervisorNotes: 'Piling complete; column work started' },
  { id: 'SCI-005', name: 'Leisure Valley redevelopment — landscape and internal roads', roadType: 'Mixed Civil', totalKm: 1.8, completedKm: 0.27, estimateCost: 820, tenderCost: 779, billsPaid: 95, physicalProgress: 15, financialProgress: 12, fundSource: 'SASCI', supervisorNotes: 'In progress — landscape contractor mobilized' },
];

export const stageDistribution = [
  { name: 'Completed',     value: 392, fill: '#3db97d' },
  { name: 'In Progress',   value: 421, fill: '#4f6ef7' },
  { name: 'Tender Issued', value: 173, fill: '#3d9bd4' },
  { name: 'Pending Start', value: 102, fill: '#404040' },
  { name: 'Delayed',       value: 70,  fill: '#d4a017' },
];

export const zoneProgress = [
  { zone: 'Zone A', BR: 62, OM: 48 },
  { zone: 'Zone B', BR: 78, OM: 82 },
  { zone: 'Zone C', BR: 44, OM: 68 },
  { zone: 'Zone D', BR: 88, OM: 36 },
  { zone: 'Zone E', BR: 57, OM: 42 },
];

export const monthlySpend = [
  { month: 'Apr', spend: 18.2 },
  { month: 'May', spend: 24.5 },
  { month: 'Jun', spend: 31.8 },
  { month: 'Jul', spend: 28.4 },
  { month: 'Aug', spend: 35.6 },
  { month: 'Sep', spend: 22.1 },
  { month: 'Oct', spend: 19.8 },
  { month: 'Nov', spend: 27.3 },
  { month: 'Dec', spend: 33.9 },
];

export const kpiSummary = {
  totalWorks: 1158,
  brWorks: 648,
  omWorks: 510,
  sanctionedBudget: 482.6,
  contractValue: 396.4,
  disbursed: 218.7,
  criticalWorks: 27,
  completedWorks: 392,
  inProgressWorks: 421,
  tenderIssuedWorks: 173,
};
