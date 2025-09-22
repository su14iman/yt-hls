# YouTube Live ID - HLS Stream Extractor

A Node.js server that extracts the best possible HLS (m3u8) streaming URLs from YouTube Live streams using yt-dlp. Perfect for IPTV applications, media players, and streaming integrations.

## Features

- 🎥 Extract HLS streaming URLs from YouTube Live channels
- 📺 Support for quality selection (target height and minimum height)
- 🔄 Multiple output formats (direct URL, M3U playlist, redirect)
- 🎯 Smart quality selection with H.264 preference for TV compatibility
- 🐳 Docker support with health checks
- 🌐 CORS enabled for web applications
- ⚡ Fast and lightweight Express.js server

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/su14iman/yt-hls.git
cd yt-hls

# Start with docker-compose
docker-compose up -d

# Or build and run manually
docker build -t yt-hls .
docker run -p 8000:8000 yt-hls
```

### Local Development

```bash
# Install dependencies
npm install

# Make sure yt-dlp is installed
pip3 install -U yt-dlp

# Start the server
node index.js
```

The server will start on `http://localhost:8000`

## API Endpoints

### 1. Get HLS URL (JSON Response)
```
GET /hls_url?url=<youtube_url>&h=<target_height>&min=<min_height>
```

**Parameters:**
- `url` (required): YouTube Live stream URL
- `h` (optional): Target height (e.g., 720, 1080)
- `min` (optional): Minimum acceptable height

**Example:**
```bash
curl "http://localhost:8000/hls_url?url=https://www.youtube.com/@AlekhbariahSY/live&h=720"
```

### 2. Generate M3U Playlist
```
GET /playlist.m3u?url=<youtube_url>&name=<channel_name>&logo=<logo_url>&group=<group_name>&tvg_id=<id>&h=<height>&min=<min_height>
```

**Parameters:**
- `url` (required): YouTube Live stream URL
- `name` (optional): Channel display name (default: "YouTube Live")
- `logo` (optional): Channel logo URL
- `group` (optional): IPTV group name (default: "YouTube")
- `tvg_id` (optional): TVG ID for EPG
- `h` (optional): Target height
- `min` (optional): Minimum height

**Example:**
```bash
curl "http://localhost:8000/playlist.m3u?url=https://www.youtube.com/@AlekhbariahSY/live&name=Al%20Ekhbariah&h=720"
```

### 3. Direct Redirect to Stream
```
GET /redirect.m3u8?url=<youtube_url>&h=<height>&min=<min_height>
```

Returns a 302 redirect directly to the HLS stream URL.

**Example:**
```bash
curl -L "http://localhost:8000/redirect.m3u8?url=https://www.youtube.com/@AlekhbariahSY/live&h=1080"
```

### 4. Health Check
```
GET /
```

Returns "OK" for health monitoring.

## Quality Selection

The server uses intelligent quality selection:

1. **Target Height (`h`)**: Prefers streams at or below the target resolution
2. **Minimum Height (`min`)**: Filters out streams below this resolution
3. **Codec Preference**: Prioritizes H.264 streams for better TV compatibility
4. **Bitrate**: Higher bitrate streams are preferred when resolution is equal

### Quality Examples:
- `h=720`: Get best stream ≤ 720p
- `min=480`: Only streams ≥ 480p
- `h=1080&min=720`: Prefer 1080p, but accept 720p+ if 1080p unavailable

## Use Cases

### IPTV Integration
```m3u
#EXTM3U
#EXTINF:-1 tvg-id="news1" tvg-logo="https://example.com/logo.png" group-title="News",News Channel
http://your-server:8000/redirect.m3u8?url=https://www.youtube.com/@newschannel/live&h=720
```

### Media Player
```bash
# VLC
vlc "http://localhost:8000/redirect.m3u8?url=https://www.youtube.com/@channel/live"

# FFmpeg
ffmpeg -i "http://localhost:8000/hls_url?url=https://www.youtube.com/@channel/live" output.mp4
```

### Web Application
```javascript
const response = await fetch('/hls_url?url=https://www.youtube.com/@channel/live&h=720');
const hlsUrl = await response.text();
// Use with HLS.js or similar player
```

## Environment Variables

- `PORT`: Server port (default: 8000)
- `TZ`: Timezone for Docker container (default: Europe/Berlin)

## Docker Configuration

The included `docker-compose.yml` provides:
- Health checks every 30 seconds
- Automatic restart unless stopped
- Log rotation (10MB max, 3 files)
- Timezone configuration

## Requirements

- Node.js 18+
- yt-dlp (automatically installed in Docker)
- Python 3 (for yt-dlp)
- FFmpeg (for some stream processing)
