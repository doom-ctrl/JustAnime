import client from '@/src/lib/api/miruro.client';
import { mapEpisodesFromProvider, getAvailableProviders, PROVIDER_PREFERENCES, DEFAULT_CATEGORY } from '@/src/lib/api/mappers';

export default async function getEpisodes(id) {
  try {
    const response = await client.get(`/episodes/${id}`);
    const data = response.data;

    // Get available providers
    const providers = getAvailableProviders(data);

    if (providers.length === 0) {
      return {
        episodes: [],
        totalEpisodes: 0,
        providers: [],
        allEpisodesByProvider: {},
      };
    }

    // Sort providers by preference
    const preferredNames = PROVIDER_PREFERENCES.filter(p => providers.some(pr => pr.name === p));
    const sortedProviders = [
      ...preferredNames.map(name => providers.find(pr => pr.name === name)),
      ...providers.filter(p => !PROVIDER_PREFERENCES.includes(p.name))
    ].filter(Boolean);

    console.log('[getEpisodes] All providers:', sortedProviders.map(p => p.name));
    
    // Get all episodes from all providers
    const allEpisodesByProvider = {};
    for (const provider of sortedProviders) {
      const providerData = data.providers?.[provider.name];
      if (!providerData) continue;

      console.log('[getEpisodes] Processing provider:', provider.name);


      // Get sub episodes
      const subEpisodes = mapEpisodesFromProvider(providerData, provider.name, 'sub');
      console.log('[getEpisodes] Mapped', subEpisodes.length, 'sub episodes for', provider.name);
      
      if (subEpisodes.length > 0) {
        allEpisodesByProvider[provider.name] = {
          sub: subEpisodes,
          dub: [],
        };
      }

      // Get dub episodes
      if (provider.hasDub) {
        const dubEpisodes = mapEpisodesFromProvider(providerData, provider.name, 'dub');
        if (dubEpisodes.length > 0) {
          if (allEpisodesByProvider[provider.name]) {
            allEpisodesByProvider[provider.name].dub = dubEpisodes;
          } else {
            allEpisodesByProvider[provider.name] = {
              sub: [],
              dub: dubEpisodes,
            };
          }
        }
      }
    }
    console.log('[getEpisodes] allEpisodesByProvider keys:', Object.keys(allEpisodesByProvider));

    // Use preferred provider for initial episodes
    const preferredProvider = sortedProviders[0];
    if (!preferredProvider) {
      return { episodes: [], totalEpisodes: 0, providers: [], allEpisodesByProvider: {} };
    }
    
    const providerData = data.providers?.[preferredProvider.name];

    // Get episodes for default category (sub)
    let episodes = mapEpisodesFromProvider(providerData, preferredProvider.name, DEFAULT_CATEGORY);

    // If no sub episodes, try dub
    if (episodes.length === 0 && preferredProvider.hasDub) {
      episodes = mapEpisodesFromProvider(providerData, preferredProvider.name, 'dub');
    }

    // If still no episodes with preferred provider, try other providers
    if (episodes.length === 0) {
      for (const altProvider of sortedProviders.slice(1)) {
        const altProviderData = data.providers?.[altProvider.name];
        episodes = mapEpisodesFromProvider(altProviderData, altProvider.name, DEFAULT_CATEGORY);
        if (episodes.length > 0) {
          break;
        }
      }
    }

    // Calculate total episodes
    const totalEpisodes = Math.max(
      ...providers.map(p => p.episodeCount.sub + p.episodeCount.dub),
      episodes.length
    );

    return {
      episodes,
      totalEpisodes,
      providers: sortedProviders,
      mappings: data.mappings || {},
      allEpisodesByProvider,
    };
  } catch (error) {
    console.error('Error fetching episodes:', error);
    throw error;
  }
}
