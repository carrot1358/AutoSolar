# AutoSolar

An automated solar tracker with dual-LDR sun following, motor/actuator control, real-time telemetry, and a web dashboard.

## System Architecture

```
[Solar Panel]
  LDR Left (A0) ──┐
  LDR Right (A1) ─┤
  ACS712 (A2) ────┤──→ [Arduino Nano] ──Serial 115200──→ [ESP32]
  H-bridge (D5/D6)┘                                          │
                                                             │ MQTT TLS
                                                             ▼
                                                    [HiveMQ Cloud :8883]
                                                             │
                                          ┌──────────────────┘
                                          ▼
                                   [Backend Node.js :3000]
                                   Express + Socket.IO + SQLite
                                          │
                                          ▼
                                  [Frontend Next.js :3001]
                                   Real-time dashboard
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v18+ | Backend & Frontend |
| PlatformIO | latest | Nano & ESP32 firmware |
| Docker & Docker Compose | latest | Containerised deployment |
| HiveMQ Cloud account | — | MQTT broker (free tier works) |

---

## Service 1: Arduino Nano

**Location:** `autosolar-nano/`

### Hardware Wiring

| Pin | Connection | Notes |
|-----|------------|-------|
| A0 | LDR Left | One leg to 5V via 10kΩ pull-up |
| A1 | LDR Right | One leg to 5V via 10kΩ pull-up |
| A2 | ACS712 OUT | Current sensor signal output |
| D5 | H-bridge RPWM | Right/forward PWM |
| D6 | H-bridge LPWM | Left/reverse PWM |
| 5V | ACS712 VCC | Power the sensor |
| GND | ACS712 GND | Common ground |

### ACS712 Notes

- Module: ACS712 30A variant
- Formula: `current = (voltage - 2.5) / 0.066` where `voltage = (raw / 1023.0) * 5.0`
- Power assumes 12 V supply: `power = 12.0 * abs(current)`

### Default Settings

| Setting | Default | Range |
|---------|---------|-------|
| mode | 0 (Motor) | 0 = Motor, 1 = Actuator |
| pwmMotor | 150 | 0–255 |
| pwmActuator | 120 | 0–255 |
| tolerance | 50 | 0–1023 |

### Build & Upload

```bash
cd autosolar-nano
pio run -t upload
```

**Board:** `nanoatmega328new` | **Library:** `bblanchon/ArduinoJson@^7.4.2`

---

## Service 2: ESP32

**Location:** `autosolar-esp/`

### Hardware Wiring

| ESP32 Pin | Connects To |
|-----------|-------------|
| GPIO16 (RX2) | Nano TX |
| GPIO17 (TX2) | Nano RX |
| GND | Nano GND (shared) |

> Both boards must share a common GND or communication will be unreliable.

### Configuration (edit before flashing)

Open `autosolar-esp/src/main.cpp`:

**WiFi credentials — lines 12–13:**
```cpp
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

**MQTT credentials — lines 18–19:**
```cpp
const char* mqtt_username = "YOUR_MQTT_USERNAME";
const char* mqtt_password = "YOUR_MQTT_PASSWORD";
```

**MQTT broker (pre-configured):**
```
mqtts://52340093aec74039a7680620b922eaa7.s1.eu.hivemq.cloud:8883
```

### Build & Upload

```bash
cd autosolar-esp
pio run -t upload
```

**Board:** `esp32dev` | **Libraries:** `knolleary/PubSubClient@^2.8`, `bblanchon/ArduinoJson@^7.4.2`

### What the ESP32 Does

- Reads JSON from Nano over Serial2 (`ldr_l`, `ldr_r`, `cur`, `pwr`)
- Remaps keys to long names (`ldr_left`, `ldr_right`, `current`, `power`)
- Publishes to `autosolar/sensor-data` via MQTT TLS
- Subscribes to `autosolar/commands` and forwards settings to Nano over Serial2

---

## Service 3: Backend (Node.js)

**Location:** `autosolar-webapp/backend/`

**Tech:** Express, Socket.IO, MQTT client, SQLite3

### Environment Variables

| Variable | Description |
|----------|-------------|
| `MQTT_USERNAME` | HiveMQ Cloud username |
| `MQTT_PASSWORD` | HiveMQ Cloud password |

### Manual Run

```bash
cd autosolar-webapp/backend
npm install
MQTT_USERNAME=xxx MQTT_PASSWORD=yyy node server.js
```

Runs on **port 3000**.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health + MQTT connection status |
| GET | `/api/latest` | Most recent sensor reading |
| GET | `/api/data?limit=N` | Last N readings (default 100) |
| GET | `/api/stats` | Aggregate stats (avg/max/min current & power) |
| GET | `/api/settings` | Current tracker settings |
| POST | `/api/settings` | Update settings (publishes to MQTT) |

---

## Service 4: Frontend (Next.js)

**Location:** `autosolar-webapp/frontend/`

**Tech:** Next.js 15.1.7, React 19, Tailwind CSS 4, Recharts 2, Socket.IO client 4

### Environment Variable

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### Development

```bash
cd autosolar-webapp/frontend
npm install
npm run dev
```

Runs on **port 3000** (Next.js default).

### Production Build

```bash
npm run build && npm start
```

---

## Docker Compose (Full Stack)

**Location:** `autosolar-webapp/`

### 1. Create `.env` file

```bash
# autosolar-webapp/.env
MQTT_USERNAME=your_hivemq_username
MQTT_PASSWORD=your_hivemq_password
```

### 2. Start all services

```bash
cd autosolar-webapp
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend | http://localhost:3000 |

---

## Complete Wiring Diagram

```
                    ┌─────────────────────────────┐
[Solar Panel LDR L] │ A0                           │
[Solar Panel LDR R] │ A1                           │
[ACS712 OUT]────────│ A2    Arduino Nano            │
                    │                               │
[H-bridge RPWM]─────│ D5                           │
[H-bridge LPWM]─────│ D6                           │
                    │                               │
                    │ TX ─────────────── GPIO16(RX2)│──┐
                    │ RX ─────────────── GPIO17(TX2)│  │  ESP32
                    │ GND ────────────── GND        │  │
                    └─────────────────────────────--┘  │
                                                        │
                                                    WiFi (TLS)
                                                        │
                                                        ▼
                                              HiveMQ Cloud :8883
```

**ACS712 wiring:**
```
5V  ──→ ACS712 VCC
GND ──→ ACS712 GND
OUT ──→ Nano A2
```

---

## MQTT Topics Reference

| Topic | Direction | Payload |
|-------|-----------|---------|
| `autosolar/sensor-data` | ESP32 → Backend | `{"ldr_left":N,"ldr_right":N,"current":N,"power":N}` |
| `autosolar/commands` | Backend → ESP32 → Nano | `{"mode":0,"pwm_motor":150,"pwm_actuator":120,"tolerance":50}` |

---

## Troubleshooting

**Serial communication not working (no data from Nano)**
- Both boards must use 115200 baud: `Serial.begin(115200)` on Nano, `Serial2.begin(115200, ...)` on ESP32
- Check that Nano TX connects to ESP32 GPIO16 (RX2) and Nano RX connects to GPIO17 (TX2)
- Ensure shared GND between the two boards

**MQTT connection failures (ESP32 can't connect)**
- Verify `mqtt_username` and `mqtt_password` are set correctly in `autosolar-esp/src/main.cpp` lines 18–19
- Re-flash after any credential changes
- Check that your HiveMQ Cloud cluster is active and the credentials have publish/subscribe permissions

**Frontend can't connect to backend**
- Confirm `NEXT_PUBLIC_BACKEND_URL` is set correctly and the backend is running
- In Docker, the frontend container connects to the backend container — check that both services are on the same Docker network (`autosolar-network`)
- For local dev, backend defaults to port 3000; frontend dev server also defaults to 3000 — run backend on a different port or set `PORT=3001` for the frontend dev server

**SQLite database permissions in Docker**
- The `docker-compose.yml` mounts `./backend/solar_data.db` into the container
- Create the file first if it does not exist: `touch autosolar-webapp/backend/solar_data.db`
- Ensure the file is writable by the container process (not root-owned on the host)
