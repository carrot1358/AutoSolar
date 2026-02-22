#include <Arduino.h>
#include "settings.h"
#include "ldr_tracker.h"
#include "current_sensor.h"
#include "serial_comm.h"

// Global settings — initialized with defaults from settings.h
Settings settings = DEFAULT_SETTINGS;

void setup() {
  Serial.begin(115200);  // 115200 baud — must match ESP32 Serial2

  // Motor driver output pins
  pinMode(RPWM_Output, OUTPUT);
  pinMode(LPWM_Output, OUTPUT);

  // Limit switch input pins (external 10kΩ pull-up to 5V — no internal pull-up needed)
  pinMode(LIMIT_SW_RPWM, INPUT);
  pinMode(LIMIT_SW_LPWM, INPUT);

  // Relay pin — default HIGH (relay off, NC closed = mode 0)
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);

  // Ensure motor is stopped on boot
  analogWrite(RPWM_Output, 0);
  analogWrite(LPWM_Output, 0);
}

void loop() {
  // Receive incoming settings commands from ESP32 (non-blocking)
  receiveSettings(settings);

  // Read LDR sensor values
  int ldrLeft  = readLDRLeft();
  int ldrRight = readLDRRight();

  // Relay: mode 0 → HIGH (NC, relay off), mode 1 → LOW (NO, relay energized)
  digitalWrite(RELAY_PIN, settings.mode == 1 ? LOW : HIGH);

  // Select active PWM based on current mode
  // mode 0 = Motor, mode 1 = Actuator
  int activePwm = (settings.mode == 0) ? settings.pwmMotor : settings.pwmActuator;

  // Tolerance-based LDR sun tracking — drives H-bridge RPWM/LPWM
  updateMotor(ldrLeft, ldrRight, settings.tolerance, activePwm);

  // Accumulate one ADC sample into the running average (non-blocking)
  sampleCurrent();

  // Get smoothed current; derive power
  float current = readCurrent();
  float power   = 12.0f * abs(current);

  // Publish sensor JSON over Serial (rate-limited to 500ms internally)
  sendSensorData(ldrLeft, ldrRight, current, power, settings.mode);
}
