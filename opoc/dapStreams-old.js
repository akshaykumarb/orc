var myApplication = "onciergePOC";
var myId = null;
var myRoomName = null;
var myRole = "trc";
var lap_el;
var wtButton;
function errorHandler(error) {
  console.log(error);
}
function adjustScreenElements() {
  var wtWindow = window.innerWidth;
  var htWindow = window.innerHeight;
  lap_el = document.getElementById("lapVideo");
  wtButton = lap_el.width / 15;
  return;
}
function pageReady(roomname, id, role) {
  if (roomname == undefined || roomname == "") {
    roomname = getCookie("session");
  }
  if (roomname == undefined || roomname == "" || roomname.charAt(0) == " ") {
    alert("Session ID too short or first char is blank, EXIT then retry.");
    return;
  }
  if (id == undefined || id == "") {
    id = getCookie("name");
  }
  if (id == undefined || id == "" || id.charAt(0) == " ") {
    id = "Anon-" + generateId2();
  }
  console.log("params %s %s %s", roomname, id, role);
  myRoomName = roomname;
  myId = id;
  if (role != undefined && role != "") {
    myRole = role;
  }
  adjustScreenElements();
  var descriptor = opoc_product_name + " v:" + opoc_version_string + " Session ID:" + myRoomName + " Name:" + myId;
  statusbar_SetText(descriptor);
  if (!navigator.mediaDevices.getUserMedia) {
    alert("Your browser does not support getUserMedia API");
    return;
  }
  if (lap_el == null) {
    alert("Elements were not found");
    return;
  }
  setTimeout(connect2ORD, 2000);
}
function pageUnloaded() {
  leaveRoom();
}
function leaveRoom() {
  stopallstreams();
  sigLeaveRoom(myRoomName);
  sigCloseConnection();
  if (pcMap[myRoomName]) {
    pcMap[myRoomName].close();
  }
}
function startStreams() {
  var lcconstraints;
  lcconstraints = wdl_createGUMConstraints("any", "any", 80, 60, true);
  navigator.mediaDevices.getUserMedia(lcconstraints).then(function(stream) {
    gumsuccess(stream, lcam_el);
  })["catch"](function() {
    lcconstraints = wdl_createGUMConstraints(null, "any");
    navigator.mediaDevices.getUserMedia(lcconstraints).then(function(stream) {
      gumsuccess(stream, lcam_el);
    })["catch"](function() {
    });
  });
}
function gumsuccess(stream, el) {
  wdl_attachStreamToElement(stream, el);
  el.onloadedmetadata = function() {
    console.log("stream is: ", this.stream);
    console.log("width is", this.videoWidth);
    console.log("height is", this.videoHeight);
  };
}
var n_StartTelestrationIntervalID = 0;
var nSTCalls = 0;
var sbtxt;
function startTelestration() {
}
function startTelestrationForReal() {
  statusbar_SetText(sbtxt);
  document.body.style.cursor = "default";
  initButtonHandlers(wtButton);
  initTelestration(lap_el);
}
function connect2ORD(isCaller) {
  sigMakeConnection(myId, null, null, null);
}
function continueAfterWSConnected() {
  sigJoinRoom(myRoomName, 0);
}
function continueAfterRoomCreatedJoined(bAllGood, reason) {
  if (bAllGood == false) {
    if (reason == "name taken") {
      alert("Name entered is already in room. Exit & choose another name");
      return;
    }
    alert("The ORD has not joined yet. Enter to Retry in one min.");
    window.setTimeout(continueAfterWSConnected, 60000);
    return;
  }
  if (myInitiator == "trc") {
    initiatePeerConnection(myRoomName);
  }
  return;
}
function stopallstreams() {
  console.log("stopallstreams called: stopping ");
  if (lap_el.stream) {
    wdl_stopMediaTracksInStream(lap_el.stream);
    wdl_stopMediaTracksInStream(lcam_el.stream);
    delete lap_el.stream;
    delete lcam_el.stream;
  }
}
function startallstreams() {
  setTimeout(connect2ORD, 2000);
  startStreams();
}
;