function sleep(time) {
  var p = new Promise(function(resolve, reject) {
    window.setTimeout(function() {
      resolve();
    }, time);
  });
  return p;
}
function strcmp(str1, str2) {
  if (str1 === str2) {
    return 0;
  }
  if (str1 > str2) {
    return 1;
  }
  return -1;
  return str1 == str2 ? 0 : str1 > str2 ? 1 : -1;
  return str1 < str2 ? -1 : str1 > str2 ? 1 : 0;
}
function httpGETSync(url) {
  var request = new XMLHttpRequest;
  request.open("GET", url, false);
  request.send(null);
  if (request.status === 200) {
    return request.responseText;
  }
  throw request.responseText;
}
function httpGETAsync(url, callback, errorCallback) {
  var xmlHttp = new XMLHttpRequest;
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4) {
      if (xmlHttp.status == 200) {
        callback(xmlHttp.responseText);
      } else {
        console.error("The xmlHttp request for " + url + " had an error");
        errorCallback(xmlHttp.responseText);
      }
    }
  };
  xmlHttp.ontimeout = function() {
    console.error("The request for " + url + " timed out.");
    errorCallback("timeout");
  };
  xmlHttp.open("GET", url, true);
  xmlHttp.send(null);
}
function setCookie(cname, cvalue, exdays) {
  var d = new Date;
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  var expires = "expires=" + d.toUTCString();
  document.cookie = cname + "=" + cvalue + "; " + expires;
}
function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}
function generateId() {
  function s4() {
    return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1);
  }
  return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}
function generateId2() {
  function s4() {
    return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1);
  }
  return s4() + s4();
}
function closeWindows() {
  var browserName = navigator.appName;
  var browserVer = parseInt(navigator.appVersion);
  if (browserName == "Microsoft Internet Explorer") {
    var ie7 = document.all && !window.opera && window.XMLHttpRequest ? true : false;
    if (ie7) {
      window.open("", "_parent", "");
      window.close();
    } else {
      this.focus();
      self.opener = this;
      self.close();
    }
  } else {
    try {
      this.focus();
      self.opener = this;
      self.close();
    } catch (e) {
    }
    try {
      window.open("", "_self", "");
      window.close();
    } catch (e$0) {
    }
  }
}
;