# Coco Streaming System Architecture

A technical overview of how the Coco anime streaming application integrates with the Miruro API and uses an HLS proxy to enable cross-origin video streaming.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COCO FRONTEND                                  │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│  │  HomePage   │   │ BrowsePage  │   │ DetailsPage │   │  WatchPage  │   │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   │
│         │                 │                 │                 │           │
│  ┌──────┴─────────────────┴─────────────────┴─────────────────┴──────┐    │
│  │                     React 19 + Vite                                │    │
│  │              (API Client, Hooks, Components)                       │    │
│  └──────────────────────────┬────────────────────────────────────────┘    │
└─────────────────────────────┼──────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MIRURO API                                           │
│                  (https://miruro-api-production.up.railway.app)            │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│  │  /search    │   │  /trending  │   │  /info/:id  │   │ /episodes   │   │
│  │  /filter    │   │  /popular   │   │  /sources   │   │             │   │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HLS PROXY (Cloudflare Worker)                           │
│            (https://coco-hls-proxy.samoeiethan.workers.dev)                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Adds CORS headers                                                │   │
│  │  • Rewrites m3u8 playlist URLs                                      │   │
│  │  • Forwards Referer header to bypass CDN restrictions               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│                    ┌─────────────────┐                                     │
│                    │  Video CDN      │                                     │
│                    │ (vault-99.owocdn│                                     │
│                    │  .top, etc.)    │                                     │
│                    └─────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. API Integration

### Configuration

The frontend communicates with the Miruro API, which is a third-party anime API built on AniList data. Configuration is managed in:

**`src/lib/api/config.js`**

```javascript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://miruro-api-production.up.railway.app';
export const API_KEY = import.meta.env.VITE_API_KEY || '';
```

The `.env` file contains:

```
VITE_API_URL=https://miruro-api-production.up.railway.app
VITE_API_KEY=KiLXgGxlzxwNKz4IQ1wJV-tj035olvg92dBknWin7XM
```

### API Client Features

**`src/lib/api.js`** provides:

| Feature | Implementation |
|---------|----------------|
| **Request/Response Interceptors** | Hook system for modifying requests and responses |
| **Rate Limiting** | Configurable requests per minute |
| **Caching** | In-memory cache with TTL (default 5 min) |
| **Retry Logic** | Exponential backoff for failed requests |
| **Error Handling** | Custom `ApiError` class with status codes |

```javascript
// Example: Adding interceptors
import { addRequestInterceptor, addResponseInterceptor } from '@/lib/api';

addRequestInterceptor((options) => {
  // Modify request before sending
  return { ...options, credentials: 'include' };
});
```

### API Endpoints

**`src/lib/api/endpoints.js`** exposes all available endpoints:

| Category | Endpoints |
|----------|-----------|
| **Search** | `search()`, `getSuggestions()`, `filter()` |
| **Collections** | `getTrending()`, `getPopular()`, `getUpcoming()`, `getRecent()`, `getSpotlight()`, `getSchedule()` |
| **Details** | `getAnimeInfo()`, `getCharacters()`, `getRelations()`, `getRecommendations()` |
| **Streaming** | `getEpisodes()`, `getSources()`, `getWatchSources()` |

---

## 2. Frontend Hooks

The React hooks in **`src/hooks/useWatch.js`** manage the streaming flow:

```javascript
// Fetch episodes for an anime
const { data: episodesData } = useEpisodes(animeId);

// Get streaming sources for a specific episode
const { data: streamData } = useStreamUrl(episodeId);

// Manage watch session (progress, timestamps)
const { currentTimestamp, updateTimestamp } = useWatchSession(animeId, anime);

// Handle provider selection (kiwi, gogo, etc.)
const { episodes, selectProvider, selectCategory } = useProviderSelector(episodesData);
```

### Watch Progress Persistence

Watch history is stored in `localStorage`:

```javascript
// Auto-save every 10 seconds
saveWatchProgress(animeId, currentEpisode, timestamp, animeInfo);

// Stores up to 50 entries
const STORAGE_KEYS = {
  WATCH_HISTORY: 'coco_watch_history',
  FAVORITES: 'coco_favorites',
};
```

---

## 3. Streaming Flow

### Step-by-Step Process

```
1. User navigates to /watch/:animeId?ep=1

2. Frontend fetches episode list:
   GET /episodes/:animeId
   Response: { providers: { kiwi: { episodes: { sub: [...], dub: [...] } } } }

3. User selects episode → Frontend fetches stream sources:
   GET /sources?episodeId=xxx&provider=kiwi&category=sub
   Response: {
     streams: [
       { type: 'hls', url: 'https://vault-99.owocdn.top/stream/.../video.m3u8', quality: '1080p' },
       { type: 'embed', url: 'https://embed-url...', quality: '720p' }
     ],
     subtitles: [...],
     intro: { start: 0, end: 90 },
     outro: { start: 1380, end: 1500 }
   }

4. For HLS streams → Route through HLS Proxy:
   Original:  https://vault-99.owocdn.top/stream/.../video.m3u8
   Proxied:   https://coco-hls-proxy.samoeiethan.workers.dev/proxy?url=...

5. Video player plays the stream
```

---

## 4. HLS Proxy (Cloudflare Worker)

### Purpose

The HLS proxy solves **CORS (Cross-Origin Resource Sharing)** issues when playing video streams from third-party CDNs. Browsers block requests to different origins unless the server explicitly allows them.

### Architecture

**`hls-proxy/src/index.ts`** (Cloudflare Worker):

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    // 1. Extract target URL from query parameter
    const targetUrl = url.searchParams.get('url'); // https://vault-99.owocdn.top/.../video.m3u8

    // 2. Forward request with headers to bypass CDN restrictions
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 ...',
      'Referer': parsedUrl.origin,  // Required by some CDNs
    };
    const response = await fetch(parsedUrl.href, { headers: fetchHeaders });

    // 3. If it's an m3u8 playlist, rewrite all internal URLs
    if (isM3u8(contentType, parsedUrl.href)) {
      const m3u8Content = await response.text();
      // Rewrite: /segment/001.ts → /proxy?url=https://cdn.../segment/001.ts
      const rewrittenLines = lines.map(line => {
        if (line is segment URL) {
          return `/proxy?url=${encodeURIComponent(resolveUrl(line))}`;
        }
        return line;
      });
      responseBody = rewrittenLines.join('\n');
    }

    // 4. Add CORS headers to response
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(responseBody, { headers: responseHeaders });
  }
};
```

### URL Rewriting Explained

Original m3u8 playlist:
```
#EXTM3U
#EXT-X-KEY:METHOD=AES-128,URI="key.bin"
#EXTINF:10.0,
segment/001.ts
#EXTINF:10.0,
segment/002.ts
```

Proxied response:
```
#EXTM3U
#EXT-X-KEY:METHOD=AES-128,URI="/proxy?url=https://cdn.../key.bin"
#EXTINF:10.0,
/proxy?url=https://cdn.../segment/001.ts
#EXTINF:10.0,
/proxy?url=https://cdn.../segment/002.ts
```

This ensures **all requests** (including video segments) go through the proxy, maintaining CORS compliance.

### Deployment

```bash
cd hls-proxy
npm install
npm run deploy  # Wrangler CLI deploys to Cloudflare Workers
```

---

## 5. WatchPage Implementation

**`src/pages/WatchPage.jsx`** ties everything together:

```javascript
// Hardcoded HLS Proxy URL (could move to env)
const HLS_PROXY = "https://coco-hls-proxy.samoeiethan.workers.dev/proxy";

// Stream selection logic - prefer embed, fallback to HLS
const validStreams = useMemo(() => {
  // Embed streams (iframe) don't need proxy
  const embedStreams = streamData?.streams?.filter(s => s.type === 'embed' && s.url) || [];
  if (embedStreams.length > 0) return embedStreams;
  
  // HLS streams need proxy for CORS
  return streamData?.streams?.filter(s => s.type === 'hls' && s.url) || [];
}, [streamData]);

// Apply proxy to HLS URLs
useEffect(() => {
  if (validStreams[0]?.type === 'embed') {
    setStreamUrl(url);  // Direct URL for iframe
  } else {
    // HLS - route through proxy
    setStreamUrl(`${HLS_PROXY}?url=${encodeURIComponent(url)}`);
  }
}, [streamData]);
```

### Player Component

**`src/components/Player.jsx`** (hls.js-based) handles:

- HLS stream playback
- Quality switching
- Intro/outro skipping
- Progress tracking
- Keyboard navigation (arrow keys for episode skip)

---

## 6. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER ACTION: Click "Episode 5"                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WATCHPAGE COMPONENT                                                          │
│ • setCurrentEpisode(5)                                                      │
│ • Triggers useStreamUrl(episodeId)                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ useWatch.js HOOK → endpoints.getSources(episodeId)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ api.js CLIENT → GET https://miruro-api.../sources?episodeId=xxx            │
│                                                                             │
│ Returns:                                                                    │
│ {                                                                           │
│   streams: [{ type: 'hls', url: 'https://vault-99.owocdn.top/...', ... }], │
│   subtitles: [...],                                                         │
│   intro: { start: 0, end: 85 },                                            │
│   outro: { start: 1320, end: 1440 }                                        │
│ }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ WATCHPAGE PROCESSES RESPONSE                                                │
│ • Extracts stream URL                                                       │
│ • Applies HLS Proxy: https://coco-hls-proxy.../proxy?url=ENCODED_URL      │
│ • Sets streamUrl state                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ VIDEO PLAYER (hls.js)                                                       │
│ • Loads proxied m3u8 playlist                                              │
│ • Proxy fetches original m3u8, rewrites URLs, adds CORS                   │
│ • hls.js loads segments through proxy                                      │
│ • Video plays!                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | `https://miruro-api-production.up.railway.app` | Miruro API base URL |
| `VITE_API_KEY` | `KiLXgGxlzxwNKz4IQ1wJV-...` | API authentication |
| `VITE_PROXY_URL` | (optional) | Alternative M3U8 proxy |

---

## 8. Key Files Reference

| File | Purpose |
|------|---------|
| `src/lib/api.js` | Core API client with caching, retries, interceptors |
| `src/lib/api/config.js` | API configuration |
| `src/lib/api/endpoints.js` | All API endpoint functions |
| `src/lib/proxy.js` | M3U8 proxy utilities (optional) |
| `src/hooks/useWatch.js` | Streaming hooks, localStorage persistence |
| `src/pages/WatchPage.jsx` | Main watch page with player |
| `src/components/Player.jsx` | Video player with hls.js |
| `hls-proxy/src/index.ts` | Cloudflare Worker for CORS bypass |

---

## 9. Known Limitations

1. **Hardcoded Proxy URL**: The HLS proxy URL is hardcoded in `WatchPage.jsx`. Consider moving to environment variable.
2. **Embed Streams**: Some episodes only have embed (iframe) streams, which load external players.
3. **Provider Dependencies**: Streaming availability depends on Miruro API providers (kiwi, gogo, etc.).
4. **CORS Restrictions**: Without the proxy, most video CDNs would block browser requests.