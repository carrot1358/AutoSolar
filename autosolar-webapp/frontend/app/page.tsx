'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useSensorData } from './hooks/useSensorData';
import { useSettings } from './hooks/useSettings';
import PowerDisplay from './components/PowerDisplay';
import LDRChart from './components/LDRChart';
import SettingsPanel from './components/SettingsPanel';
import type { Settings } from './types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

interface HistoricalPoint {
  id: number;
  timestamp: string;
  current: number;
  power: number;
  ldr_left: number;
  ldr_right: number;
}

interface DailySummary {
  avg_current: number;
  avg_power: number;
  max_power: number;
  max_current: number;
  min_current: number;
  count: number;
}

export default function Home() {
  const { socket, currentData, chartData, ldrData } = useSensorData(BACKEND_URL);
  const { settings, saveSettings } = useSettings(BACKEND_URL, socket);

  const [connected, setConnected] = useState(false);
  const [historicalData, setHistoricalData] = useState<HistoricalPoint[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);

  // Track socket connection state
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setConnected(true);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  // Fetch historical data
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/data?limit=20`)
      .then((r) => r.json())
      .then((res: { data: HistoricalPoint[] }) => setHistoricalData(res.data ?? []))
      .catch(() => {});
  }, []);

  // Fetch daily summary
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/stats`)
      .then((r) => r.json())
      .then((row: DailySummary) => {
        if (row && row.count) setDailySummary(row);
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async (newSettings: Settings) => {
    await saveSettings(newSettings);
  };

  return (
    <main className="min-h-screen bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AutoSolar Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Real-time solar tracker monitoring &amp; control</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className={`text-sm font-medium ${connected ? 'text-green-400' : 'text-red-400'}`}>
            {connected ? '● Connected' : '● Disconnected'}
          </span>
        </div>
      </div>

      {/* System Status — LDR values */}
      {currentData && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-gray-800 p-4 shadow">
            <p className="text-xs font-medium text-gray-400">LDR Left</p>
            <p className="mt-1 text-2xl font-bold text-blue-400">{currentData.ldr_left}</p>
            <p className="text-xs text-gray-500 mt-1">ADC (0–1023)</p>
          </div>
          <div className="rounded-xl bg-gray-800 p-4 shadow">
            <p className="text-xs font-medium text-gray-400">LDR Right</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">{currentData.ldr_right}</p>
            <p className="text-xs text-gray-500 mt-1">ADC (0–1023)</p>
          </div>
          <div className="rounded-xl bg-gray-800 p-4 shadow col-span-2">
            <p className="text-xs font-medium text-gray-400">LDR Difference</p>
            <p className="mt-1 text-2xl font-bold text-purple-400">
              {Math.abs(currentData.ldr_left - currentData.ldr_right)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {Math.abs(currentData.ldr_left - currentData.ldr_right) <= settings.tolerance
                ? '✓ Balanced'
                : currentData.ldr_left > currentData.ldr_right
                ? '← Tracking left'
                : '→ Tracking right'}
            </p>
          </div>
        </div>
      )}

      {/* Current & Power Display */}
      <div className="mb-6">
        <PowerDisplay
          current={currentData?.current ?? 0}
          power={currentData?.power ?? 0}
        />
      </div>

      {/* Two-column layout for charts + settings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Charts */}
        <div className="space-y-6 lg:col-span-2">
          {/* LDR Dual-Line Chart */}
          <div className="rounded-xl bg-gray-800 p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold text-gray-300">LDR Sensor Values</h2>
            <LDRChart data={ldrData} />
          </div>

          {/* Real-time Current Chart */}
          <div className="rounded-xl bg-gray-800 p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold text-gray-300">Real-time Current (A)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="timestamp" hide />
                <YAxis
                  domain={[0, 'auto']}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) => v.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: 8,
                  }}
                  labelFormatter={() => ''}
                  formatter={(value: number) => [value.toFixed(3), 'Current (A)']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  dot={false}
                  isAnimationActive={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Summary */}
          {dailySummary && (
            <div className="rounded-xl bg-gray-800 p-4 shadow-lg">
              <h2 className="mb-3 text-sm font-semibold text-gray-300">Overall Summary</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-700/60 p-3">
                  <p className="text-xs text-gray-400">Avg Current</p>
                  <p className="mt-1 text-lg font-semibold text-gray-100">{dailySummary.avg_current.toFixed(2)} A</p>
                </div>
                <div className="rounded-lg bg-gray-700/60 p-3">
                  <p className="text-xs text-gray-400">Avg Power</p>
                  <p className="mt-1 text-lg font-semibold text-gray-100">{dailySummary.avg_power.toFixed(1)} W</p>
                </div>
                <div className="rounded-lg bg-gray-700/60 p-3">
                  <p className="text-xs text-gray-400">Max Power</p>
                  <p className="mt-1 text-lg font-semibold text-yellow-400">{dailySummary.max_power.toFixed(1)} W</p>
                </div>
                <div className="rounded-lg bg-gray-700/60 p-3">
                  <p className="text-xs text-gray-400">Max Current</p>
                  <p className="mt-1 text-lg font-semibold text-gray-100">{dailySummary.max_current.toFixed(2)} A</p>
                </div>
                <div className="rounded-lg bg-gray-700/60 p-3">
                  <p className="text-xs text-gray-400">Min Current</p>
                  <p className="mt-1 text-lg font-semibold text-gray-100">{dailySummary.min_current.toFixed(2)} A</p>
                </div>
                <div className="rounded-lg bg-gray-700/60 p-3">
                  <p className="text-xs text-gray-400">Total Readings</p>
                  <p className="mt-1 text-lg font-semibold text-blue-400">{dailySummary.count}</p>
                </div>
              </div>
            </div>
          )}

          {/* Historical Data */}
          {historicalData.length > 0 && (
            <div className="rounded-xl bg-gray-800 p-4 shadow-lg">
              <h2 className="mb-3 text-sm font-semibold text-gray-300">Recent Readings</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="pb-2 text-left text-xs font-medium text-gray-400">Time</th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-400">LDR Left</th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-400">LDR Right</th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-400">Current</th>
                      <th className="pb-2 text-right text-xs font-medium text-gray-400">Power</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalData.map((row) => (
                      <tr key={row.id} className="border-b border-gray-700/50">
                        <td className="py-1.5 text-gray-400 text-xs">
                          {new Date(row.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-1.5 text-right text-blue-400">{row.ldr_left}</td>
                        <td className="py-1.5 text-right text-yellow-400">{row.ldr_right}</td>
                        <td className="py-1.5 text-right text-gray-300">{row.current.toFixed(2)} A</td>
                        <td className="py-1.5 text-right text-gray-300">{row.power.toFixed(1)} W</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Settings */}
        <div className="lg:col-span-1">
          <SettingsPanel settings={settings} onSave={handleSaveSettings} />
        </div>
      </div>
    </main>
  );
}
