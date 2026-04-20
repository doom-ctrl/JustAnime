import client from '@/src/lib/api/miruro.client';
import { mapAnimeInfo } from '@/src/lib/api/mappers';

export default async function fetchAnimeInfo(id, random = false) {
  try {
    if (random) {
      // Get random anime ID from trending
      const trendingRes = await client.get('/trending', { params: { page: 1, per_page: 50 } });
      const results = trendingRes.data.results || [];
      if (results.length === 0) {
        throw new Error('No anime found');
      }
      const randomIndex = Math.floor(Math.random() * results.length);
      id = results[randomIndex].id;
    }

    // Fetch full anime info from Miruro
    const response = await client.get(`/info/${id}`);
    const anime = response.data;

    if (!anime) {
      throw new Error('Anime not found');
    }

    // Transform to app format
    const mappedAnime = mapAnimeInfo(anime);

    // Miruro doesn't have seasons data in the same way
    // We can check for sequels/spin-offs in relations
    const seasons = mappedAnime.related_data
      ?.filter(r => r.type === 'SEASON' || r.type === 'PREQUEL' || r.type === 'SEQUEL')
      ?.map(r => ({
        id: r.id,
        season: r.title,
        season_poster: r.poster,
        season_year: r.seasonYear,
      })) || [];

    return {
      data: mappedAnime,
      seasons,
    };
  } catch (error) {
    console.error('Error fetching anime info:', error);
    throw error;
  }
}
