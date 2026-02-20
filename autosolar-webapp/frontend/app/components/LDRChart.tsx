'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { LDRPoint } from '../types';

interface LDRChartProps {
  data: LDRPoint[];
}

export default function LDRChart({ data }: LDRChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="timestamp" hide />
        <YAxis domain={[0, 1023]} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8 }}
          labelFormatter={() => ''}
          formatter={(value: number, name: string) => [value, name === 'ldr_left' ? 'LDR Left' : 'LDR Right']}
        />
        <Legend formatter={(value) => (value === 'ldr_left' ? 'LDR Left' : 'LDR Right')} />
        <Line
          type="monotone"
          dataKey="ldr_left"
          stroke="#3b82f6"
          dot={false}
          isAnimationActive={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="ldr_right"
          stroke="#f59e0b"
          dot={false}
          isAnimationActive={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
