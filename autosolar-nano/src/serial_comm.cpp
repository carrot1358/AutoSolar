#include "serial_comm.h"
#include <Arduino.h>
#include <ArduinoJson.h>

void sendSensorData(int ldrLeft, int ldrRight, float current, float power, int mode) {
  static unsigned long lastSend = 0;
  if (millis() - lastSend < 500) return;
  lastSend = millis();

  JsonDocument doc;
  doc["ldr_l"] = ldrLeft;
  doc["ldr_r"] = ldrRight;
  doc["cur"]   = current;
  doc["pwr"]   = power;
  doc["m"]     = mode;
  serializeJson(doc, Serial);
  Serial.println();
}

void receiveSettings(Settings &s) {
  if (!Serial.available()) return;
  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, line);
  if (err) return;

  Serial.print("[CMD] raw=");
  Serial.println(line);

  if (!doc["mode"].isNull()) {
    s.mode = doc["mode"].as<int>();
    Serial.print("[CMD] mode="); Serial.println(s.mode);
  }
  if (!doc["pwm_motor"].isNull())    s.pwmMotor    = doc["pwm_motor"].as<int>();
  if (!doc["pwm_actuator"].isNull()) s.pwmActuator = doc["pwm_actuator"].as<int>();
  if (!doc["tolerance"].isNull())    s.tolerance   = doc["tolerance"].as<int>();
}
