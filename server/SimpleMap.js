module.exports = {newMap:function(mapname) {
  return new SimpleMap(mapname);
}};
var SimpleMap = function(mapname) {
  if (!mapname) {
    mapname = "";
  }
  this.name = mapname;
  this.keys = [];
  this.values = [];
  this.lt = 0;
};
SimpleMap.prototype.length = function() {
  return this.lt;
};
SimpleMap.prototype.getKeys = function() {
  var na = this.keys.slice();
  return na;
};
SimpleMap.prototype.getValues = function() {
  var na = this.values.slice();
  return na;
};
SimpleMap.prototype.add = function(key, value, bAllowDuplicates) {
  if (bAllowDuplicates == undefined || bAllowDuplicates == false) {
    var existing = this.get(key);
    if (existing != undefined) {
      this.remove(key);
    }
  }
  this.keys.push(key);
  this.values.push(value);
  this.lt += 1;
};
SimpleMap.prototype.get = function(key) {
  if (key == undefined) {
    return undefined;
  }
  var i;
  for (i = 0; i < this.lt; i++) {
    if (this.keys[i] == key) {
      return this.values[i];
    }
  }
  return undefined;
};
SimpleMap.prototype.remove = function(key) {
  console.log("SimpleMap remove for key:" + key + "current length=" + this.lt);
  var numRemoved = 0;
  var i;
  var nk = [];
  var nv = [];
  for (i = 0; i < this.lt; i++) {
    if (this.keys[i] == key) {
      this.keys[i] = undefined;
      this.values[i] = undefined;
      numRemoved += 1;
      console.log("  Key Match! continue");
      continue;
    }
    nk.push(this.keys[i]);
    nv.push(this.values[i]);
  }
  delete this.keys;
  delete this.values;
  this.keys = nk;
  this.values = nv;
  this.lt = this.lt - numRemoved;
  console.log("  Lt after remove=" + this.lt);
  console.log("  Lt of new arrays %d  %d", this.keys.length, this.values.length);
};