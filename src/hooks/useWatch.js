/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from "react";
import getAnimeInfo from "@/src/utils/getAnimeInfo.utils";
import getEpisodes from "@/src/utils/getEpisodes.utils";
import getNextEpisodeSchedule from "../utils/getNextEpisodeSchedule.utils";
import getStreamInfo from "@/src/utils/getStreamInfo.utils";
import client from "@/src/lib/api/miruro.client";
import { mapEpisodesFromProvider, PROVIDER_PREFERENCES } from "@/src/lib/api/mappers";
import { HLS_PROXY_URL } from "@/src/lib/api/miruro.config";

export const useWatch = (animeId, initialEpisodeId) => {
  const [error, setError] = useState(null);
  const [buffering, setBuffering] = useState(true);
  const [streamInfo, setStreamInfo] = useState(null);
  const [animeInfo, setAnimeInfo] = useState(null);
  const [episodes, setEpisodes] = useState(null);
  const [animeInfoLoading, setAnimeInfoLoading] = useState(false);
  const [totalEpisodes, setTotalEpisodes] = useState(null);
  const [seasons, setSeasons] = useState(null);
  const [servers, setServers] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamType, setStreamType] = useState(null);
  const [isFullOverview, setIsFullOverview] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [intro, setIntro] = useState(null);
  const [outro, setOutro] = useState(null);
  const [episodeId, setEpisodeId] = useState(null);
  const [activeEpisodeNum, setActiveEpisodeNum] = useState(null);
  const [activeServerId, setActiveServerId] = useState(null);
  const [activeServerType, setActiveServerType] = useState(null);
  const [activeServerName, setActiveServerName] = useState(null);
  const [serverLoading, setServerLoading] = useState(true);
  const [nextEpisodeSchedule, setNextEpisodeSchedule] = useState(null);
  const [providers, setProviders] = useState(null);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [currentCategory, setCurrentCategory] = useState('sub');
  const [allEpisodesByProvider, setAllEpisodesByProvider] = useState({});

  // Store raw episode data for provider switching
  const rawEpisodeDataRef = useRef(null);

  const isServerFetchInProgress = useRef(false);
  const isStreamFetchInProgress = useRef(false);

  // Reset state when anime changes
  useEffect(() => {
    setEpisodes(null);
    setEpisodeId(null);
    setActiveEpisodeNum(null);
    setServers(null);
    setActiveServerId(null);
    setStreamInfo(null);
    setStreamUrl(null);
    setStreamType(null);
    setSubtitles([]);
    setThumbnail(null);
    setIntro(null);
    setOutro(null);
    setBuffering(true);
    setServerLoading(true);
    setError(null);
    setAnimeInfo(null);
    setSeasons(null);
    setTotalEpisodes(null);
    setProviders(null);
    setCurrentProvider(null);
    setCurrentCategory('sub');
    setAllEpisodesByProvider({});
    setAnimeInfoLoading(true);
    isServerFetchInProgress.current = false;
    isStreamFetchInProgress.current = false;
    rawEpisodeDataRef.current = null;
  }, [animeId]);

  // Fetch initial data (anime info and episodes)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setAnimeInfoLoading(true);
        const [animeData, episodesData] = await Promise.all([
          getAnimeInfo(animeId, false),
          getEpisodes(animeId),
        ]);

        setAnimeInfo(animeData?.data);
        setSeasons(animeData?.seasons);

        // Store raw episode data for provider switching
        rawEpisodeDataRef.current = episodesData;
        setAllEpisodesByProvider(episodesData?.allEpisodesByProvider || {});

        // Set episodes
        setEpisodes(episodesData?.episodes || []);
        setTotalEpisodes(episodesData?.totalEpisodes || 0);
        setProviders(episodesData?.providers || []);

        // Set initial episode - use the full episode ID (slug)
        const newEpisodeId = initialEpisodeId ||
          (episodesData?.episodes?.length > 0 ? episodesData.episodes[0].originalId : null);
        setEpisodeId(newEpisodeId);

        // Set initial provider (prefer kiwi)
        const availableProviders = episodesData?.providers || [];
        const preferredProviderName = PROVIDER_PREFERENCES.find(p =>
          availableProviders.some(ap => ap.name === p)
        ) || (availableProviders[0]?.name || null);

        if (preferredProviderName) {
          setCurrentProvider(preferredProviderName);
          setActiveServerName(preferredProviderName.toUpperCase());
        }

        // Set servers based on available providers
        const serverList = availableProviders
          .filter(p => p && p.name)
          .map((provider, index) => {
            return {
              serverName: (provider.name || 'UNKNOWN').toUpperCase(),
              type: provider.hasDub ? 'multi' : 'single',
              data_id: provider.name,
              index: index,
              hasSub: provider.hasSub,
              hasDub: provider.hasDub,
              episodeCount: provider.episodeCount,
            };
          });
        setServers(serverList);
        setServerLoading(false);

      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError(err.message || "An error occurred.");
      } finally {
        setAnimeInfoLoading(false);
      }
    };
    fetchInitialData();
  }, [animeId]);

  // Fetch next episode schedule
  useEffect(() => {
    const fetchNextEpisodeSchedule = async () => {
      try {
        const data = await getNextEpisodeSchedule(animeId);
        setNextEpisodeSchedule(data);
      } catch (err) {
        console.error("Error fetching next episode schedule:", err);
      }
    };
    fetchNextEpisodeSchedule();
  }, [animeId]);

  // Sync active episode number
  useEffect(() => {
    if (!episodes || !episodeId) {
      setActiveEpisodeNum(null);
      return;
    }

    const activeEpisode = episodes.find((episode) => episode.originalId === episodeId);
    const newActiveEpisodeNum = activeEpisode ? activeEpisode.episode_no : null;
    if (activeEpisodeNum !== newActiveEpisodeNum) {
      setActiveEpisodeNum(newActiveEpisodeNum);
    }
  }, [episodeId, episodes]);

  // Fetch stream info when episode changes
  useEffect(() => {
    console.log('[useWatch] fetchStreamInfo effect triggered, episodeId:', episodeId);
    if (!episodeId || isStreamFetchInProgress.current) {
      console.log('[useWatch] Skipping fetch - no episodeId or fetch in progress');
      return;
    }

    let mounted = true;
    const controller = new AbortController();
    isStreamFetchInProgress.current = true;
    setBuffering(true);

    const fetchStreamInfo = async () => {
      try {
        console.log('[useWatch] fetchStreamInfo: calling getStreamInfo with:', episodeId);
        const data = await getStreamInfo(episodeId);
        console.log('[useWatch] fetchStreamInfo: got data, streams:', data?.streams?.length);

        if (!mounted) return;

        setStreamInfo(data);

        // Find the best stream - prefer embed, fallback to HLS
        const embedStream = data.streams?.find(s => s.type === 'embed' && s.url);
        const hlsStream = data.streams?.find(s => s.type === 'hls' && s.url);
        const selectedStream = embedStream || hlsStream;

        if (selectedStream) {
          setStreamType(selectedStream.type);

          // For HLS streams, route through proxy for CORS
          if (selectedStream.type === 'hls' && HLS_PROXY_URL) {
            setStreamUrl(`${HLS_PROXY_URL}/proxy?url=${encodeURIComponent(selectedStream.url)}`);
          } else {
            setStreamUrl(selectedStream.url);
          }
        }

        // Set intro/outro
        setIntro(data.intro || null);
        setOutro(data.outro || null);

        // Set subtitles
        setSubtitles(data.subtitles || []);

      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("Error fetching stream info:", err);
        if (mounted) {
          setError(err.message || "Failed to load stream");
          setStreamUrl(null);
        }
      } finally {
        if (mounted) {
          setBuffering(false);
          isStreamFetchInProgress.current = false;
        }
      }
    };

    fetchStreamInfo();

    return () => {
      mounted = false;
      try { controller.abort(); } catch (e) {}
      isStreamFetchInProgress.current = false;
    };
  }, [episodeId]);

  // Handle server/provider selection - switches to a new provider
  const handleServerSelect = useCallback((server) => {
    const newProvider = server.data_id;
    console.log('[useWatch] handleServerSelect called:', newProvider);
    console.log('[useWatch] currentProvider:', currentProvider);
    console.log('[useWatch] allEpisodesByProvider:', Object.keys(allEpisodesByProvider));

    // If no raw data, can't switch
    if (!rawEpisodeDataRef.current?.allEpisodesByProvider) {
      console.warn('[useWatch] No raw episode data available in ref');
    }

    if (!allEpisodesByProvider || Object.keys(allEpisodesByProvider).length === 0) {
      console.warn('[useWatch] No allEpisodesByProvider available');
      return;
    }

    const providerEpisodes = allEpisodesByProvider[newProvider];
    console.log('[useWatch] providerEpisodes for', newProvider, ':', providerEpisodes ? 'exists' : 'null');
    if (!providerEpisodes) {
      console.warn('[useWatch] No episodes for provider:', newProvider);
      return;
    }

    // Get episodes for current category
    const newEpisodes = providerEpisodes[currentCategory] || providerEpisodes.sub || [];

    if (newEpisodes.length === 0) {
      console.warn('[useWatch] No episodes in category for provider:', newProvider, currentCategory);
      return;
    }

    console.log('[useWatch] Found episodes for provider:', newProvider, newEpisodes.length);

    // Find the current episode number in the new provider's episodes
    const currentEpisodeNum = activeEpisodeNum;
    let targetEpisode = null;

    if (currentEpisodeNum) {
      // Try to find the same episode number in the new provider
      targetEpisode = newEpisodes.find(ep => ep.episode_no === currentEpisodeNum);
    }

    // If not found or no current episode, use first episode
    if (!targetEpisode) {
      targetEpisode = newEpisodes[0];
    }

    console.log('[useWatch] Switching to episode:', targetEpisode?.originalId);
    console.log('[useWatch] Current episode will be set to:', targetEpisode?.originalId);
    console.log('[useWatch] About to call setEpisodeId');
    
    // Update state
    setCurrentProvider(newProvider);
    setActiveServerId(newProvider);
    setActiveServerName(server.serverName);
    setActiveServerType(server.type);
    setEpisodes(newEpisodes);
    
    // Trigger re-render first
    console.log('[useWatch] State updated, now calling setEpisodeId with:', targetEpisode.originalId);
    setEpisodeId(targetEpisode.originalId);
    
    localStorage.setItem("server_name", server.serverName);
    localStorage.setItem("server_type", server.type);
  }, [activeEpisodeNum, currentCategory, allEpisodesByProvider]);

  // Handle category change (sub/dub)
  const handleCategoryChange = useCallback((category) => {
    setCurrentCategory(category);
    setActiveServerType(category);

    // Also update episodes if provider has episodes for this category
    if (rawEpisodeDataRef.current?.allEpisodesByProvider?.[currentProvider]) {
      const providerEpisodes = rawEpisodeDataRef.current.allEpisodesByProvider[currentProvider];
      const newEpisodes = providerEpisodes[category] || providerEpisodes.sub || [];
      if (newEpisodes.length > 0) {
        setEpisodes(newEpisodes);
        // Find current episode in new category
        const currentEpisodeNum = activeEpisodeNum;
        const targetEpisode = currentEpisodeNum
          ? newEpisodes.find(ep => ep.episode_no === currentEpisodeNum) || newEpisodes[0]
          : newEpisodes[0];
        setEpisodeId(targetEpisode.originalId);
      }
    }
  }, [currentProvider, activeEpisodeNum]);

  return {
    error,
    buffering,
    serverLoading,
    streamInfo,
    streamType,
    animeInfo,
    episodes,
    nextEpisodeSchedule,
    animeInfoLoading,
    totalEpisodes,
    seasons,
    servers,
    streamUrl,
    isFullOverview,
    setIsFullOverview,
    subtitles,
    thumbnail,
    intro,
    outro,
    episodeId,
    setEpisodeId,
    activeEpisodeNum,
    setActiveEpisodeNum,
    activeServerId,
    setActiveServerId: handleServerSelect,
    activeServerType,
    setActiveServerType: handleCategoryChange,
    activeServerName,
    setActiveServerName,
    providers,
    currentProvider,
    currentCategory,
    allEpisodesByProvider,
  };
};
