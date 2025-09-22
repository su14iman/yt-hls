// index.js
// Server for extracting the best possible HLS (m3u8) from a YouTube Live URL
// Endpoints:
//   GET /hls_url?url=...&h=720&min=480
//   GET /playlist.m3u?url=...&name=...&logo=...&group=...&tvg_id=...&h=720&min=480
//   GET /redirect.m3u8?url=...&h=720&min=480
//   GET http://localhost:8000/redirect.m3u8?url=https://www.youtube.com/@AlekhbariahSY/live&h=1080&min=720

const express = require("express");
const ytdlp = require("yt-dlp-exec");

const PORT = process.env.PORT || 8000;
const app = express();

// Optional: basic CORS for convenience
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// --------- Core extractor ---------
async function extractHls(url, { minHeight = 0, targetHeight = null } = {}) {
  if (!url) throw new Error("missing url");

  // Ask yt-dlp for full JSON; no download
  const info = await ytdlp(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
    format: "best",
  });

  // Collect candidate formats (root + playlist entries if any)
  const collectFormats = (obj) => Array.isArray(obj?.formats) ? obj.formats.map(f => ({ ...f })) : [];
  const all = [];
  if (info) all.push(...collectFormats(info));
  if (Array.isArray(info?.entries)) {
    for (const e of info.entries) all.push(...collectFormats(e));
  }

  // Keep only HLS-like formats (m3u8)
  const hls = all.filter(f => {
    const u = (f.url || "").toLowerCase();
    const ext = (f.ext || "").toLowerCase();
    const proto = (f.protocol || "").toLowerCase();
    return ext === "m3u8" || proto.includes("m3u8") || u.includes(".m3u8");
  });

  // If none found, try hls_manifest_url
  if (!hls.length) {
    const entryWithManifest = Array.isArray(info?.entries)
      ? info.entries.find(e => e.hls_manifest_url)
      : null;
    const manifest = info?.hls_manifest_url || entryWithManifest?.hls_manifest_url;
    if (manifest) return manifest;
    throw new Error("no HLS formats");
  }

  // Scoring: prefer higher height/bitrate; bonus for H.264 for TV compatibility
  const score = (f) => {
    const h = f.height || 0;
    const tbr = f.tbr || 0;
    const isH264 = /avc1|h264/i.test(f.vcodec || "");
    let s = h * 10 + tbr;
    if (isH264) s += 10000;
    return s;
  };

  // Filter by min height / target height
  let candidates = hls.filter(f => (f.height || 0) >= (targetHeight || minHeight || 0));

  if (targetHeight) {
    // Prefer the best candidate <= targetHeight
    const atOrBelow = candidates.filter(f => (f.height || 0) <= targetHeight);
    if (atOrBelow.length) {
      return atOrBelow.sort((a, b) => score(b) - score(a))[0].url;
    }
    // Otherwise fall back to best above target
    if (candidates.length) {
      return candidates.sort((a, b) => score(b) - score(a))[0].url;
    }
  }

  // No target: pick the overall best (respecting minHeight if provided)
  const pool = candidates.length ? candidates : hls;
  return pool.sort((a, b) => score(b) - score(a))[0].url;
}

// --------- Helpers ---------
function parseIntOrNull(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

// --------- Endpoints ---------
app.get("/hls_url", async (req, res) => {
  try {
    const url = (req.query.url || "").trim();
    const targetHeight = parseIntOrNull(req.query.h);
    const minHeight = parseIntOrNull(req.query.min) || 0;

    if (!url) return res.status(400).send("missing ?url");

    const m3u8 = await extractHls(url, { targetHeight, minHeight });
    res.type("text/plain; charset=utf-8").send(m3u8 + "\n");
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    res.status(404).send(msg);
  }
});

app.get("/playlist.m3u", async (req, res) => {
  try {
    const url = (req.query.url || "").trim();
    const name = (req.query.name || "YouTube Live").trim();
    const logo = (req.query.logo || "").trim();
    const group = (req.query.group || "YouTube").trim();
    const tvg_id = (req.query.tvg_id || "").trim();
    const targetHeight = parseIntOrNull(req.query.h);
    const minHeight = parseIntOrNull(req.query.min) || 0;

    if (!url) return res.status(400).send("missing ?url");

    const m3u8 = await extractHls(url, { targetHeight, minHeight });

    const attrs = [];
    if (tvg_id) attrs.push(`tvg-id="${tvg_id}"`);
    if (logo)   attrs.push(`tvg-logo="${logo}"`);
    if (group)  attrs.push(`group-title="${group}"`);
    const attrStr = attrs.join(" ");

    const content = `#EXTM3U
#EXTINF:-1 ${attrStr},${name}
${m3u8}
`;
    res.type("audio/x-mpegurl; charset=utf-8").send(content);
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    res.status(404).send(msg);
  }
});

app.get("/redirect.m3u8", async (req, res) => {
  try {
    const url = (req.query.url || "").trim();
    const targetHeight = parseIntOrNull(req.query.h);
    const minHeight = parseIntOrNull(req.query.min) || 0;

    if (!url) return res.status(400).send("missing ?url");

    const m3u8 = await extractHls(url, { targetHeight, minHeight });
    res.redirect(302, m3u8);
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    res.status(404).send(msg);
  }
});

// Health check
app.get("/", (req, res) => {
  res.type("text/plain").send("OK\n");
});

app.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
