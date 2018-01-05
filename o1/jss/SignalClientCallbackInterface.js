var SignalClientCallbackInterface = function() {
  this.onConnected = function() {
    console.log("onConnected()");
  };
  this.onNoConnection = function(reason) {
    alert("onNoConnection() Signal Connection Failed " + reason);
  };
  this.onGotSCMDResponse = function(scmd, bSuccess, reason) {
    console.log("onGotSCMDResponse() " + scmd);
    if (bSuccess == false) {
      console.log("    SCMD Failure " + reason);
      return;
    }
    if (scmd == "create" || scmd == "join" || scmd == "leave" || scmd == "delete") {
    }
    if (scmd == "getroominfo") {
    }
  };
  this.onGotSCMDEvent = function(senderid, event, roomname, xdata) {
    console.log("onGotSCMDEvent() " + event);
    if (event == "joined") {
      console.log("Someone joined with id " + senderid);
    } else {
      if (event == "left") {
        console.log("Someone left with id " + senderid);
      } else {
        if (event == "roomdeleted") {
          console.log("My room was deleted " + roomname);
        }
      }
    }
  };
  this.onGotString = function(sender, string, description) {
    console.log("onGotString() " + string + " received of description " + description);
  };
  this.onGotObject = function(sender, object, description) {
    console.log("onGotObject() " + description);
  };
  this.onGotRemoteStream = function(stream, sender, streamIndex, pC, baseEvent) {
    console.log("onGotRemoteStream() stream id " + baseEvent.stream.id + " from " + sender);
  };
  this.returnOfferResponseStreamsArray = function(sender, offersdp) {
    console.log("returnOfferResponseStreamsArray() back to " + sender);
    return null;
  };
  this.returnOfferResponseDataStreamsArray = function(sender, offersdp) {
    console.log("returnOfferResponseDataStreamsArray() back to " + sender);
    return null;
  };
  this.onDCMessage = function(sender, dcLabel, data) {
    console.log("onDCMessage() received data from/channel " + sender + "/" + dcLabel + ":" + data);
  };
  this.onDone_initiatePeerConnection = function(pC, toWho, err) {
    if (err) {
      this.onError(err, "peerConnection");
      return;
    }
    if (pC) {
    }
  };
  this.onError = function(err, cat) {
    console.log("onError() " + err + " category: " + cat);
  };
  this.onICE = function(peerName, ice) {
    console.log("onICE() from " + peerName);
    return false;
  };
  this.onOffer = function(sender, sdp) {
    console.log("onOffer() from " + sender);
    return false;
  };
  this.onAnswer = function(sender, sdp) {
    console.log("onAnswer() from " + sender);
    return false;
  };
};
