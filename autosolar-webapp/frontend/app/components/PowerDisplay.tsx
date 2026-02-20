'use client';

interface PowerDisplayProps {
  current: number;
  power: number;
}

export default function PowerDisplay({ current, power }: PowerDisplayProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 text-white shadow-lg">
        <p className="text-sm font-medium text-blue-100">Current</p>
        <p className="text-3xl font-bold mt-1">{current.toFixed(2)}</p>
        <p className="text-sm text-blue-200 mt-1">Amperes (A)</p>
      </div>
      <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
        <p className="text-sm font-medium text-yellow-100">Power</p>
        <p className="text-3xl font-bold mt-1">{power.toFixed(1)}</p>
        <p className="text-sm text-yellow-200 mt-1">Watts (W)</p>
      </div>
    </div>
  );
}
