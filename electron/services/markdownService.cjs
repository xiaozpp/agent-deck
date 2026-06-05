const fs = require("node:fs");
const path = require("node:path");

const imageExts = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif"]);

function isRemoteAsset(value) {
  return /^([a-z]+:)?\/\//i.test(value) || /^data:/i.test(value) || /^blob:/i.test(value);
}

function extractImageReferences(content) {
  const refs = [];
  for (const match of content.matchAll(/!\[[^\]]*]\(\s*<?([^)\s>]+)>?[^)]*\)/g)) {
    refs.push(match[1]);
  }
  for (const match of content.matchAll(/<img[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi)) {
    refs.push(match[1]);
  }
  return [...new Set(refs)];
}

function decodeMarkdown(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString("utf8");
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString("utf16le");
  }
  return buffer.toString("utf8");
}

function mimeType(ext) {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".bmp":
      return "image/bmp";
    case ".ico":
      return "image/x-icon";
    case ".avif":
      return "image/avif";
    default:
      return "application/octet-stream";
  }
}

function resolveLocalImage(markdownDir, reference) {
  if (isRemoteAsset(reference)) return null;
  const clean = reference.replace(/[?#].*$/, "");
  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    decoded = clean;
  }
  const normalized = decoded.replaceAll("/", path.sep);
  const absolute = path.isAbsolute(normalized) ? normalized : path.resolve(markdownDir, normalized);
  if (!fs.existsSync(absolute)) return null;
  const ext = path.extname(absolute);
  if (!imageExts.has(ext.toLowerCase())) return null;
  const info = fs.statSync(absolute);
  if (info.size > 10 * 1024 * 1024) return null;
  return { absolute, key: clean.replaceAll("\\", "/"), ext };
}

function readMarkdownFile(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`文件不存在: ${absolutePath}`);
  }

  const markdownDir = path.dirname(absolutePath);
  const content = decodeMarkdown(fs.readFileSync(absolutePath));
  const images = {};

  for (const reference of extractImageReferences(content)) {
    const local = resolveLocalImage(markdownDir, reference);
    if (!local) continue;
    const data = fs.readFileSync(local.absolute).toString("base64");
    images[local.key] = `data:${mimeType(local.ext)};base64,${data}`;
  }

  return {
    path: absolutePath,
    name: path.basename(absolutePath),
    folderName: path.basename(markdownDir),
    content,
    images,
  };
}

module.exports = {
  extractImageReferences,
  readMarkdownFile,
};
