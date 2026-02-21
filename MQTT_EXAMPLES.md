# MQTT Message Examples

## Topics Overview

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `autosolar/sensor-data` | ESP32 → Backend | Sensor readings (LDR, current, power) |
| `autosolar/commands` | Backend → ESP32/Nano | Motor & tracking configuration |

---

## Sensor Data (ESP32 → Backend)

**Topic:** `autosolar/sensor-data`

**Frequency:** Every 500ms from Nano → ESP32 → MQTT

### Basic Example
```json
{
  "ldr_left": 512,
  "ldr_right": 480,
  "current": 1.5,
  "power": 18.0
}
```

### Real-world Examples

**Balanced (tracking complete):**
```json
{
  "ldr_left": 500,
  "ldr_right": 505,
  "current": 2.1,
  "power": 25.2
}
```

**Left tracking (left sensor lower):**
```json
{
  "ldr_left": 400,
  "ldr_right": 600,
  "current": 1.8,
  "power": 21.6
}
```

**Right tracking (right sensor lower):**
```json
{
  "ldr_left": 700,
  "ldr_right": 300,
  "current": 2.5,
  "power": 30.0
}
```

**Low light:**
```json
{
  "ldr_left": 100,
  "ldr_right": 120,
  "current": 0.2,
  "power": 2.4
}
```

**High light (peak sun):**
```json
{
  "ldr_left": 950,
  "ldr_right": 940,
  "current": 3.5,
  "power": 42.0
}
```

---

## Commands/Config (Backend → ESP32/Nano)

**Topic:** `autosolar/commands`

**Sent when:** Settings updated in Frontend, or ESP32 reconnects (resync)

### Default Settings
```json
{
  "mode": 0,
  "pwm_motor": 150,
  "pwm_actuator": 120,
  "tolerance": 50
}
```

### Parameter Descriptions
- **mode** (int): 0 = Motor tracking, 1 = Actuator mode
- **pwm_motor** (0-255): Motor speed for tracking
- **pwm_actuator** (0-255): Actuator (tilt) power level
- **tolerance** (int): Max LDR difference before tracking triggers

### Example Configurations

**Aggressive tracking (low tolerance, high PWM):**
```json
{
  "mode": 0,
  "pwm_motor": 200,
  "pwm_actuator": 120,
  "tolerance": 20
}
```

**Smooth tracking (high tolerance, medium PWM):**
```json
{
  "mode": 0,
  "pwm_motor": 100,
  "pwm_actuator": 120,
  "tolerance": 80
}
```

**Actuator mode (tilt control):**
```json
{
  "mode": 1,
  "pwm_motor": 150,
  "pwm_actuator": 180,
  "tolerance": 50
}
```

**Low power mode:**
```json
{
  "mode": 0,
  "pwm_motor": 80,
  "pwm_actuator": 80,
  "tolerance": 40
}
```

---

## Testing ESP32 MQTT Connection

### Quick Test: Enable TEST_MODE

The ESP32 firmware includes a **TEST_MODE** that publishes dummy sensor data every 2 seconds without needing the Nano connected.

**Steps:**

1. **Enable TEST_MODE in main.cpp:**
   ```cpp
   // Line 31 - Change from:
   // #define TEST_MODE

   // To:
   #define TEST_MODE
   ```

2. **Build and upload:**
   ```bash
   cd autosolar-esp
   pio run -t upload
   ```

3. **Monitor ESP32 output:**
   ```bash
   pio device monitor --baud 115200
   ```

   You should see messages like:
   ```
   TEST DATA: {"ldr_left":505,"ldr_right":485,"current":2.1,"power":25.2}
   TEST DATA: {"ldr_left":510,"ldr_right":478,"current":1.8,"power":21.6}
   ...
   ```

4. **Check backend received the data:**
   - Open `http://localhost:3000/health` in browser
   - Backend logs should show incoming MQTT messages
   - Check SQLite: `sqlite3 solar_data.db "SELECT * FROM solar_data ORDER BY timestamp DESC LIMIT 5;"`

5. **Check frontend dashboard:**
   - Run `npm run dev` in `autosolar-webapp/frontend/`
   - Open `http://localhost:9000`
   - Watch the sensor chart update in real-time

**Disable TEST_MODE when Nano is ready:**
   ```cpp
   // Comment out or remove the #define TEST_MODE line
   // #define TEST_MODE
   ```

---

## Testing with MQTT Client

### Using `mosquitto_pub` (command line)

**Test sensor data (publish to backend):**
```bash
mosquitto_pub -h <broker_url> -u <username> -P <password> \
  -t "autosolar/sensor-data" \
  -m '{"ldr_left":512,"ldr_right":480,"current":1.5,"power":18.0}'
```

**Test commands (publish to ESP32/Nano):**
```bash
mosquitto_pub -h <broker_url> -u <username> -P <password> \
  -t "autosolar/commands" \
  -m '{"mode":0,"pwm_motor":150,"pwm_actuator":120,"tolerance":50}'
```

### Replace with your values:
- `<broker_url>` = Your HiveMQ broker URL (e.g., `52340093aec74039a7680620b922eaa7.s1.eu.hivemq.cloud`)
- `<username>` = Your MQTT username
- `<password>` = Your MQTT password

### Using MQTT Explorer (GUI)

1. Download: https://mqtt-explorer.com/
2. Connect to broker with credentials
3. Navigate to topic
4. Click "Publish" button
5. Paste JSON payload
6. Click "Publish"

---

## Testing Workflow

### 1. Test Backend (Sensor Data)
```bash
# Publish sensor data
mosquitto_pub -h broker.example.com -u user -P pass \
  -t "autosolar/sensor-data" \
  -m '{"ldr_left":512,"ldr_right":480,"current":1.5,"power":18.0}'

# Check Backend logs
# Should see message in server.js console and data in SQLite
```

### 2. Test Frontend (Webapp)
```bash
# Start backend & frontend
cd autosolar-webapp
docker-compose up --build

# Or manually:
# Terminal 1: cd backend && npm start
# Terminal 2: cd frontend && npm run dev

# Then open http://localhost:9000 (frontend) or :3000 (backend)
# Publish sensor data and watch dashboard update in real-time
```

### 3. Test Nano (Commands)
```bash
# Publish command
mosquitto_pub -h broker.example.com -u user -P pass \
  -t "autosolar/commands" \
  -m '{"mode":0,"pwm_motor":150,"pwm_actuator":120,"tolerance":50}'

# Check Nano logs via serial monitor
pio device monitor --baud 115200

# Should see settings updated and motor response
```

---

## Common Issues

### No messages received?
- Check broker URL, username, password
- Verify topic spelling (case-sensitive)
- Check MQTT connection status in backend logs: `/health` endpoint

### Frontend not updating?
- Check MQTT subscription in backend (server.js line 79)
- Check Socket.IO connection (browser DevTools → Network → WS)

### Nano not responding?
- Check Serial2 pins (GPIO16 RX, GPIO17 TX) in ESP32
- Check ESP32 → Nano serial baud rate (115200)
- Monitor serial output: `pio device monitor --baud 115200`

### Want to test ESP32 → MQTT without Nano?
- Enable `TEST_MODE` in main.cpp (see "Testing ESP32 MQTT Connection" section above)
- Publishes dummy data every 2 seconds
- Great for debugging MQTT connection issues before Nano integration
