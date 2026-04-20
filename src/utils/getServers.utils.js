import { PROVIDER_PREFERENCES } from '@/src/lib/api/mappers';

export default async function getServers(animeId, episodeId, options = {}) {
  try {
    // With Miruro, servers are derived from episode data
    // The episode object contains provider and category info
    // We return the available providers as "servers"

    // Import episodes to get provider info
    // Since we can't access the hook state here, we'll return
    // a default server structure that the hook will populate
    
    // These are Miruro providers mapped to a format the app expects
    const miruroProviders = PROVIDER_PREFERENCES;
    
    // Create server list based on available providers
    // The actual available servers will be determined when episodes are loaded
    const servers = miruroProviders.map((provider, index) => ({
      serverName: provider.toUpperCase(),
      type: 'hls',
      data_id: provider,
      index: index,
    }));

    return servers;
  } catch (error) {
    console.error('Error fetching servers:', error);
    return [];
  }
}

// Helper to create server object from provider
export function createServerFromProvider(provider, category = 'sub') {
  return {
    serverName: provider.name.toUpperCase(),
    type: 'hls',
    data_id: provider.name,
    category,
    hasSub: provider.hasSub,
    hasDub: provider.hasDub,
  };
}
