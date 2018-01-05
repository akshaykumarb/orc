var VERSION = "0.60";
var VERSION_DESCRIPTION = "External Server";
var HTTP_PORT = 80;
var HTTPS_PORT = 443;
var PING_INTERVAL = 1000 * 15;
var MISSED_PING_LIMIT = 4;
var serverStartDate = Date.now();
var serverStartDateString = formatDateTimeString(serverStartDate);
var fs = require("fs");
var http = require("http");
var https = require("https");
var WebSocketServer = require("ws").Server;
var url = require("url");
var qs = require("querystring");
var express = require("express");
var cors = require("cors");
var eApp;
var IceLister = require("./iceservers.js");
var log4js = require("log4js");
var log4jsConfig = {appenders:{out:{type:"console"}, sigs:{type:"dateFile", filename:"../logs/sigserv.log", pattern:"-MM-dd.log", alwaysIncludePattern:true}}, categories:{"default":{appenders:["out"], level:"info"}, sigs:{appenders:["out", "sigs"], level:"info"}}};
log4js.configure(log4jsConfig);
var logger = log4js.getLogger("sigs");
logger.level = "info";
var wss;
var pingtimerid;
var webappdir = "client";
startIt();
function startIt() {
  var httpServer = http.createServer(function(req, res) {
    res.writeHead(301, {"Location":"https://" + req.headers["host"] + req.url});
    res.end();
  });
  httpServer.listen(HTTP_PORT, null, 10, function() {
    logger.info("\n===============================================" + "\n   SERVER STARTUP  " + serverStartDateString + "\n===============================================");
    logger.info("HTTP server: listening on " + HTTP_PORT);
  });
  var serverConfig = {key:fs.readFileSync("key.pem"), cert:fs.readFileSync("cert.pem"), ca:fs.readFileSync("intcert.pem"), requestCert:true, rejectUnauthorized:false, ciphers:["ECDHE-RSA-AES128-GCM-SHA256", "ECDHE-ECDSA-AES128-GCM-SHA256", "ECDHE-RSA-AES256-GCM-SHA384", "ECDHE-ECDSA-AES256-GCM-SHA384", "DHE-RSA-AES128-GCM-SHA256", "ECDHE-RSA-AES128-SHA256", "DHE-RSA-AES128-SHA256", "ECDHE-RSA-AES256-SHA384", "DHE-RSA-AES256-SHA384", "ECDHE-RSA-AES256-SHA256", "DHE-RSA-AES256-SHA256", "HIGH", "!aNULL", 
  "!eNULL", "!EXPORT", "!DES", "!RC4", "!MD5", "!PSK", "!SRP", "!CAMELLIA"].join(":"), honorCipherOrder:true};
  eApp = express();
  var httpsServer = https.createServer(serverConfig, eApp);
  httpsServer.listen(HTTPS_PORT, null, 10, function() {
    logger.info("HTTPS Server: listening on " + HTTPS_PORT + " (there is HTTP->HTTPS redirect!)");
  });
  wss = new WebSocketServer({server:httpsServer});
  pingtimerid = setInterval(fncWSPinger, PING_INTERVAL);
  process.on("SIGTERM", function() {
    clearInterval(pingtimerid);
    wss.close();
    httpsServer.close();
    httpServer.close(function() {
      process.exit(0);
    });
  });
}
eApp.use(cors());
eApp.get("/iceserviceslist", function(req, res) {
  IceLister.list(req, res);
  return;
});
eApp.get("/roomreport", function(req, res) {
  roomReporterO(req, res);
  return;
});
eApp.get("/roomreportf", function(req, res) {
  Room.flushRoomReportToFile(true);
  res.write("Ok!");
  res.end();
  return;
});
eApp.get("/abc", function(req, res) {
  parseQueryData(req, res);
  return;
});
eApp.get("/help", function(req, res) {
  res.write("Omni2 Node Server Version " + VERSION);
  res.write("  Description = " + VERSION_DESCRIPTION + "\n");
  res.write("******************************************\n");
  res.write("Special Handlers: \n");
  res.write("/r...r..... \tLists participants\n");
  res.write("/r...r.....f \tDump file of above\n");
  res.end();
  return;
});
eApp.use(function(req, res, next) {
  if (req.path.indexOf(".") == -1) {
    req.url += ".html";
  }
  next();
});
eApp.use(express["static"](webappdir));
function parseQueryData(request, response) {
  var queryObject;
  var url_parts;
  if (request.method == "GET") {
    url_parts = url.parse(request.url, true);
    queryObject = url_parts.query;
    response.writeHead(200);
    response.write(JSON.stringify(queryObject));
    response.end();
  } else {
    if (request.method == "POST") {
      var body = "";
      request.on("data", function(data) {
        body += data;
      });
      request.on("end", function() {
        queryObject = qs.parse(body);
        response.writeHead(200);
        response.write(JSON.stringify(queryObject));
        response.end();
      });
    }
  }
}
var RoomNotificationsReceiver = function() {
  this.onPreRoomDeleted = function(rmObj) {
    var evm = JSON.stringify({"senderid":rmObj.owner, "scmdevent":"roomdeleted", "rname":rmObj.name});
    rmObj.sendMessage(evm, rmObj.owner, null);
  };
  this.onPreParticipantRemoved = function(pname, rmObj) {
    if (rmObj.beingDeleted == true) {
      return;
    }
    var evm = JSON.stringify({"senderid":pname, "scmdevent":"left", "rname":rmObj.name});
    rmObj.sendMessage(evm, pname, null);
  };
};
var room_notifications = new RoomNotificationsReceiver;
function fncWSPinger() {
  var ra = Room.getRoomObjectsArray();
  for (var i = 0; i < ra.length; i++) {
    var rmObj = ra[i];
    rmObj.pingAll();
  }
}
wss.broadcast = function(data) {
  for (var i in this.clients) {
    this.clients[i].send(data, broadcast_errhandler);
  }
  function broadcast_errhandler(err) {
    if (err != undefined) {
      logger.error("broadcast send() ERROR:" + err);
    }
  }
};
wss.on("connection", function(ws, req) {
  var connected = {"server":"connected"};
  ws.send(JSON.stringify(connected));
  logger.trace("WS Connection made, sending : " + JSON.stringify(connected));
  ws.upgradeReq = req;
  logger.info("WSConnection with " + req.url + " from " + ws._socket.remoteAddress);
  if (req.url == "/roommanager1") {
    ws.appname = "roommanager1";
    wsshandleurl_roommanager1(ws);
    return;
  } else {
    if (req.url == "/oncierge1") {
      ws.appname = "oncierge1";
      wsshandleurl_roommanager1(ws);
      return;
    } else {
      logger.error("WS Connection UNKNOWN Application");
      var con = {server:"noconnection", reason:"noapp"};
      ws.send(JSON.stringify(con));
      ws.close();
    }
  }
});
function oncierge_limit(rname) {
  if (rname.indexOf("oncierge") != 0) {
    return false;
  }
  var num = parseInt(rname.substring(8));
  if (num != NaN) {
    if (num <= 0) {
      return false;
    }
    if (num > 20) {
      return false;
    }
    return true;
  }
  return false;
}
function wsshandleurl_roommanager1(ws) {
  ws.on("pong", function() {
    ws.missedPings = 0;
  });
  ws.on("message", function(message) {
    var data, reply;
    if (message.indexOf("*ImAlive!") == 0) {
      ws.missedPings = 0;
      return;
    }
    try {
      data = JSON.parse(message);
    } catch (e) {
      logger.error("Connection: Invalid JSON");
      data = null;
      return;
    }
    if (data.scmd == "create") {
      logger.info("RQST:CREATEROOM %s by %s", data.rname, data.senderid);
      if (!data.senderid || data.senderid == "" || !data.rname || data.rname == "") {
        logger.warn("  SenderID is NULL");
        reply = {"scmd":"create", "success":false, "reason":"no login name"};
        ws.send(JSON.stringify(reply));
        return;
      }
      if (!data.rname || data.rname == "") {
        data.rname = data.senderid;
      }
      if (ws.appname == "oncierge1" && oncierge_limit(data.rname) == false) {
        reply = {"scmd":"create", "success":false, "reason":"disallowed"};
        ws.send(JSON.stringify(reply));
        setTimeout(function() {
          ws.close();
        }, 1000);
        return;
      }
      var rm = Room.getRoomObject(data.rname);
      if (rm != null) {
        logger.warn("  Room " + data.rname + " already exists");
        reply = {"scmd":"create", "success":false, "reason":"room already exists"};
        ws.send(JSON.stringify(reply));
        return;
        logger.trace("  Room exists with owner:" + rm.getOwner());
        if (rm.getOwner() == data.senderid) {
          logger.trace("  Same owner made same room request - delete & create", data.senderid);
          rm["delete"]();
        } else {
          logger.warn("  Room name owned by someone else");
          reply = {"scmd":"create", "success":false, "reason":"room already exists"};
          ws.send(JSON.stringify(reply));
          return;
        }
      }
      var newRoom = new Room(data.rname, data.senderid, ws, room_notifications);
      if (newRoom == null) {
        logger.warn("  Could not create room");
        reply = {"scmd":"create", "success":false, "reason":"could not make room"};
        ws.send(JSON.stringify(reply));
        return;
      }
      ws.send(JSON.stringify({"scmd":"create", "success":true, "roomname":data.rname}));
      logger.trace("  Created room " + data.rname + " owner: " + newRoom.getOwner());
      return;
    }
    if (data.scmd == "delete") {
      logger.info("RQST:DELETEROOM user/rname= " + data.senderid + "/" + data.rname);
      if (data.rname == "null") {
        data.rname = null;
      }
      var rm = Room.getRoomObject(data.rname);
      if (rm == null) {
        logger.trace("Delete room request was NULL room");
        return;
      }
      if (rm.getOwner() != data.senderid) {
        logger.warn("Delete room request from wrong owner - not deleted");
        return;
      }
      rm["delete"]();
      return;
    }
    if (data.scmd == "join") {
      logger.info("RQST:JOINROOM userid/room/prio/xdata " + data.senderid + "/" + data.rname + "/" + data.priority + "/" + data.xdata);
      var rm = Room.getRoomObject(data.rname);
      if (rm == null) {
        reply = {"scmd":"join", "success":false, "reason":"unknown room"};
        ws.send(JSON.stringify(reply));
        return;
      }
      if (rm.addParticipant(data.senderid, ws, data.priority) == false) {
        reply = {"scmd":"join", "success":false, "reason":"name taken"};
        ws.send(JSON.stringify(reply));
        return;
      }
      ws.send(JSON.stringify({"scmd":"join", "success":true}));
      var evm = JSON.stringify({"senderid":data.senderid, "scmdevent":"joined", "rname":data.rname, "xdata":data.xdata});
      rm.sendMessage(evm, data.senderid, null);
      return;
    }
    if (data.scmd == "leave") {
      logger.info("RQST:LEAVEROOM room name " + data.senderid + "/" + data.rname);
      var rm = Room.getRoomObject(data.rname);
      if (rm == null) {
        return;
      }
      var evm = JSON.stringify({"senderid":data.senderid, "scmdevent":"left", "rname":data.rname});
      rm.sendMessage(evm, data.senderid, null);
      rm.removeParticipant(data.senderid);
      return;
    }
    if (data.scmd == "getroominfo") {
      logger.info("RQST:getroominfo from/room " + data.senderid + "/" + data.rname);
      var rm = Room.getRoomObject(data.rname);
      if (rm == null) {
        reply = {"scmd":"getroominfo", "success":false, "reason":"unknown room"};
        ws.send(JSON.stringify(reply));
        return;
      }
      var rmi = rm.getInfoObject();
      ws.send(JSON.stringify({"scmd":"getroominfo", "success":true, "reason":rmi}));
      return;
    }
    var rm = Room.getRoomObject(data.rname);
    if (rm == null) {
      logger.warn("Send Message area... ROOM NOT FOUND");
      return;
    }
    logger.debug("RQST:SENDMESSAGE from/to: %s/%s\n\n", data.senderid, data.targetid);
    rm.sendMessage(message, data.senderid, data.targetid);
    return;
  });
}
function roomReporterO(rq, rs) {
  var rooms = Room.getRoomObjectsArray();
  var keys = Room.getRoomObjectsKeys();
  rs.write("SYSTEM ROOMS (recent first)-------------------------------------------\n");
  rs.write("#    Room      Owner    timeCr      #parts   Part names\n");
  rs.write("----------------------------------------------------------------------\n");
  for (var i = rooms.length - 1; i >= 0; i--) {
    var rm = rooms[i];
    var ra = rm.getInfoObject();
    if (ra.name.indexOf("-*") != 0) {
      continue;
    }
    rs.write(i + 1 + "    " + ra.name + "      " + ra.owner + "    " + ra.startTime + "    " + ra.activeParticipantObjectsArray.length + "   ");
    for (var j = 0; j < ra.activeParticipantObjectsArray.length; j++) {
      rs.write(ra.activeParticipantObjectsArray[j].name + ", ");
    }
    rs.write("\n");
  }
  rs.write("\n\n");
  rs.write("CURRENT ROOMS (recent first)------------------------------------------\n");
  rs.write("#    Room      Owner      timeCr      #parts      Part names\n");
  rs.write("----------------------------------------------------------------------\n");
  for (var i = rooms.length - 1; i >= 0; i--) {
    var rm = rooms[i];
    var ra = rm.getInfoObject();
    if (ra.name.indexOf("-*") == 0) {
      continue;
    }
    rs.write(i + 1 + "  " + ra.name + "    " + ra.owner + "    " + ra.startTime + "    " + ra.activeParticipantObjectsArray.length + "    ");
    for (j = 0; j < ra.activeParticipantObjectsArray.length; j++) {
      rs.write(ra.activeParticipantObjectsArray[j].name + ", ");
    }
    rs.write("\n");
  }
  rs.write("\n\n");
  rooms = Room.getRoomDeletedObjectsArray();
  keys = Room.getRoomDeletedObjectsKeys();
  rs.write("DELETED ROOMS (recent first)------------------------------------------------------\n");
  rs.write("#    Room      Owner      timeCr      timeDel      #parts      Part names\n");
  rs.write("----------------------------------------------------------------------------------\n");
  for (var i = rooms.length - 1; i >= 0; i--) {
    var rm = rooms[i];
    var ra = rm.getInfoObject();
    rs.write(keys[i] + "  " + ra.name + "    " + ra.owner + "    " + ra.startTime + "    " + ra.endTime + "    " + ra.pastParticipantObjectsArray.length + "    ");
    for (var j = 0; j < ra.pastParticipantObjectsArray.length; j++) {
      rs.write(ra.pastParticipantObjectsArray[j].name + ", ");
    }
    rs.write("\n");
  }
  rs.end();
}
function formatDateTimeString(datetime) {
  var dt = new Date(datetime);
  var rs = dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate() + "::" + dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
  return rs;
}
var SimpleMapFactory = require("./SimpleMap.js");
var roomsmap = SimpleMapFactory.newMap();
var roomsmap_R = SimpleMapFactory.newMap();
var roomsmap_R_currentKey = 1;
var roomsmap_R_lastFlushedKey = 0;
var Participant = function() {
  this.name;
  this.ws;
  this.time_joined;
  this.time_left;
};
var Room = function(rname, owner, wsOwner, room_notificant) {
  if (rname == null || owner == null || wsOwner == null) {
    logger.error("Room Creation Parameters Error");
    return null;
  }
  this.name = rname;
  this.owner = owner;
  this.ownerWsConn = wsOwner;
  this.ownerWsConn.missedPings = 0;
  this.ownerWsConn.participantName = owner;
  this.rnr = room_notificant;
  this.startTime = Date.now();
  this.endTime = null;
  logger.info("Room " + rname + " created on " + formatDateTimeString(this.startTime));
  this.participants0 = SimpleMapFactory.newMap();
  this.participants0_R = SimpleMapFactory.newMap();
  roomsmap.add(rname, this);
  logger.debug("New ROOM:" + this.name + " added, Number of Rooms now = " + roomsmap.length());
};
Room.getRoomObject = function(name) {
  return roomsmap.get(name);
};
Room.deleteRoomObject = function(name) {
  Room.getRoomObject(name)["delete"]();
};
Room.getRoomObjectsArray = function() {
  return roomsmap.getValues();
};
Room.getRoomObjectsKeys = function() {
  return roomsmap.getKeys();
};
Room.getRoomDeletedObjectsArray = function() {
  return roomsmap_R.getValues();
};
Room.getRoomDeletedObjectsKeys = function() {
  return roomsmap_R.getKeys();
};
Room.prototype.pingAll = function() {
  var nm;
  this.ownerWsConn.missedPings += 1;
  try {
    this.ownerWsConn.ping();
  } catch (e) {
    if (e == "not opened") {
      logger.info("PINGER:ROOM OWNER not pingable - deleting: " + this.name);
      this["delete"]();
      return;
    }
  }
  if (this.ownerWsConn.missedPings > MISSED_PING_LIMIT) {
    logger.info("PINGER:ROOM/OWNER has vanished: " + this.name + "/" + this.owner);
    this["delete"]();
    return;
  }
  pingHelper(this, this.participants0);
  return;
  function pingHelper(rmo, partlist) {
    var wsa;
    wsa = partlist.getValues();
    var ii;
    for (ii = 0; ii < wsa.length; ii++) {
      var pws = wsa[ii].ws;
      pws.missedPings += 1;
      try {
        pws.ping();
      } catch (e$0) {
        if (e$0 == "not opened") {
          logger.info("PINGER:ROOM/PARTICIPANT not pingable - deleting: " + rmo.name + "/" + pws.participantName);
          rmo.removeParticipant(pws.participantName);
          return;
        }
      }
      if (pws.missedPings > MISSED_PING_LIMIT) {
        logger.info("PINGER:ROOM/PARTICIPANT has vanished: " + rmo.name + "/" + pws.participantName);
        rmo.removeParticipant(pws.participantName);
        return;
      }
    }
  }
};
Room.flushRoomReportToFile = function(doCurrent) {
  var fn = "../logs/" + "RF-" + serverStartDateString;
  var dbuf = "";
  var o = null;
  var i;
  if (doCurrent) {
    fn = "../logs/" + "RC-" + serverStartDateString;
    dbuf = "***** CURRENTS *****\n";
    var rooms = Room.getRoomObjectsArray();
    var keys = Room.getRoomObjectsKeys();
    for (i = 0; i < rooms.length; i++) {
      o = rooms[i].getInfoObject();
      dbuf = dbuf + (keys[i] + " ::: " + JSON.stringify(o) + "\r\n");
    }
    dbuf = dbuf + "\n\n***** DELETED *****\n";
    rooms = Room.getRoomDeletedObjectsArray();
    keys = Room.getRoomDeletedObjectsKeys();
    for (i = 0; i < rooms.length; i++) {
      o = rooms[i].getInfoObject();
      dbuf = dbuf + (keys[i] + " ::: " + JSON.stringify(o) + "\r\n");
    }
    fs.appendFileSync(fn, dbuf);
    return;
  }
  for (i = 0; i < 49; i++) {
    roomsmap_R_lastFlushedKey += 1;
    o = roomsmap_R.get(roomsmap_R_lastFlushedKey);
    o = o.getInfoObject();
    roomsmap_R.remove(roomsmap_R_lastFlushedKey);
    dbuf = dbuf + (roomsmap_R_lastFlushedKey + " ::: " + JSON.stringify(o) + "\r\n");
  }
  fs.appendFileSync(fn, dbuf);
  return;
};
Room.prototype["delete"] = function() {
  var nm = this.name;
  this.beingDeleted = true;
  if (this.rnr) {
    this.rnr.onPreRoomDeleted(this);
  }
  this.endTime = Date.now();
  removeEachParticipant(this, this.participants0);
  try {
    this.ownerWsConn.close();
  } catch (e) {
    logger.error("close() error: " + e);
  }
  delete this.participants0;
  delete this.ownerWsConn;
  delete this.rnr;
  delete this.beingDeleted;
  roomsmap.remove(nm);
  roomsmap_R.add(roomsmap_R_currentKey, this);
  roomsmap_R_currentKey += 1;
  logger.debug("ROOM:" + nm + " removed, Number of rooms now = " + roomsmap.length());
  if (roomsmap_R_currentKey - roomsmap_R_lastFlushedKey > 100) {
    Room.flushRoomReportToFile();
  }
  function removeEachParticipant(rmo, partlist) {
    var keys;
    keys = partlist.getKeys();
    var ii;
    for (ii = 0; ii < keys.length; ii++) {
      rmo.removeParticipant(keys[ii]);
    }
  }
};
Room.prototype.getInfoArray = function() {
  var ra = [];
  ra.push(this.name);
  ra.push(this.owner);
  ra.push(this.startTime);
  ra.push(this.endTime);
  var pl = this.participants0;
  if (pl) {
    var keys = pl.getKeys();
    ra.push(keys.length);
    var i;
    for (i = 0; i < keys.length; i++) {
      ra.push(keys[i]);
    }
  } else {
    ra.push(0);
  }
  pl = this.participants0_R;
  if (pl) {
    keys = pl.getKeys();
    ra.push(keys.length);
    for (i = 0; i < keys.length; i++) {
      ra.push(keys[i]);
    }
  } else {
    ra.push(0);
  }
  return ra;
};
Room.prototype.getInfoObject = function() {
  var ra = {};
  ra.name = this.name;
  ra.owner = this.owner;
  ra.startTime = formatDateTimeString(this.startTime);
  if (this.endTime) {
    ra.endTime = formatDateTimeString(this.endTime);
  } else {
    ra.endTime = "";
  }
  var keys, values;
  var poa = [];
  var pl = this.participants0;
  if (pl) {
    values = pl.getValues(true);
    var i;
    for (i = 0; i < values.length; i++) {
      var po = {};
      po.name = values[i].name;
      po.time_joined = formatDateTimeString(values[i].time_joined);
      po.time_left = "";
      poa.push(po);
    }
  }
  ra.activeParticipantObjectsArray = poa;
  poa = [];
  pl = this.participants0_R;
  if (pl) {
    values = pl.getValues();
    for (i = 0; i < values.length; i++) {
      var po$1 = {};
      po$1.name = values[i].name;
      po$1.time_joined = formatDateTimeString(values[i].time_joined);
      po$1.time_left = formatDateTimeString(values[i].time_left);
      poa.push(po$1);
    }
  }
  ra.pastParticipantObjectsArray = poa;
  return ra;
};
Room.prototype.getOwner = function() {
  return this.owner;
};
Room.prototype.addParticipant = function(name, ws, priority) {
  if (priority == null) {
    priority = 0;
  }
  if (this.participants0.get(name) != undefined) {
    return false;
  }
  var p = new Participant;
  p.name = name;
  p.ws = ws;
  p.time_joined = Date.now();
  p.time_left = 0;
  this.participants0.add(name, p);
  ws.missedPings = 0;
  ws.participantName = name;
  logger.debug("Participant added of name %s to room %s", name, this.name);
  return true;
};
Room.prototype.removeParticipant = function(name) {
  var vp = this.participants0.get(name);
  if (vp == undefined) {
    return;
  }
  logger.debug("Participant %s removed from room %s", name, this.name);
  if (this.rnr) {
    this.rnr.onPreParticipantRemoved(name, this);
  }
  vp.time_left = Date.now();
  if (vp.ws) {
    try {
      vp.ws.close();
    } catch (e) {
      logger.error("close() error " + e);
    }
    delete vp.ws;
  }
  this.participants0.remove(name);
  this.participants0_R.add(name, vp, true);
  return;
};
Room.prototype.sendMessage = function(data, from, to) {
  if (from == "--owner") {
    from = this.owner;
  }
  if (to == null || to == undefined) {
    to = "--all";
  } else {
    if (to == "--owner") {
      to = this.owner;
    } else {
      if (to == "--none") {
        logger.trace(data);
        return;
      }
    }
  }
  try {
    if (to == "--all" || to == this.owner) {
      if (from != this.owner) {
        this.ownerWsConn.send(data);
      }
    }
    if (to == this.owner) {
      return;
    }
    senderHelper(data, from, to, this.participants0);
    return;
  } catch (e) {
  }
  function senderHelper(data, from, to, partlist) {
    var wsa, keys;
    wsa = partlist.getValues();
    keys = partlist.getKeys();
    var ii;
    for (ii = 0; ii < keys.length; ii++) {
      var ws = wsa[ii].ws;
      if (keys[ii] == from) {
        continue;
      } else {
        if (keys[ii] == to) {
          ws.send(data, sendcallback);
          break;
        } else {
          if (to == "--all") {
            ws.send(data, sendcallback);
          }
        }
      }
    }
    function sendcallback(err) {
      if (err != undefined) {
        logger.error("send() ERROR:" + err);
      }
    }
  }
};