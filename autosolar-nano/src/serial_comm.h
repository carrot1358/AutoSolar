#pragma once

#include "settings.h"

// Send sensor data as JSON over Serial (non-blocking, 500ms interval)
void sendSensorData(int ldrLeft, int ldrRight, float current, float power);

// Receive and parse incoming settings JSON from Serial
void receiveSettings(Settings &s);
