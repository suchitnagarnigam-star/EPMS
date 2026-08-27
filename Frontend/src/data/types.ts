export type WorkStage = 'Completed' | 'In Progress' | 'Tender Issued' | 'Not Started' | 'Delayed' | 'Stalled';
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type FundSource = 'MDF' | 'SASCI' | 'PIDB' | 'SFC' | 'Municipal';
export type Branch = 'B&R' | 'O&M' | 'Light' | 'Horticulture' | 'SWM';
export type AgencyHealth = 'Healthy' | 'Moderate' | 'High Risk' | 'Unassigned';

export interface Work {
  id: string;
  name: string;
  branch: Branch;
  zone: string;
  ac: string;
  ward: string;
  fundSource: FundSource;
  agency: string;
  stage: WorkStage;
  estimateCost: number; // Lacs
  tenderValue: number;  // Lacs
  paidAmount: number;   // Lacs
  physicalProgress: number; // 0-100
  riskScore: number;        // 0-100
  daysElapsed: number;
}

export interface Contractor {
  id: string;
  name: string;
  class: string;
  branch: Branch;
  health: AgencyHealth;
  totalWorks: number;
  inProgress: number;
  criticalFlagged: number;
  completed: number;
  tenderValue: number; // Lacs
  paidAmount: number;  // Lacs
  avgProgress: number;
}

export interface Constituency {
  name: string;
  totalWorks: number;
  brWorks: number;
  omWorks: number;
  sanctionedCost: number; // Lacs
  tenderValue: number;    // Lacs
  expenditure: number;    // Lacs
  criticalCount: number;
}

export interface FlagshipWork {
  id: string;
  name: string;
  roadType: string;
  totalKm: number;
  completedKm: number;
  estimateCost: number;
  tenderCost: number;
  billsPaid: number;
  physicalProgress: number;
  financialProgress: number;
  fundSource: 'MDF' | 'SASCI';
  supervisorNotes: string;
}
