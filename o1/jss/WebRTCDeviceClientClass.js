var WebRTCDeviceClientClass = function() {
};
WebRTCDeviceClientClass.buildDeviceListsSuccess = function(deviceInfos, cb) {
  var deviceInfoList = deviceInfos;
  var deviceLabels_videoin = [];
  var deviceLabels_audioin = [];
  var deviceLabels_audioout = [];
  var deviceIds_videoin = [];
  var deviceIds_audioin = [];
  var deviceIds_audioout = [];
  var vinum = 0, ainum = 0, aonum = 0;
  for (var i = 0; i !== deviceInfos.length; ++i) {
    var templabel;
    var deviceInfo = deviceInfos[i];
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
        console.log("AudioOut Found %s", deviceInfo.label + " " + deviceInfo.deviceId);
        deviceLabels_audioout[aonum] = "speaker " + aonum;
        if (deviceInfo.label) {
          deviceLabels_audioout[aonum] = deviceInfo.label;
        }
        deviceIds_audioout[aonum] = deviceInfo.deviceId;
        console.log("AudioOut Found %d %s", aonum, deviceLabels_audioout[aonum] + " " + deviceIds_audioout[aonum]);
        aonum += 1;
      } else {
        if (deviceInfo.kind === "videoinput") {
          console.log("Video Found %s", deviceInfo.label + " " + deviceInfo.deviceId);
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
  cb.deviceLabels_videoin = deviceLabels_videoin;
  cb.deviceIds_videoin = deviceIds_videoin;
  cb.deviceLabels_audioin = deviceLabels_audioin;
  cb.deviceIds_audioin = deviceIds_audioin;
  cb.deviceLabels_audioout = deviceLabels_audioout;
  cb.deviceIds_audioout = deviceIds_audioout;
  cb.MDIList = deviceInfoList;
  cb.readDeviceLists();
};
WebRTCDeviceClientClass.buildDeviceListsErrored = function(error, cb) {
  console.log("enumerateDevices() error: ", error);
  cb.failDeviceLists(error);
};
WebRTCDeviceClientClass.buildDeviceLists = function(callbackIF) {
  if (callbackIF == undefined) {
    console.log("UNDEF");
    return;
  }
  navigator.mediaDevices.getUserMedia(WebRTCDeviceClientClass.createGUMConstraints("any", "any")).then(function(stream) {
    WebRTCDeviceClientClass.stopMediaTracksInStream(stream);
    console.log("CALLING enumerateDevices()");
    navigator.mediaDevices.enumerateDevices().then(function(devInfoList) {
      WebRTCDeviceClientClass.buildDeviceListsSuccess(devInfoList, callbackIF);
    })["catch"](function(error) {
      WebRTCDeviceClientClass.buildDeviceListsErrored(error, callbackIF);
    });
  })["catch"](function(error) {
    WebRTCDeviceClientClass.buildDeviceListsErrored(error, callbackIF);
  });
};
WebRTCDeviceClientClass.attachAudioOut_Element2Device = function(audioout_devId, dest_element) {
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
};
WebRTCDeviceClientClass.attachStreamToElement = function(stream, dest_element) {
  if (dest_element == undefined) {
    return;
  }
  if (!stream) {
    dest_element.src = null;
  } else {
    dest_element.srcObject = stream;
  }
  dest_element.stream = stream;
};
WebRTCDeviceClientClass.stopMediaTracksInStream = function(stream) {
  if (stream) {
    stream.getTracks().forEach(function(track) {
      track.stop();
    });
  }
};
WebRTCDeviceClientClass.enableAudioInStream = function(stream, enable_disable) {
  if (stream) {
    stream.getAudioTracks()[0].enabled = enable_disable;
  }
};
WebRTCDeviceClientClass.removeTracksFromStream = function(stream, tracktype) {
  var ta;
  if (!stream) {
    return;
  }
  if (tracktype == "audio") {
    ta = stream.getAudioTracks();
  } else {
    if (tracktype == "video") {
      ta = stream.getVideoTracks();
    } else {
      if (tracktype == "data") {
      }
    }
  }
  for (var i = 0; i < ta.length; i++) {
    stream.removeTrack(ta[i]);
  }
  return ta;
};
WebRTCDeviceClientClass.addTracksToStream = function(stream, tracks) {
  for (var i = 0; i < tracks.length; i++) {
    stream.addTrack(tracks[i]);
  }
};
WebRTCDeviceClientClass.createGUMConstraints = function(audioSource, videoSource, vWidth, vHeight, doExact, framerate) {
  var constraints;
  var as, vs;
  if (audioSource == null) {
    as = false;
  } else {
    if (audioSource == "any") {
      as = true;
    } else {
      as = {deviceId:{exact:audioSource}};
    }
  }
  if (videoSource == null) {
    vs = false;
  } else {
    if (videoSource == "any") {
      vs = {deviceId:"undefined"};
    } else {
      vs = {deviceId:{exact:videoSource}};
    }
  }
  var vw, vh;
  if (vWidth > 0 && vHeight > 0) {
    vw = {min:vWidth};
    vh = {min:vHeight};
    if (doExact) {
      vw = {exact:vWidth};
      vh = {exact:vHeight};
    }
    vs.width = vw;
    vs.height = vh;
  }
  if (framerate != undefined && framerate > 0 && vs != false) {
    vs["frameRate"] = {ideal:framerate};
  }
  constraints = {audio:as, video:vs};
  console.log("wdl_createGUMConstraints returning: ", JSON.stringify(constraints));
  return constraints;
};
