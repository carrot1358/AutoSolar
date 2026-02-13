#pragma once

struct Settings {
  int mode;         // 0 = Motor, 1 = Actuator
  int pwmMotor;     // PWM value for motor mode (0–255)
  int pwmActuator;  // PWM value for actuator mode (0–255)
  int tolerance;    // LDR balance tolerance (0–1023)
};

static const Settings DEFAULT_SETTINGS = {
  /* mode        */ 0,
  /* pwmMotor    */ 150,
  /* pwmActuator */ 120,
  /* tolerance   */ 50
};
