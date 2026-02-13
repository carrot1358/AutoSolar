#include "ldr_tracker.h"

int readLDRLeft() {
  return analogRead(LDR_LEFT_PIN);
}

int readLDRRight() {
  return analogRead(LDR_RIGHT_PIN);
}

void updateMotor(int ldrLeft, int ldrRight, int tolerance, int pwm) {
  int diff = ldrLeft - ldrRight;
  if (abs(diff) > tolerance) {
    if (diff > 0) {
      // Left brighter — rotate toward left
      analogWrite(RPWM_Output, pwm);
      analogWrite(LPWM_Output, 0);
    } else {
      // Right brighter — rotate toward right
      analogWrite(LPWM_Output, pwm);
      analogWrite(RPWM_Output, 0);
    }
  } else {
    // Balanced — stop motor
    analogWrite(RPWM_Output, 0);
    analogWrite(LPWM_Output, 0);
  }
}
