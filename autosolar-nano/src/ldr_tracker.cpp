#include "ldr_tracker.h"

int readLDRLeft() {
  return analogRead(LDR_LEFT_PIN);
}

int readLDRRight() {
  return analogRead(LDR_RIGHT_PIN);
}

void updateMotor(int ldrLeft, int ldrRight, int tolerance, int pwm) {
  bool limitRpwm = (digitalRead(LIMIT_SW_RPWM) == LOW);
  bool limitLpwm = (digitalRead(LIMIT_SW_LPWM) == LOW);

  int diff = ldrLeft - ldrRight;
  if (abs(diff) > tolerance) {
    if (diff > 0) {
      // Left brighter — rotate RPWM direction; blocked if limit hit
      analogWrite(RPWM_Output, limitRpwm ? 0 : pwm);
      analogWrite(LPWM_Output, 0);
    } else {
      // Right brighter — rotate LPWM direction; blocked if limit hit
      analogWrite(LPWM_Output, limitLpwm ? 0 : pwm);
      analogWrite(RPWM_Output, 0);
    }
  } else {
    // Balanced — stop motor
    analogWrite(RPWM_Output, 0);
    analogWrite(LPWM_Output, 0);
  }
}
