import client from '@/src/lib/api/miruro.client';

const getSearchSuggestion = async (keyword) => {
  try {
    const response = await client.get('/suggestions', {
      params: { query: keyword }
    });

    const suggestions = response.data.suggestions || [];
    
    // Transform to match what Suggestion component expects
    return suggestions.map(item => ({
      id: String(item.id),
      poster: item.poster,
      title: item.title,
      japanese_title: item.title_romaji,
      releaseDate: item.year ? String(item.year) : null,
      showType: item.format || 'TV',
      duration: item.episodes ? `${item.episodes} eps` : null,
      episodes: item.episodes,
      status: item.status,
    }));
  } catch (err) {
    console.error("Error fetching search suggestions:", err);
    return [];
  }
};

export default getSearchSuggestion;
