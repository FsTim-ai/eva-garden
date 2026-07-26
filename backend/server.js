import 'dotenv/config';
import { readFileSync } from 'node:fs';
import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const {
  PORT = 3001,
  SYSTEM_ID = 'rooftop-main',
  FIRESTORE_DATABASE_ID = '(default)',
  GOOGLE_APPLICATION_CREDENTIALS = './serviceAccountKey.json',
  FIREBASE_SERVICE_ACCOUNT,
  SENSOR_API_KEY,
} = process.env;

// Hosts like Render/Railway don't let you ship a gitignored file, so the
// service account can be passed as a JSON string in an env var instead.
// Locally, a serviceAccountKey.json file is more convenient.
const serviceAccount = FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(FIREBASE_SERVICE_ACCOUNT)
  : JSON.parse(readFileSync(new URL(GOOGLE_APPLICATION_CREDENTIALS, import.meta.url)));

const firebaseApp = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(firebaseApp, FIRESTORE_DATABASE_ID);

// Only pH and temperature readings are accepted, per the ESP32 sensors in use.
const READING_UNITS = { temperature: '°C', ph: 'pH' };
const VALID_SYSTEMS = ['fish', 'lobster', 'hydroponics'];

const app = express();
app.use(cors());
app.use(express.json());

function requireApiKey(req, res, next) {
  // No key configured yet -> allow through so local setup isn't blocked.
  if (!SENSOR_API_KEY) return next();
  if (req.get('x-api-key') !== SENSOR_API_KEY) {
    return res.status(401).json({ ok: false, error: 'invalid api key' });
  }
  next();
}

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ESP32 posts here roughly every 5 minutes with one reading per request.
app.post('/api/sensors', requireApiKey, async (req, res) => {
  const { system, type, value } = req.body ?? {};

  if (!VALID_SYSTEMS.includes(system)) {
    return res.status(400).json({ ok: false, error: `system must be one of ${VALID_SYSTEMS.join(', ')}` });
  }
  if (!Object.hasOwn(READING_UNITS, type)) {
    return res.status(400).json({ ok: false, error: `type must be one of ${Object.keys(READING_UNITS).join(', ')}` });
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return res.status(400).json({ ok: false, error: 'value must be a finite number' });
  }

  const reading = {
    system,
    type,
    value,
    unit: READING_UNITS[type],
    timestamp: FieldValue.serverTimestamp(),
  };

  const sensorsPath = `systems/${SYSTEM_ID}/sensors`;
  const historyPath = `systems/${SYSTEM_ID}/history`;

  const doc = await db.collection(sensorsPath).add(reading);
  await db.collection(historyPath).add(reading);

  console.log(`[sensor] ${system}/${type} = ${value}${reading.unit}`);
  res.status(201).json({ ok: true, id: doc.id });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: 'internal error' });
});

app.listen(PORT, () => {
  console.log(`Sensor backend listening on http://0.0.0.0:${PORT}`);
});
