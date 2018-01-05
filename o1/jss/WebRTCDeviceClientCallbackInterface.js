var WebRTCDeviceClientCallbackInterface = function() {
  this.deviceLabels_videoin = [];
  this.deviceIds_videoin = [];
  this.deviceLabels_audioin = [];
  this.deviceIds_audioin = [];
  this.deviceLabels_audioout = [];
  this.deviceIds_audioout = [];
  this.MDIList = [];
  this.readDeviceLists = function() {
    for (var i = 0; i !== this.MDIList.length; ++i) {
      var deviceInfo = this.MDIList[i];
      console.log("Device found %s", deviceInfo.kind + " " + deviceInfo.label + " " + deviceInfo.deviceId);
    }
  };
  this.failDeviceLists = function(error_string) {
    console.log("WebRTCDeviceClientClass.buildDeviceLists() failed");
  };
};
