import client from '@/src/lib/api/miruro.client';

/**
 * Get streaming sources for an episode
 * @param {string} episodeId - Full episode ID (e.g., "watch/kiwi/21/sub/animekai-1")
 * @returns {Promise<Object>} Streams, subtitles, intro/outro
 */
export default async function getStreamInfo(episodeId, retries = 2) {
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (!episodeId) {
        throw new Error('Episode ID is required');
      }
      
      // episodeId is the full path like "watch/kiwi/21/sub/animekai-1"
      // Just pass it directly to the API
      const url = `/${episodeId}`;
      
      console.log(`[getStreamInfo] Fetching (attempt ${attempt + 1}): ${url}`);
      const response = await client.get(url);
      const data = response.data;

      // Transform streams
      const streams = (data.streams || []).map(s => ({
        url: s.url,
        type: s.type, // 'hls' or 'embed'
        quality: s.quality || 'auto',
        iframe: s.type === 'embed' ? s.url : null,
      }));

      // Transform subtitles
      const subtitles = (data.subtitles || []).map(s => ({
        file: s.file,
        label: s.label,
        kind: s.kind || 'captions',
        default: s.default || false,
      }));

      // Create streamingLink format for Player compatibility
      const streamingLink = streams.map(s => ({
        link: s.url,
        type: s.type,
        quality: s.quality,
        iframe: s.iframe,
      }));

      return {
        streams,
        streamingLink, // For Player.jsx compatibility
        subtitles,
        intro: data.intro || null,
        outro: data.outro || null,
        download: data.download || null,
      };
    } catch (error) {
      lastError = error;
      console.warn(`[getStreamInfo] Attempt ${attempt + 1} failed:`, error.message);
      
      // If it's a 444 (rate limit/connection closed), wait and retry
      if (error.response?.status === 444 && attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      
      // For other errors or final attempt, throw
      break;
    }
  }
  
  console.error('[getStreamInfo] All attempts failed:', lastError);
  throw lastError;
}
