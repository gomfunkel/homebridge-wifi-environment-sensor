/**
 * WiFi Environment Sensor
 */

#include <Wire.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

Adafruit_BME280 bme;

// Connection data to the WiFi
const char* ssid = "SSID";
const char* password = "PASSWORD";

// Webservice endpoint to push new sensor data to
const char* webservice = "http://192.168.0.1:3200/data";

// Time to (deep) sleep between measurements
const int sleepTimeInSeconds = 5 * 60;

// Variables holding (t)emperature, (h)umidity and (p)ressure
float t, h, p;

// Runs once on boot
void setup () {

  // Initialize serial port
  Serial.begin(115200);

  Serial.println("=== WiFi Environment Sensor ===");

  // Initialize wires
  Wire.begin(D3, D4);

  // Connect to WiFi
  Serial.println();
  Serial.print("Connecting to ");
  Serial.print(ssid);
  Serial.print(" .");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println(" done");

  Serial.print("Connected to ");
  Serial.print(ssid);
  Serial.print(" with IP address ");
  Serial.println(WiFi.localIP());
  Serial.print("This device's MAC address is ");
  Serial.println(WiFi.macAddress());

  // Check for BME280 availability
  if (!bme.begin()) {
    Serial.println();
    Serial.println("ERROR: Could not find BME280 sensor, check wiring");
    while (1);
  }

  delay(1000);

  // Get data from the sensor
  t = bme.readTemperature();
  h = bme.readHumidity();
  p = bme.readPressure() / 100.0F;

  Serial.println();
  if (!isnan(t) && !isnan(h) && !isnan(p)) {

    // Print sensor data to the console
    Serial.println("Temperature\tHumidity\t\tPressure");
    Serial.print(t); Serial.print(" *C\t\t");
    Serial.print(h); Serial.print(" %\t\t");
    Serial.print(p); Serial.println(" hPa");

    // Send POST request to sensor data collecting webservice
    HTTPClient http;

    Serial.println();
    Serial.print("Posting sensor data to collecting webservice ...");

    String payload = "t=" + String(t) + "&h=" + String(h) + "&p=" + String(p) + "&id=" + WiFi.macAddress();

    http.begin(webservice);
    http.addHeader("Content-Type", "application/x-www-form-urlencoded");
    int httpCode = http.POST(payload);
    if (httpCode == HTTP_CODE_OK) {
      Serial.println(" done");
    } else {
      Serial.println(" failed");
    }
    http.end();

  } else {
    Serial.println("ERROR: Received no sensor data from BME280");
  }

  // Go to deep sleep
  Serial.println();
  Serial.print("Going to deep sleep for ");
  Serial.print(sleepTimeInSeconds);
  Serial.println(" seconds. Good night!");

  ESP.deepSleep(sleepTimeInSeconds * 1000 * 1000);

}

// Run over and over again
void loop () {
}