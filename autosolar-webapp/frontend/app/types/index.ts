export interface SensorData {
  ldr_left: number;
  ldr_right: number;
  current: number;
  power: number;
}

export interface Settings {
  mode: number;           // 0 = Motor, 1 = Actuator (แกนชัก)
  pwm_motor: number;      // 0–255
  pwm_actuator: number;   // 0–255
  tolerance: number;      // 0–200
  current_zero_offset?: number;
}

export interface ChartPoint {
  timestamp: number;
  value: number;
}

export interface LDRPoint {
  timestamp: number;
  ldr_left: number;
  ldr_right: number;
}
