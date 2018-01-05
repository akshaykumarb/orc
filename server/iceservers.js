var https = require("https");
var LANONLY = false;
var xprmO = {};
var bodyString = JSON.stringify(xprmO);
var callop = {};
var localstun = [];
var freestunservers = [];
var viageniestun = [{}];
var viagenieturn = [{}];
var extservers = null;
var parentReq, parentRes;
module.exports = {list:function(request, response) {
  parentReq = request;
  parentRes = response;
  if (LANONLY == true) {
    writeoutNC();
    return;
  }
  var req = https.request(callop, callback);
  req.on("error", function(e) {
    console.log("HTTPS request error: " + e);
    extservers = null;
    writeoutNC();
    return;
  });
  req.write(bodyString);
  req.end();
}};
function callback(response) {
  console.log("STATUS: " + response.statusCode);
  if (response.statusCode != 200) {
  }
  var str = "";
  response.on("data", function(chunk) {
    str += chunk;
  });
  response.on("end", function() {
    try {
      var data = JSON.parse(str);
      if (data != undefined) {
        extservers = data.d.iceServers;
      }
    } catch (e) {
    }
    writeout();
  });
  response.on("error", function(e) {
    logger.error("ICE Servers retrieval ERROR ", e);
    writeoutNC();
    return;
  });
}
function writeoutNC() {
  var lr = localstun;
  var s2 = JSON.stringify(lr);
  parentRes.end(s2);
}
function writeout() {
  var lr = [];
  if (extservers != null) {
    lr = lr.concat(extservers);
  }
  lr = lr.concat(viageniestun);
  lr = lr.concat(viagenieturn);
  var s2 = JSON.stringify(lr);
  parentRes.end(s2);
}
;