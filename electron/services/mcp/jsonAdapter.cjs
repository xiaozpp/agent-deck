function readJsonConfig(readJson, filePath) {
  return readJson(filePath);
}

function writeJsonConfig(writeJsonSafe, filePath, data) {
  return writeJsonSafe(filePath, data);
}

module.exports = {
  readJsonConfig,
  writeJsonConfig,
};
