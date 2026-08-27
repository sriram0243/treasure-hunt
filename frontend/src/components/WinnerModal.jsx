import React from 'react';
import { Trophy, Sparkles, PartyPopper, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playVictorySound } from '../utils/soundEffects';

export default function WinnerModal({ winnerName, onClose, onViewSummary }) {
  React.useEffect(() => {
    playVictorySound();

    // Trigger confetti cannon
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#030d0a]/90 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#0e2920] to-[#06140f] border-2 border-amber-400/80 rounded-3xl p-8 shadow-[0_0_80px_rgba(245,158,11,0.35)] text-center overflow-hidden">
        
        {/* Glow & Shimmer FX */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-[0_0_30px_rgba(245,158,11,0.6)] mb-6 animate-bounce">
            <Trophy className="w-12 h-12 text-[#071912]" />
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <PartyPopper className="w-4 h-4 text-amber-400" />
            Victory Declared!
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            🏆 TREASURE FOUND!
          </h2>

          <div className="my-6 p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 backdrop-blur-md">
            <p className="text-sm text-amber-200/80 font-medium mb-1">Winning Team</p>
            <h3 className="text-2xl font-black text-amber-400 tracking-wide uppercase drop-shadow-md">
              TEAM {winnerName || 'SHADOW HUNTERS'}
            </h3>
            <p className="text-xs text-amber-300/90 mt-2 font-semibold">
              HAS COMPLETED THE TREASURE HUNT FIRST!
            </p>
          </div>

          <p className="text-sm text-emerald-200/80 mb-8 leading-relaxed">
            🎉 Congratulations to the winning team! The Treasure Hunt has officially concluded for all participants.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onViewSummary && (
              <button
                onClick={onViewSummary}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-[#071912] font-bold text-sm hover:brightness-110 transition shadow-lg flex items-center justify-center gap-2"
              >
                <span>View Full Results</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-semibold text-sm hover:bg-emerald-900/50 transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
