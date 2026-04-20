import client from '@/src/lib/api/miruro.client';

export default async function fetchVoiceActorInfo(id, page = 1) {
  try {
    // Get anime info which includes characters with voice actors
    const response = await client.get(`/info/${id}`);
    const anime = response.data;

    if (anime?.charactersVoiceActors) {
      return anime.charactersVoiceActors;
    }

    // Fallback to characters endpoint
    const charResponse = await client.get(`/anime/${id}/characters`, {
      params: { page, per_page: 25 }
    });

    return charResponse.data.characters || [];
  } catch (error) {
    console.error("Error fetching voice actor info:", error);
    return [];
  }
}
