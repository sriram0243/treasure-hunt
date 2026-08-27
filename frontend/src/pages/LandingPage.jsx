import React, { useState, useEffect } from 'react';
import { Compass, Sparkles, MapPin, Shield, Play, HelpCircle, User, Users, UserCheck, Plus, Trash2, LogIn, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function LandingPage({ onStartHunt, onOpenGuide, userSession }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('register'); // 'register' | 'leader-login' | 'member-login'
  
  // Capacity & Settings state
  const [capacityInfo, setCapacityInfo] = useState(null);
  const [settingsInfo, setSettingsInfo] = useState({ min_team_members: 4, default_team_members: 5, max_team_members: 10, max_total_participants: 150 });

  // Registration Form state
  const [teamName, setTeamName] = useState('');
  const [leaderName, setLeaderName] = useState('');

  // Login Form state
  const [loginTeamName, setLoginTeamName] = useState('');
  const [loginLeaderName, setLoginLeaderName] = useState('');
  const [memberTeamName, setMemberTeamName] = useState('');
  const [memberName, setMemberName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCapacity();
  }, []);

  const fetchCapacity = async () => {
    try {
      const res = await api.getCapacity();
      if (res.success) {
        setCapacityInfo(res.capacity);
        if (res.settings) {
          setSettingsInfo(res.settings);
        }
      }
    } catch (err) {
      console.warn('Could not fetch capacity info:', err);
    }
  };

  // Submit Team Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!teamName.trim() || !leaderName.trim()) {
      setError('Please fill in Team Name and Team Leader Name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        team_name: teamName.trim(),
        leader_name: leaderName.trim()
      };

      const res = await api.registerTeam(payload);
      if (res.success && res.token) {
        localStorage.setItem('th_jwt_token', res.token);
        onStartHunt(res.user);
        setShowAuthModal(false);
      } else {
        setError(res.error || 'Team registration failed.');
      }
    } catch (err) {
      setError(err.message || 'Team registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Leader Login
  const handleLeaderLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginTeamName.trim() || !loginLeaderName.trim()) {
      setError('Please enter both Registered Team Name and Team Leader Name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.loginUser(loginTeamName.trim(), loginLeaderName.trim());
      if (res.success && res.token) {
        localStorage.setItem('th_jwt_token', res.token);
        onStartHunt(res.user);
        setShowAuthModal(false);
      } else {
        setError(res.error || 'Login failed.');
      }
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };


  // Submit Team Member Quick Login
  const handleMemberLoginSubmit = async (e) => {
    e.preventDefault();
    if (!memberTeamName.trim() || !memberName.trim()) {
      setError('Please enter both Registered Team Name and Your Name.');
      return;
    }


    setLoading(true);
    setError(null);

    try {
      const res = await api.loginTeamMember(memberTeamName.trim(), memberName.trim());
      if (res.success && res.token) {
        localStorage.setItem('th_jwt_token', res.token);
        onStartHunt(res.user);
        setShowAuthModal(false);
      } else {
        setError(res.error || 'Team member login failed.');
      }
    } catch (err) {
      setError(err.message || 'Team member login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-4 py-8 relative">
      
      {/* Background Compass Graphic */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none overflow-hidden">
        <Compass className="w-[500px] h-[500px] text-[#F59E0B] animate-compass" />
      </div>

      {/* Main Hero Container */}
      <div className="relative z-10 max-w-3xl w-full text-center space-y-6">
        
        {/* Event Badge */}
        <div className="inline-flex items-center space-x-2 bg-emerald-950/80 border border-[#F59E0B]/50 px-4 py-1.5 rounded-full text-xs font-bold text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
          <Sparkles className="w-4 h-4 text-[#FBBF24]" />
          <span>OFFICIAL COLLEGE CAMPUS EVENT</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#FBBF24] to-amber-500 font-heading tracking-wider leading-tight drop-shadow-md">
          TEAM TREASURE <br />
          <span className="text-gold-glow">HUNT 2026</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl font-medium text-emerald-200/90 italic max-w-xl mx-auto tracking-wide">
          "7 Stages • Randomized Routes • Live Real-Time Competition"
        </p>

        {/* Capacity Progress Counter Card */}
        {capacityInfo && (
          <div className="max-w-md mx-auto p-4 bg-[#0D261E]/90 border border-amber-500/40 rounded-2xl backdrop-blur-md text-left space-y-2 shadow-lg">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                Participant Capacity
              </span>
              <span className="text-amber-200 font-mono text-sm">
                {capacityInfo.current_total_members} / {capacityInfo.max_total_participants}
              </span>
            </div>

            {/* Capacity Meter Bar */}
            <div className="w-full bg-emerald-950 rounded-full h-3 overflow-hidden border border-emerald-800">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  capacityInfo.is_full ? 'bg-red-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                }`}
                style={{ width: `${Math.min(100, (capacityInfo.current_total_members / capacityInfo.max_total_participants) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-emerald-300">
              <span>{capacityInfo.spots_remaining} spots remaining</span>
              {capacityInfo.is_full && (
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Capacity Full
                </span>
              )}
            </div>
          </div>
        )}

        {/* Active User Session Banner */}
        {userSession && (
          <div className="bg-amber-950/70 border border-[#F59E0B] p-4 rounded-2xl max-w-md mx-auto text-left flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs font-bold text-amber-300">LOGGED IN TEAM SESSION</p>
              <p className="text-xs text-emerald-200">
                Team: <span className="font-bold text-amber-100">{userSession.team_name}</span> ({userSession.role === 'TEAM_LEADER' ? '👑 Leader' : '👀 Member'})
              </p>
            </div>
            <button
              onClick={() => onStartHunt(userSession)}
              className="px-5 py-2.5 bg-[#FBBF24] hover:bg-amber-300 text-[#071912] font-bold text-xs rounded-xl transition-transform active:scale-95 shadow-md flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>GO TO HUNT</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => { setError(null); setShowAuthModal(true); setAuthTab('register'); }}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-[#FBBF24] text-[#071912] font-heading font-extrabold text-base md:text-lg rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.5)] border-2 border-amber-200 hover:scale-105 transition-all flex items-center justify-center space-x-3 active:scale-95"
          >
            <Users className="w-5 h-5 fill-current" />
            <span>REGISTER TEAM</span>
          </button>

          <button
            onClick={() => { setError(null); setShowAuthModal(true); setAuthTab('leader-login'); }}
            className="w-full sm:w-auto px-7 py-4 bg-[#0D261E] hover:bg-emerald-900/80 text-amber-200 font-heading font-bold text-base rounded-2xl border-2 border-[#F59E0B]/50 transition-all flex items-center justify-center space-x-2"
          >
            <LogIn className="w-5 h-5 text-[#FBBF24]" />
            <span>TEAM LOGIN</span>
          </button>

          <button
            onClick={onOpenGuide}
            className="w-full sm:w-auto px-6 py-4 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 font-semibold text-sm rounded-2xl border border-emerald-800 transition"
          >
            <span>RULES & GUIDE</span>
          </button>
        </div>

      </div>

      {/* Team Auth / Registration Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-[#0D261E] border-2 border-[#F59E0B] rounded-3xl p-6 sm:p-8 shadow-2xl relative text-left my-8">
            
            {/* Modal Tabs */}
            <div className="flex border-b border-emerald-800/80 mb-6 gap-2">
              <button
                type="button"
                onClick={() => { setAuthTab('register'); setError(null); }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition ${
                  authTab === 'register'
                    ? 'bg-amber-500 text-[#071912]'
                    : 'bg-emerald-950/60 text-emerald-300 hover:text-white'
                }`}
              >
                Register Team
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('leader-login'); setError(null); }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition ${
                  authTab === 'leader-login'
                    ? 'bg-amber-500 text-[#071912]'
                    : 'bg-emerald-950/60 text-emerald-300 hover:text-white'
                }`}
              >
                👑 Leader Login
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('member-login'); setError(null); }}
                className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl transition ${
                  authTab === 'member-login'
                    ? 'bg-amber-500 text-[#071912]'
                    : 'bg-emerald-950/60 text-emerald-300 hover:text-white'
                }`}
              >
                👀 Member Login
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-950/90 border border-red-700 text-red-200 text-xs rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: TEAM REGISTRATION */}
            {authTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="border-b border-emerald-950 pb-2">
                  <h4 className="text-xs font-extrabold uppercase text-amber-400 tracking-wider">Team Details</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1">Team Name *</label>
                    <input
                      type="text"
                      required
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. Treasure Titans"
                      className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 text-sm text-amber-100 focus:outline-none focus:border-[#F59E0B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1">Team Leader Name *</label>
                    <input
                      type="text"
                      required
                      value={leaderName}
                      onChange={(e) => setLeaderName(e.target.value)}
                      placeholder="Leader full name"
                      className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 text-sm text-amber-100 focus:outline-none focus:border-[#F59E0B]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-emerald-950">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="px-4 py-2.5 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-bold rounded-xl"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (capacityInfo && capacityInfo.is_full)}
                    className="px-6 py-2.5 bg-[#F59E0B] hover:bg-amber-400 text-[#071912] text-xs font-extrabold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>{loading ? 'REGISTERING...' : 'CONFIRM TEAM REGISTRATION'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: TEAM LEADER LOGIN */}
            {authTab === 'leader-login' && (
              <form onSubmit={handleLeaderLoginSubmit} className="space-y-4">
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300">
                  Team Leader logs in using <strong>Team Name & Leader Name</strong> to control QR scanning.
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Registered Team Name *</label>
                  <input
                    type="text"
                    required
                    value={loginTeamName}
                    onChange={(e) => setLoginTeamName(e.target.value)}
                    placeholder="Enter registered team name"
                    className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 text-sm text-amber-100 focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Team Leader Name *</label>
                  <input
                    type="text"
                    required
                    value={loginLeaderName}
                    onChange={(e) => setLoginLeaderName(e.target.value)}
                    placeholder="Enter team leader full name"
                    className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 text-sm text-amber-100 focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="px-4 py-2.5 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-bold rounded-xl"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-[#F59E0B] hover:bg-amber-400 text-[#071912] text-xs font-extrabold rounded-xl shadow-lg transition"
                  >
                    <span>{loading ? 'LOGGING IN...' : 'LOGIN AS LEADER'}</span>
                  </button>
                </div>
              </form>
            )}


            {/* TAB 3: TEAM MEMBER LOGIN */}
            {authTab === 'member-login' && (
              <form onSubmit={handleMemberLoginSubmit} className="space-y-4">
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300">
                  Team Members join as <strong>Read-Only viewers</strong> to track real-time team progress & hints.
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Registered Team Name *</label>
                  <input
                    type="text"
                    required
                    value={memberTeamName}
                    onChange={(e) => setMemberTeamName(e.target.value)}
                    placeholder="Exact team name"
                    className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 text-sm text-amber-100 focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="Your participant name"
                    className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-3 text-sm text-amber-100 focus:outline-none focus:border-[#F59E0B]"
                  />
                </div>


                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="px-4 py-2.5 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-bold rounded-xl"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-[#F59E0B] hover:bg-amber-400 text-[#071912] text-xs font-extrabold rounded-xl shadow-lg transition"
                  >
                    <span>{loading ? 'JOINING...' : 'JOIN AS TEAM MEMBER'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}


