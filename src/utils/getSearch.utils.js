import client from '@/src/lib/api/miruro.client';
import { mapAnimeCard } from '@/src/lib/api/mappers';

const getSearch = async (keyword, page = 1, perPage = 20) => {
  try {
    const response = await client.get('/search', {
      params: {
        query: keyword,
        page,
        per_page: perPage,
      },
    });

    const data = response.data;

    // Transform results to match existing format
    const results = (data.results || []).map(anime => mapAnimeCard(anime));

    return {
      data: results,
      totalPage: data.hasNextPage ? data.page + 1 : data.page,
      page: data.page,
      hasNextPage: data.hasNextPage,
    };
  } catch (error) {
    console.error('Error fetching search results:', error);
    throw error;
  }
};

export default getSearch;
