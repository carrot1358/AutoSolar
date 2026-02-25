'use client';
import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import type { Settings } from '../types';

const DEFAULT_SETTINGS: Settings = {
  mode: 0,
  pwm_motor: 150,
  pwm_actuator: 120,
  tolerance: 50,
  current_zero_offset: 0,
};

export function useSettings(backendUrl: string, socket: Socket | null) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    fetch(`${backendUrl}/api/settings`)
      .then(r => r.json())
      .then(data => setSettings(s => ({ ...s, ...data })))
      .catch(console.error);
  }, [backendUrl]);

  useEffect(() => {
    if (!socket) return;
    socket.on('settingsUpdate', (data: Partial<Settings>) => {
      setSettings(s => ({ ...s, ...data }));
    });
    return () => { socket.off('settingsUpdate'); };
  }, [socket]);

  const saveSettings = async (newSettings: Settings) => {
    await fetch(`${backendUrl}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    setSettings(newSettings);
  };

  return { settings, setSettings, saveSettings };
}
