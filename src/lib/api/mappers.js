// Miruro API Data Mappers
// Transform AniList/Miruro data to match existing app format

// Provider preferences (in order of quality/reliability)
export const PROVIDER_PREFERENCES = ['kiwi', 'arc', 'zoro', 'jet'];

// Default category (sub = subtitles, dub = english dub)
export const DEFAULT_CATEGORY = 'sub';

/**
 * Map AniList status to app status format
 */
export function mapStatus(status) {
  const statusMap = {
    'RELEASING': 'Ongoing',
    'FINISHED': 'Completed',
    'NOT_YET_RELEASED': 'Upcoming',
    'CANCELLED': 'Cancelled',
    'HIATUS': 'Hiatus',
  };
  return statusMap[status] || status || 'Unknown';
}

/**
 * Map AniList format to app format
 */
export function mapFormat(format) {
  const formatMap = {
    'TV': 'TV',
    'TV_SHORT': 'TV Short',
    'MOVIE': 'Movie',
    'SPECIAL': 'Special',
    'OVA': 'OVA',
    'ONA': 'ONA',
    'MUSIC': 'Music',
  };
  return formatMap[format] || format || 'Unknown';
}

/**
 * Map AniList anime to card format (for lists/grids)
 */
export function mapAnimeCard(anime) {
  if (!anime) return null;
  
  const title = anime.title?.english || anime.title?.romaji || anime.title?.native || 'Unknown';
  const mappedFormat = mapFormat(anime.format);
  
  return {
    id: String(anime.id),
    title: title,
    japanese_title: anime.title?.native || null,
    poster: anime.coverImage?.large || anime.coverImage?.extraLarge || null,
    banner: anime.bannerImage || null,
    genres: anime.genres || [],
    status: mapStatus(anime.status),
    totalEpisodes: anime.episodes || 0,
    rating: anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null,
    sub: true, // Assume sub is available for most anime
    dub: anime.characters?.edges?.some(e => e.voiceActors?.length > 0) || false,
    quality: 'HD',
    ratingValue: anime.averageScore || null,
    popularity: anime.popularity || null,
    favourites: anime.favourites || null,
    format: mappedFormat,
    type: mappedFormat, // Alias for compatibility
    season: anime.season || null,
    seasonYear: anime.seasonYear || null,
    duration: anime.duration || null,
    studios: anime.studios?.nodes?.map(s => s.name) || [],
    description: anime.description?.replace(/<[^>]*>/g, '') || null,
    // For CategoryCard compatibility
    tvInfo: {
      sub: 'SUB',
      dub: anime.characters?.edges?.some(e => e.voiceActors?.length > 0) ? 'DUB' : null,
      showType: mappedFormat,
      rating: anime.averageScore ? `${(anime.averageScore / 10).toFixed(1)}/10` : null,
      duration: anime.duration ? `${anime.duration} m` : null,
    },
    releaseDate: anime.seasonYear ? String(anime.seasonYear) : null,
    isAdult: anime.isAdult || false,
    // Next episode info
    nextAiringEpisode: anime.nextAiringEpisode ? {
      episode: anime.nextAiringEpisode.episode,
      airingAt: anime.nextAiringEpisode.airingAt * 1000,
    } : null,
  };
}

/**
 * Map spotlight data (for hero banner)
 */
export function mapSpotlight(anime) {
  if (!anime) return null;
  
  const mapped = mapAnimeCard(anime);
  return {
    ...mapped,
    description: anime.description?.replace(/<[^>]*>/g, '') || null, // Strip HTML
    isAdult: anime.isAdult || false,
  };
}

/**
 * Map trending/popular anime to TopTen format
 */
export function mapTopTen(anime, rank) {
  if (!anime) return null;
  
  return {
    id: String(anime.id),
    title: anime.title?.english || anime.title?.romaji || 'Unknown',
    poster: anime.coverImage?.large || null,
    rank: rank || 0,
    episodes: anime.episodes || null,
    status: mapStatus(anime.status),
  };
}

/**
 * Map episode from Miruro to app format
 */
export function mapEpisode(ep, provider, category = 'sub') {
  if (!ep) return null;
  
  // The original episode ID from Miruro is the full slug: "watch/kiwi/182300/sub/animepahe-1"
  // We keep this as 'id' for finding the episode, and extract display number from 'number'
  // The slug for stream URL is extracted from the original id
  const originalId = typeof ep.id === 'string' ? ep.id : String(ep.number);
  const episodeSlug = originalId.startsWith('watch/') ? originalId : `watch/${provider}/${ep.anilistId || ''}/${category}/${ep.id}`;
  
  return {
    id: String(ep.number), // Use episode number for display/selection
    episode_no: ep.number,
    title: ep.title || `Episode ${ep.number}`,
    image: ep.image || null,
    airDate: ep.airDate || null,
    duration: ep.duration || null,
    description: ep.description || null,
    filler: ep.filler || false,
    // Store provider info for streaming
    provider: provider,
    category: category,
    // Full original ID (slug) for stream URL
    originalId: originalId,
    // Store provider and category for reference
    providerName: provider,
    categoryType: category,
  };
}

/**
 * Map all episodes from a provider
 */
export function mapEpisodesFromProvider(providerData, provider, category = 'sub') {
  if (!providerData?.episodes) return [];
  
  const episodes = providerData.episodes[category] || providerData.episodes.sub || [];
  return episodes.map(ep => mapEpisode(ep, provider, category));
}

/**
 * Get all available providers from episode data
 */
export function getAvailableProviders(episodeData) {
  const providers = [];
  const rawProviders = episodeData?.providers || {};
  
  for (const [name, data] of Object.entries(rawProviders)) {
    const categories = [];
    if (data?.episodes?.sub?.length > 0) categories.push('sub');
    if (data?.episodes?.dub?.length > 0) categories.push('dub');
    
    if (categories.length > 0) {
      providers.push({
        name,
        categories,
        hasSub: categories.includes('sub'),
        hasDub: categories.includes('dub'),
        episodeCount: {
          sub: data.episodes.sub?.length || 0,
          dub: data.episodes.dub?.length || 0,
        },
      });
    }
  }
  
  return providers;
}

/**
 * Build watch slug for stream URL
 */
export function buildWatchSlug(episode, provider, anilistId) {
  // Extract prefix from original ID
  let prefix = 'episode';
  if (episode.id && typeof episode.id === 'string') {
    // Original format might be like "animepahe-1" or similar
    const parts = episode.id.split('-');
    if (parts.length > 1) {
      prefix = parts.slice(0, -1).join('-');
    }
  }
  
  return `${provider}-${anilistId}-${episode.category}-${prefix}-${episode.episode_no}`;
}

/**
 * Map streaming response to app format
 */
export function mapStreamResponse(data) {
  if (!data) return null;
  
  return {
    streams: data.streams?.map(s => ({
      url: s.url,
      type: s.type, // 'hls' or 'embed'
      quality: s.quality || 'auto',
    })) || [],
    subtitles: data.subtitles?.map(s => ({
      file: s.file,
      label: s.label,
      kind: s.kind || 'captions',
      default: s.default || false,
    })) || [],
    intro: data.intro || null,
    outro: data.outro || null,
  };
}

/**
 * Map anime info (full details page)
 */
export function mapAnimeInfo(anime) {
  if (!anime) return null;
  
  const title = anime.title?.english || anime.title?.romaji || anime.title?.native || 'Unknown';
  
  // Map tvInfo for existing components
  const tvInfo = {
    Japanese: anime.title?.native || null,
    Synonyms: anime.synonyms?.join(', ') || null,
    Aired: formatDateRange(anime.startDate, anime.endDate),
    Premiered: anime.season ? `${anime.season.charAt(0) + anime.season.slice(1).toLowerCase()} ${anime.seasonYear}` : null,
    Duration: anime.duration ? `${anime.duration} min` : null,
    Status: mapStatus(anime.status),
    'MAL Score': anime.averageScore ? `${(anime.averageScore / 10).toFixed(2)}/10` : null,
    Genres: anime.genres || [],
    Studios: anime.studios?.nodes?.map(s => s.name) || [],
    Producers: [], // AniList doesn't have producers in the same way
  };
  
  // Map characters with voice actors
  const charactersVoiceActors = (anime.characters?.edges || []).map(edge => ({
    id: edge.node?.id,
    name: edge.node?.name?.full || edge.node?.name?.native || 'Unknown',
    image: edge.node?.image?.large || edge.node?.image?.medium || null,
    role: edge.role,
    voiceActor: edge.voiceActors?.[0] ? {
      id: edge.voiceActors[0].id,
      name: edge.voiceActors[0].name?.full || 'Unknown',
      image: edge.voiceActors[0].image?.large || null,
      language: edge.voiceActors[0].languageV2 || 'Japanese',
    } : null,
  }));
  
  // Map relations
  const related_data = (anime.relations?.edges || []).map(edge => {
    const node = edge.node;
    return {
      id: String(node.id),
      title: node.title?.english || node.title?.romaji || 'Unknown',
      poster: node.coverImage?.large || null,
      type: edge.relationType,
      format: node.format,
      status: node.status,
      episodes: node.episodes || null,
      meanScore: node.meanScore || null,
    };
  });
  
  // Map recommendations
  const recommended_data = (anime.recommendations?.nodes || [])
    .filter(rec => rec.mediaRecommendation)
    .map(rec => ({
      id: String(rec.mediaRecommendation.id),
      title: rec.mediaRecommendation.title?.english || rec.mediaRecommendation.title?.romaji || 'Unknown',
      poster: rec.mediaRecommendation.coverImage?.large || null,
      rating: rec.rating || 0,
    }));
  
  // Get next episode info
  const nextAiringEpisode = anime.nextAiringEpisode ? {
    episode: anime.nextAiringEpisode.episode,
    airingAt: anime.nextAiringEpisode.airingAt * 1000, // Convert to ms
    timeUntilAiring: anime.nextAiringEpisode.timeUntilAiring,
  } : null;
  
  return {
    id: String(anime.id),
    data_id: String(anime.id),
    title: title,
    japanese_title: anime.title?.native || null,
    poster: anime.coverImage?.extraLarge || anime.coverImage?.large || null,
    banner: anime.bannerImage || null,
    animeInfo: {
      tvInfo,
      Overview: anime.description?.replace(/<[^>]*>/g, '') || null, // Strip HTML
    },
    genres: anime.genres || [],
    status: mapStatus(anime.status),
    ratingValue: anime.averageScore,
    rating: anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null,
    popularity: anime.popularity || null,
    favourites: anime.favourites || null,
    totalEpisodes: anime.episodes,
    duration: anime.duration,
    format: anime.format,
    season: anime.season,
    seasonYear: anime.seasonYear,
    source: anime.source,
    charactersVoiceActors,
    related_data,
    recommended_data,
    nextAiringEpisode,
    isAdult: anime.isAdult || false,
    trailer: anime.trailer?.id ? {
      id: anime.trailer.id,
      site: anime.trailer.site,
      thumbnail: anime.trailer.thumbnail,
    } : null,
    siteUrl: anime.siteUrl,
    externalLinks: anime.externalLinks || [],
    streamingEpisodes: anime.streamingEpisodes || [],
    tags: anime.tags?.map(t => ({ name: t.name, rank: t.rank, isSpoiler: t.isMediaSpoiler })) || [],
    stats: anime.stats || {},
  };
}

/**
 * Map schedule data
 */
export function mapSchedule(schedule) {
  if (!schedule) return null;
  
  return {
    airingAt: schedule.airingAt ? schedule.airingAt * 1000 : null, // Convert to ms
    episode: schedule.next_episode || schedule.episode,
    timeUntilAiring: schedule.timeUntilAiring,
    media: mapAnimeCard(schedule),
  };
}

/**
 * Helper to format date range
 */
function formatDateRange(startDate, endDate) {
  if (!startDate) return 'Unknown';
  
  const formatDate = (date) => {
    if (!date) return '';
    const parts = [date.year];
    if (date.month) parts.push(String(date.month).padStart(2, '0'));
    if (date.day) parts.push(String(date.day).padStart(2, '0'));
    return parts.join('-');
  };
  
  const start = formatDate(startDate);
  const end = endDate ? formatDate(endDate) : '?';
  
  return start === end ? start : `${start} to ${end}`;
}
