var btnMuteMic = document.getElementById("btnMuteMic");
var clrOrigBG = "#FFFFFF";
if (btnMuteMic) {
  clrOrigBG = btnMuteMic.style.backgroundColor;
}
var clrSelectedBG = "#7FFF00";
var clrMuted = "#FF6161";
var isMicMuted = false;
var btnMuteSpkr = document.getElementById("btnMuteSpkr");
var isSpkrMuted = false;
var saveVolume = null;
var statusbarel = document.getElementById("statusrow");
function onbtnMuteMic() {
  isMicMuted = !isMicMuted;
  var micel = drVid;
  if (micel.stream != null) {
    WebRTCDeviceClientClass.enableAudioInStream(micel.stream, !isMicMuted);
  }
  micel = paVid;
  if (micel.stream != null) {
    WebRTCDeviceClientClass.enableAudioInStream(micel.stream, !isMicMuted);
  }
  var button = btnMuteMic;
  if (isMicMuted) {
    button.style.backgroundColor = clrMuted;
    button.style.backgroundImage = "url(icon/microphonedisabled.png)";
  } else {
    button.style.backgroundColor = clrOrigBG;
    button.style.backgroundImage = "url(icon/microphone_red.png)";
  }
}
function onbtnMuteSpkr() {
  var sound_els = [drVid, paVid];
  var button = btnMuteSpkr;
  isSpkrMuted = !isSpkrMuted;
  if (isSpkrMuted == true) {
    saveVolume = sound_els[0].volume;
    sound_els[0].volume = 0;
    button.style.backgroundColor = clrMuted;
    button.style.backgroundImage = "url(icon/mute.png)";
    document.getElementById("speakerValue").value = 0;
    for (var i = 1; i < sound_els.length; i++) {
      if (sound_els[i] != undefined) {
        sound_els[i].volume = 0;
      }
    }
  } else {
    if (saveVolume != null) {
      sound_els[0].volume = saveVolume;
      document.getElementById("speakerValue").value = saveVolume * 100;
      for (var i = 1; i < sound_els.length; i++) {
        if (sound_els[i] != undefined) {
          sound_els[i].volume = saveVolume;
        }
      }
    } else {
      document.getElementById("speakerValue").value = 100;
    }
    button.style.backgroundColor = clrOrigBG;
    button.style.backgroundImage = "url(icon/sound_high.png)";
  }
}
function setElementsSoundVolume(percent) {
  var sound_els = [drVid, paVid];
  var v = percent / 100;
  saveVolume = v;
  sound_els[0].volume = saveVolume;
  var button = document.getElementById("btnMuteSpkr");
  if (percent != 0) {
    button.style.backgroundColor = clrOrigBG;
    button.style.backgroundImage = "url(icon/sound_high.png)";
  } else {
    button.style.backgroundColor = clrMuted;
    button.style.backgroundImage = "url(icon/mute.png)";
  }
  for (var i = 1; i < sound_els.length; i++) {
    if (sound_els[i] != undefined) {
      sound_els[i].volume = saveVolume;
    }
  }
}
function statusbar_SetText(text, color, isBold) {
  if (!statusbarel) {
    return;
  }
  statusbarel.innerHTML = text;
}
function statusbar_GetText() {
  if (!statusbarel) {
    return "";
  }
  return statusbarel.innerHTML;
}
var btn_bVideoOn = true;
var vTA = null;
var vTB = null;
function onbtnToggleVideo() {
  if (myRole != "initiator") {
    return;
  }
  btn_bVideoOn = !btn_bVideoOn;
  var button = document.getElementById("btnToggleVideo");
  if (btn_bVideoOn) {
    scc.sendString("unmutevideo", null, scribeID);
    button.style.backgroundColor = clrOrigBG;
  } else {
    scc.sendString("mutevideo", null, scribeID);
    button.style.backgroundColor = clrMuted;
  }
}
var btnSendChat = document.getElementById("btnSendChatText");
var txtChatBox = document.getElementById("txtchatbox");
var txtChatEntry = document.getElementById("txtchatentry");
if (txtChatEntry) {
  txtChatEntry.addEventListener("keydown", function(event) {
    if (event.keyCode == 13) {
      event.preventDefault();
      btnSendChat.click();
    }
  });
}
function onbtnSendChat() {
  var c2 = scribeID;
  if (myRole == "scribe") {
    c2 = myRoomName;
  }
  var data = txtChatEntry.value;
  scc.sendString(data, "chat", c2);
  populateChatBox(myId, data);
  txtChatEntry.value = null;
}
function populateChatBox(sender, data) {
  var str = sender + ":: " + data;
  var prevD = txtChatBox.value;
  str = prevD + str + "\n";
  txtChatBox.value = str;
  txtChatBox.scrollTop = txtChatBox.scrollHeight;
}
var txtTransBox = document.getElementById("txttransbox");
var keyCount = 0;
setInterval(sendTransBox, 1000);
if (txtTransBox) {
  txtTransBox.addEventListener("keydown", function(event) {
    keyCount += 1;
  });
}
function sendTransBox() {
  if (keyCount == 0) {
    return;
  }
  keyCount = 0;
  var data = txtTransBox.value;
  scc.sendString(data, "transcription", myRoomName);
}
function populateTransBox(data) {
  txtTransBox.value = data;
}
;