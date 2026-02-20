#pragma once

#include <Arduino.h>

// ACS712 30A current sensor pin
#define CURRENT_SENSOR_PIN A2

// Number of samples for averaging
#define CURRENT_SAMPLES 10

// Read average current in Amperes from ACS712 30A
// Formula: (voltage - 2.5) / 0.066  where voltage = (raw/1023.0)*5.0
float readCurrent();

// Calculate power in Watts: 12.0 * abs(current)
float readPower();
