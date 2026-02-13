#include "current_sensor.h"

float readCurrent() {
  long sum = 0;
  for (int i = 0; i < CURRENT_SAMPLES; i++) {
    sum += analogRead(CURRENT_SENSOR_PIN);
  }
  float raw = sum / (float)CURRENT_SAMPLES;
  float voltage = (raw / 1023.0f) * 5.0f;
  float current = (voltage - 2.5f) / 0.066f;
  return current;
}

float readPower() {
  float current = readCurrent();
  return 12.0f * abs(current);
}
