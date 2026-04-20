import client from '@/src/lib/api/miruro.client';

const getQtip = async (id) => {
  try {
    // Get anime info for tooltip
    const response = await client.get(`/info/${id}`);
    const anime = response.data;

    if (anime) {
      return {
        title: anime.title?.english || anime.title?.romaji || 'Unknown',
        image: anime.coverImage?.large || anime.coverImage?.extraLarge,
        genres: anime.genres || [],
        rating: anime.averageScore ? `${(anime.averageScore / 10).toFixed(1)}/10` : null,
        episodes: anime.episodes,
        status: anime.status,
      };
    }

    return null;
  } catch (err) {
    console.error("Error fetching tooltip info:", err);
    return null;
  }
};

export default getQtip;
