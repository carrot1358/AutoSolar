'use client';

import { useState, useEffect } from 'react';
import type { Settings } from '../types';

interface SettingsPanelProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
}

export default function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [mode, setMode] = useState<number>(settings.mode);
  const [pwmMotor, setPwmMotor] = useState<number>(settings.pwm_motor);
  const [pwmActuator, setPwmActuator] = useState<number>(settings.pwm_actuator);
  const [tolerance, setTolerance] = useState<number>(settings.tolerance);

  useEffect(() => {
    setMode(settings.mode);
    setPwmMotor(settings.pwm_motor);
    setPwmActuator(settings.pwm_actuator);
    setTolerance(settings.tolerance);
  }, [settings]);

  const handleSave = () => {
    onSave({
      mode,
      pwm_motor: pwmMotor,
      pwm_actuator: pwmActuator,
      tolerance,
    });
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg space-y-6">
      <h2 className="text-lg font-semibold text-white">Settings</h2>

      {/* Mode Toggle */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">Mode</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setMode(0)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 0
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Motor
          </button>
          <button
            type="button"
            onClick={() => setMode(1)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 1
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            แกนชัก
          </button>
        </div>
      </div>

      {/* PWM Motor */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-300">PWM Motor</label>
          <span className="text-sm text-gray-400">{pwmMotor}</span>
        </div>
        <input
          type="range"
          min={0}
          max={255}
          value={pwmMotor}
          onChange={(e) => setPwmMotor(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>255</span>
        </div>
      </div>

      {/* PWM Actuator */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-300">PWM Actuator</label>
          <span className="text-sm text-gray-400">{pwmActuator}</span>
        </div>
        <input
          type="range"
          min={0}
          max={255}
          value={pwmActuator}
          onChange={(e) => setPwmActuator(Number(e.target.value))}
          className="w-full accent-yellow-500"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>255</span>
        </div>
      </div>

      {/* Tolerance */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-300">Tolerance</label>
          <span className="text-sm text-gray-400">{tolerance}</span>
        </div>
        <input
          type="range"
          min={0}
          max={200}
          value={tolerance}
          onChange={(e) => setTolerance(Number(e.target.value))}
          className="w-full accent-green-500"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>200</span>
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
      >
        Save
      </button>
    </div>
  );
}
