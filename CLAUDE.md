# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoSolar is an IoT solar tracker system with four components:

```
[Solar Panel + Sensors] → Arduino Nano → ESP32 → MQTT (HiveMQ Cloud) → Backend (Node.js) → Frontend (Next.js)
```

**Data flow:** Nano reads LDR sensors + ACS712 current sensor, sends compact JSON over Serial (115200 baud) to ESP32, which publishes to MQTT topic `autosolar/sensor-data`. Backend subscribes, stores in SQLite, emits via Socket.IO to frontend.

**Command flow:** Frontend POSTs to `/api/settings` → backend publishes to MQTT `autosolar/commands` → ESP32 forwards over Serial2 to Nano, which adjusts motor/tracking behavior.

## Build & Run Commands

### Frontend (`autosolar-webapp/frontend/`)
```bash
npm run dev      # dev server on port 9000 (not default 3000)
npm run build    # production build
npm run lint     # ESLint via next lint
```

### Backend (`autosolar-webapp/backend/`)
```bash
npm start        # node server.js (port 3000)
```
No test or lint scripts are defined for backend.

### Firmware (both `autosolar-nano/` and `autosolar-esp/`)
```bash
pio run                    # build
pio run -t upload          # build + upload
pio run -t upload --upload-port COM3  # specific port
pio device monitor --baud 115200      # serial monitor
```

### Docker (full webapp stack)
```bash
cd autosolar-webapp
docker-compose up --build   # backend :3000, frontend :3001
```

## Architecture Details

### Arduino Nano (`autosolar-nano/src/`)
- PlatformIO, AVR/atmega328new, ArduinoJson v7
- Pins: A0=LDR Left, A1=LDR Right, A2=ACS712, D5=RPWM, D6=LPWM (H-bridge)
- Modules: `ldr_tracker` (motor control via LDR diff vs tolerance), `current_sensor` (ACS712 30A, 10-sample avg), `serial_comm` (500ms send interval, compact JSON keys)
- Settings struct in `settings.h`: mode, pwmMotor, pwmActuator, tolerance

### ESP32 (`autosolar-esp/src/main.cpp`)
- Single-file firmware, PlatformIO, PubSubClient + ArduinoJson v7
- `#define MQTT_MAX_PACKET_SIZE 512` must precede PubSubClient include
- WiFi and MQTT credentials are **hardcoded** (lines 12-13, 18-19) — no .env for firmware
- TLS cert verification disabled (`setInsecure()`)
- Serial2: GPIO16 (RX from Nano), GPIO17 (TX to Nano)

### Backend (`autosolar-webapp/backend/server.js`)
- Single-file Express server (~220 lines), Socket.IO, mqtt client, sqlite3
- SQLite tables: `solar_data` (sensor readings), `settings` (key-value, JSON-stringified values)
- On MQTT reconnect, re-publishes current settings for ESP32 sync
- TLS cert verification disabled (`rejectUnauthorized: false`)

### Frontend (`autosolar-webapp/frontend/`)
- Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS v4
- `output: 'standalone'` in next.config.ts
- Path alias: `@/*` maps to `./app/*`
- Tailwind v4 uses `@tailwindcss/postcss` plugin (not legacy `tailwindcss` plugin)
- `globals.css` contains only `@import "tailwindcss"` — Tailwind v4 syntax
- Hooks: `useSensorData` (Socket.IO, 50-point rolling buffer), `useSettings` (REST + Socket.IO sync)
- Types defined in `app/types/index.ts`: SensorData, Settings, ChartPoint, LDRPoint

## Environment Variables

Backend `.env` (in `autosolar-webapp/backend/`):
- `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` — required for MQTT connection
- `DATABASE_PATH` — defaults to `./solar_data.db`

Frontend `.env` (in `autosolar-webapp/frontend/`):
- `NEXT_PUBLIC_BACKEND_URL` — defaults to `http://localhost:3000`

## MQTT Topics & Payloads

| Topic | Direction | Example |
|-------|-----------|---------|
| `autosolar/sensor-data` | ESP32 → Backend | `{"ldr_left":512,"ldr_right":480,"current":1.5,"power":18.0}` |
| `autosolar/commands` | Backend → ESP32 | `{"mode":0,"pwm_motor":150,"pwm_actuator":120,"tolerance":50}` |

## Default Settings
mode=0 (Motor), pwm_motor=150, pwm_actuator=120, tolerance=50
