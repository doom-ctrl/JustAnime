import client from '@/src/lib/api/miruro.client';
import { mapAnimeCard, mapSchedule } from '@/src/lib/api/mappers';

export default async function getSchedInfo(date) {
  try {
    // Miruro /schedule returns upcoming episodes with airing times
    // date parameter can be used to filter if needed
    const response = await client.get('/schedule', {
      params: {
        page: 1,
        per_page: 20,
      },
    });

    const data = response.data;

    // Transform results
    const results = (data.results || []).map(item => ({
      ...mapAnimeCard(item),
      nextEpisode: item.next_episode,
      airingAt: item.airingAt ? item.airingAt * 1000 : null, // Convert to ms
      timeUntilAiring: item.timeUntilAiring,
    }));

    // If date is provided, filter by that date
    if (date) {
      const targetDate = new Date(date);
      const filtered = results.filter(item => {
        if (!item.airingAt) return false;
        const airDate = new Date(item.airingAt);
        return airDate.toDateString() === targetDate.toDateString();
      });
      return filtered;
    }

    return results;
  } catch (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }
}
