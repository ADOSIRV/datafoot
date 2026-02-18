import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { PlayerStats } from '../../types';

interface StatsRadarProps {
  stats: PlayerStats;
  height?: number;
}

export default function StatsRadar({ stats, height = 250 }: StatsRadarProps) {
  const data = [
    { subject: 'Pied droit', value: stats.avg_right_foot, best: stats.best_right_foot },
    { subject: 'Pied gauche', value: stats.avg_left_foot, best: stats.best_left_foot },
    { subject: 'Tête', value: stats.avg_head, best: stats.best_head },
    { subject: 'Régularité', value: Math.min(stats.total_sessions * 5, 100), best: 100 },
    { subject: 'Progression', value: stats.best_total > 0 ? Math.round((stats.avg_total / stats.best_total) * 100) : 0, best: 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <Radar name="Moyenne" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2} />
        <Tooltip formatter={(v) => [v, 'Moyenne']} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
