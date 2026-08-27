import React, { useEffect, useState } from 'react';
import { Scroll, Sparkles, CheckCircle2, AlertCircle, Save, X, Edit3, HelpCircle, Key, Layers } from 'lucide-react';
import { api } from '../api/client';

export default function StageManagerModal({ onClose }) {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedStageNumber, setSelectedStageNumber] = useState(1);

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getStages();
      if (res.success && res.stages) {
        setStages(res.stages);
      } else {
        setErrorMessage(res.error || 'Failed to load stages.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load stages from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleStageFieldChange = (stageNumber, field, value) => {
    setStages(prev =>
      prev.map(stg =>
        stg.stage_number === stageNumber ? { ...stg, [field]: value } : stg
      )
    );
  };

  const handleSaveStage = async (stage) => {
    setSavingId(stage.id || stage.stage_number);
    setSaveMessage(null);
    setErrorMessage(null);

    try {
      const res = await api.updateStage(stage.id || stage.stage_number, {
        title: stage.title,
        mission_description: stage.mission_description,
        clue_text: stage.clue_text
      });

      if (res.success) {
        setSaveMessage(`✓ Stage ${stage.stage_number} updated successfully!`);
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setErrorMessage(res.error || 'Failed to update stage.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save stage updates.');
    } finally {
      setSavingId(null);
    }
  };

  const activeStage = stages.find(s => s.stage_number === selectedStageNumber) || stages[0];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#030d0a]/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-[#0d261e] via-[#091b15] to-[#05110d] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.25)] text-left my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-emerald-400 hover:text-amber-300 rounded-full hover:bg-emerald-950/60 transition"
          title="Close Stage Editor"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-emerald-900/60">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black font-heading text-amber-200 tracking-wider">
              MANAGE STAGE HEADINGS & QUESTIONS
            </h2>
            <p className="text-xs text-emerald-400">
              Customize stage titles, riddles/questions, and unlocked clue hints in real-time.
            </p>
          </div>
        </div>

        {/* Alert Messages */}
        {saveMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500 text-red-300 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-emerald-400 text-sm font-semibold animate-pulse flex flex-col items-center gap-2">
            <Layers className="w-8 h-8 text-amber-400 animate-spin" />
            <span>Loading 7 Stages from database...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Column: Stage Selector Tabs */}
            <div className="md:col-span-4 space-y-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block mb-2">
                SELECT STAGE (1 to 7)
              </span>
              <div className="space-y-2">
                {stages.map(stg => {
                  const isSelected = stg.stage_number === selectedStageNumber;
                  return (
                    <button
                      key={stg.stage_number}
                      onClick={() => setSelectedStageNumber(stg.stage_number)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md'
                          : 'bg-[#071912]/80 border-emerald-900/60 text-emerald-300 hover:bg-emerald-950/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isSelected ? 'bg-amber-400 text-[#071912]' : 'bg-emerald-900/60 text-emerald-400'
                        }`}>
                          0{stg.stage_number}
                        </span>
                        <div className="truncate max-w-[140px]">
                          <span className="text-xs font-bold block truncate">
                            {stg.title || `Stage ${stg.stage_number}`}
                          </span>
                          <span className="text-[10px] text-emerald-400/70 block">
                            {stg.stage_number === 7 ? '🏆 Final Treasure' : `Checkpoint ${stg.stage_number}`}
                          </span>
                        </div>
                      </div>
                      {stg.stage_number === 7 && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                          Final
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Stage Editor Form */}
            {activeStage && (
              <div className="md:col-span-8 bg-[#071912]/90 border border-emerald-800/60 rounded-2xl p-5 space-y-5 shadow-inner">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-900/60">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-[#071912] font-black text-xs">
                      STAGE {activeStage.stage_number}
                    </span>
                    <h3 className="text-lg font-extrabold text-amber-200">
                      Edit Stage Details
                    </h3>
                  </div>
                  <button
                    onClick={() => handleSaveStage(activeStage)}
                    disabled={savingId === activeStage.stage_number}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-[#071912] font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingId === activeStage.stage_number ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>

                {/* Stage Heading / Title Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    Stage Heading / Title
                  </label>
                  <input
                    type="text"
                    value={activeStage.title || ''}
                    onChange={(e) => handleStageFieldChange(activeStage.stage_number, 'title', e.target.value)}
                    placeholder="e.g. THE ANCIENT QUADRANGLE"
                    className="w-full px-4 py-2.5 bg-[#030d0a] border border-emerald-700/60 rounded-xl text-amber-100 text-sm focus:outline-none focus:border-amber-400 font-semibold"
                  />
                  <p className="text-[11px] text-emerald-400/80">
                    This title appears at the top of the parchment card for players.
                  </p>
                </div>

                {/* Mission Description / Riddle / Question Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    Stage Question / Riddle / Mission Description
                  </label>
                  <textarea
                    rows={3}
                    value={activeStage.mission_description || ''}
                    onChange={(e) => handleStageFieldChange(activeStage.stage_number, 'mission_description', e.target.value)}
                    placeholder="Enter the main question, riddle, or campus landmark mission..."
                    className="w-full px-4 py-2.5 bg-[#030d0a] border border-emerald-700/60 rounded-xl text-emerald-100 text-xs focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                  />
                  <p className="text-[11px] text-emerald-400/80">
                    The main question or riddle players must read to locate this campus checkpoint.
                  </p>
                </div>

                {/* Unlocked Clue Text Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Unlocked Clue Hint Text
                  </label>
                  <textarea
                    rows={3}
                    value={activeStage.clue_text || ''}
                    onChange={(e) => handleStageFieldChange(activeStage.stage_number, 'clue_text', e.target.value)}
                    placeholder="Enter the detailed clue hint revealed when this stage is active..."
                    className="w-full px-4 py-2.5 bg-[#030d0a] border border-emerald-700/60 rounded-xl text-amber-200/90 text-xs focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                  />
                  <p className="text-[11px] text-emerald-400/80">
                    Additional hints displayed to players to guide them to the physical QR code location.
                  </p>
                </div>

                {/* Action Footer */}
                <div className="pt-3 border-t border-emerald-900/60 flex justify-end">
                  <button
                    onClick={() => handleSaveStage(activeStage)}
                    disabled={savingId === activeStage.stage_number}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-[#071912] font-black text-xs rounded-xl transition flex items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingId === activeStage.stage_number ? 'Saving Stage...' : `Save Stage ${activeStage.stage_number} Changes`}</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
