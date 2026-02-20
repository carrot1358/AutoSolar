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

  // Read current once; derive power to avoid double-sampling
  float current = readCurrent();
  float power   = 12.0f * abs(current);

  // Select active PWM based on current mode
  // mode 0 = Motor, mode 1 = Actuator
  int activePwm = (settings.mode == 0) ? settings.pwmMotor : settings.pwmActuator;

  // Tolerance-based LDR sun tracking — drives H-bridge RPWM/LPWM
  updateMotor(ldrLeft, ldrRight, settings.tolerance, activePwm);

  // Publish sensor JSON over Serial (rate-limited to 500ms internally)
  sendSensorData(ldrLeft, ldrRight, current, power);
}
