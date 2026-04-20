import { useState } from "react";
import { FaChevronRight } from "react-icons/fa";
import VoiceactorList from "../voiceactorlist/VoiceactorList";

function Voiceactor({ animeInfo, className }) {
  const [showVoiceActors, setShowVoiceActors] = useState(false);
  
  // Handle data from Miruro API (charactersVoiceActors format)
  const charactersData = animeInfo?.charactersVoiceActors || [];
  
  return (
    <div className={`w-full flex flex-col gap-y-5 ${className}`}>
      <div className="flex justify-between items-center">
        <h1 className="font-bold text-2xl text-zinc-100 max-[478px]:text-[18px] capitalize">
          Characters & Voice Actors
        </h1>
        <button 
          onClick={() => setShowVoiceActors(true)}
          className="flex items-center px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 transition-all duration-300 group"
        >
          <span className="text-zinc-300 text-sm font-medium group-hover:text-zinc-100">
            View more
          </span>
          <FaChevronRight className="text-zinc-400 text-xs ml-1.5 group-hover:text-zinc-300" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
        {charactersData.slice(0, 6).map((character, index) => {
          // Support both old format (character object with voiceActors array) 
          // and new Miruro format (character info at top level, single voiceActor)
          const charInfo = character.character || character;
          const voiceActorInfo = character.voiceActor || (character.voiceActors?.[0] || {});
          
          return (
            <div
              key={index}
              className="flex justify-between items-center px-4 py-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800/70 transition-all duration-300 border border-zinc-700/30"
            >
              {charInfo && (
                <div className="w-[50%] float-left overflow-hidden max-[350px]:w-[45%]">
                  <div className="w-full flex gap-x-3">
                    {charInfo.poster && (
                      <img
                        src={charInfo.poster}
                        title={charInfo.name || "Character"}
                        alt={charInfo.name || "Character"}
                        onError={(e) => {
                          e.target.src = "https://i.postimg.cc/HnHKvHpz/no-avatar.jpg";
                        }}
                        className="w-[48px] h-[48px] flex-shrink-0 rounded-full object-cover border-2 border-zinc-700 hover:border-zinc-500 transition-all duration-300 max-[480px]:w-[36px] max-[480px]:h-[36px]"
                        loading="lazy"
                      />
                    )}
                    <div className="flex justify-center flex-col">
                      {charInfo.name && (
                        <h4 className="text-[13px] text-zinc-100 font-medium leading-snug mb-1 overflow-hidden -webkit-box -webkit-line-clamp-2 -webkit-box-orient-vertical">
                          {charInfo.name}
                        </h4>
                      )}
                      {character.role && (
                        <p className="text-[12px] text-zinc-400">
                          {character.role}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {voiceActorInfo && voiceActorInfo.name && (
                <div className="w-[50%] float-right overflow-hidden max-[350px]:w-[45%]">
                  <div className="w-full flex justify-end gap-x-3">
                    <div className="flex flex-col justify-center">
                      <span className="text-[13px] text-zinc-300 text-right leading-snug mb-0 overflow-hidden -webkit-box -webkit-line-clamp-2 -webkit-box-orient-vertical w-fit">
                        {voiceActorInfo.name}
                      </span>
                      {voiceActorInfo.language && (
                        <span className="text-[11px] text-zinc-500 text-right">
                          {voiceActorInfo.language}
                        </span>
                      )}
                    </div>
                    {voiceActorInfo.image && (
                      <img
                        src={voiceActorInfo.image}
                        title={voiceActorInfo.name || "Voice Actor"}
                        alt={voiceActorInfo.name || "Voice Actor"}
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = "https://i.postimg.cc/HnHKvHpz/no-avatar.jpg";
                        }}
                        className="w-[48px] h-[48px] rounded-full object-cover opacity-60 hover:opacity-100 cursor-pointer flex-shrink-0 transition-all duration-300 border-2 border-zinc-700 hover:border-zinc-500 max-[480px]:w-[36px] max-[480px]:h-[36px]"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showVoiceActors && (
        <VoiceactorList
          id={animeInfo.id}
          isOpen={showVoiceActors}
          onClose={() => setShowVoiceActors(false)}
        />
      )}
    </div>
  );
}

export default Voiceactor;
