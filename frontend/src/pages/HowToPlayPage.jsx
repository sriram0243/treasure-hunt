import React from 'react';
import { Play, Search, Camera, Key, Footprints, MapPin, Trophy, ArrowLeft } from 'lucide-react';

export default function HowToPlayPage({ onBackToGame }) {
  const steps = [
    {
      step: 1,
      title: "Start the Hunt",
      icon: Play,
      desc: "Enter your name or team name on the landing page to initialize your official player session."
    },
    {
      step: 2,
      title: "Find the QR Code",
      icon: Search,
      desc: "Read your current mission to locate the physical QR code hidden around the college campus."
    },
    {
      step: 3,
      title: "Scan the QR Code",
      icon: Camera,
      desc: "Click 'Scan the QR Code' and point your mobile camera directly at the hidden mark."
    },
    {
      step: 4,
      title: "Unlock the Clue",
      icon: Key,
      desc: "Upon successful verification, an ancient parchment unrolls with your next location clue."
    },
    {
      step: 5,
      title: "Follow the Clue",
      icon: Footprints,
      desc: "Decipher the puzzle text to figure out where the next QR code mark is located on campus."
    },
    {
      step: 6,
      title: "Scan the QR Code",
      icon: MapPin,
      desc: "Move to the next landmark and scan each location's QR code in strict linear sequence."
    },
    {
      step: 7,
      title: "Find the Treasure",
      icon: Trophy,
      desc: "Scan the final location QR code to unlock the gold treasure chest, claim victory, and submit feedback!"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#F59E0B]/30">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-heading text-amber-200">
            HOW TO PLAY
          </h2>
          <p className="text-xs text-emerald-300">
            Follow these 7 steps to master the treasure hunt.
          </p>
        </div>

        <button
          onClick={onBackToGame}
          className="px-4 py-2 bg-[#0D261E] hover:bg-emerald-900 border border-[#F59E0B] text-amber-300 text-xs font-bold rounded-xl flex items-center space-x-2 transition-transform active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO HUNT</span>
        </button>
      </div>

      {/* 7 Steps Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((item) => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.step}
              className="bg-[#0D261E]/90 border border-[#F59E0B]/40 rounded-2xl p-5 flex items-start space-x-4 shadow-lg hover:border-[#F59E0B] transition-all hover:scale-[1.02]"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-[#071912] flex items-center justify-center font-bold font-heading shrink-0 shadow-md">
                <IconComponent className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-emerald-950 px-2 py-0.5 rounded-full border border-amber-900/60">
                    STEP 0{item.step}
                  </span>
                  <h3 className="font-heading font-bold text-amber-100 text-base">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules Notice */}
      <div className="p-4 bg-amber-950/60 border border-[#F59E0B] rounded-2xl text-xs text-amber-200 leading-relaxed">
        <p className="font-bold text-amber-300 mb-1">⚔ TREASURE HUNT RULES:</p>
        <ul className="list-disc list-inside space-y-1 text-emerald-200">
          <li>You cannot skip locations. QR codes must be scanned in strict sequential order.</li>
          <li>Scanning a wrong stage QR code will display a <strong>WRONG MARK</strong> warning without unlocking progress.</li>
          <li>Your progress is saved securely on the server—you can refresh or reopen your phone browser anytime.</li>
        </ul>
      </div>

    </div>
  );
}
