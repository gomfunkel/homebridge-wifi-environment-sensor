# WiFi Environment Sensor

This repository contains all code for my custom made [Apple HomeKit](https://www.apple.com/ios/home/) compatible WiFi environment sensor using a NodeMCU board and the BME280 sensor. It includes the [ESP8266 code](#client), the [Homebridge plugin](#plugin) to allow it to be used in HomeKit and a [webservice](#server) in Node.js used to store and manage sensor data.

A more detailed description of the whole project can be found on my [website](http://daniel.leinich.io/blog/diy-wifi-environment-sensor). The blog post is only available in German right now. If you are not able to read German you might have some luck asking our future AI overlords for a [translation](https://translate.google.com/).

## Client

The client code is merely an .INO file you can load into [Arduino IDE](https://www.arduino.cc/en/main/software) and deploy to your NodeMCU/ESP8266. You will also need the [ESP8266 Arduino core](https://github.com/esp8266/Arduino) to enable ESP8266 support in the Arduino environment. On top of that the code is using the [Adafruit Unified Sensor Driver](https://github.com/adafruit/Adafruit_Sensor) and the [Adafruit BME 280 Library](https://github.com/adafruit/Adafruit_BME280_Library). The blog post mentioned above contains further details on how everything is set up, especially the corresponding hardware, but what the code basically does is:

1. Connect to a given WiFi
2. Get sensor data from the BME280
3. Push the sensor data to a webservice (see [Server](#server))
4. Go to deep sleep for a specified amount of time after which to start from the beginning

There are three configuration parameters. The first two being the `SSID` and `password` for the WiFi to connect to and the last one the URL to the `webservice` (see [Server](#server)) to push sensor data to.

## Server

The server is implemented in [Node.js](https://nodejs.org) and uses a [SQLite](https://www.sqlite.org/) database to store sensor data. In my scenario it is running on a [Raspberry Pi](https://www.raspberrypi.org/) which is also serving my [Homebridge](https://github.com/nfarina/homebridge) installation. The webservice exposes the following endpoints:

`POST /data`

Expects a POST request with Content-Type `application/x-www-form-urlencoded` and temparature (`t`) in degrees, relative humidity (`h`) in percent, air pressure (`p`) in hPa and a unique device id (`id`) in the payload (i.e. `t=21.0&h=42&p=1000&id=12:34:56:78:90:AB`). See the [client](#client) code for details.

`GET /data/latest/{deviceId}`

Gets the latest sensor data for the specified `deviceId` from the database and returns a JSON representation of it. This is primarily called by the [plugin](#plugin). Using the optional GET parameter `callback` a function name to wrap the response payload can be provided, this can for example be used by JSONP requests.

`GET /data/all/{deviceId}`

Gets all sensor data for the specified `deviceId` from the database and returns a JSON representation of it. Using the optional GET parameter `callback` a function name to wrap the response payload can be provided, this can for example be used by JSONP requests.

`GET /devices`

Gets a list of all devices available (having sensor data in the database) and returns a JSON representation of it. Using the optional GET parameter `callback` a function name to wrap the response payload can be provided, this can for example be used by JSONP requests.

`DELETE /data/{deviceId}`

Deletes all stored data for the given `deviceId` from the database.

## Plugin

The code for the [Homebridge](https://github.com/nfarina/homebridge) plugin which exposes the sensor data to HomeKit. It only provides temperature and humidity information for now as air pressure is not yet a characteristic officially supported by HomeKit. When adding an accessory using this plugin to the Homebridge configuration you have the following configuration options:

`accessory`: (Mandatory) Needs to be "WiFiEnvironmentSensor".
`name`: (Mandatory) Whatever name you want the accessory to have.
`endpoint`: (Mandatory) Endpoint for the webservice (see [Server](#server)) to get the sensor data from.
`deviceId`: (Mandatory) The unique device id for the sensor (as given by the [client](#client) code).
`manufacturer`: (Optional) Your name or whatever you want to show up in HomeKit as being the manufacturer of the accessory (Defaults to "Acme Corporation").
`name_temperature`: (Optional) Name for the temperature characteristic (Defaults to "Temperature").
`name_humidity`: (Optional) Name for the humidity characteristic (Defaults to "Humidity").
`name_pressure`: (Optional) Name for the air pressure characteristic (Defaults to "Air Pressure" but is not yet used anyway).

A minimal example configuration would thus look like this:

```
{
  "accessory": "WiFiEnvironmentSensor",
  "name": "WiFi Environment Sensor",
  "endpoint": "http://localhost:3200/data",
  "deviceId": "12:34:56:78:90:AB”
}
```