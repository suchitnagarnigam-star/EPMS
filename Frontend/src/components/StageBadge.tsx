import type { WorkStage } from '../data/types';

export default function StageBadge({ stage }: { stage: WorkStage }) {
  const map: Record<WorkStage, string> = {
    'Completed':     'badge-success',
    'In Progress':   'badge-info',
    'Tender Issued': 'badge-accent',
    'Not Started':   'badge-neutral',
    'Delayed':       'badge-warn',
    'Stalled':       'badge-danger',
  };
  return <span className={`badge ${map[stage]}`}>{stage}</span>;
}
