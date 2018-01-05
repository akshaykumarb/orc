var wsURL1 = "wss://";
var wsHostname = location.hostname;
var wsPort = location.port;
var wsURL;
var wsSignalConnection;
var wsMyId;
var wsMyAuth;
var wsMyRoomname;
var wsApplicationNameOnServer = "/roommanager1";
var pcMap = {};
function sigGenerateId() {
  function s4() {
    return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1);
  }
  return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}
function sigMakeConnection(identity, authentication, host, port) {
  wsMyId = identity;
  if (wsMyId == null || wsMyId == undefined) {
    wsMyId = sigGenerateId();
  }
  if (port != null && port != undefined) {
    wsPort = port;
  }
  if (host != null && host != undefined) {
    wsHostname = host;
  }
  wsMyAuth = authentication;
  wsURL = wsURL1 + wsHostname;
  if (wsPort) {
    wsURL += ":" + wsPort;
  }
  wsURL += wsApplicationNameOnServer;
  console.log("Making WSConnection to " + wsURL + " with id " + wsMyId);
  try {
    wsSignalConnection = new WebSocket(wsURL);
  } catch (err) {
    sighandler_NoConnection(err);
    return;
  }
  wsSignalConnection.onmessage = sigProcessMessage;
  wsSignalConnection.onping = sigProcessPing;
  console.log("  WSConnection state is " + wsSignalConnection.readyState);
}
function sigCreateRoom(roomname) {
  if (roomname == null) {
    return;
  }
  wsSignalConnection.send(JSON.stringify({"senderid":wsMyId, "scmd":"create", "auth":wsMyAuth, "rname":roomname}));
  wsMyRoomname = roomname;
}
function sigDeleteRoom(roomname) {
  console.log("sigDeleteRoom() for room= " + roomname);
  if (roomname == null) {
    return;
  }
  wsSignalConnection.send(JSON.stringify({"senderid":wsMyId, "scmd":"delete", "rname":roomname}));
  wsMyRoomname = null;
}
function sigJoinRoom(roomname, priority) {
  if (roomname == null) {
    return;
  }
  if (roomname == undefined) {
    return;
  }
  wsSignalConnection.send(JSON.stringify({"senderid":wsMyId, "scmd":"join", "auth":wsMyAuth, "rname":roomname, "priority":priority}));
  wsMyRoomname = roomname;
}
function sigLeaveRoom(roomname) {
  if (roomname == null) {
    return;
  }
  if (roomname == undefined) {
    return;
  }
  wsSignalConnection.send(JSON.stringify({"senderid":wsMyId, "scmd":"leave", "rname":roomname}));
  wsMyRoomname = null;
}
function sigConnected() {
  console.log("  WSConnection state is " + wsSignalConnection.readyState);
  sighandler_Connected();
}
function sigCloseConnection() {
  wsSignalConnection.close();
}
function sigProcessMessage(message) {
  if (message.data.indexOf("*AreYouAlive?") == 0) {
    var answer = "*ImAlive!" + wsMyId;
    wsSignalConnection.send(answer);
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
    sigConnected();
  }
  if (signal.senderid == wsMyId) {
    return;
  }
  if (signal.sdp) {
    if (signal.sdp.type == "offer") {
      var h = false;
      if (sighandler_Offer != undefined) {
        h = sighandler_Offer(signal.senderid, signal.sdp);
      }
      if (!h) {
        sclocalhandler_Offer(signal.senderid, signal.sdp);
      }
    } else {
      var h = false;
      if (sighandler_Answer != undefined) {
        h = sighandler_Answer(signal.senderid, signal.sdp);
      }
      if (!h) {
        sclocalhandler_Answer(signal.senderid, signal.sdp);
      }
    }
  } else {
    if (signal.ice) {
      var h = false;
      if (sighandler_Ice != undefined) {
        h = sighandler_Ice(signal.senderid, signal.ice);
      }
      if (!h) {
        sclocalhandler_Ice(signal.senderid, signal.ice);
      }
    } else {
      if (signal.type == "string") {
        sighandler_String(signal.senderid, signal.string, signal.description);
      } else {
        if (signal.type == "object") {
          sighandler_Object(signal.senderid, signal.object, signal.description);
        } else {
          if (signal.scmd) {
            if (signal.scmd == "delete") {
              var k = Object.keys(pcMap);
              for (var i = 0; i < k.length; k++) {
                pcMap[k[i]].close();
                delete pcMap[k[i]];
                delete pcMap[k[i] + "_ia"];
              }
            }
            sighandler_SCMDResponse(signal.scmd, signal.success, signal.reason);
          } else {
            if (signal.scmdevent) {
              if (pcMap[signal.senderid]) {
                pcMap[signal.senderid].close();
                delete pcMap[signal.senderid];
                delete pcMap[signal.senderid + "_ia"];
              }
              sighandler_SCMDEvent(signal.senderid, signal.scmdevent, signal);
            }
          }
        }
      }
    }
  }
}
function sclocalhandler_Answer(sender, sdp) {
  console.log("GOT answer from " + sender);
  var peerConnection = pcMap[sender];
  if (peerConnection) {
    var rDesc = new RTCSessionDescription(sdp);
    peerConnection.setRemoteDescription(rDesc);
  }
}
function sclocalhandler_Offer(sender, sdp) {
  console.log("GOT offer from %s -Making peer connection & adding stream", sender);
  var aa = sender + "_ia";
  if (pcMap[sender]) {
    pcMap[sender].close();
  }
  delete pcMap[sender];
  delete pcMap[aa];
  pcMap[aa] = [];
  var localStreams = sighandler_returnOfferResponseStreamsArray(sender, sdp);
  offerhelper1();
  return;
  function offerhelper1() {
    pcMakePeerConnection1(sender, localStreams, sdp, pcSChange).then(function(pC) {
      pcMap[sender] = pC;
      var icearray = pcMap[aa];
      for (var ii = 0; ii < icearray.length; ii++) {
        pC.addIceCandidate(new RTCIceCandidate(icearray[ii]))["catch"](function() {
          scclient_ErrorHandler("Adding ICE from array failed");
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
      console.log("OFFER pcMakePeerConnection failed: " + error);
      scclient_ErrorHandler("Cannot connect to ORD/TRC, Exit and retry please!");
    })["catch"](function() {
      scclient_ErrorHandler("OFFER pcMakePeerConnection() exception");
    });
    return;
  }
  function pcSChange(state) {
    if (state == "completed") {
      console.log("state CHANGE to COMPLETED");
      statusbar_SetText("Connected to " + myRoomName);
    }
  }
}
function sclocalhandler_Ice(sender, ice) {
  var peerConnection = pcMap[sender];
  var aa = sender + "_ia";
  var icearray = pcMap[aa];
  if (peerConnection == undefined) {
    if (icearray != undefined) {
      icearray.push(ice);
    }
  } else {
    peerConnection.addIceCandidate(new RTCIceCandidate(ice))["catch"](function() {
      scclient_ErrorHandler("ICE adding exception");
    });
  }
}
function sigProcessPing() {
  wsSignalConnection.pong();
}
function sigSendICE(iceobj, to) {
  if (to == undefined) {
    to = "--all";
  }
  if (iceobj != null) {
    wsSignalConnection.send(JSON.stringify({"senderid":wsMyId, "ice":iceobj, "rname":wsMyRoomname, "targetid":to}));
  }
}
function sigSendSDP(sdp, to) {
  if (to == undefined) {
    to = "--all";
  }
  wsSignalConnection.send(JSON.stringify({"senderid":wsMyId, "sdp":sdp, "rname":wsMyRoomname, "targetid":to}));
}
function sigSendString(str, description, to) {
  if (description == undefined || description == null) {
    description = "";
  }
  if (to == undefined) {
    to = "--all";
  }
  wsSignalConnection.send(JSON.stringify({"senderid":wsMyId, "type":"string", "description":description, "string":str, "rname":wsMyRoomname, "targetid":to}));
}
function sigSendObject(obj, description, to) {
  if (to == undefined) {
    to = "--all";
  }
  wsSignalConnection.send(JSON.stringify({"senderid":wsMyId, "type":"object", "description":description, "object":obj, "rname":wsMyRoomname, "targetid":to}));
}
var bMPCbusy = false;
function pcMakePeerConnection1(peerName, localStreams, remoteSDP, connstatecallback) {
  var successfnc;
  var failfnc;
  var p = new Promise(function(resolve, reject) {
    successfnc = resolve;
    failfnc = reject;
    if (!bMPCbusy) {
      bMPCbusy = true;
      pcMPC(peerName, localStreams, remoteSDP, connstatecallback);
    } else {
      setTimeout(function() {
        failfnc("busy");
      }, 1);
      return p;
    }
  });
  return p;
  function pcMPC(peerName, localStreams, remoteSDP, connstatecallback) {
    if (pcMap[peerName] != undefined) {
      var aa = peerName + "_ia";
      if (pcMap[peerName]) {
        pcMap[peerName].close();
      }
      delete pcMap[peerName];
      delete pcMap[aa];
      pcMap[aa] = [];
    }
    if (true) {
      var url2 = location.protocol + "//" + location.host + "/iceserviceslist";
      httpGETAsync(url2, pcMakePeerConnectionContinue, null);
    }
    function pcMakePeerConnectionContinue(str) {
      var pcPeerConnectionConfig;
      var data = JSON.parse(str);
      pcPeerConnectionConfig = {"iceServers":data};
      var pC = new RTCPeerConnection(pcPeerConnectionConfig);
      pC["peerName"] = peerName;
      pC["streamIndex"] = 0;
      pC.onicecandidate = function(event) {
        if (event.candidate != null) {
          sigSendICE(event.candidate, peerName);
        }
      };
      pC.onaddstream = function(ev) {
        pchandler_gotRemoteStream(ev, this["peerName"], this["streamIndex"]);
        this["streamIndex"] += 1;
      };
      if (connstatecallback) {
        pC.oniceconnectionstatechange = connstatecallback;
      } else {
        pC.oniceconnectionstatechange = function(evt) {
          console.log("ICE connection state change: " + evt.target.iceConnectionState);
          return;
        };
      }
      if (localStreams != null) {
        for (var i = 0; i < localStreams.length; i++) {
          pC.addStream(localStreams[i]);
        }
      }
      if (remoteSDP == null) {
        console.log("Initiator of call- Creating offer for " + pC.peerName);
        if (localStreams == null) {
        }
        pC.createOffer().then(function(descr) {
          createdLocalDescription(pC, descr);
        })["catch"](function() {
          bMPCbusy = false;
          failfnc("Could not create offer");
          return;
        });
      } else {
        var rDesc = new RTCSessionDescription(remoteSDP);
        pC.setRemoteDescription(rDesc).then(function() {
          pC.createAnswer().then(function(descr) {
            createdLocalDescription(pC, descr);
          })["catch"](function() {
            bMPCbusy = false;
            failfnc("createAnswer() failed");
          });
        })["catch"](function() {
          bMPCbusy = false;
          failfnc("setRemoteDescription() failed");
        });
      }
      pcMap[peerName] = pC;
      bMPCbusy = false;
      successfnc(pC);
    }
  }
  function createdLocalDescription(peerConn, description) {
    console.log("setting local description sending SDP to " + peerConn.peerName);
    peerConn.setLocalDescription(description).then(function() {
      sigSendSDP(peerConn.localDescription, peerConn.peerName);
    })["catch"](function() {
      bMPCbusy = false;
      failfnc("Error sending local Description");
    });
  }
}
;