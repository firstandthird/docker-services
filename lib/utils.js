
exports.arrToObj = function(arr) {
  const obj = {};
  arr.forEach(kvp => {
    const kvArr = kvp.split('=');
    const kvar = kvArr.shift();
    obj[kvar] = kvArr.join('=');
  });

  return obj;
};

exports.objToArr = function(obj) {
  const arr = [];
  Object.keys(obj).forEach(key => {
    const str = `${key}=${obj[key]}`;
    arr.push(str);
  });

  return arr;
};
