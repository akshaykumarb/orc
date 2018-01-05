var deviceInfoList = [];
var deviceLabels_videoin = [];
var deviceLabels_audioin = [];
var deviceLabels_audioout = [];
var deviceIds_videoin = [];
var deviceIds_audioin = [];
var deviceIds_audioout = [];
function wdli_GotDevices(deviceInfos) {
  var vinum = 0, ainum = 0, aonum = 0;
  for (var i = 0; i !== deviceInfos.length; ++i) {
    var templabel;
    var deviceInfo = deviceInfos[i];
    deviceInfoList[i] = deviceInfo;
    if (deviceInfo.kind === "audioinput") {
      deviceLabels_audioin[ainum] = "microphone " + ainum;
      if (deviceInfo.label) {
        deviceLabels_audioin[ainum] = deviceInfo.label;
      }
      deviceIds_audioin[ainum] = deviceInfo.deviceId;
      console.log("AudioIn Found %d %s", ainum, deviceLabels_audioin[ainum] + " " + deviceIds_audioin[ainum]);
      ainum += 1;
    } else {
      if (deviceInfo.kind === "audiooutput") {
        deviceLabels_audioout[aonum] = "speaker " + aonum;
        if (deviceInfo.label) {
          deviceLabels_audioout[aonum] = deviceInfo.label;
        }
        deviceIds_audioout[aonum] = deviceInfo.deviceId;
        console.log("AudioOut Found %d %s", aonum, deviceLabels_audioout[aonum] + " " + deviceIds_audioout[aonum]);
        aonum += 1;
      } else {
        if (deviceInfo.kind === "videoinput") {
          deviceLabels_videoin[vinum] = "video-in " + vinum;
          if (deviceInfo.label) {
            deviceLabels_videoin[vinum] = deviceInfo.label;
          }
          deviceIds_videoin[vinum] = deviceInfo.deviceId;
          console.log("VideoIn Found %d %s", vinum, deviceLabels_videoin[vinum] + " " + deviceIds_videoin[vinum]);
          vinum += 1;
        } else {
          console.log("Some other kind of source/device: ", deviceInfo);
        }
      }
    }
  }
  wdlc_DeviceListsBuilt();
}
function wdl_BuildDeviceListsErrored(error) {
  console.log("enumerateDevices() error: ", error);
  wdlc_DeviceListsFailed(error);
}
function wdl_BuildDeviceLists() {
  navigator.mediaDevices.getUserMedia(wdl_createGUMConstraints("any", "any")).then(function(stream) {
    wdl_stopMediaTracksInStream(stream);
    console.log("CALLING enumerateDevices()");
    navigator.mediaDevices.enumerateDevices().then(wdli_GotDevices)["catch"](wdl_BuildDeviceListsErrored);
  })["catch"]();
}
function wdl_attachAudioOut_Element2Device(audioout_devId, dest_element) {
  if (audioout_devId == null || dest_element == null) {
    return;
  }
  if (typeof dest_element.sinkId !== "undefined") {
    dest_element.setSinkId(audioout_devId).then(function() {
      console.log("Success, audio output device attached: " + audioout_devId);
    })["catch"](function(error) {
      var errorMessage = error;
      if (error.name === "SecurityError") {
        errorMessage = "You need to use HTTPS for selecting audio output device: " + error;
      }
      console.error(errorMessage);
    });
  } else {
    console.warn("Browser does not support output device selection.");
  }
}
function wdl_attachStreamToElement(stream, dest_element) {
  if (dest_element == undefined) {
    return;
  }
  if (!stream) {
    dest_element.src = null;
  } else {
    dest_element.src = window.URL.createObjectURL(stream);
  }
  dest_element.stream = stream;
}
function wdl_stopMediaTracksInStream(stream) {
  if (stream) {
    stream.getTracks().forEach(function(track) {
      track.stop();
    });
  }
}
function wdl_createGUMConstraints(audioSource, videoSource, vWidth, vHeight, doExact, framerate) {
  console.log("wdl_createGUMConstraints entry params: ", audioSource, " ", videoSource, " ", vWidth, " ", vHeight);
  var constraints;
  if (vWidth > 0 && vHeight > 0) {
    constraints = {audio:audioSource == null ? false : audioSource == "any" ? true : {deviceId:{exact:audioSource}}, video:videoSource == null ? false : {deviceId:videoSource == "any" ? "undefined" : {exact:videoSource}, width:doExact ? {exact:vWidth} : {min:vWidth}, height:doExact ? {exact:vHeight} : {min:vHeight}}};
  } else {
    constraints = {audio:audioSource == null ? false : audioSource == "any" ? true : {deviceId:{exact:audioSource}}, video:videoSource == null ? false : videoSource == "any" ? true : {deviceId:{exact:videoSource}}};
  }
  var vo = constraints.video;
  if (framerate != undefined && framerate > 0 && vo != false) {
    vo["framerate"] = {ideal:framerate};
  }
  console.log("wdl_createGUMConstraints returning: ", JSON.stringify(constraints));
  return constraints;
}
;