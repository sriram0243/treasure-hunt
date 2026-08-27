import React from 'react';
import { Check, Lock, Shield, Trophy } from 'lucide-react';

export default function ProgressBar({ currentStage, completedStagesCount = 0 }) {
  const stages = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="w-full bg-[#0B251B]/80 border border-[#F59E0B]/30 rounded-xl p-3 md:p-4 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-[#FBBF24]" />
          <span className="text-xs md:text-sm font-bold text-amber-200 font-heading tracking-wide">
            TREASURE MAP PROGRESS
          </span>
        </div>
        <span className="text-xs font-bold text-[#FBBF24] bg-emerald-950 px-2.5 py-0.5 rounded-full border border-[#F59E0B]/40">
          PROGRESS
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative flex items-center justify-between pt-2 pb-1 px-1">
        {/* Background Connecting Line */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-emerald-950 border border-emerald-900 rounded-full z-0">
          <div 
            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-[#FBBF24] rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            style={{ width: `${Math.min(100, ((currentStage - 1) / 6) * 100)}%` }}
          />
        </div>

        {/* Stage Nodes */}
        {stages.map((stgNum) => {
          const isCompleted = stgNum < currentStage || (currentStage === 7 && completedStagesCount >= 7);
          const isCurrent = stgNum === currentStage && !isCompleted;
          const isLocked = stgNum > currentStage;
          const isFinal = stgNum === 7;

          return (
            <div key={stgNum} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-[#071912] border-2 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.7)] ring-2 ring-amber-400/30'
                    : isCurrent
                    ? 'bg-[#FBBF24] text-[#071912] border-2 border-white shadow-[0_0_16px_rgba(251,191,36,0.9)] animate-bounce font-extrabold'
                    : 'bg-emerald-950/90 text-gray-500 border border-emerald-800'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : isCurrent ? (
                  <span>●</span>
                ) : isFinal ? (
                  <Trophy className="w-4 h-4 text-amber-600/70" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-emerald-700" />
                )}
              </div>
              <span 
                className={`mt-1 text-[10px] font-bold ${
                  isCurrent 
                    ? 'text-[#FBBF24] font-heading scale-110' 
                    : isCompleted 
                    ? 'text-amber-300' 
                    : 'text-emerald-700'
                }`}
              >
                {isFinal ? '🏆' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
