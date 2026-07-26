# Sensor Backend

Small HTTP server that receives pH and temperature readings from an ESP32 and writes
them to the same Firestore database the dashboard reads from
(`systems/{SYSTEM_ID}/sensors` and `systems/{SYSTEM_ID}/history`).

The ESP32 talks plain JSON over HTTP to this server instead of dealing with
Firestore's own REST format directly.

## Setup

1. Install dependencies:
   ```
   cd backend
   npm install
   ```
2. Get a service account key: Firebase console -> Project Settings -> Service
   accounts -> Generate new private key. Save it as `backend/serviceAccountKey.json`
   (already gitignored — never commit this file).
3. Copy `.env.example` to `.env` and adjust if needed:
   ```
   cp .env.example .env
   ```
4. Run it:
   ```
   npm start
   ```
   You should see `Sensor backend listening on http://0.0.0.0:3001`.

Test it without any hardware:
```
curl -X POST http://localhost:3001/api/sensors \
  -H "Content-Type: application/json" \
  -d '{"system":"fish","type":"ph","value":7.2}'
```

## API

### `POST /api/sensors`

```json
{ "system": "fish", "type": "ph", "value": 7.2 }
```

- `system` — one of `fish`, `lobster`, `hydroponics`
- `type` — one of `temperature`, `ph`
- `value` — number

If `SENSOR_API_KEY` is set in `.env`, requests must include header `x-api-key: <that value>`.

### `GET /health`

Returns `{ "ok": true }` — useful for checking the ESP32 can actually reach the server
before debugging Firestore.

### `GET /api/export`

Downloads an Excel workbook (`sensor-log.xlsx`) with one sheet per system
(Fish Tank / Lobster Farm / Hydroponics). Every hour, on the hour, the server
takes the latest known reading of each type for each system and appends one
row with the date and time. A system with no sensor reporting a given type
yet just gets a blank cell for it — readings arrive independently per
system/type, so most rows won't be fully filled in.

The workbook file lives at `EXCEL_LOG_PATH` (defaults to `backend/data/sensor-log.xlsx`,
gitignored). It's written to local disk, so on hosts with an ephemeral
filesystem (Render/Railway free tiers) the log resets on every redeploy —
fine for this project's scale, but worth knowing. A snapshot is also taken
once immediately at startup so the file is downloadable right away instead
of waiting up to an hour.

## ESP32 firmware (Arduino), sending every 5 minutes

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* backendUrl = "http://192.168.1.50:3001/api/sensors"; // this server's LAN IP
const char* apiKey = "";              // match SENSOR_API_KEY if you set one
const char* system_ = "fish";         // fish | lobster | hydroponics

const unsigned long INTERVAL_MS = 5UL * 60UL * 1000UL; // 5 minutes
unsigned long lastSend = 0;

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void sendReading(const char* type, float value) {
  HTTPClient http;
  http.begin(backendUrl);
  http.addHeader("Content-Type", "application/json");
  if (strlen(apiKey) > 0) http.addHeader("x-api-key", apiKey);

  String body = String("{\"system\":\"") + system_ +
                "\",\"type\":\"" + type +
                "\",\"value\":" + String(value, 2) + "}";

  int status = http.POST(body);
  Serial.printf("POST %s -> %d\n", type, status);
  http.end();
}

void loop() {
  if (millis() - lastSend >= INTERVAL_MS || lastSend == 0) {
    lastSend = millis();

    float temperatureC = readTemperatureSensor(); // your sensor read here
    float ph = readPhSensor();                     // your sensor read here

    sendReading("temperature", temperatureC);
    sendReading("ph", ph);
  }
}
```

Replace `readTemperatureSensor()` / `readPhSensor()` with your actual sensor
reads (e.g. a DS18B20 for temperature, an analog pH probe read via `analogRead`
and converted with your probe's calibration curve).

The actual sketch running on the lobster tank's ESP32 (pH probe + I2C LCD) is
in [firmware/lobster_ph_sensor/lobster_ph_sensor.ino](firmware/lobster_ph_sensor/lobster_ph_sensor.ino) —
it only ever sends `{"system":"lobster","type":"ph",...}`, so it can't affect
fish or hydroponics data.

## Notes

- This server uses `firebase-admin`, so it writes to Firestore with elevated
  privileges regardless of `firestore.rules`. Keep `serviceAccountKey.json` and
  `SENSOR_API_KEY` private.
- `SYSTEM_ID` here is the root system document (defaults to `rooftop-main`, same
  as the frontend in `frontend/src/components/Dashboard.tsx`) — not to be confused with
  `system` in the request body, which is the specific tank/bed (`fish` /
  `lobster` / `hydroponics`).

## Deploying (separately from the frontend)

This folder is a self-contained Node app with its own `package.json` — the
repo root (frontend) and `backend/` deploy as two independent services from
the same GitHub repo. Point the host's **root directory** setting at `backend`
and it won't touch the frontend at all.

### Render

1. [render.com](https://render.com) -> New -> Web Service -> connect the
   `eva-garden` GitHub repo.
2. **Root Directory**: `backend`
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. Add environment variables (Render's dashboard, not `.env` — that file
   never leaves your machine):
   - `SYSTEM_ID` = `rooftop-main`
   - `FIRESTORE_DATABASE_ID` = `ai-studio-06ed7652-dbf2-432b-8ba8-36890d139c87`
   - `FIREBASE_SERVICE_ACCOUNT` = the entire contents of your
     `serviceAccountKey.json`, pasted as one value
   - `SENSOR_API_KEY` = a secret string of your choice (recommended once the
     server has a public URL — anyone who finds it could otherwise post fake
     readings)
   - Leave `PORT` unset — Render injects it and `server.js` already reads
     `process.env.PORT`.
6. Deploy. Point the ESP32's `backendUrl` (in the Arduino sketch above) at
   the resulting `https://<your-service>.onrender.com/api/sensors` instead of
   a LAN IP.

Free-tier Render web services spin down after 15 minutes idle and take a few
seconds to wake on the next request — fine for a 5-minute reporting interval,
just don't expect an instant response on the first POST after a gap.

### Railway

Same idea: New Project -> Deploy from GitHub repo -> set **Root Directory**
to `backend` in the service settings -> add the same environment variables
listed above. Railway detects the `npm start` script automatically.
