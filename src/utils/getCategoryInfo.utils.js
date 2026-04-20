import client from '@/src/lib/api/miruro.client';
import { mapAnimeCard } from '@/src/lib/api/mappers';

const getCategoryInfo = async (path, page = 1) => {
  try {
    // path can be: genre, trending, popular, recent, upcoming, etc.
    // Convert path to Miruro parameters
    
    let params = { page, per_page: 20 };
    
    // Handle genre
    if (path.startsWith('genre/')) {
      const genre = path.replace('genre/', '').replace(/-/g, ' ');
      params.genre = genre.charAt(0).toUpperCase() + genre.slice(1);
      params.sort = 'POPULARITY_DESC';
    }
    // Handle specific endpoints
    else if (path === 'trending') {
      params.sort = 'TRENDING_DESC';
    } else if (path === 'popular') {
      params.sort = 'POPULARITY_DESC';
    } else if (path === 'recent' || path === 'ongoing') {
      params.status = 'RELEASING';
      params.sort = 'START_DATE_DESC';
    } else if (path === 'upcoming') {
      params.status = 'NOT_YET_RELEASED';
      params.sort = 'POPULARITY_DESC';
    } else if (path === 'completed') {
      params.status = 'FINISHED';
      params.sort = 'POPULARITY_DESC';
    } else {
      // Default to trending
      params.sort = 'TRENDING_DESC';
    }

    const response = await client.get('/filter', { params });
    const results = (response.data.results || []).map(anime => mapAnimeCard(anime));

    return {
      data: results,
      totalPages: response.data.hasNextPage ? response.data.page + 1 : response.data.page,
      page: response.data.page,
    };
  } catch (err) {
    console.error("Error fetching category info:", err);
    return { data: [], totalPage: 1, page: 1 };
  }
};

export default getCategoryInfo;
