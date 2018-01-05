var myApplication = "oncierge1";
var myId = null;
var myRoomName = null;
var scribeID = null;
var patientID = null;
var captureID = null;
var drVid = document.getElementById("drVid");
var paVid = document.getElementById("paVid");
var wcc_cb = new WebRTCDeviceClientCallbackInterface;
var scc;
var scc_cb = new SignalClientCallbackInterface;
wcc_cb.failDeviceLists = function(error_string) {
  console.log("back from bdl ERROR= " + error_string);
  alert("No Devices found... try lauching again!");
  return;
};
wcc_cb.readDeviceLists = function() {
  startStreams();
};
scc_cb.onConnected = function() {
  if (myRole == "initiator") {
    console.log("Creating Room");
    scc.createRoom(myRoomName, 0);
    return;
  } else {
    console.log("Joining Room " + myRoomName);
    scc.joinRoom(myRoomName, 0, myRole);
    return;
  }
};
scc_cb.onGotSCMDResponse = function(scmd, bSuccess, reason) {
  console.log("onGotSCMDResponse for " + scmd + " status " + bSuccess + " reason: " + reason);
  if (!bSuccess) {
    alert("Server Command Failed :" + scmd + " " + reason);
    return;
  }
  if (scmd == "join") {
    if (bSuccess) {
      continueAfterRoomCreatedJoined();
    } else {
      alert("Room already entered by this id or NO room " + myId + "/" + myRoomName, +"/" + reason);
    }
  }
};
scc_cb.returnOfferResponseStreamsArray = function(sender, offersdp) {
  console.log("returnOfferResponseStreamsArray() back to " + sender);
  var sA = null;
  if (myRole == "patient") {
    var sA = [paVid.stream];
  }
  return sA;
};
scc_cb.onGotSCMDEvent = function(senderid, event, roomname, xdata) {
  console.log("onGotSCMDEvent() " + " sid=" + senderid + " ev=" + event + " rn=" + roomname + " xdata=" + xdata);
  if (event == "joined") {
    console.log("  in joined clause");
    if (myRole == "initiator") {
      console.log("  in initiator " + xdata);
      if (xdata == "capture") {
        console.log("  in capture");
        if (patientID) {
          scc.sendString("busy", null, senderid);
          return;
        }
        captureID = "capture";
        if (scribeID) {
          setTimeout(function() {
            scc_cb.onGotSCMDEvent(scribeID, "joined", myRoomName, "scribe");
          }, 10000);
        }
        drVid.muted = false;
      } else {
        if (xdata == "patient") {
          console.log("  in patient");
          if (patientID || captureID) {
            scc.sendString("busy", null, senderid);
            return;
          }
          patientID = senderid;
          if (!drVid.stream) {
            startStreams();
          }
          setTimeout(continueAfterRoomCreatedJoined, 3000);
          if (scribeID) {
            setTimeout(function() {
              scc_cb.onGotSCMDEvent(scribeID, "joined", myRoomName, "scribe");
            }, 10000);
          }
        } else {
          if (xdata == "scribe") {
            console.log("  in scribe");
            scribeID = senderid;
            var lst = [];
            if (drVid.stream) {
              console.log("Adding drVid for Scribe");
              lst.push(drVid.stream);
            }
            if (paVid.stream) {
              console.log("Adding paVid for Scribe");
              lst.push(paVid.stream);
            }
            console.log("Making SCRIBE connection to " + scribeID);
            console.log("  num streams = " + lst.length);
            setTimeout(function() {
              scc.initiatePeerConnection(senderid, lst);
            }, 5000);
          }
        }
      }
      var sbt = "Dr:" + myRoomName;
      if (patientID) {
        sbt += " Patient:" + patientID;
      }
      if (scribeID) {
        sbt += " DA:" + scribeID;
      }
      statusbar_SetText(sbt);
      return;
    }
    if (myRole == "scribe") {
      if (xdata == "patient") {
        patientID = senderid;
      }
      if (xdata == "capture") {
        captureID = "capture";
      }
    }
  } else {
    if (event == "left") {
      if (senderid == "capture") {
        captureID = null;
        paVid.stream = undefined;
        drVid.stream = undefined;
        if (myRole == "initiator") {
          drVid.muted = true;
        }
      } else {
        if (senderid == scribeID) {
          scribeID = null;
        } else {
          if (senderid == patientID) {
            patientID = null;
            paVid.stream = undefined;
            drVid.stream = undefined;
          }
        }
      }
      scc.unmakePeerConnection(senderid);
    } else {
      if (event == "roomdeleted") {
        console.log("My room was deleted " + roomname);
        alert("Room is gone gone gone!!!");
      }
    }
  }
};
scc_cb.onGotRemoteStream = function(stream, sender) {
  console.log("onGotRemoteStream() stream id " + stream.id + " from " + sender);
  if (myRole == "initiator") {
    if (sender == captureID) {
      WebRTCDeviceClientClass.attachStreamToElement(stream, drVid);
      return;
    }
    if (sender == patientID) {
      WebRTCDeviceClientClass.attachStreamToElement(stream, paVid);
      return;
    }
  }
  if (myRole == "scribe") {
    var tel = drVid;
    if (drVid.stream) {
      tel = paVid;
    }
    WebRTCDeviceClientClass.attachStreamToElement(stream, tel);
  }
  if (myRole == "patient") {
    WebRTCDeviceClientClass.attachStreamToElement(stream, drVid);
  }
};
scc_cb.onGotString = function(sender, string, description) {
  console.log("onGotString() " + string + " received of description " + description);
  if (description == "chat") {
    populateChatBox(sender, string);
    return;
  } else {
    if (string == "busy") {
      alert("Cannot connect: Remote side is busy. Try later!");
      return;
    } else {
      if (string == "mutevideo") {
        if (drVid.stream) {
          console.log("1mutingV");
          drVid.src0 = drVid.src;
          drVid.src = undefined;
        }
        if (paVid.stream) {
          console.log("1mutingV");
          paVid.src0 = paVid.src;
          paVid.src = undefined;
        }
        return;
      } else {
        if (string == "unmutevideo") {
          if (drVid.stream) {
            console.log("2mutingV");
            drVid.src = drVid.src0;
          }
          if (paVid.stream) {
            console.log("2mutingV");
            paVid.src = paVid.src0;
          }
          return;
        }
      }
    }
  }
  populateTransBox(string);
};
function pageReady() {
  myRoomName = getCookie("session");
  if (myRoomName == "") {
    alert("No session entered");
    return;
  }
  myId = getCookie("name");
  if (myRole == "initiator") {
    myId = myRoomName;
  }
  if (myRole == "capture") {
    myId = "capture";
  }
  if (myId == "") {
    alert("No name entered");
    return;
  }
  statusbar_SetText("Dr:" + myRoomName);
  scc = new SignalClientClass(myApplication, myId, null, null, null, scc_cb);
  if (myRole == "capture") {
    WebRTCDeviceClientClass.buildDeviceLists(wcc_cb);
  }
  if (myRole == "patient") {
    startStreams();
  }
}
function pageUnloaded() {
  if (!scc) {
    return;
  }
  stopallstreams();
  scc.deleteORleaveRoom(myRoomName);
  scc.closeConnection();
  scc = null;
}
function continueAfterRoomCreatedJoined() {
  if (myRole == "initiator" && !patientID) {
    return;
  }
  if (myRole == "patient" || myRole == "scribe") {
    return;
  }
  if (myRole == "capture" && !drVid.stream) {
    setTimeout(continueAfterRoomCreatedJoined, 2000);
    return;
  }
  var c2 = myRoomName;
  if (myRole == "initiator") {
    c2 = patientID;
  }
  var lst = [];
  if (drVid.stream) {
    lst.push(drVid.stream);
  }
  if (paVid && paVid.stream) {
    lst.push(paVid.stream);
  }
  scc.initiatePeerConnection(c2, lst);
}
function startStreams() {
  var webcam = "any";
  var mic = "any";
  var lcconstraints;
  console.log("Cameras found: " + wcc_cb.deviceLabels_videoin.length);
  if (wcc_cb.deviceLabels_videoin.length > 1) {
    webcam = wcc_cb.deviceIds_videoin[1];
  }
  var xr = 640, yr = 480;
  lcconstraints = WebRTCDeviceClientClass.createGUMConstraints(mic, webcam, xr, yr, false);
  navigator.mediaDevices.getUserMedia(lcconstraints).then(function(stream) {
    var tel = drVid;
    if (myRole == "patient") {
      tel = paVid;
    }
    gumsuccess(stream, tel);
  })["catch"](function() {
    alert("gum failed");
  });
}
function gumsuccess(stream, el) {
  console.log("gumsuccess called with el: ", el);
  WebRTCDeviceClientClass.attachStreamToElement(stream, el);
  el.onloadedmetadata = function() {
    console.log("GUM-Success for stream: ");
    console.log("\t\twidth is", this.videoWidth);
    console.log("\t\theight is", this.videoHeight);
  };
}
function stopallstreams() {
  if (drVid.stream) {
    WebRTCDeviceClientClass.stopMediaTracksInStream(drVid.stream);
    delete drVid.stream;
  }
}
;