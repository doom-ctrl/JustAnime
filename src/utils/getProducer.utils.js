import client from '@/src/lib/api/miruro.client';
import { mapAnimeCard } from '@/src/lib/api/mappers';

const getProducer = async (producer, page = 1) => {
  try {
    // Miruro doesn't have a specific producer endpoint
    // Use filter with studios search
    // Note: AniList/Miruro doesn't support direct studio filtering
    // We'll try to search for anime and filter by studio
    const response = await client.get('/search', {
      params: {
        query: producer.replace(/-/g, ' '),
        page,
        per_page: 20,
      },
    });

    const results = (response.data.results || [])
      .filter(anime => anime.studios?.nodes?.some(s => 
        s.name.toLowerCase().includes(producer.replace(/-/g, ' ').toLowerCase())
      ))
      .map(anime => mapAnimeCard(anime));

    return {
      data: results,
      totalPage: response.data.hasNextPage ? response.data.page + 1 : response.data.page,
      page: response.data.page,
    };
  } catch (err) {
    console.error("Error fetching producer info:", err);
    return { data: [], totalPage: 1, page: 1 };
  }
};

export default getProducer;
