import React from 'react';
import { Volume2, VolumeX, Compass, ShieldAlert, RotateCcw } from 'lucide-react';
import { isSoundEnabled, toggleSound } from '../utils/soundEffects';

export default function Header({ soundOn, setSoundOn, onResetSession, currentStage, viewMode, setViewMode }) {
  const handleSoundToggle = () => {
    const newState = toggleSound();
    setSoundOn(newState);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#071912]/90 backdrop-blur-md border-b border-[#F59E0B]/30 px-4 py-3 shadow-lg">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo / Title */}
        <div 
          onClick={() => setViewMode('game')} 
          className="flex items-center space-x-2 cursor-pointer group"
        >
          <div className="relative">
            <Compass className="w-7 h-7 text-[#F59E0B] group-hover:rotate-45 transition-transform duration-500" />
            <div className="absolute inset-0 bg-[#F59E0B]/20 rounded-full blur-sm"></div>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-amber-100 tracking-wider font-heading leading-tight group-hover:text-[#FBBF24] transition-colors">
              TREASURE HUNT
            </h1>
            <p className="text-[10px] text-emerald-400 font-sans tracking-widest uppercase">
              7 Stages • Campus Edition
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 md:space-x-3">

          {/* Sound Toggle */}
          <button
            onClick={handleSoundToggle}
            className={`p-2 rounded-lg border transition-all flex items-center space-x-1.5 text-xs font-semibold ${
              soundOn 
                ? 'bg-[#1E4637] border-[#F59E0B] text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                : 'bg-emerald-950/60 border-emerald-800 text-gray-400 hover:text-gray-200'
            }`}
            title={soundOn ? 'Sound FX Enabled' : 'Sound FX Muted'}
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-[#FBBF24]" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundOn ? 'SOUND ON' : 'MUTED'}</span>
          </button>

          {/* How to Play Nav */}
          <button
            onClick={() => setViewMode('how-to-play')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              viewMode === 'how-to-play'
                ? 'bg-[#F59E0B] text-[#071912] border-[#FBBF24] font-bold'
                : 'bg-emerald-900/40 text-amber-200 border-amber-900/50 hover:bg-emerald-800/60'
            }`}
          >
            GUIDE
          </button>

          {/* Admin Nav */}
          <button
            onClick={() => setViewMode('admin')}
            className={`p-2 rounded-lg border transition-all ${
              viewMode === 'admin'
                ? 'bg-amber-600 text-white border-amber-400'
                : 'bg-emerald-950/60 border-emerald-800/80 text-amber-400/80 hover:text-amber-300'
            }`}
            title="Admin Dashboard"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          {/* Restart Session Option */}
          {onResetSession && (
            <button
              onClick={onResetSession}
              className="p-2 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 hover:bg-red-900/60 transition-all"
              title="Reset Session / Start Fresh"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
