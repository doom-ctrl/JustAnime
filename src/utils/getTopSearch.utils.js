import client from '@/src/lib/api/miruro.client';
import { mapAnimeCard } from '@/src/lib/api/mappers';

const getTopSearch = async () => {
  try {
    // Check cache (7 days)
    const storedData = localStorage.getItem("topSearch");
    if (storedData) {
      const { data, timestamp } = JSON.parse(storedData);
      if (Date.now() - timestamp <= 7 * 24 * 60 * 60 * 1000) {
        return data;
      }
    }

    // Fetch trending anime as top search results
    const response = await client.get('/trending', { params: { page: 1, per_page: 10 } });
    const results = (response.data.results || []).map(anime => mapAnimeCard(anime));

    if (results.length) {
      localStorage.setItem(
        "topSearch",
        JSON.stringify({ data: results, timestamp: Date.now() })
      );
      return results;
    }
    return [];
  } catch (error) {
    console.error("Error fetching top search data:", error);
    return null;
  }
};

export default getTopSearch;
