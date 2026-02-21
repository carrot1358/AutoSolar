'use strict';

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// ── Validate required environment variables ─────────────────────────────────
const REQUIRED_ENV = ['MQTT_BROKER_URL', 'MQTT_USERNAME', 'MQTT_PASSWORD'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}\nCreate a .env file based on .env.example`
  );
}

// ── Environment variables ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL;
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'autosolar/sensor-data';
const MQTT_COMMANDS_TOPIC = process.env.MQTT_COMMANDS_TOPIC || 'autosolar/commands';
const DATABASE_PATH = process.env.DATABASE_PATH || './solar_data.db';

// ── Express + Socket.IO setup ───────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// ── SQLite database setup ───────────────────────────────────────────────────
const db = new sqlite3.Database(DATABASE_PATH);

db.serialize(() => {
  // Sensor readings table (existing)
  db.run(`CREATE TABLE IF NOT EXISTS solar_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ldr_left REAL,
    ldr_right REAL,
    current REAL,
    power REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Settings table (new)
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed default settings on first boot — INSERT OR IGNORE never overwrites existing values
  const DEFAULTS = { mode: 0, pwm_motor: 150, pwm_actuator: 120, tolerance: 50 };
  Object.entries(DEFAULTS).forEach(([key, value]) => {
    db.run(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [key, JSON.stringify(value)]
    );
  });
});

// ── MQTT client setup ───────────────────────────────────────────────────────
const mqttOptions = {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  rejectUnauthorized: false,
  reconnectPeriod: 5000,
};

const mqttClient = mqtt.connect(MQTT_BROKER_URL, mqttOptions);

let mqttConnected = false;

mqttClient.on('connect', () => {
  mqttConnected = true;

  mqttClient.subscribe(MQTT_TOPIC, { qos: 0 });

  // Re-publish persisted settings so reconnecting ESP32 syncs immediately
  db.all('SELECT key, value FROM settings', [], (err, rows) => {
    if (err || !rows || rows.length === 0) return;
    const settings = {};
    rows.forEach(r => { settings[r.key] = JSON.parse(r.value); });
    mqttClient.publish(MQTT_COMMANDS_TOPIC, JSON.stringify(settings), { qos: 0, retain: false });
  });
});

mqttClient.on('reconnect', () => {
  mqttConnected = false;
});

mqttClient.on('close', () => {
  mqttConnected = false;
});

mqttClient.on('error', () => {
  mqttConnected = false;
});

mqttClient.on('message', (topic, message) => {
  if (topic !== MQTT_TOPIC) return;

  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch (_) {
    return;
  }

  const { ldr_left, ldr_right, current, power } = payload;
  const timestamp = new Date().toISOString();

  db.run(
    'INSERT INTO solar_data (ldr_left, ldr_right, current, power) VALUES (?, ?, ?, ?)',
    [ldr_left ?? null, ldr_right ?? null, current ?? null, power ?? null]
  );

  io.emit('sensorData', { ldr_left, ldr_right, current, power, timestamp });
});

// ── Socket.IO connection handler ────────────────────────────────────────────
io.on('connection', socket => {
  socket.on('disconnect', () => {});
});

// ── Health endpoint ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', mqttConnected });
});

// ── GET /api/latest ─────────────────────────────────────────────────────────
app.get('/api/latest', (req, res) => {
  db.get(
    'SELECT * FROM solar_data ORDER BY id DESC LIMIT 1',
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(row || {});
    }
  );
});

// ── GET /api/data ───────────────────────────────────────────────────────────
app.get('/api/data', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  db.all(
    'SELECT * FROM solar_data ORDER BY id DESC LIMIT ?',
    [limit],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json({ data: rows });
    }
  );
});

// ── GET /api/stats ──────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  db.get(
    `SELECT
      COUNT(*) AS count,
      AVG(current) AS avg_current,
      MAX(current) AS max_current,
      MIN(current) AS min_current,
      AVG(power) AS avg_power,
      MAX(power) AS max_power
    FROM solar_data`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(row || {});
    }
  );
});

// ── GET /api/settings ───────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  db.all('SELECT key, value FROM settings', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    const settings = {};
    rows.forEach(r => { settings[r.key] = JSON.parse(r.value); });
    res.json(settings);
  });
});

// ── POST /api/settings ──────────────────────────────────────────────────────
app.post('/api/settings', (req, res) => {
  const incoming = req.body;

  // Read existing settings, merge with incoming, then publish complete object
  // Ensures a partial POST never sends an incomplete payload to MQTT/ESP32
  db.all('SELECT key, value FROM settings', [], (err, rows) => {
    const existing = {};
    if (!err && rows) rows.forEach(r => { existing[r.key] = JSON.parse(r.value); });
    const merged = { ...existing, ...incoming };

    // Persist only the incoming keys (upsert each)
    db.serialize(() => {
      Object.entries(incoming).forEach(([key, value]) => {
        db.run(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [key, JSON.stringify(value)]
        );
      });
    });

    // Publish complete merged settings to MQTT (retain: false — no stale replay)
    mqttClient.publish(MQTT_COMMANDS_TOPIC, JSON.stringify(merged), { qos: 0, retain: false });

    // Broadcast to all connected frontend clients
    io.emit('settingsUpdate', merged);

    res.json({ success: true, settings: merged });
  });
});

// ── Start HTTP server ───────────────────────────────────────────────────────
server.listen(PORT, () => {});
