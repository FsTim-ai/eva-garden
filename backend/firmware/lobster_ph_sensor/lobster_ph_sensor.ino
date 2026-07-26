#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const char* ssid = "ADVAN MF01-84208D";
const char* password = "1234567890";

// Backend di Railway. Endpoint-nya harus /api/sensors, bukan root "/".
const char* serverName = "https://eva-garden-production.up.railway.app/api/sensors";

// Isi kalau SENSOR_API_KEY di-set di environment variable Railway.
// Kalau belum di-set di backend, biarkan string kosong.
const char* apiKey = "";

// Sketch ini KHUSUS sensor pH tangki lobster — jangan diubah ke system lain,
// karena data fish/hydroponics diisi dari sumber lain.
const char* SYSTEM = "lobster";

LiquidCrystal_I2C lcd(0x27, 16, 2);

// pH SENSOR
#define PH_SENSOR_PIN 34

float calibration_value = 22.84;

unsigned long avgval;
int buffer_arr[10];
int temp;

float ph_act;

// Kirim ke backend tiap 5 menit (dashboard & backend memang didesain untuk
// interval ini), tapi LCD tetap update tiap kali dibaca supaya responsif.
const unsigned long SEND_INTERVAL_MS = 5UL * 60UL * 1000UL; // 5 menit
unsigned long lastSend = 0;

void connectWiFi() {

  Serial.print("Connecting WiFi");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi Connected");
  Serial.print("IP : ");
  Serial.println(WiFi.localIP());

}

float readPH() {

  for (int i = 0; i < 10; i++) {
    buffer_arr[i] = analogRead(PH_SENSOR_PIN);
    delay(30);
  }

  for (int i = 0; i < 9; i++) {
    for (int j = i + 1; j < 10; j++) {

      if (buffer_arr[i] > buffer_arr[j]) {

        temp = buffer_arr[i];
        buffer_arr[i] = buffer_arr[j];
        buffer_arr[j] = temp;

      }

    }
  }

  avgval = 0;

  for (int i = 2; i < 8; i++)
    avgval += buffer_arr[i];

  float volt = (float)avgval * 3.3 / 4095.0 / 6.0;

  float ph = -5.70 * volt + calibration_value;

  return ph;

}

void sendData(float ph) {

  if (WiFi.status() != WL_CONNECTED)
    return;

  HTTPClient http;

  http.begin(serverName);

  http.addHeader("Content-Type", "application/json");
  if (strlen(apiKey) > 0) http.addHeader("x-api-key", apiKey);

  // Format ini yang dibaca backend: system, type, value.
  String json = "{\"system\":\"" + String(SYSTEM) +
                "\",\"type\":\"ph\"" +
                ",\"value\":" + String(ph, 2) + "}";

  int httpResponseCode = http.POST(json);

  Serial.print("HTTP Response : ");
  Serial.println(httpResponseCode);

  if (httpResponseCode > 0) {

    String response = http.getString();

    Serial.println(response);

  }

  http.end();

}

// =======================

void setup() {

  Serial.begin(115200);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  Wire.begin();

  lcd.init();
  lcd.backlight();

  lcd.setCursor(0,0);
  lcd.print("Starting...");
  delay(1500);

  connectWiFi();

  lcd.clear();
  lcd.print("WiFi Connected");
  delay(1500);

}

// =======================

void loop() {

  ph_act = readPH();

  Serial.print("pH : ");
  Serial.println(ph_act);

  lcd.clear();

  lcd.setCursor(0,0);
  lcd.print("pH Lobster");

  lcd.setCursor(0,1);
  lcd.print(ph_act,2);

  // Kirim ke backend cuma tiap 5 menit, bukan tiap loop, biar tidak
  // membanjiri Railway/Firestore dan tidak boros kuota gratis.
  if (millis() - lastSend >= SEND_INTERVAL_MS || lastSend == 0) {
    lastSend = millis();
    sendData(ph_act);
  }

  delay(2000); // LCD tetap update tiap 2 detik untuk feedback lokal

}
