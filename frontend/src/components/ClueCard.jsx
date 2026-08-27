import React, { useEffect, useState } from 'react';
import { Scroll, Eye, ChevronRight } from 'lucide-react';

export default function ClueCard({ stageNumber, clueText, onProceed, isLatestUnlock = false }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(isLatestUnlock);
  const [isRevealed, setIsRevealed] = useState(!isLatestUnlock);

  useEffect(() => {
    if (isLatestUnlock && isRevealed) {
      setDisplayedText('');
      setIsTyping(true);
      let idx = 0;

      const timer = setInterval(() => {
        if (idx < clueText.length) {
          setDisplayedText((prev) => prev + clueText.charAt(idx));
          idx++;
        } else {
          clearInterval(timer);
          setIsTyping(false);
        }
      }, 30);

      return () => clearInterval(timer);
    } else {
      setDisplayedText(clueText);
      setIsTyping(false);
    }
  }, [clueText, isLatestUnlock, isRevealed]);

  return (
    <div className="parchment-card rounded-2xl p-5 md:p-6 my-4 transition-all transform hover:scale-[1.01] duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-[#8B4513]/40 mb-3">
        <div className="flex items-center space-x-2">
          <Scroll className="w-6 h-6 text-[#8B4513]" />
          <h3 className="font-heading font-extrabold text-[#3D1E0B] text-lg tracking-wider">
            UNLOCKED CLUE
          </h3>
        </div>
        <span className="text-[11px] font-bold text-[#8B4513] bg-[#F5E3B8] px-2.5 py-0.5 rounded-full border border-[#8B4513]/30 uppercase tracking-widest">
          PARCHMENT SEAL VERIFIED
        </span>
      </div>

      {/* Secret Clue Content Area */}
      {!isRevealed ? (
        <div className="py-8 text-center bg-[#E5D2A5]/50 rounded-xl border border-dashed border-[#8B4513]/50 my-2">
          <Scroll className="w-10 h-10 text-[#8B4513]/70 mx-auto mb-2 animate-pulse" />
          <p className="text-sm font-bold text-[#4A280D] mb-4">
            The parchment is sealed with ancient gold wax.
          </p>
          <button
            onClick={() => setIsRevealed(true)}
            className="px-6 py-2.5 bg-[#8B4513] hover:bg-[#6A340D] text-[#F9ECCB] font-bold text-xs rounded-xl shadow-lg flex items-center space-x-2 mx-auto transition-transform active:scale-95"
          >
            <Eye className="w-4 h-4" />
            <span>REVEAL CLUE TEXT</span>
          </button>
        </div>
      ) : (
        <div className="my-3 p-4 bg-[#FAF0D9] rounded-xl border border-[#D2B48C]/80 shadow-inner">
          <p className="font-serif italic text-base md:text-lg text-[#2B1B12] leading-relaxed tracking-wide min-h-[60px]">
            "{displayedText}"
            {isTyping && <span className="inline-block w-2 h-5 bg-[#8B4513] ml-1 animate-pulse" />}
          </p>
        </div>
      )}

      {/* Footer / Next Action */}
      {isLatestUnlock && onProceed && (
        <div className="pt-3 border-t border-[#8B4513]/20 flex justify-end">
          <button
            onClick={onProceed}
            className="px-5 py-2.5 bg-[#2B1B12] hover:bg-[#1A100B] text-[#FBBF24] font-heading font-bold text-xs rounded-xl flex items-center space-x-2 shadow-md transition-transform active:scale-95"
          >
            <span>PROCEED TO NEXT LOCATION</span>
            <ChevronRight className="w-4 h-4 text-[#FBBF24]" />
          </button>
        </div>
      )}

    </div>
  );
}
