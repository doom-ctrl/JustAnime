# Plan: Integrate Miruro API into JustAnime

## Context

The app currently uses GogoAnime API which requires a custom backend. The user wants to switch to Miruro API, which:
- Is already self-hosted (Python FastAPI in `API/Miruro-API/`)
- Uses AniList GraphQL for metadata
- Has an HLS proxy (Cloudflare Worker in `API/hls-proxy/`) for CORS-bypass on video streams
- Provides clean REST endpoints

## Decisions
- **URL format**: Use AniList IDs directly (e.g., `/watch/21?ep=1`)
- **Watch history**: Start fresh (no migration needed)
- **API key**: Required authentication
- **Episode descriptions**: Less detailed than GogoAnime - acceptable

## Approach

1. Configure environment variables for Miruro API and HLS Proxy
2. Create API client and data transformation layer
3. Update all utility files to use Miruro endpoints
4. Update Watch hook and Player for Miruro's provider structure
5. Test and verify all pages work

## Files to Modify

### Configuration
- `.env.example`
- Create `src/lib/api/miruro.config.js`
- Create `src/lib/api/miruro.client.js`

### Utility Files
- `src/utils/getHomeInfo.utils.js`
- `src/utils/getAnimeInfo.utils.js`
- `src/utils/getEpisodes.utils.js`
- `src/utils/getServers.utils.js`
- `src/utils/getStreamInfo.utils.js`
- `src/utils/getSearch.utils.js`
- `src/utils/getScheduleInfo.utils.js`
- Create `src/utils/mappers/miruro.mapper.js`

### Hooks
- `src/hooks/useWatch.js`

### Components
- `src/components/player/Player.jsx`

## Steps

### Phase 1: Configuration & Client
- [ ] 1.1 Update `.env.example`:
  ```
  VITE_MIRURO_API_URL=https://your-miruro-api.railway.app
  VITE_HLS_PROXY_URL=https://your-hls-proxy.workers.dev
  VITE_API_KEY=your_api_key
  ```
- [ ] 1.2 Create `src/lib/api/miruro.config.js`:
  ```javascript
  export const MIRURO_API_URL = import.meta.env.VITE_MIRURO_API_URL;
  export const HLS_PROXY_URL = import.meta.env.VITE_HLS_PROXY_URL;
  export const API_KEY = import.meta.env.VITE_API_KEY;
  ```
- [ ] 1.3 Create `src/lib/api/miruro.client.js`:
  ```javascript
  import axios from 'axios';
  import { MIRURO_API_URL, API_KEY } from './miruro.config';
  
  const client = axios.create({
    baseURL: MIRURO_API_URL,
    headers: { 'x-api-key': API_KEY }
  });
  
  export default client;
  ```

### Phase 2: Home Page Data
- [ ] 2.1 Update `src/utils/getHomeInfo.utils.js`:
  - Fetch in parallel: `/trending`, `/spotlight`, `/popular`, `/recent`
  - Transform AniList response to existing format using mapper
  - Response shape: `{ spotlights, trending, top_airing, most_popular, ... }`

### Phase 3: Search & Discovery
- [ ] 3.1 Update `src/utils/getSearch.utils.js`:
  ```javascript
  GET /search?query={keyword}&page={page}
  ```
- [ ] 3.2 Update `src/utils/getScheduleInfo.utils.js`:
  ```javascript
  GET /schedule
  ```

### Phase 4: Anime Info Page
- [ ] 4.1 Update `src/utils/getAnimeInfo.utils.js`:
  ```javascript
  GET /info/{anilist_id}
  ```
- Transform to existing format: `{ id, title, poster, banner, animeInfo: { tvInfo, Overview }, charactersVoiceActors, related_data, recommended_data, seasons }`

### Phase 5: Episodes & Streaming
- [ ] 5.1 Update `src/utils/getEpisodes.utils.js`:
  ```javascript
  GET /episodes/{anilist_id}
  ```
  - Transform to: `{ episodes: [{ id, episode_no, title, ... }], totalEpisodes }`
  - Use episode number as ID (e.g., `id: "1"` for episode 1)

- [ ] 5.2 Update `src/utils/getServers.utils.js`:
  - Miruro providers (kiwi, arc, zoro) - no separate servers endpoint needed
  - Return providers as server options

- [ ] 5.3 Update `src/utils/getStreamInfo.utils.js`:
  ```javascript
  GET /watch/{provider}/{anilistId}/{category}/{slug}
  // slug format: provider-prefix-{episodeNumber}
  ```
  - Return: `{ streamingLink: [{ link, iframe }], tracks, intro, outro }`

### Phase 6: Watch Hook & Player
- [ ] 6.1 Update `src/hooks/useWatch.js`:
  - Episode ID format: use episode number directly
  - Provider selection: prefer "kiwi" provider
  - Category: "sub" or "dub"

- [ ] 6.2 Update `src/components/player/Player.jsx`:
  ```javascript
  // Apply HLS Proxy to m3u8 URLs
  const HLS_PROXY = import.meta.env.VITE_HLS_PROXY_URL;
  const proxiedUrl = `${HLS_PROXY}/proxy?url=${encodeURIComponent(streamUrl)}`;
  ```

### Phase 7: Data Mappers
- [ ] 7.1 Create `src/utils/mappers/miruro.mapper.js`:
  ```javascript
  // Map AniList anime to card format
  export function mapAnimeCard(anime) {
    return {
      id: String(anime.id),
      title: anime.title?.english || anime.title?.romaji,
      poster: anime.coverImage?.large,
      banner: anime.bannerImage,
      genres: anime.genres,
      status: mapStatus(anime.status),
      totalEpisodes: anime.episodes,
      rating: (anime.averageScore / 10).toFixed(1),
      // ...
    };
  }
  
  // Map episode from Miruro to app format
  export function mapEpisode(ep, anilistId, provider) {
    return {
      id: String(ep.number),  // Use episode number as ID
      episode_no: ep.number,
      title: ep.title,
      // Store provider info for streaming
      provider,
      category: ep.category // 'sub' or 'dub'
    };
  }
  
  // Map streaming response
  export function mapStreamResponse(data) {
    return {
      streamingLink: data.streams?.map(s => ({ link: s.url, type: s.type })),
      tracks: data.subtitles?.map(s => ({ file: s.file, label: s.label, kind: 'captions' })),
      intro: data.intro,
      outro: data.outro
    };
  }
  ```

### Phase 8: URL Route Updates
- [ ] 8.1 Check `src/App.jsx` for route definitions
- [ ] 8.2 Ensure routes accept AniList IDs directly
- [ ] 8.3 Update any hardcoded references to old ID format

### Phase 9: Verification
- [ ] 9.1 Test Home page loads with Miruro data
- [ ] 9.2 Test Search functionality
- [ ] 9.3 Test Anime Info page
- [ ] 9.4 Test Episode list
- [ ] 9.5 Test Video playback with HLS proxy
- [ ] 9.6 Test continue watching functionality

## Miruro API Endpoints Reference

| Miruro Endpoint | Usage |
|-----------------|-------|
| `GET /search?query=&page=&per_page=` | Search anime |
| `GET /trending?page=&per_page=` | Trending anime |
| `GET /popular?page=&per_page=` | Popular anime |
| `GET /recent?page=&per_page=` | Currently airing |
| `GET /spotlight` | Featured anime |
| `GET /schedule` | Airing schedule |
| `GET /info/{anilist_id}` | Full anime details |
| `GET /episodes/{anilist_id}` | Episode list |
| `GET /watch/{provider}/{anilistId}/{category}/{slug}` | Stream sources |

## Streaming Flow

```
1. GET /episodes/{anilistId}
   → Returns providers: kiwi, arc, zoro with episodes by sub/dub

2. Select provider + episode
   → Build slug: "kiwi-{anilistId}-sub-{providerPrefix}-{episodeNumber}"
   → Example: "kiwi-21-sub-animepahe-1"

3. GET /watch/kiwi/21/sub/animepahe-1
   → Returns: { streams: [{ url, type, quality }], subtitles, intro, outro }

4. Apply HLS Proxy for CORS:
   → Original: https://cdn.../video.m3u8
   → Proxied: https://hls-proxy.workers.dev/proxy?url=ENCODED_URL
```
