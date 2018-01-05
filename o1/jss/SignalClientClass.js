var SignalClientClass = function(application, identity, authentication, host, port, callbackIF) {
  this.wsURL1 = "wss://";
  this.wsHostname = location.hostname;
  this.wsPort = location.port;
  this.wsURL;
  this.wsSignalConnection;
  this.wsMyId;
  this.wsMyAuth;
  this.wsMyRoomname;
  this.wsMyApplicationNameOnServer = application;
  this.amRoomCreator = false;
  this.wsCallbackIF = callbackIF;
  this.pcMap = {};
  this.pcMapIA = {};
  this.bMPCbusy = false;
  this.makeConnection(application, identity, authentication, host, port);
};
SignalClientClass.prototype.makeConnection = function(application, identity, authentication, host, port) {
  this.wsMyApplicationNameOnServer = application;
  this.wsMyId = identity;
  if (this.wsMyId == null || this.wsMyId == undefined) {
    this.wsMyId = generateId2();
  }
  if (port != null && port != undefined) {
    this.wsPort = port;
  }
  if (host != null && host != undefined) {
    this.wsHostname = host;
  }
  this.wsMyAuth = authentication;
  this.wsURL = this.wsURL1 + this.wsHostname;
  if (this.wsPort) {
    this.wsURL += ":" + this.wsPort;
  }
  this.wsURL += "/" + this.wsMyApplicationNameOnServer;
  console.log("Making WSConnection to " + this.wsURL + " with id " + this.wsMyId);
  try {
    this.wsSignalConnection = new WebSocket(this.wsURL);
  } catch (err) {
    this.wsCallbackIF.onNoConnection(err);
    return;
  }
  this.wsSignalConnection.SCCObject = this;
  this.wsSignalConnection.onmessage = SCCHelper_processWsMessage;
  this.wsSignalConnection.onping = SCCHelper_processWsPing;
  console.log("  WSConnection state is " + this.wsSignalConnection.readyState);
};
SignalClientClass.prototype.closeConnection = function() {
  this.wsSignalConnection.close();
  this.wsSignalConnection = null;
  this.wsMyId = null;
  this.wsMyAuth = null;
  this.wsURL = null;
};
SignalClientClass.prototype.amIRoomCreator = function() {
  return this.amRoomCreator;
};
SignalClientClass.prototype.wsSend = function(data) {
};
SignalClientClass.prototype.createRoom = function(roomname) {
  if (roomname == null) {
    return;
  }
  this.wsSignalConnection.send(JSON.stringify({"senderid":this.wsMyId, "scmd":"create", "auth":this.wsMyAuth, "rname":roomname}));
  this.wsMyRoomname = roomname;
};
SignalClientClass.prototype.deleteRoom = function() {
  this.deleteORleaveRoom();
};
SignalClientClass.prototype.leaveRoom = function() {
  this.deleteORleaveRoom();
};
SignalClientClass.prototype.deleteORleaveRoom = function() {
  var scmdstring = "leave";
  console.log("deleteORleaveRoom() for room= " + this.wsMyRoomname);
  if (this.amRoomCreator == true) {
    console.log("   deleteORleaveRoom() setting delete");
    scmdstring = "delete";
  }
  this.wsSignalConnection.send(JSON.stringify({"senderid":this.wsMyId, "scmd":scmdstring, "rname":this.wsMyRoomname}));
  this.wsMyRoomname = null;
  this.unmakePeerConnection(null);
};
SignalClientClass.prototype.joinRoom = function(roomname, priority, xdata) {
  if (!roomname) {
    return;
  }
  if (!xdata) {
    xdata = null;
  }
  this.wsSignalConnection.send(JSON.stringify({"senderid":this.wsMyId, "scmd":"join", "auth":this.wsMyAuth, "rname":roomname, "priority":priority, "xdata":xdata}));
  this.wsMyRoomname = roomname;
};
SignalClientClass.prototype.sendString = function(str, description, to) {
  if (!description) {
    description = "";
  }
  if (!to) {
    to = "--all";
  }
  this.wsSignalConnection.send(JSON.stringify({"senderid":this.wsMyId, "type":"string", "description":description, "string":str, "rname":this.wsMyRoomname, "targetid":to}));
};
SignalClientClass.prototype.sendObject = function(obj, description, to) {
  if (!to) {
    to = "--all";
  }
  this.wsSignalConnection.send(JSON.stringify({"senderid":this.wsMyId, "type":"object", "description":description, "object":obj, "rname":this.wsMyRoomname, "targetid":to}));
};
function SCCHelper_processWsPing() {
  this.pong();
}
function SCCHelper_processWsMessage(message) {
  var scco = this.SCCObject;
  if (message.data.indexOf("*AreYouAlive?") == 0) {
    var answer = "*ImAlive!" + this.wsMyId;
    this.send(answer);
    return;
  }
  var signal;
  try {
    signal = JSON.parse(message.data);
  } catch (e) {
    console.log("PARSE Exception");
    return;
  }
  if (signal.server == "connected") {
    console.log("  WSConnection state is " + this.readyState);
    scco.wsCallbackIF.onConnected();
  }
  if (signal.server == "noconnection") {
    console.log("  WSConnection state is " + this.readyState);
    scco.wsCallbackIF.onNoConnection(signal.reason);
  }
  if (signal.senderid == scco.wsMyId) {
    return;
  }
  if (signal.sdp) {
    if (signal.sdp.type == "offer") {
      var h = false;
      h = scco.wsCallbackIF.onOffer(signal.senderid, signal.sdp);
      if (!h) {
        scco.localhandler_Offer(signal.senderid, signal.sdp);
      }
    } else {
      var h = false;
      h = scco.wsCallbackIF.onAnswer(signal.senderid, signal.sdp);
      if (!h) {
        scco.localhandler_Answer(signal.senderid, signal.sdp);
      }
    }
  } else {
    if (signal.ice) {
      var h = false;
      scco.wsCallbackIF.onICE(signal.senderid, signal.ice);
      if (!h) {
        scco.localhandler_Ice(signal.senderid, signal.ice);
      }
    } else {
      if (signal.type == "string") {
        scco.wsCallbackIF.onGotString(signal.senderid, signal.string, signal.description);
      } else {
        if (signal.type == "object") {
          scco.wsCallbackIF.onGotObject(signal.senderid, signal.object, signal.description);
        } else {
          if (signal.scmd) {
            if (signal.scmd == "create") {
              if (signal.success == true) {
                console.log("Setting amCreator flag");
                scco.amRoomCreator = true;
              }
            } else {
              if (signal.scmd == "delete") {
                scco.unmakePeerConnection(null);
                scco.amRoomCreator = false;
              }
            }
            scco.wsCallbackIF.onGotSCMDResponse(signal.scmd, signal.success, signal.reason);
          } else {
            if (signal.scmdevent) {
              scco.unmakePeerConnection(signal.senderid);
              scco.wsCallbackIF.onGotSCMDEvent(signal.senderid, signal.scmdevent, signal.rname, signal.xdata);
            }
          }
        }
      }
    }
  }
}
SignalClientClass.prototype.localhandler_Answer = function(sender, sdp) {
  console.log("GOT answer from " + sender);
  var peerConnection = this.pcMap[sender];
  if (peerConnection) {
    var rDesc = new RTCSessionDescription(sdp);
    peerConnection.setRemoteDescription(rDesc);
  }
};
SignalClientClass.prototype.localhandler_Offer = function(sender, sdp) {
  console.log("GOT offer from %s -Making peer connection & adding stream", sender);
  this.unmakePeerConnection(sender);
  this.pcMapIA[sender] = [];
  var localAVStreams = this.wsCallbackIF.returnOfferResponseStreamsArray(sender, sdp);
  var localDataStreams = this.wsCallbackIF.returnOfferResponseDataStreamsArray(sender, sdp);
  var scco = this;
  scco.makePeerConnection(sender, localAVStreams, sdp, pcSChange, localDataStreams).then(function(pC) {
    scco.pcMap[sender] = pC;
    var icearray = scco.pcMapIA[sender];
    for (var ii = 0; ii < icearray.length; ii++) {
      pC.addIceCandidate(new RTCIceCandidate(icearray[ii]))["catch"](function() {
        scco.callbackIF.onError("Adding ICE from array failed", "peerConnection");
      });
    }
    icearray.length = 0;
  }, function(error) {
    if (error == "busy") {
      var randomTO = Math.floor(Math.random() * 2) + 4;
      setTimeout(function() {
        offerhelper1();
      }, randomTO * 2000);
      return;
    }
    console.log("OFFER makePeerConnection failed: " + error);
    scco.callbackIF.onError("OFFER makePeerConnection failed!", "peerConnection");
  })["catch"](function(err) {
    scco.callbackIF.onError("OFFER makePeerConnection() exception " + err, "peerConnection");
  });
  return;
  function pcSChange(state) {
    if (state == "completed") {
      console.log("state CHANGE to COMPLETED");
      statusbar_SetText("Connected to " + myRoomName);
    }
  }
};
SignalClientClass.prototype.localhandler_Ice = function(sender, ice) {
  var peerConnection = this.pcMap[sender];
  var icearray = this.pcMapIA[sender];
  if (peerConnection == undefined) {
    if (icearray != undefined) {
      icearray.push(ice);
    }
  } else {
    peerConnection.addIceCandidate(new RTCIceCandidate(ice))["catch"](function() {
      this.callbackIF.onError("ICE adding exception", "peerConnection");
    });
  }
};
SignalClientClass.prototype.sendICE = function(iceobj, to) {
  if (!to) {
    to = "--all";
  }
  if (iceobj) {
    this.wsSignalConnection.send(JSON.stringify({"senderid":this.wsMyId, "ice":iceobj, "rname":this.wsMyRoomname, "targetid":to}));
  }
};
SignalClientClass.prototype.sendSDP = function(sdp, to) {
  if (!to) {
    to = "--all";
  }
  this.wsSignalConnection.send(JSON.stringify({"senderid":this.wsMyId, "sdp":sdp, "rname":this.wsMyRoomname, "targetid":to}));
};
SignalClientClass.prototype.amIPeerConnectedTo = function(peerName) {
  if (peerName) {
    if (this.pcMap[peerName]) {
      return true;
    }
  }
  return false;
};
SignalClientClass.prototype.closeDataChannels = function(peerName) {
  if (peerName && this.pcMap[peerName]) {
    var pc = this.pcMap[peerName];
    var k = Object.keys(pc.dataChannels);
    for (var i = 0; i < k.length; k++) {
      dc = pc.dataChannels.k[i];
      dc.close();
      delete pc.dataChannels.k[i];
    }
  }
};
SignalClientClass.prototype.unmakePeerConnection = function(peerName) {
  if (peerName && this.pcMap[peerName]) {
    console.log("SCC: Unmaking pC to " + peerName);
    this.closeDataChannels(peerName);
    this.pcMap[peerName].close();
    delete this.pcMap[peerName];
    delete this.pcMapIA[peerName];
    return;
  }
  if (peerName) {
    return;
  }
  console.log("SCC: Unmaking pC to everyone");
  var k = Object.keys(this.pcMap);
  for (var i = 0; i < k.length; k++) {
    console.log("SCC: Unmaking pC to " + k[i]);
    this.closeDataChannels(k[i]);
    this.pcMap[k[i]].close();
    delete this.pcMap[k[i]];
    delete this.pcMapIA[k[i]];
  }
};
SignalClientClass.prototype.makePeerConnection = function(peerName, streamsAV, remoteSDP, connstatecallback, streamsData) {
  var successfnc;
  var failfnc;
  var scco = this;
  var p = new Promise(function(resolve, reject) {
    successfnc = resolve;
    failfnc = reject;
    if (scco.bMPCbusy == true) {
      setTimeout(function() {
        failfnc("busy");
      }, 1);
      return p;
    }
    scco.bMPCbusy = true;
    pcMPC();
  });
  return p;
  function pcMPC() {
    if (scco.pcMap[peerName] != undefined) {
      scco.unmakePeerConnection(peerName);
    }
    scco.pcMapIA[peerName] = [];
    if (true) {
      var url2 = "https://" + scco.wsHostname + "/iceserviceslist";
      httpGETAsync(url2, pcMakePeerConnectionContinue, function(err) {
        console.log(err);
        pcMakePeerConnectionContinue("[]");
      });
    } else {
      pcMakePeerConnectionContinue("[]");
    }
    function pcMakePeerConnectionContinue(str) {
      var pcPeerConnectionConfig;
      var data = JSON.parse(str);
      pcPeerConnectionConfig = {"iceServers":data};
      var pC = new RTCPeerConnection(pcPeerConnectionConfig);
      pC["peerName"] = peerName;
      pC["streamIndexR"] = 0;
      pC["dataChannels"] = {};
      pC.onicecandidate = function(event) {
        if (event.candidate != null) {
          scco.sendICE(event.candidate, peerName);
        }
      };
      pC.onaddstream = function(event) {
        scco.wsCallbackIF.onGotRemoteStream(event.stream, pC["peerName"], this["streamIndexR"], event);
        this["streamIndexR"] += 1;
      };
      pC.ondatachannel = function(event) {
        console.log("Added data channel from : " + pC.peerName);
        var remDC = event.channel;
        remDC.onmessage = function(event) {
          scco.wsCallbackIF.onDCMessage(peerName, this.label, event.data);
        };
        remDC.onopen = function() {
        };
        remDC.onclose = function() {
        };
      };
      if (connstatecallback) {
        pC.oniceconnectionstatechange = connstatecallback;
      } else {
        pC.oniceconnectionstatechange = function(evt) {
          console.log("ICE connection state change: " + evt.target.iceConnectionState);
          return;
        };
      }
      if (streamsData) {
        for (var i = 0; i < streamsData.length; i++) {
          SignalClientClass.addDataChannelToPC(pC, streamsData[i], scco);
        }
      }
      if (streamsAV) {
        for (var i = 0; i < streamsAV.length; i++) {
          pC.addStream(streamsAV[i]);
        }
      }
      if (remoteSDP == null) {
        console.log("Initiator of call- Creating offer for " + pC.peerName);
        if (streamsAV == null) {
        }
        pC.createOffer().then(function(descr) {
          createdLocalDescription(pC, descr);
        })["catch"](function() {
          scco.bMPCbusy = false;
          failfnc("Could not create offer");
          return;
        });
      } else {
        var rDesc = new RTCSessionDescription(remoteSDP);
        pC.setRemoteDescription(rDesc).then(function() {
          pC.createAnswer().then(function(descr) {
            createdLocalDescription(pC, descr);
          })["catch"](function() {
            this.bMPCbusy = false;
            failfnc("createAnswer() failed");
          });
        })["catch"](function() {
          this.bMPCbusy = false;
          failfnc("setRemoteDescription() failed");
        });
      }
      scco.pcMap[peerName] = pC;
      scco.bMPCbusy = false;
      successfnc(pC);
    }
  }
  function createdLocalDescription(peerConn, description) {
    console.log("setting local description sending SDP to " + peerConn.peerName);
    peerConn.setLocalDescription(description).then(function() {
      scco.sendSDP(peerConn.localDescription, peerConn.peerName);
    })["catch"](function() {
      scco.bMPCbusy = false;
      failfnc("Error sending local Description");
    });
  }
};
SignalClientClass.prototype.initiatePeerConnection = function(peerName, streamsAV, streamsData) {
  var scco = this;
  if (!streamsAV && !streamsData) {
  }
  this.makePeerConnection(peerName, streamsAV, null, pcSChange, streamsData).then(function(pC) {
    scco.wsCallbackIF.onDone_initiatePeerConnection(pC, peerName, null);
  }, function(error) {
    if (error == "busy") {
      console.log("makePeerConnection is busy - RECURSIVE-1");
      var randomTO = Math.floor(Math.random() * 2) + 4;
      setTimeout(function() {
        scco.initiatePeerConnection(peerName, streamsAV, streamsData);
      }, randomTO * 2000);
      return;
    }
    console.log("makePeerConnection failed: " + error);
    scco.wsCallbackIF.onDone_initiatePeerConnection(null, peerName, "makePeerConnection() failed: " + error);
  })["catch"](function() {
    console.log("pcMakePeerConnection() exception");
    scco.wsCallbackIF.onDone_initiatePeerConnection(null, peerName, "makePeerConnection() exception");
  });
  function pcSChange(state) {
    if (state == "new") {
      this.conncomplete = false;
    } else {
      if (state == "failed") {
        if (this.conncomplete == true) {
          return;
        }
        peerCTries += 1;
        if (peerCTries < 6) {
          console.log("RETRYING Connection " + peerCTries);
          setTimeout(function() {
            initiatePeerConnection(peerName, streamsAV);
          }, 250);
        } else {
          peerCTries = 0;
          console.log("Cannot connect to " + peerName + ", Exit and retry!");
          scco.wsCallbackIF.onDone_initiatePeerConnection(null, peerName, "Cannot connect to " + peerName + ", Exit and retry please!");
        }
      } else {
        if (state == "completed") {
          this.conncomplete = true;
        }
      }
    }
  }
};
SignalClientClass.prototype.sendOverDataChannel = function(data, dcName, to) {
  if (to) {
    var dc = this.pcMap[to];
    dc = dc.dataChannels;
    dc = dc[dcName];
    if (dc) {
      console.log("found dc and sending");
      dc.send(data);
    }
    return;
  }
  var k = Object.keys(this.pcMap);
  for (var i = 0; i < k.length; k++) {
    var dc = this.pcMap[k[i]].dataChannels[dcName];
    if (dc) {
      dc.send(data);
    }
  }
};
SignalClientClass.prototype.addDataChannel = function(peerName, dcName) {
  var dataChannelOptions = {ordered:true};
  if (peerName) {
    var pC = this.pcMap[peerName];
    SignalClientClass.addDataChannelToPC(pC, dcName, this);
    return;
  }
  var k = Object.keys(this.pcMap);
  for (var i = 0; i < k.length; k++) {
    if (k[i]) {
      SignalClientClass.addDataChannelToPC(this.pcMap[k[i]], dcName, this);
    }
  }
  return;
};
SignalClientClass.addDataChannelToPC = function(pC, dcName, scco) {
  var dataChannelOptions = {ordered:true};
  if (!pC) {
    return;
  }
  var dc;
  dc = pC.createDataChannel(dcName, dataChannelOptions);
  dc.onopen = function() {
  };
  dc.onclose = function() {
    delete pC.dataChannels.streamsData[i];
  };
  dc.onerror = function(error) {
    scco.wsCallbackIF.onError(error, "dataChannel");
  };
  dc.onmessage = function(event) {
    scco.wsCallbackIF.onDCMessage(peerName, dcName, event.data);
  };
  pC.dataChannels[dcName] = dc;
  return;
};
SignalClientClass.prototype.getPeerStats = function(peerName) {
  console.log("STATS: Entry for peer" + peerName);
  var pc = this.pcMap[peerName];
  console.log("STATS: pc for peer" + pc);
  var selector = pc.getLocalStreams()[0].getVideoTracks()[0];
  if (!selector) {
    selector = pc.getLocalStreams()[0].getAudioTracks()[0];
  }
  if (!selector) {
    return;
  }
  var rttMeasures = [];
  var aBit = 2000;
  setInterval(function() {
    pc.getStats(selector, function(report) {
      for (var i in report) {
        var now = report[i];
        if (now.type == "ssrc" && now.id.indexOf("send") > -1) {
          console.log(" googRtt: " + now.googRtt);
          rttMeasures.push(parseInt(now.googRtt));
          var avgRtt = average(rttMeasures);
        }
      }
    }, logError);
  }, aBit);
  function average(values) {
    var addedup = 0;
    for (var i = 0; i < values.length; i++) {
      addedup = addedup + values[i];
    }
    var aver = addedup / values.length;
    return aver;
  }
  function logError(error) {
    log(error.name + ": " + error.message);
  }
};
