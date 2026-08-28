import React, { useEffect, useState } from 'react';
import { Compass, Sparkles, AlertOctagon, CheckCircle2, Lock, HelpCircle } from 'lucide-react';
import { api } from '../api/client';
import { playScanErrorSound, playScanSuccessSound, playStageUnlockSound } from '../utils/soundEffects';

export default function Stage7QuizCard({ isLeader, onQuizSuccess, onQuizDisqualified, fetchLatestProgress }) {
  const [question, setQuestion] = useState(null);
  const [totalPoolCount, setTotalPoolCount] = useState(10);
  const [selectedOption, setSelectedOption] = useState(null); // optionIdx (0, 1, 2, 3)
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getStage7Quiz();
      if (res.success) {
        setQuestion(res.question || null);
        setTotalPoolCount(res.total_pool_questions || 10);
        setWrongAttempts(res.wrong_attempts || 0);

        if (res.quiz_passed) {
          onQuizSuccess();
        }
        if (res.team_status === 'DISQUALIFIED') {
          onQuizDisqualified();
        }
      }
    } catch (err) {
      console.error('Failed to load Stage 7 Quiz question:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optionIdx) => {
    if (!isLeader) return;
    setSelectedOption(optionIdx);
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    if (!isLeader) return;

    if (selectedOption === null || selectedOption === undefined) {
      setErrorMsg('Please select one of the 4 options before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.submitStage7Quiz(selectedOption);
      if (res.success && res.quiz_passed) {
        playScanSuccessSound();
        playStageUnlockSound();
        onQuizSuccess();
        fetchLatestProgress();
      } else if (res.disqualified) {
        playScanErrorSound();
        onQuizDisqualified();
        fetchLatestProgress();
      } else {
        playScanErrorSound();
        setWrongAttempts(res.wrong_attempts || (wrongAttempts + 1));
        setErrorMsg(res.message || '⚠️ Incorrect answer! You have 1 attempt remaining before disqualification.');
      }
    } catch (err) {
      playScanErrorSound();
      setErrorMsg(err.message || 'Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-[#0D261E] border-2 border-amber-500/50 rounded-3xl text-center space-y-3 shadow-lg">
        <Compass className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
        <p className="text-xs font-bold text-amber-200 animate-pulse uppercase tracking-wider">
          Shuffling & Assigning Your Team's Stage 7 Challenge Question...
        </p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="p-6 bg-[#0D261E] border border-red-500 rounded-2xl text-center text-xs text-red-300">
        No quiz questions available. Please contact event administrators.
      </div>
    );
  }

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="bg-[#0D261E]/95 border-2 border-[#F59E0B] rounded-3xl p-6 md:p-8 shadow-[0_0_40px_rgba(245,158,11,0.25)] space-y-6 text-left relative overflow-hidden">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-900/80 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-amber-500 text-[#071912] font-black text-[11px] rounded-full uppercase tracking-widest shadow-sm">
              STAGE 7 SHUFFLED TEAM QUESTION
            </span>
            <span className={`px-3 py-1 font-bold text-[11px] rounded-full uppercase tracking-wider ${
              wrongAttempts === 1 ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}>
              Attempts: {wrongAttempts} / 2 (Max 2 Allowed)
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-black font-heading text-amber-100 tracking-wide">
            Solve Your Team's Challenge Question
          </h3>
          <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
            Your team has been assigned 1 randomized question from the {totalPoolCount} pool questions. Select the correct option. A 2nd wrong attempt will result in immediate team disqualification!
          </p>
        </div>
      </div>

      {/* Error / Attempt Warning Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-950/90 border-2 border-red-600 rounded-2xl text-red-200 text-xs font-semibold flex items-center gap-3 shadow-lg animate-shake">
          <AlertOctagon className="w-6 h-6 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Single Assigned Question Card */}
      <form onSubmit={handleSubmitQuiz} className="space-y-6">
        <div className="p-6 bg-[#061711] border border-amber-500/60 rounded-2xl space-y-4 shadow-inner">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-extrabold text-sm flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h4 className="text-base md:text-lg font-bold text-amber-100 leading-snug whitespace-pre-line">
              {question.question_text}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {question.options.map((opt, optIdx) => {
              const isSelected = selectedOption === optIdx;
              return (
                <button
                  type="button"
                  key={optIdx}
                  disabled={!isLeader}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`p-4 rounded-xl border text-xs sm:text-sm font-semibold text-left transition-all flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-[#071912] border-amber-300 font-extrabold shadow-lg scale-[1.02]'
                      : 'bg-emerald-950/80 text-emerald-200 border-emerald-800 hover:border-amber-500/50 hover:bg-emerald-900/70'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center border shrink-0 ${
                    isSelected ? 'bg-[#071912] text-amber-300 border-[#071912]' : 'bg-emerald-900 text-emerald-300 border-emerald-700'
                  }`}>
                    {optionLetters[optIdx]}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Action */}
        {isLeader ? (
          <button
            type="submit"
            disabled={submitting || selectedOption === null}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-[#FBBF24] hover:brightness-110 text-[#071912] font-heading font-extrabold text-sm md:text-base rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.5)] border-2 border-amber-200 transition-all transform active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Sparkles className="w-5 h-5 fill-current" />
            <span>{submitting ? 'VERIFYING ANSWER...' : 'SUBMIT STAGE 7 ANSWER 🎯'}</span>
          </button>
        ) : (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-2xl text-center space-y-1">
            <p className="text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Team Leader is answering the Stage 7 Shuffled Question</span>
            </p>
            <p className="text-[11px] text-emerald-300">
              Help your Team Leader select the correct option above! Once answered correctly, the Stage 7 QR Code Scanner will unlock for your team.
            </p>
          </div>
        )}
      </form>

    </div>
  );
}
