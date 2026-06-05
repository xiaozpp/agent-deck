const fs = require("node:fs");
const path = require("node:path");

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function backupFile(filePath) {
  if (!exists(filePath)) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = `${filePath}.bak-${ts}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function writeJsonSafe(filePath, data) {
  const backup = backupFile(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return backup;
}

function writeTextSafe(filePath, content) {
  const backup = backupFile(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  return backup;
}

module.exports = {
  exists,
  readJson,
  readText,
  writeJsonSafe,
  writeTextSafe,
};
