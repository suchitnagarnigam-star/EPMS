/**
 * Renders a colored badge for a work's delivery status.
 * Supports both backend canonical values and legacy mock data values.
 */
export default function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, string> = {
    // Backend canonical delivery_status values
    'Completed':       'badge-success',
    'In Progress':     'badge-info',
    'Procurement':     'badge-accent',
    'Not Started':     'badge-neutral',
    'Delayed/Held Up': 'badge-warn',
    // Legacy mock data values
    'Tender Issued':   'badge-accent',
    'Delayed':         'badge-warn',
    'Stalled':         'badge-danger',
    // Backend canonical workflow_stage values
    'Awarded':           'badge-success',
    'Work Order Issued': 'badge-info',
    'Approval Pending':  'badge-neutral',
  };
  return <span className={`badge ${map[stage] || 'badge-neutral'}`}>{stage}</span>;
}
