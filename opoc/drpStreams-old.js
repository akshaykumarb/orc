var myApplication = "onciergePOC";
var myId = null;
var myRoomName = null;
var myRole = "ord";
var myBandwidthLow = true;
var lap_el;
var lcam_el = undefined;
var rcam_el = [];
var rtxt_el = [];
function adjustScreenElements() {
  var wtWindow = window.innerWidth;
  var htWindow = window.innerHeight;
  console.log("Window width/height= %d/%d", wtWindow, htWindow);
  lap_el = document.getElementById("lapVideo");
  console.log("Window width/height=%d/%d, button width=%d", wtWindow, htWindow);
  console.log("Video width/height=%d/%d", lap_el.width, lap_el.height);
  return;
}
function errorHandler(error) {
  console.log(error);
}
function pageReady(roomname) {
  if (roomname == undefined || roomname == "") {
    roomname = getCookie("session");
  }
  if (roomname == undefined || roomname == "" || roomname.charAt(0) == " ") {
    alert("Session ID too short or first char is blank, EXIT then retry.");
    return;
  }
  myRoomName = roomname;
  if (myRoomName == undefined) {
    alert("Session information not passed in");
    return;
  }
  myBandwidthLow = false;
  var lbv = getCookie("lowbw");
  if (lbv == "1") {
    myBandwidthLow = true;
  }
  myId = myRoomName;
  adjustScreenElements();
  var descriptor = opoc_product_name + " v:" + opoc_version_string + " Session ID:" + myRoomName;
  statusbar_SetText(descriptor);
  console.log("VARS are %s %s %s", myId, lapcamnamecontains, sccamnamecontains);
  if (!navigator.mediaDevices.getUserMedia) {
    alert("Your browser does not support getUserMedia API");
    return;
  }
  if (lap_el == null) {
    alert("Elements were not found in UI definition");
    return;
  }
  sigMakeConnection(myId, null, null, null);
}
function pageUnloaded() {
  stopallstreams();
  sigDeleteRoom(myRoomName);
  sigCloseConnection();
}
function continueAfterWSConnected() {
  sigCreateRoom(myRoomName);
}
function continueAfterRoomCreatedJoined(bAllGood) {
  if (bAllGood == false) {
    myRoomName = null;
    alert("The Session could not be created. Exit and try again");
    return;
  }
  wdl_BuildDeviceLists();
}
function wdlc_DeviceListsFailed(error) {
  console.log("back from bdl ERROR= " + error);
  alert("No Devices found... try lauching again!");
  return;
}
function wdlc_DeviceListsBuilt() {
  console.log("Video Devices found lts: " + deviceLabels_videoin.length + " " + deviceIds_videoin.length);
  console.log("AI Devices found lts: " + deviceLabels_audioin.length + " " + deviceIds_audioin.length);
  console.log("AO Devices found lts: " + deviceLabels_audioout.length + " " + deviceIds_audioout.length);
  for (var ii = 0; ii < deviceLabels_videoin; ii++) {
    console.log("V" + ii + ": " + deviceLabels_videoin[ii] + " id= " + deviceIds_videoin[ii]);
  }
  startStreams();
}
function startStreams() {
  var lcindex = -1;
  var ii, jj, thiscam;
  for (jj = 0; jj < lapcamnamecontains.length; jj++) {
    for (ii = 0; ii < deviceLabels_videoin.length; ii++) {
      thiscam = deviceLabels_videoin[ii].toLowerCase();
      console.log("checking cam label = %s with %s", thiscam, lapcamnamecontains[jj]);
      if (thiscam.indexOf(lapcamnamecontains[jj]) > -1) {
        lcindex = ii;
        break;
      }
    }
    if (lcindex > -1) {
      break;
    }
  }
  if (lcindex == -1) {
    lcindex = 100;
  }
  if (deviceLabels_videoin.length > 0) {
    lcindex = 0;
  }
  if (lcindex > -1) {
    var camid = "any";
    if (lcindex != 100) {
      camid = deviceIds_videoin[lcindex];
    }
    streamStart(camid);
  }
}
function streamStart(cam) {
  var lcconstraints;
  if (myBandwidthLow == true) {
    lcconstraints = wdl_createGUMConstraints("any", cam, 1024, 576, true);
  } else {
    lcconstraints = wdl_createGUMConstraints("any", cam, 640, 360, true);
  }
  navigator.mediaDevices.getUserMedia(lcconstraints).then(function(stream) {
    gumsuccess(stream, lap_el);
  })["catch"](function() {
    lcconstraints = wdl_createGUMConstraints(null, camid, 1024, 576, false);
    navigator.mediaDevices.getUserMedia(lcconstraints).then(function(stream) {
      gumsuccess(stream, lap_el);
    })["catch"](errorHandler);
  });
}
var currCamIdx = 0;
function streamNextCamera() {
  if (deviceLabels_videoin.length == 0) {
    return 0;
  }
  currCamIdx += 1;
  if (currCamIdx > deviceLabels_videoin.length - 1) {
    currCamIdx = 0;
  }
  toggleLapVideo();
  setTimeout(streamStart(deviceIds_videoin[currCamIdx]), 1000);
  return currCamIdx;
}
var videoTracks;
function gumsuccess(stream, el) {
  console.log("gumsuccess called with el: ", el);
  el.onloadedmetadata = function() {
    var streamname = "lap";
    console.log("GUM-Success for stream: " + streamname);
    console.log("\t\twidth is", this.videoWidth);
    console.log("\t\theight is", this.videoHeight);
    if (lap_el.width > this.videoWidth * 2) {
      lap_el.width = this.videoWidth * 2;
      lap_el.height = this.videoHeight * 2;
    }
  };
  wdl_attachStreamToElement(stream, el);
  if (el == lap_el) {
    videoTracks = stream.getVideoTracks();
  }
}
function toggleLapVideo(isOn) {
  if (isOn) {
    if (videoTracks.length > 0) {
      lap_el.stream.addTrack(videoTracks[0]);
    }
  } else {
    if (videoTracks.length > 0) {
      lap_el.stream.removeTrack(videoTracks[0]);
    }
  }
}
function startTelestration() {
  document.body.style.cursor = "default";
  initButtonHandlers();
  initTelestration(lap_el);
}
function getLapStream() {
  return lap_el.stream;
}
function stopallstreams() {
  if (lap_el.stream) {
    wdl_stopMediaTracksInStream(lap_el.stream);
    delete lap_el.stream;
  }
}
function startallstreams() {
  startStreams();
}
;