'use strict';

var request = require('request'),
    Service,
    Characteristic;

var endpoint = '';

module.exports = (homebridge) => {

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-wifi-environment-sensor', 'WiFiEnvironmentSensor', WiFiEnvironmentSensorPlugin);

};

class WiFiEnvironmentSensorPlugin {

  /**
   * Construct the plugin reading/setting configuration and creating services.
   */
  constructor (log, config) {

    this.log = log;

    this.name = config.name;
    this.endpoint = config.endpoint;
    this.deviceId = config.deviceId;

    this.manufacturer = config.manufacturer || 'Acme Corporation';
    this.model = 'WiFi Environment Sensor';
    this.serialNumber = config.deviceId;

    this.name_temperature = config.name_temperature || 'Temperature';
    this.temperatureService = new Service.TemperatureSensor(this.name_temperature);
    this.temperatureService.getCharacteristic(Characteristic.CurrentTemperature).on('get', this.getCurrentTemperature.bind(this));

    this.name_humidity = config.name_humidity || 'Humidity';
    this.humidityService = new Service.HumiditySensor(this.name_humidity);
    this.humidityService.getCharacteristic(Characteristic.CurrentRelativeHumidity).on('get', this.getCurrentRelativeHumidity.bind(this));

    // Air Pressure is not yet available as an official HomeKit characteristic. Until it is, this stays commented out.
    //this.name_pressure = config.name_pressure || 'Air Pressure';
    //this.pressureService = new Service.AirPressureSensor(this.name_pressure);
    //this.pressureService.getCharacteristic(Characteristic.CurrentAirPressure).on('get', this.getCurrentAirPressure.bind(this));

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber);

  }

  /**
   * Called internally when new sensor data is requested. Gets the latest data
   * from the configured endpoint and returns it to the calling method.
   */
  getSensorData (callback) {

    request({
      uri: this.endpoint + '/latest/' + this.deviceId,
      method: 'GET',
      headers : {
        'User-Agent' : 'homebridge-wifi-environment-sensor-plugin',
      },
    }, function (error, response, body) {

      var sensorData;

      if (error) {
        callback(new Error('Unable to get sensor data from server - '+error), null);
      } else {

        try {
          sensorData = JSON.parse(body);
        } catch (error) {
          callback(new Error('Error parsing response body - '+error), null);
          return;
        }

        callback(null, sensorData);

      }
    });

  }

  /**
   * Returns the latest sensor data for temperature.
   */
  getCurrentTemperature (callback) {

    this.getSensorData(
      (function (that) {
        return function (error, sensorData) {

          if (error) {
            callback(error, null);
          } else {
            console.log('Temperature for '+that.deviceId+' is: '+sensorData.temperature+' °C');
            callback(null, sensorData.temperature);
          }

        };
      })(this)
    );

  }

  /**
   * Returns the latest sensor data for relative humidity.
   */
  getCurrentRelativeHumidity (callback) {

    this.getSensorData(
      (function (that) {
        return function (error, sensorData) {

          if (error) {
            callback(error, null);
          } else {
            console.log('Humidity for '+that.deviceId+' is: '+sensorData.humidity+' %');
            callback(null, sensorData.humidity);
          }

        };
      })(this)
    );

  }

  // Air Pressure is not yet available as an official HomeKit characteristic. Until it is, this stays commented out.
  ///**
  // * Returns the latest sensor data for air pressure.
  // */
  //getCurrentAirPressure (callback) {
  //
  //  this.getSensorData(
  //    (function (that) {
  //      return function (error, sensorData) {
  //
  //        if (error) {
  //          callback(error, null);
  //        } else {
  //          console.log('Pressure for '+that.deviceId+' is: '+sensorData.pressure+' hPa');
  //          callback(null, sensorData.pressure);
  //        }
  //
  //      };
  //    })(this)
  //  );
  //
  //}

  /**
   * Returns available services/characteristics of the accessory.
   */
  getServices () {
    return [this.informationService, this.temperatureService, this.humidityService]
  }

}