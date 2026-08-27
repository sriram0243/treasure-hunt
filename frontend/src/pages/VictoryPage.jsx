import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Star, Send, CheckCircle2, RotateCcw, Award, Sparkles, HeartHandshake } from 'lucide-react';
import { api } from '../api/client';
import { playVictorySound } from '../utils/soundEffects';

export default function VictoryPage({ userSession, onResetSession }) {
  const [teamProgress, setTeamProgress] = useState(null);
  const [rating, setRating] = useState(5);
  const [emoji, setEmoji] = useState('🔥');
  const [comment, setComment] = useState('');
  const [participantName, setParticipantName] = useState(userSession?.name || '');
  const [teamName, setTeamName] = useState(userSession?.team_name || '');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emojis = ['🏆', '🔥', '🎉', '🤩', '⚔️'];

  useEffect(() => {
    fetchProgress();
    fireGoldConfetti();
    playVictorySound();
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await api.getTeamProgress();
      if (res.success) {
        setTeamProgress(res);
      }
    } catch (err) {
      console.warn('Error fetching victory progress:', err);
    }
  };

  const fireGoldConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#F59E0B', '#FBBF24', '#D97706', '#FFFFFF']
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#F59E0B', '#FBBF24', '#D97706', '#FFFFFF']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.submitFeedback({
        rating,
        emoji,
        comment,
        participant_name: participantName,
        team_name: teamName
      });

      if (res.success) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isWinnerTeam = teamProgress?.hunt?.winner_team_id && teamProgress?.team?.id === teamProgress?.hunt?.winner_team_id;
  const winnerName = teamProgress?.hunt?.winner_name || 'SHADOW HUNTERS';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 text-center animate-fade-in">
      
      {/* Winner View vs Other Team View */}
      {isWinnerTeam ? (
        /* WINNER TEAM SCREEN */
        <div className="relative bg-gradient-to-b from-[#0D261E] via-[#143D2F] to-[#071912] border-4 border-[#FBBF24] rounded-3xl p-8 shadow-[0_0_50px_rgba(251,191,36,0.4)] overflow-hidden">
          <div className="absolute inset-0 bg-[#F59E0B]/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center space-x-2 bg-amber-500 text-[#071912] px-4 py-1 rounded-full text-xs font-extrabold font-heading uppercase tracking-widest shadow-lg">
              <Sparkles className="w-4 h-4" />
              <span>OFFICIAL TREASURE CHAMPIONS</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold font-heading text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#FBBF24] to-amber-500 tracking-wider">
              🏆 YOU FOUND THE TREASURE!
            </h1>

            <div className="py-4 flex justify-center">
              <div className="relative w-32 h-32 bg-gradient-to-br from-amber-500 to-yellow-300 rounded-3xl border-4 border-white flex items-center justify-center shadow-[0_0_30px_#FBBF24] animate-bounce">
                <Trophy className="w-16 h-16 text-[#071912] drop-shadow-md" />
              </div>
            </div>

            <div className="p-4 bg-emerald-950/90 rounded-2xl border border-amber-500/60 max-w-lg mx-auto space-y-1 text-left">
              <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">WINNING TEAM</p>
              <h3 className="text-xl font-black text-amber-200">{teamProgress?.team?.team_name || teamName}</h3>
              <p className="text-xs text-emerald-300">
                You were the first team to discover the treasure! All 7 stages completed!
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* OTHER TEAMS SCREEN */
        <div className="relative bg-gradient-to-b from-[#0D261E] to-[#071912] border-2 border-amber-500/60 rounded-3xl p-8 shadow-xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-emerald-950 border border-amber-500/40 px-4 py-1.5 rounded-full text-xs font-extrabold text-amber-300 uppercase tracking-widest">
            <HeartHandshake className="w-4 h-4 text-amber-400" />
            <span>EVENT CONCLUDED</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-amber-200 tracking-wider">
            🏆 TREASURE HUNT COMPLETE
          </h1>

          <div className="p-5 bg-amber-950/40 border border-amber-500/40 rounded-2xl max-w-lg mx-auto space-y-2">
            <p className="text-sm font-bold text-amber-300">
              <span className="text-amber-100 uppercase tracking-wide font-black">{winnerName}</span>
            </p>
            <p className="text-xs text-emerald-200">
              was the first team to complete the hunt!
            </p>
          </div>

          <p className="text-sm text-emerald-200/90 max-w-md mx-auto italic">
            Thank you to every team for participating. Your adventure may have ended, but your memories remain!
          </p>

          <p className="text-base font-extrabold text-amber-300 tracking-wider pt-2">
            🎉 THANK YOU FOR PARTICIPATING! 🎉
          </p>
        </div>
      )}

      {/* Feedback Section */}
      <div className="bg-[#0D261E] border-2 border-[#F59E0B]/60 rounded-3xl p-6 md:p-8 shadow-xl text-left space-y-5">
        <div className="border-b border-amber-900/60 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-xl text-amber-200">
              EVENT FEEDBACK
            </h3>
            <p className="text-xs text-emerald-300">
              How was your Treasure Hunt experience?
            </p>
          </div>
          <Award className="w-6 h-6 text-[#FBBF24]" />
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3 bg-emerald-950/80 rounded-2xl border border-emerald-800">
            <CheckCircle2 className="w-12 h-12 text-[#FBBF24] mx-auto animate-bounce" />
            <h4 className="font-heading font-bold text-amber-200 text-lg">
              FEEDBACK RECORDED!
            </h4>
            <p className="text-xs text-emerald-200 max-w-sm mx-auto">
              Your feedback has been recorded. Thank you for participating in the College Event Treasure Hunt!
            </p>
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            
            {/* Star Rating */}
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-2">Star Rating</label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating ? 'text-[#FBBF24] fill-amber-400' : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji Reactions */}
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-2">Emoji Reaction</label>
              <div className="flex space-x-3">
                {emojis.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                      emoji === em
                        ? 'bg-[#F59E0B] border-2 border-white scale-110 shadow-lg'
                        : 'bg-emerald-950 border border-emerald-800'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Participant Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">Your Name</label>
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Participant Name"
                  className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-2.5 text-xs text-amber-100 focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Team Name"
                  className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-2.5 text-xs text-amber-100 focus:outline-none focus:border-[#F59E0B]"
                />
              </div>
            </div>

            {/* Comment Box */}
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1">Feedback Comment</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts about the hunt..."
                className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 text-xs text-amber-100 focus:outline-none focus:border-[#F59E0B]"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-[#FBBF24] hover:brightness-110 text-[#071912] font-heading font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'SUBMITTING...' : 'SUBMIT FEEDBACK'}</span>
            </button>
          </form>
        )}

      </div>

      {/* Reset Session Action */}
      <div className="pt-2">
        <button
          onClick={onResetSession}
          className="px-6 py-3 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-amber-300 font-bold text-xs rounded-xl inline-flex items-center space-x-2 transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>RETURN TO HOME</span>
        </button>
      </div>

    </div>
  );
}

