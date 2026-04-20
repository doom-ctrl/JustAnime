import client from '@/src/lib/api/miruro.client';

const getNextEpisodeSchedule = async (id) => {
  try {
    // Get anime info which includes nextAiringEpisode
    const response = await client.get(`/info/${id}`);
    const anime = response.data;

    if (anime?.nextAiringEpisode) {
      return {
        nextEpisode: anime.nextAiringEpisode.episode,
        nextEpisodeSchedule: anime.nextAiringEpisode.airingAt * 1000, // Convert to ms
        timeUntilAiring: anime.nextAiringEpisode.timeUntilAiring,
      };
    }

    // Fallback: fetch from schedule endpoint
    const scheduleRes = await client.get('/schedule', { params: { page: 1, per_page: 20 } });
    const schedule = scheduleRes.data.results?.find(item => item.id === parseInt(id));
    
    if (schedule?.airingAt) {
      return {
        nextEpisode: schedule.next_episode || schedule.episode,
        nextEpisodeSchedule: schedule.airingAt * 1000,
        timeUntilAiring: schedule.timeUntilAiring,
      };
    }

    return null;
  } catch (err) {
    console.error("Error fetching next episode schedule:", err);
    return null;
  }
};

export default getNextEpisodeSchedule;
