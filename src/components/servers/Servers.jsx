/* eslint-disable react/prop-types */
import {
  faRepeat,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import BouncingLoader from "../ui/bouncingloader/Bouncingloader";
import "./Servers.css";
import { useEffect } from "react";

function Servers({
  servers,
  activeEpisodeNum,
  activeServerId,
  setActiveServerId,
  serverLoading,
  setActiveServerType,
  setActiveServerName,
}) {
  // Provider color mapping for visual distinction
  const getProviderColor = (providerName) => {
    const colors = {
      'kiwi': { from: '#00D26A', to: '#00B85C', glow: 'rgba(0, 210, 106, 0.4)' },
      'arc': { from: '#FF6B35', to: '#E85A2B', glow: 'rgba(255, 107, 53, 0.4)' },
      'zoro': { from: '#8B5CF6', to: '#7C3AED', glow: 'rgba(139, 92, 246, 0.4)' },
      'jet': { from: '#06B6D4', to: '#0891B2', glow: 'rgba(6, 182, 212, 0.4)' },
      'telli': { from: '#F59E0B', to: '#D97706', glow: 'rgba(245, 158, 11, 0.4)' },
    };
    return colors[providerName?.toLowerCase()] || { from: '#6366F1', to: '#4F46E5', glow: 'rgba(99, 102, 241, 0.4)' };
  };

  useEffect(() => {
    // Only auto-select if no server has been selected yet
    if (!activeServerId && servers && servers.length > 0) {
      const savedServerName = localStorage.getItem("server_name");
      const matchingServer = servers.find(
        (server) => server.serverName === savedServerName,
      );

      if (matchingServer) {
        setActiveServerId(matchingServer);
      }
      // Otherwise let the parent's useWatch handle initial selection
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servers]);

  const handleServerSelect = (server) => {
    // Pass full server object to trigger provider switch in useWatch
    setActiveServerId(server);
  };

  return (
    <div className="bg-[#111111] p-4 w-full flex justify-center items-center max-[1200px]:bg-[#151515] max-[600px]:p-2">
      {serverLoading ? (
        <div className="flex justify-center items-center py-4">
          <BouncingLoader />
        </div>
      ) : servers && servers.length > 0 ? (
        <div className="w-full flex flex-col items-center gap-4">
          {/* Episode Info + Provider Pills */}
          <div className="flex items-center justify-center gap-6 flex-wrap max-[600px]:flex-col max-[600px]:gap-3">
            
            {/* Episode Info */}
            <div className="flex flex-col items-center text-white">
              <p className="text-center text-[14px] max-[600px]:text-[13px]">
                You are watching:{" "}
                <span className="font-semibold">Episode {activeEpisodeNum}</span>
              </p>
              <p className="text-[14px] font-medium text-center text-gray-400 max-[600px]:text-[12px]">
                If the current server doesn&apos;t work, try switching sources
              </p>
            </div>

            {/* Provider Pills */}
            {servers.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-gray-500 mr-1">
                  <FontAwesomeIcon icon={faRepeat} className="mr-1" />
                  Source
                </span>
                {servers.slice(0, 3).map((server, index) => {
                  const providerKey = server.serverName?.toLowerCase().replace('HD-', '');
                  const colors = getProviderColor(providerKey);
                  const isActive = activeServerId === server?.data_id;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        console.log('[Servers] Button clicked:', server);
                        handleServerSelect(server);
                      }}
                      className={`
                        relative px-4 py-2 text-sm font-bold tracking-wide rounded-lg
                        transition-all duration-300 ease-out overflow-hidden
                        ${isActive 
                          ? 'text-white shadow-lg' 
                          : 'text-gray-300 bg-[#2a2a2a] hover:bg-[#333333]'
                        }
                      `}
                      style={isActive ? {
                        background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
                        boxShadow: `0 0 20px ${colors.glow}`,
                      } : {}}
                    >
                      {isActive && (
                        <span 
                          className="absolute inset-0 opacity-25"
                          style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                            animation: 'shimmer 2.5s infinite',
                          }}
                        />
                      )}
                      <span className="relative z-10">{server.serverName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center font-medium text-[15px] text-gray-400">
          Could not load servers
        </p>
      )}
    </div>
  );
}

export default Servers;
