import React, { useEffect, useState } from 'react';
import { Compass, Sparkles, AlertOctagon, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../api/client';
import { playScanErrorSound, playScanSuccessSound, playStageUnlockSound } from '../utils/soundEffects';

export default function Stage7QuizCard({ isLeader, onQuizSuccess, onQuizDisqualified, fetchLatestProgress }) {
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { qIndex: optionIdx }
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
        setQuestions(res.questions || []);
        setWrongAttempts(res.wrong_attempts || 0);
        if (res.quiz_passed) {
          onQuizSuccess();
        }
        if (res.team_status === 'DISQUALIFIED') {
          onQuizDisqualified();
        }
      }
    } catch (err) {
      console.error('Failed to load Stage 7 Quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qIdx, optionIdx) => {
    if (!isLeader) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [qIdx]: optionIdx
    }));
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    if (!isLeader) return;

    if (Object.keys(selectedAnswers).length < questions.length) {
      setErrorMsg(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const answersArray = questions.map((_, idx) => selectedAnswers[idx]);

    try {
      const res = await api.submitStage7Quiz(answersArray);
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
        setErrorMsg(res.message || '⚠️ Incorrect answers! You have 1 attempt remaining before disqualification.');
      }
    } catch (err) {
      playScanErrorSound();
      setErrorMsg(err.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-[#0D261E] border-2 border-amber-500/50 rounded-3xl text-center space-y-3 shadow-lg">
        <Compass className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
        <p className="text-xs font-bold text-amber-200 animate-pulse uppercase tracking-wider">
          Loading Stage 7 Final 10-Question Quiz...
        </p>
      </div>
    );
  }

  const answeredCount = Object.keys(selectedAnswers).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="bg-[#0D261E]/95 border-2 border-[#F59E0B] rounded-3xl p-6 md:p-8 shadow-[0_0_40px_rgba(245,158,11,0.25)] space-y-6 text-left relative overflow-hidden">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-900/80 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-amber-500 text-[#071912] font-black text-[11px] rounded-full uppercase tracking-widest shadow-sm">
              STAGE 7 FINAL CHALLENGE
            </span>
            <span className={`px-3 py-1 font-bold text-[11px] rounded-full uppercase tracking-wider ${
              wrongAttempts === 1 ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}>
              Attempts: {wrongAttempts} / 2 (Max 2 Allowed)
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-black font-heading text-amber-100 tracking-wide">
            Solve the 10 Questions to Unlock QR Code Scanning
          </h3>
          <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
            Choose the correct option from 4 for each question. Exceeding 2 wrong attempts will result in immediate team disqualification!
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-bold text-amber-300">
          <span>Quiz Progress</span>
          <span>{answeredCount} of {questions.length} Answered ({progressPercent}%)</span>
        </div>
        <div className="w-full bg-emerald-950 rounded-full h-2.5 overflow-hidden border border-emerald-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Error / Attempt Warning Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-950/90 border-2 border-red-600 rounded-2xl text-red-200 text-xs font-semibold flex items-center gap-3 shadow-lg animate-shake">
          <AlertOctagon className="w-6 h-6 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Questions List */}
      <form onSubmit={handleSubmitQuiz} className="space-y-6">
        {questions.map((q, qIdx) => (
          <div
            key={q.id}
            className={`p-5 rounded-2xl border transition-all ${
              selectedAnswers[qIdx] !== undefined
                ? 'bg-[#061711] border-amber-500/60 shadow-md'
                : 'bg-emerald-950/40 border-emerald-900/80'
            }`}
          >
            <h4 className="text-sm font-bold text-amber-200 mb-3 flex items-start gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black flex items-center justify-center shrink-0 border border-amber-500/40">
                {q.index}
              </span>
              <span>{q.question_text}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {q.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[qIdx] === optIdx;
                const optionLetters = ['A', 'B', 'C', 'D'];
                return (
                  <button
                    type="button"
                    key={optIdx}
                    disabled={!isLeader}
                    onClick={() => handleSelectOption(qIdx, optIdx)}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-[#071912] border-amber-300 font-extrabold shadow-md scale-[1.01]'
                        : 'bg-emerald-950/80 text-emerald-200 border-emerald-800 hover:border-amber-500/50 hover:bg-emerald-900/60'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center border ${
                      isSelected ? 'bg-[#071912] text-amber-300 border-[#071912]' : 'bg-emerald-900 text-emerald-300 border-emerald-700'
                    }`}>
                      {optionLetters[optIdx]}
                    </span>
                    <span className="truncate">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Submit Quiz Action */}
        {isLeader ? (
          <button
            type="submit"
            disabled={submitting || answeredCount < questions.length}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-[#FBBF24] hover:brightness-110 text-[#071912] font-heading font-extrabold text-sm md:text-base rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.5)] border-2 border-amber-200 transition-all transform active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Sparkles className="w-5 h-5 fill-current" />
            <span>{submitting ? 'VERIFYING ANSWERS...' : 'SUBMIT STAGE 7 QUIZ ANSWERS 🎯'}</span>
          </button>
        ) : (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-2xl text-center">
            <p className="text-xs text-amber-300 font-bold flex items-center justify-center gap-1.5 mb-1">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Team Leader is completing the Stage 7 Final Quiz</span>
            </p>
            <p className="text-[11px] text-emerald-300">
              Help your Team Leader solve the questions above! Once passed, the Stage 7 QR Code Scanner will unlock for your team.
            </p>
          </div>
        )}
      </form>

    </div>
  );
}
