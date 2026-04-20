# HLS Proxy Worker for Coco

A Cloudflare Workers proxy that enables playback of HLS streams from cross-origin CDNs by:
1. **Adding CORS headers** to bypass browser restrictions
2. **Rewriting m3u8 playlist URLs** to route segment requests through the proxy

## Deployment

```bash
# Install dependencies
cd hls-proxy
npm install

# Deploy to Cloudflare Workers
npm run deploy
```

## Usage

Once deployed, use the worker URL to proxy requests:

```
https://your-worker.subdomain.workers.dev/proxy?url=<encoded-m3u8-url>
```

Example:
```
https://coco-hls-proxy.your-name.workers.dev/proxy?url=https%3A%2F%2Fvault-99.owocdn.top%2Fstream%2F99%2F01%2Fvideo.m3u8
```

## Integration with Coco

In your app, when you receive the streaming URL from Miruro API, transform it to use the proxy:

**Before (from Miruro):**
```javascript
const streamUrl = streams[0].url; // https://vault-99.owocdn.top/stream/.../video.m3u8
```

**After (with proxy):**
```javascript
const proxyBase = "https://coco-hls-proxy.your-name.workers.dev/proxy";
const streamUrl = `${proxyBase}?url=${encodeURIComponent(streams[0].url)}`;
```

This ensures all requests go through your Cloudflare Worker, which adds the necessary CORS headers and rewrites internal playlist URLs.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Cloudflare Worker                  │
├─────────────────────────────────────────────────────────────┤
│  1. Receives: /proxy?url=https://vault-99.owocdn.../video.m3u8
│  2. Fetches: https://vault-99.owocdn.../video.m3u8
│     - Adds Referer header to bypass CDN restrictions
│  3. Parses: m3u8 playlist
│  4. Rewrites: all relative URLs to /proxy?url=<absolute-url>
│  5. Returns: modified playlist + CORS headers
│  6. Browser requests segments through proxy → CORS OK!
└─────────────────────────────────────────────────────────────┘
```

## Testing Locally

```bash
npm run dev
# Then test:
curl "http://localhost:8787/proxy?url=https%3A%2F%2Ftest-streams.mux.dev%2Fx36xhzz%2Fx36xhzz.m3u8"
```

## Limits

- **Free tier**: 100,000 requests/day, 10ms CPU time
- **Paid tier**: Unlimited requests, 50ms CPU time
- Streaming responses don't count against CPU time limits