var sqlite3 = require('sqlite3').verbose(),
    app = require('express')(),
    http = require('http').Server(app),
    bodyParser = require('body-parser');

// The database
var db;

// SQLite table the sensor data is stored in
var tableName = 'sensorData';

// Port the webservice is listening on
var serverPort = 3200;

/**
 * Returns the current timestamp to be used when logging to console.
 */
function getLogTimestamp () {
  return '['+(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''))+'] ';
}

/**
 * Initialize the database and set up the system.
 */
function initDatabase () {

  // Open connection to the database
  db = new sqlite3.Database('data.db', function (error) {

    if (error) {
      console.log(getLogTimestamp()+'ERROR: Unable to open database');
    } else {

      // If the sensor data table does not exist yet, create it
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='"+tableName+"'", [], function (error, data) {

        if (error) {
          console.log(getLogTimestamp()+'ERROR: Error checking for sensor data table');
        } else if (data === undefined) {
          console.log(getLogTimestamp()+'INFO: Table for sensor data does not yet exist. Creating.');
          createTable();
        } else {
          // Perfect! Nothing to do.
        }

      });

    }

  });

}

/**
 * Create the table to store sensor data.
 */
function createTable () {
  db.run("CREATE TABLE "+tableName+" (deviceId TEXT, timestamp INT, temperature REAL, humidity REAL, pressure REAL)");
  console.log(getLogTimestamp()+'INFO: Created table to store sensor data');
}

/**
 * Insert sensor data into the table.
 */
function insertData (deviceId, temperature, humidity, pressure) {

  var timestamp = new Date();
      timestamp = Math.round(timestamp.getTime() / 1000);

  db.run("INSERT INTO "+tableName+" (deviceId, timestamp, temperature, humidity, pressure) VALUES ('"+deviceId+"', '"+timestamp+"', '"+temperature+"', '"+humidity+"', '"+pressure+"')");
  console.log(getLogTimestamp()+'INFO: Inserted sensor data into database')

}

/**
 * Get latest sensor data for a given device from the table.
 */
function getLatestData (deviceId, res) {

  db.get("SELECT * FROM "+tableName+" WHERE deviceId='"+deviceId+"' ORDER BY timestamp DESC LIMIT 1", function (error, row) {

    if (error) {
      console.log(getLogTimestamp()+'ERROR: Unable to get sensor data from database');
      res.status(500).send({});
    } else if (row === undefined) {
      console.log(getLogTimestamp()+'ERROR: Could not find any sensor data for the given device');
      res.status(500).send({});
    } else {
      console.log(getLogTimestamp()+'INFO: Delivering requested sensor data to client');
      res.status(200).send({
        'deviceId': row.deviceid,
        'timestamp': row.timestamp,
        'temperature': row.temperature,
        'humidity': row.humidity,
        'pressure': row.pressure
      });
    }

  });

}

/**
 * Get all sensor data for a given device from the table.
 *
 * @param deviceId        Unique ID of the device to get data for
 * @param [jsonpCallback] Function name for a JSONP callback
 * @param res             Response object for the HTTP request
 */
function getAllData (deviceId, jsonpCallback, res) {

  // If there are only two parameters, assume that there is no JSONP callback
  // and the second one being the response object
  if (res === undefined) {
    res = jsonpCallback;
    jsonpCallback = false;
  }

  db.all("SELECT * FROM "+tableName+" WHERE deviceId='"+deviceId+"' ORDER BY timestamp DESC", function (error, result) {

    if (error) {
      console.log(getLogTimestamp()+'ERROR: Unable to get sensor data from database');
      res.status(500).send({});
    } else if (result === undefined) {
      console.log(getLogTimestamp()+'ERROR: Could not find any sensor data for the given device');
      res.status(500).send({});
    } else {
      console.log(getLogTimestamp()+'INFO: Delivering requested sensor data to client');

      var resultsToDeliver = [];
      for (var i = 0; i < result.length; i++) {
        resultsToDeliver.push({
          'deviceId': result[i].deviceid,
          'timestamp': result[i].timestamp,
          'temperature': result[i].temperature,
          'humidity': result[i].humidity,
          'pressure': result[i].pressure
        });
      }

      if (jsonpCallback) {
        res.status(200).send(jsonpCallback + '(' + JSON.stringify({ 'count': resultsToDeliver.length, 'results': resultsToDeliver }) + ')');
      } else {
        res.status(200).send({ 'count': resultsToDeliver.length, 'results': resultsToDeliver });
      }

    }

  });

}

/**
 * Delete sensor data for a given device from the table.
 */
function deleteData (deviceId, res) {

  db.get("DELETE FROM "+tableName+" WHERE deviceId='"+deviceId+"'", function (error, row) {

    if (error) {
      console.log(getLogTimestamp()+'ERROR: Unable to delete sensor data from database');
      res.sendStatus(500);
    } else {
      console.log(getLogTimestamp()+'INFO: Deleted sensor data for requested device');
      res.sendStatus(200);
    }

  });

}

// Set up express to understand POST params in request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Express route to post sensor data to
app.post('/data', function (req, res) {

  console.log(getLogTimestamp()+'INFO: Received sensor data from device '+req.body.id+' (Temperature: '+req.body.t+' °C, Humidity: '+req.body.h+' %, Pressure '+req.body.p+' hPa)');

  // Insert the received data into the database
  insertData(req.body.id, req.body.t, req.body.h, req.body.p);

  // Always send a 200 response, the NodeMCU is not checking this anyways
  res.sendStatus(200);

});

// Express route to get the latest sensor data for a given device
app.get('/data/latest/:deviceId', function (req, res) {

  console.log(getLogTimestamp()+'INFO: Latest sensor data for device '+req.params.deviceId+' requested');

  // Get data for the given device from the database
  getLatestData(req.params.deviceId, res);

});

// Express route to get all sensor data for a given device
app.get('/data/all/:deviceId', function (req, res) {

  console.log(getLogTimestamp()+'INFO: All sensor data for device '+req.params.deviceId+' requested');

  // Get data for the given device from the database
  if (req.query.callback) {
    getAllData(req.params.deviceId, req.query.callback, res);
  } else {
    getAllData(req.params.deviceId, res);
  }

});

// Express route to delete historic sensor data for a given device
app.delete('/data/:deviceId', function (req, res) {

  console.log(getLogTimestamp()+'INFO: Deletion of data for device '+req.params.deviceId+' requested');

  // Delete data for the given device from the database
  deleteData(req.params.deviceId, res);

});

// Hey, ho, let's go!
http.listen(serverPort, function () {

  // Initialize the database
  console.log(getLogTimestamp()+'INFO: Initializing database');
  initDatabase();

  console.log(getLogTimestamp()+'INFO: Server started and listening on *:'+serverPort);

});