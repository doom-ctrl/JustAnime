import client from '@/src/lib/api/miruro.client';
import {
  mapAnimeCard,
  mapSpotlight,
  mapTopTen,
} from '@/src/lib/api/mappers';

const CACHE_KEY = 'homeInfoCache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function getHomeInfo() {
  const currentTime = Date.now();
  const cachedData = JSON.parse(localStorage.getItem(CACHE_KEY));

  // Return cached data if still valid
  if (cachedData && currentTime - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data;
  }

  try {
    // Fetch all data in parallel
    const [trendingRes, spotlightRes, popularRes, recentRes, upcomingRes] = await Promise.allSettled([
      client.get('/trending', { params: { page: 1, per_page: 20 } }),
      client.get('/spotlight'),
      client.get('/popular', { params: { page: 1, per_page: 20 } }),
      client.get('/recent', { params: { page: 1, per_page: 20 } }),
      client.get('/upcoming', { params: { page: 1, per_page: 10 } }),
    ]);

    // Process trending
    const trending = trendingRes.status === 'fulfilled'
      ? trendingRes.value.data.results?.map((anime, idx) => mapAnimeCard(anime)) || []
      : [];

    // Process spotlight (featured banners)
    const spotlights = spotlightRes.status === 'fulfilled'
      ? spotlightRes.value.data.results?.map(anime => mapSpotlight(anime)) || []
      : [];

    // Process popular
    const most_popular = popularRes.status === 'fulfilled'
      ? popularRes.value.data.results?.map((anime, idx) => ({
          ...mapAnimeCard(anime),
          rank: idx + 1,
        })) || []
      : [];

    // Process recent (latest episodes / currently airing)
    const latest_episode = recentRes.status === 'fulfilled'
      ? recentRes.value.data.results?.map(anime => mapAnimeCard(anime)) || []
      : [];

    // Process upcoming
    const top_upcoming = upcomingRes.status === 'fulfilled'
      ? upcomingRes.value.data.results?.map((anime, idx) => ({
          ...mapAnimeCard(anime),
          rank: idx + 1,
        })) || []
      : [];

    // Top 10 (from trending)
    const topten = trending.slice(0, 10).map((anime, idx) => mapTopTen(anime, idx + 1));

    // Top airing (same as trending)
    const top_airing = trending;

    // Latest completed (from popular)
    const latest_completed = most_popular.slice(0, 10);

    // Most favorite (use trending sorted by favourites - reuse trending)
    const most_favorite = [...trending].sort((a, b) => (b.favourites || 0) - (a.favourites || 0)).slice(0, 10);

    // Today's schedule (extract from recent)
    const todaySchedule = latest_episode.slice(0, 10).map(anime => ({
      ...anime,
      nextEpisode: anime.nextAiringEpisode,
    }));

    // Static genres list (or fetch from filter)
    const genres = [
      'Action', 'Adventure', 'Cars', 'Comedy', 'Crime', 'Dark', 'Drama', 'Ecchi',
      'Fantasy', 'Gourmet', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
      'Sports', 'Supernatural', 'Suspense', 'Avant Garde', 'Award Winning', 'Boys Love',
      'Children', 'Combat Sports', 'Comedy', 'Detective', 'Drama', 'Fantasy', 'Gourmet',
      'Hentai', 'Horror', 'Isekai', 'Josei', 'Kids', 'Live Action', 'Magic', 'Mahjong',
      'Martial Arts', 'Mecha', 'Medical', 'Military', 'Music', 'Mystery', 'Mythology',
      'Organized Crime', 'Otaku Culture', 'Parody', 'Performing Arts', 'Pets',
      'Police', 'Political', 'Psychological', 'Racing', 'Reincarnation', 'Romance',
      'Romantic Subtext', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen',
      'Showbiz', 'Space', 'Sports', 'Strategy Game', 'Super Power', 'Survival', 'Suspense',
      'Swimming', 'Team Sports', 'Time Travel', 'Vampire', 'Video Game', 'Visual Arts', 'VTuber',
      'Workplace', 'Yaoi', 'Yuri'
    ];

    // Deduplicate and limit genres
    const uniqueGenres = [...new Set(genres)].slice(0, 30);

    // Recently added (same as latest episode)
    const recently_added = latest_episode.slice(0, 20);

    const dataToCache = {
      data: {
        spotlights,
        trending,
        topten,
        todaySchedule,
        top_airing,
        most_popular,
        most_favorite,
        latest_completed,
        latest_episode,
        top_upcoming,
        recently_added,
        genres: uniqueGenres,
      },
      timestamp: currentTime,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache));

    return dataToCache.data;
  } catch (error) {
    console.error('Error fetching home info:', error);
    throw error;
  }
}
