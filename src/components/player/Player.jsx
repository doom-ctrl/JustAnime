/* eslint-disable react/prop-types */
/**
 * Simple Iframe Player Component
 * Uses iframe for all video streams - simpler, more compatible
 */
import { useState } from "react";

export default function IframePlayer({
  streamUrl,
  streamType,
  autoPlay,
  autoNext,
  episodeId,
  episodes,
  playNext,
  animeInfo,
  episodeNum,
  activeServerName,
}) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    setTimeout(() => setLoading(false), 500);
  };

  // If no stream URL, show placeholder
  if (!streamUrl) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <p className="text-gray-400 text-center">
          No video source available.<br />
          Please select a different server.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 flex justify-center items-center bg-black bg-opacity-75 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      <iframe
        key={`${episodeId}-${activeServerName}`}
        src={streamUrl}
        className={`w-full h-full transition-opacity duration-500 ${
          iframeLoaded ? "opacity-100" : "opacity-0"
        }`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        scrolling="no"
        frameBorder="0"
        title="Video Player"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}
