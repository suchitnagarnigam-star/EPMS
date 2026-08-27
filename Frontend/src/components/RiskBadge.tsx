interface Props { score: number; }

export default function RiskBadge({ score }: Props) {
  const [label, cls] =
    score >= 75 ? ['Critical', 'badge-danger']  :
    score >= 50 ? ['High',     'badge-warn']    :
    score >= 25 ? ['Medium',   'badge-info']    :
                  ['Low',      'badge-success'] ;
  return <span className={`badge ${cls}`}>{label} {score}</span>;
}
