#include "current_sensor.h"

// Running EMA of raw ADC value (init to ~midpoint 2.71V ≈ 554 raw)
static float emaRaw = 554.0f;

void sampleCurrent() {
  int raw = analogRead(CURRENT_SENSOR_PIN);
  emaRaw += CURRENT_EMA_ALPHA * (raw - emaRaw);
}

float readCurrent() {
  float voltage = (emaRaw / 1023.0f) * 5.0f;
  float current = (voltage - ACS712_ZERO_POINT) / ACS712_SENSITIVITY;
  return current;
}
