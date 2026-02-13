#pragma once

#include <Arduino.h>

// LDR sensor pin definitions
#define LDR_LEFT_PIN  A0
#define LDR_RIGHT_PIN A1

// H-bridge motor driver pin definitions
#define RPWM_Output 5
#define LPWM_Output 6

// Read both LDR values
int readLDRLeft();
int readLDRRight();

// Tolerance-based motor control
// diff > tolerance  → drive RPWM only (left brighter, rotate toward left)
// diff < -tolerance → drive LPWM only (right brighter, rotate toward right)
// balanced          → stop motor (both pins = 0)
void updateMotor(int ldrLeft, int ldrRight, int tolerance, int pwm);
