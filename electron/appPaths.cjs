const path = require("node:path");

function appRoot(electronApp, dirname) {
  return electronApp.isPackaged ? electronApp.getAppPath() : path.resolve(dirname, "..");
}

function distIndexPath(rootDir) {
  return path.join(rootDir, "dist", "index.html");
}

module.exports = {
  appRoot,
  distIndexPath,
};
