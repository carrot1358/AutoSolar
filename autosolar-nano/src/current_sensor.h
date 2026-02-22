#pragma once

#include <Arduino.h>

// ACS712 30A current sensor pin
#define CURRENT_SENSOR_PIN A2

// Exponential moving average weight (0.0–1.0)
// Lower = smoother/slower, higher = more responsive
// 0.02 ≈ ~50-sample effective window, good balance for 490Hz PWM
#define CURRENT_EMA_ALPHA 0.02f

// ACS712 30A sensitivity: 66mV/A
#define ACS712_SENSITIVITY 0.066f

// ACS712 zero-current output voltage (measured midpoint, adjust if needed)
#define ACS712_ZERO_POINT 2.71f

// Call once per loop iteration — reads one ADC sample, updates running average
void sampleCurrent();

// Returns the current smoothed reading in Amperes
float readCurrent();
