import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ChartDataPoint } from '../../types';

interface ProgressionChartProps {
  data: ChartDataPoint[];
  id?: string;
  height?: number;
  showArea?: boolean;
}

const COLORS = {
  right_foot: '#2563eb',
  left_foot:  '#16a34a',
  head:       '#d97706',
  total:      '#7c3aed',
};

const LABELS = {
  right_foot: 'Pied droit',
  left_foot:  'Pied gauche',
  head:       'Tête',
  total:      'Total',
};

function formatDate(dateStr: string) {
  try { return format(new Date(dateStr), 'dd/MM', { locale: fr }); } catch { return dateStr; }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">
        {format(new Date(label), 'dd MMMM yyyy', { locale: fr })}
      </p>
      {payload.map((entry: { color: string; name: string; value: number }) => (
        <p key={entry.name} style={{ color: entry.color }} className="flex justify-between gap-4">
          <span>{LABELS[entry.name as keyof typeof LABELS] ?? entry.name}</span>
          <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function ProgressionChart({ data, id, height = 320, showArea = false }: ProgressionChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        Aucune donnée disponible
      </div>
    );
  }

  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <div id={id}>
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            formatter={(value) => LABELS[value as keyof typeof LABELS] ?? value}
          />
          {showArea ? (
            <>
              <Area type="monotone" dataKey="right_foot" stroke={COLORS.right_foot} fill={`${COLORS.right_foot}20`} strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="left_foot"  stroke={COLORS.left_foot}  fill={`${COLORS.left_foot}20`}  strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="head"       stroke={COLORS.head}       fill={`${COLORS.head}20`}       strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="total"      stroke={COLORS.total}      fill={`${COLORS.total}20`}      strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </>
          ) : (
            <>
              <Line type="monotone" dataKey="right_foot" stroke={COLORS.right_foot} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="left_foot"  stroke={COLORS.left_foot}  strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="head"       stroke={COLORS.head}       strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="total"      stroke={COLORS.total}      strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </>
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
