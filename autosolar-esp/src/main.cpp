// CRITICAL: MQTT_MAX_PACKET_SIZE MUST be defined before PubSubClient include
// Default is 256 bytes — settings JSON may exceed this
#define MQTT_MAX_PACKET_SIZE 512

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ── WiFi credentials ──────────────────────────────────────────────────────────
const char* ssid     = "Carrot_1358";
const char* password = "0860066055";

// ── HiveMQ Cloud MQTT broker ──────────────────────────────────────────────────
const char* mqtt_server   = "dcb93a23f9e9456989eb6ef2747639d8.s1.eu.hivemq.cloud";
const int   mqtt_port     = 8883;
const char* mqtt_username = "admin";
const char* mqtt_password = "Carrot1358";

// ── MQTT topics ───────────────────────────────────────────────────────────────
const char* mqtt_sensor_topic   = "autosolar/sensor-data";
const char* mqtt_commands_topic = "autosolar/commands";

// ── Serial2 pins (ESP32 default GPIO 16=RX2, 17=TX2) ─────────────────────────
#define SERIAL2_RX_PIN 16
#define SERIAL2_TX_PIN 17

// ── TEST MODE: Uncomment to publish dummy sensor data instead of reading Nano ───
// #define TEST_MODE
#ifdef TEST_MODE
unsigned long lastTestPublish = 0;
const unsigned long TEST_PUBLISH_INTERVAL = 2000;  // Publish every 2 seconds
#endif

// ── MQTT client objects ───────────────────────────────────────────────────────
WiFiClientSecure espClient;
PubSubClient     client(espClient);

// ── MQTT callback — receives commands from backend, forwards to Nano ──────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  if (String(topic) != mqtt_commands_topic) return;

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) return;

  // Forward raw JSON command to Nano via Serial2
  serializeJson(doc, Serial2);
  Serial2.println();
}

// ── WiFi connection ───────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {  // 10 second timeout
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
  } else {
    Serial.println("\nWiFi timeout - continuing anyway");
  }
}

// ── MQTT reconnect — subscribes to commands topic on every connect ────────────
void reconnectMQTT() {
  while (!client.connected()) {
    String clientId = "ESP32-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
      // CRITICAL: re-subscribe on every reconnect
      client.subscribe(mqtt_commands_topic);
    } else {
      delay(5000);
    }
  }
}

// ── Publish dummy test data to MQTT (for testing without Nano) ─────────────────
#ifdef TEST_MODE
void publishTestData() {
  if (millis() - lastTestPublish < TEST_PUBLISH_INTERVAL) return;
  lastTestPublish = millis();

  JsonDocument doc;
  // Simulate realistic sensor values that change slightly
  static int ldr_left_base = 500;
  static int ldr_right_base = 480;

  ldr_left_base += random(-10, 11);   // ±10 variation
  ldr_right_base += random(-10, 11);

  // Constrain to realistic ranges
  ldr_left_base = constrain(ldr_left_base, 100, 900);
  ldr_right_base = constrain(ldr_right_base, 100, 900);

  doc["ldr_left"]  = ldr_left_base;
  doc["ldr_right"] = ldr_right_base;
  doc["current"]   = 1.5 + random(0, 20) / 10.0;  // 1.5 to 3.5 A
  doc["power"]     = (1.5 + random(0, 20) / 10.0) * 12.0;  // Assuming 12V

  char buffer[256];
  serializeJson(doc, buffer);

  if (client.connected()) {
    client.publish(mqtt_sensor_topic, buffer);
    Serial.print("TEST DATA: ");
    Serial.println(buffer);
  } else {
    Serial.println("MQTT not connected, skipping test publish");
  }
}
#endif

// ── Read Serial2 from Nano, remap short keys to long keys, publish to MQTT ───
// Nano sends: {"ldr_l":..., "ldr_r":..., "cur":..., "pwr":...}
// MQTT expects: {"ldr_left":..., "ldr_right":..., "current":..., "power":...}
void republishSensorData() {
  if (!Serial2.available()) return;

  String line = Serial2.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  // Parse short-key JSON from Nano
  JsonDocument inDoc;
  DeserializationError err = deserializeJson(inDoc, line);
  if (err) return;

  // Re-serialize with long key names for backend + frontend
  JsonDocument outDoc;
  outDoc["ldr_left"]  = inDoc["ldr_l"];
  outDoc["ldr_right"] = inDoc["ldr_r"];
  outDoc["current"]   = inDoc["cur"];
  outDoc["power"]     = inDoc["pwr"];
  outDoc["mode"]      = inDoc["m"];

  char buffer[256];
  serializeJson(outDoc, buffer);

  if (client.connected()) {
    client.publish(mqtt_sensor_topic, buffer);
  }
}

// ── Arduino setup ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);   // USB debug monitor

  // Serial2 to Nano — 115200 baud (was 9600 — must match Nano Serial.begin(115200))
  Serial2.begin(115200, SERIAL_8N1, SERIAL2_RX_PIN, SERIAL2_TX_PIN);

  connectWiFi();

  // Skip TLS certificate verification — acceptable for dev
  espClient.setInsecure();

  client.setServer(mqtt_server, mqtt_port);

  // CRITICAL: setCallback MUST be called before connect()
  client.setCallback(mqttCallback);

  reconnectMQTT();

  Serial.println("Setup complete");
}

// ── Arduino loop ──────────────────────────────────────────────────────────────
void loop() {
  // Maintain MQTT connection
  if (!client.connected()) {
    reconnectMQTT();
  }

  // CRITICAL: client.loop() must be called every iteration to process incoming messages
  client.loop();

  // Forward Nano sensor data to MQTT with key remapping, or publish test data
  #ifdef TEST_MODE
    publishTestData();
  #else
    republishSensorData();
  #endif
}
