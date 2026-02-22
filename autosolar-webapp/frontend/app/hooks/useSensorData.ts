'use client';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SensorData, ChartPoint, LDRPoint } from '../types';

const BUFFER_SIZE = 50;

export function useSensorData(backendUrl: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentData, setCurrentData] = useState<SensorData | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [ldrData, setLdrData] = useState<LDRPoint[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const sock = io(backendUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = sock;
    setSocket(sock);

    sock.on('sensorData', (data: SensorData) => {
      const timestamp = Date.now();

      setCurrentData(data);

      setChartData(prev => {
        const point: ChartPoint = { timestamp, value: Math.abs(data.current) };
        const updated = [...prev, point];
        return updated.length > BUFFER_SIZE ? updated.slice(-BUFFER_SIZE) : updated;
      });

      setLdrData(prev => {
        const point: LDRPoint = {
          timestamp,
          ldr_left: data.ldr_left,
          ldr_right: data.ldr_right,
        };
        const updated = [...prev, point];
        return updated.length > BUFFER_SIZE ? updated.slice(-BUFFER_SIZE) : updated;
      });
    });

    return () => {
      sock.off('sensorData');
      sock.disconnect();
      socketRef.current = null;
    };
  }, [backendUrl]);

  return { socket, currentData, chartData, ldrData };
}
