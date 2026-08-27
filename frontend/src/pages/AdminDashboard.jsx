import React, { useEffect, useState } from 'react';
import { Shield, Lock, Users, Trophy, QrCode, MessageSquare, LogOut, RefreshCw, AlertTriangle, Medal, Clock, Sparkles, StopCircle, Settings, ChevronRight, Eye, CheckCircle2, AlertCircle, RotateCcw, Edit3 } from 'lucide-react';
import { api } from '../api/client';
import { getSocket, joinAdminRoom } from '../api/socket';
import StageManagerModal from '../components/StageManagerModal';

export default function AdminDashboard({ onOpenQRManagement }) {
  const [token, setToken] = useState(localStorage.getItem('th_admin_token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [stats, setStats] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null); // Detail modal team object
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);

  // Settings form state
  const [minMembers, setMinMembers] = useState(4);
  const [defaultMembers, setDefaultMembers] = useState(5);
  const [maxMembers, setMaxMembers] = useState(10);
  const [maxParticipants, setMaxParticipants] = useState(150);

  useEffect(() => {
    if (token) {
      fetchDashboard();

      joinAdminRoom();
      const socket = getSocket();

      const handleRealtimeUpdate = () => {
        fetchDashboard(true);
      };

      socket.on('team_registered', handleRealtimeUpdate);
      socket.on('team_progress_updated', handleRealtimeUpdate);
      socket.on('hunt_winner_declared', handleRealtimeUpdate);
      socket.on('hunt_closed', handleRealtimeUpdate);

      return () => {
        socket.off('team_registered', handleRealtimeUpdate);
        socket.off('team_progress_updated', handleRealtimeUpdate);
        socket.off('hunt_winner_declared', handleRealtimeUpdate);
        socket.off('hunt_closed', handleRealtimeUpdate);
      };
    }
  }, [token]);

  // Live Auto-Refresh polling
  useEffect(() => {
    let interval = null;
    if (token && autoRefresh) {
      interval = setInterval(() => {
        fetchDashboard(true);
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, autoRefresh]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);

    try {
      const res = await api.adminLogin(username, password);
      if (res.success && res.token) {
        localStorage.setItem('th_admin_token', res.token);
        setToken(res.token);
      } else {
        setLoginError(res.error || 'Invalid credentials');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res.stats);
        if (res.stats.settings) {
          setMinMembers(res.stats.settings.min_team_members || 4);
          setDefaultMembers(res.stats.settings.default_team_members || 5);
          setMaxMembers(res.stats.settings.max_team_members || 10);
          setMaxParticipants(res.stats.settings.max_total_participants || 150);
        }
      }
    } catch (err) {
      if (err.message.includes('401') || err.message.includes('token')) {
        handleLogout();
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('th_admin_token');
    setToken('');
    setStats(null);
  };

  const handleEndHuntManually = async () => {
    if (!window.confirm('Are you sure you want to end the Treasure Hunt for all teams?')) return;
    try {
      const res = await api.endHuntManually();
      if (res.success) {
        alert(res.message);
        fetchDashboard();
      }
    } catch (err) {
      alert(err.message || 'Failed to end hunt.');
    }
  };

  const handleResetHunt = async () => {
    if (!window.confirm('⚠️ WARNING: ARE YOU SURE YOU WANT TO RESET? This will permanently ERASE all registered teams, scan history, and stage progress so you can start a completely NEW hunt!')) return;
    try {
      const res = await api.resetHunt();
      if (res.success) {
        alert(res.message);
        fetchDashboard(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to reset hunt data.');
    }
  };


  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateSettings({
        min_team_members: minMembers,
        default_team_members: defaultMembers,
        max_team_members: maxMembers,
        max_total_participants: maxParticipants
      });
      if (res.success) {
        alert('Settings updated!');
        setShowSettingsModal(false);
        fetchDashboard();
      }
    } catch (err) {
      alert(err.message || 'Failed to save settings.');
    }
  };

  const handleUpdateMemberCount = async (teamId, teamName, newCount) => {
    try {
      const res = await api.updateTeamMemberCount(teamId, teamName, newCount);
      if (res.success) {
        fetchDashboard(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to update member count.');
    }
  };

  // Login View if unauthenticated

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-[#0D261E] border-2 border-[#F59E0B] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-left">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl border border-[#F59E0B] flex items-center justify-center mx-auto text-[#FBBF24]">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-amber-200">
              ADMIN CONTROL GATEWAY
            </h2>
            <p className="text-xs text-emerald-300">
              Enter event administrator credentials to monitor live teams.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-xl font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-2.5 text-xs text-amber-100 focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-2.5 text-xs text-amber-100 focus:outline-none focus:border-[#F59E0B]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#F59E0B] hover:bg-amber-400 text-[#071912] font-heading font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'AUTHENTICATING...' : 'ACCESS CONTROL CENTER'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const leaderboard = stats?.leaderboard || [];
  const teamsList = stats?.teams_list || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 text-left">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#F59E0B]/30">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-[#FBBF24]" />
            <h2 className="text-2xl font-bold font-heading text-amber-200">
              🏆 TREASURE HUNT CONTROL CENTER
            </h2>
            {stats && (
              <span className={`inline-flex items-center space-x-1 border text-[10px] font-bold px-2 py-0.5 rounded-full ${
                stats.hunt_status === 'LIVE' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-red-950 border-red-500 text-red-400'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{stats.hunt_status === 'LIVE' ? '🔴 LIVE' : '🔒 CLOSED'}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-emerald-300">
            Real-time team monitoring, participant capacity management, and route inspection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetHunt}
            className="px-3.5 py-2 bg-red-950/90 hover:bg-red-900 border border-red-700 text-red-300 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
            title="Erase all team data and start a new hunt"
          >
            <RotateCcw className="w-4 h-4 text-red-400" />
            <span>RESET / START NEW HUNT</span>
          </button>

          {stats?.hunt_status === 'LIVE' && (
            <button
              onClick={handleEndHuntManually}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md"
            >
              <StopCircle className="w-4 h-4" />
              <span>END HUNT</span>
            </button>
          )}


          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3.5 py-2 bg-emerald-950 border border-emerald-700 text-amber-300 hover:bg-emerald-900 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
            <span>Capacity Settings</span>
          </button>

          <button
            onClick={() => setShowStageModal(true)}
            className="px-3.5 py-2 bg-emerald-900/90 border border-amber-500/60 text-amber-300 hover:bg-emerald-800 text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-md"
          >
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span>Stage Questions</span>
          </button>

          <button
            onClick={onOpenQRManagement}
            className="px-4 py-2 bg-[#F59E0B] text-[#071912] font-extrabold text-xs rounded-xl hover:bg-amber-400 transition flex items-center space-x-1.5 shadow-md"
          >
            <QrCode className="w-4 h-4" />
            <span>QR Manager</span>
          </button>

          <button
            onClick={() => fetchDashboard(false)}
            className="p-2 bg-emerald-950 border border-emerald-800 text-amber-300 rounded-xl hover:bg-emerald-900"
            title="Refresh Stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleLogout}
            className="p-2 bg-red-950/60 border border-red-900 text-red-400 rounded-xl hover:bg-red-900/80"
            title="Logout Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {stats && (
        <>
          {/* PARTICIPANT CAPACITY METER CARD */}
          <div className="bg-[#0D261E]/90 border-2 border-amber-500/50 p-6 rounded-3xl space-y-3 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-900 pb-3">
              <div>
                <h3 className="text-sm font-extrabold font-heading text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  PARTICIPANT CAPACITY MONITOR
                </h3>
                <p className="text-xs text-emerald-300">
                  Total registered participants across all teams (Max: {stats.max_total_participants})
                </p>
              </div>
              <div className="text-2xl font-black font-mono text-amber-200">
                {stats.total_participants} / {stats.max_total_participants}
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div className="w-full bg-emerald-950 rounded-full h-4 overflow-hidden border border-emerald-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 transition-all duration-700 rounded-full"
                style={{ width: `${Math.min(100, (stats.total_participants / stats.max_total_participants) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-bold text-emerald-300">
              <span>{stats.spots_remaining} spots remaining</span>
              <span>{stats.total_teams} Registered Teams ({stats.active_teams} Active, {stats.completed_teams} Completed)</span>
            </div>
          </div>

          {/* KEY STAT CARDS GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0D261E] border border-amber-900/60 p-4 rounded-2xl">
              <span className="text-xs font-bold text-emerald-300 block mb-1">TOTAL TEAMS</span>
              <p className="text-2xl md:text-3xl font-extrabold font-heading text-amber-100">{stats.total_teams}</p>
            </div>

            <div className="bg-[#0D261E] border border-amber-900/60 p-4 rounded-2xl">
              <span className="text-xs font-bold text-emerald-300 block mb-1">ACTIVE TEAMS</span>
              <p className="text-2xl md:text-3xl font-extrabold font-heading text-emerald-400">{stats.active_teams}</p>
            </div>

            <div className="bg-[#0D261E] border border-amber-900/60 p-4 rounded-2xl">
              <span className="text-xs font-bold text-emerald-300 block mb-1">COMPLETED TEAMS</span>
              <p className="text-2xl md:text-3xl font-extrabold font-heading text-[#FBBF24]">{stats.completed_teams}</p>
            </div>

            <div className="bg-[#0D261E] border border-amber-900/60 p-4 rounded-2xl">
              <span className="text-xs font-bold text-emerald-300 block mb-1">TOTAL QR SCANS</span>
              <p className="text-2xl md:text-3xl font-extrabold font-heading text-amber-300">{stats.total_scans}</p>
              <span className="text-[10px] text-emerald-400">{stats.successful_scans} valid / {stats.failed_scans} wrong</span>
            </div>
          </div>

          {/* REGISTERED TEAMS MONITOR & STAGE SEQUENCE INSPECTION */}
          <div className="bg-gradient-to-b from-[#0D261E] to-[#071912] border-2 border-[#F59E0B] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-amber-900/60 pb-3">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-[#FBBF24]" />
                <h3 className="font-heading font-extrabold text-xl text-amber-200 tracking-wide">
                  REGISTERED TEAMS & STAGE SEQUENCES
                </h3>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-950 px-3 py-1 rounded-full border border-amber-800">
                {teamsList.length} TEAMS
              </span>
            </div>

            {teamsList.length === 0 ? (
              <p className="text-xs text-emerald-400 py-8 text-center">No teams registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-amber-900/60 text-amber-400 font-heading uppercase">
                      <th className="py-2.5 px-3">RANK</th>
                      <th className="py-2.5 px-3">TEAM NAME</th>
                      <th className="py-2.5 px-3">LEADER</th>
                      <th className="py-2.5 px-3">MEMBERS</th>
                      <th className="py-2.5 px-3">PROGRESS</th>
                      <th className="py-2.5 px-3">RANDOMIZED STAGE ORDER</th>
                      <th className="py-2.5 px-3">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-900/60">
                    {teamsList.map((tm) => (
                      <tr key={tm.id} className="hover:bg-emerald-950/60 transition">
                        <td className="py-3 px-3 font-bold text-amber-300 font-heading">#{tm.rank}</td>
                        <td className="py-3 px-3 font-extrabold text-amber-100">{tm.team_name}</td>
                        <td className="py-3 px-3 text-emerald-300 font-semibold">{tm.leader_name}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 bg-emerald-950 px-2 py-1 rounded-xl border border-emerald-800 w-fit">
                            <button
                              onClick={() => handleUpdateMemberCount(tm.id, tm.team_name, Math.max(1, (tm.member_count || 5) - 1))}
                              className="w-5 h-5 rounded-md bg-emerald-900 hover:bg-emerald-800 text-amber-300 font-extrabold flex items-center justify-center text-xs"
                              title="Remove 1 Member"
                            >
                              -
                            </button>
                            <span className="font-mono font-extrabold text-amber-200 text-xs px-1">{tm.member_count || 5}</span>
                            <button
                              onClick={() => handleUpdateMemberCount(tm.id, tm.team_name, (tm.member_count || 5) + 1)}
                              className="w-5 h-5 rounded-md bg-emerald-900 hover:bg-emerald-800 text-amber-300 font-extrabold flex items-center justify-center text-xs"
                              title="Add 1 Member"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            tm.completed_stages_count >= 7 ? 'bg-amber-500 text-black' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          }`}>
                            {tm.completed_stages_count} / 7
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-amber-300 text-[11px]">
                          {tm.stage_order.join(' → ')}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => setSelectedTeam(tm)}
                            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 font-bold rounded-lg border border-amber-500/40 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SCAN LOGS & FEEDBACK GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Scan Attempt Logs */}
            <div className="bg-[#0D261E] border border-emerald-900 rounded-2xl p-5 space-y-3">
              <h3 className="font-heading font-bold text-amber-200 text-sm">
                RECENT SCAN LOGS (LAST 50)
              </h3>
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {stats.recent_scan_logs.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">No scan attempts logged.</p>
                ) : (
                  stats.recent_scan_logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                        log.is_success
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                          : 'bg-red-950/40 border-red-900/60 text-red-300'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{log.team_name || 'Team'} • {log.user_name || 'User'}</p>
                        <p className="text-[10px] text-gray-400">{log.message || log.scanned_token.substring(0, 20)}</p>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(log.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Feedback List */}
            <div className="bg-[#0D261E] border border-emerald-900 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-amber-200 text-sm">
                  PARTICIPANT FEEDBACK ({stats.feedback_list.length})
                </h3>
                <MessageSquare className="w-4 h-4 text-amber-400" />
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {stats.feedback_list.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">No feedback recorded.</p>
                ) : (
                  stats.feedback_list.map((fb) => (
                    <div key={fb.id} className="p-3 bg-emerald-950 rounded-xl border border-emerald-900 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">{fb.participant_name || 'Hunter'} ({fb.team_name}) {fb.emoji}</span>
                        <span className="text-[#FBBF24]">{'⭐'.repeat(fb.rating)}</span>
                      </div>
                      {fb.comment && <p className="text-emerald-200 italic">"{fb.comment}"</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}

      {/* TEAM DETAILS MODAL */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#0D261E] border-2 border-[#F59E0B] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-amber-900/60 pb-3">
              <div>
                <h3 className="font-heading font-bold text-2xl text-amber-200">{selectedTeam.team_name}</h3>
                <p className="text-xs text-emerald-300">Leader: {selectedTeam.leader_name} • Status: {selectedTeam.status}</p>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="text-emerald-400 hover:text-white font-bold text-sm">
                ✕ Close
              </button>
            </div>

            {/* Stage Order Inspection */}
            <div className="p-4 bg-emerald-950 rounded-2xl border border-emerald-800 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">RANDOMIZED STAGE ORDER</h4>
              <p className="text-sm font-mono text-amber-200 font-extrabold">{selectedTeam.stage_order.join(' → ')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {selectedTeam.stage_order_details.map((stg) => (
                  <div key={stg.position} className="p-2 bg-[#061711] rounded-xl border border-emerald-900 text-xs">
                    <span className="text-[10px] text-amber-400 font-bold block">Pos {stg.position}</span>
                    <span className="font-bold text-amber-100">Stage {stg.stage_number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed Stages Timestamps */}
            <div>
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">COMPLETED STAGES</h4>
              {selectedTeam.completed_stages.length === 0 ? (
                <p className="text-xs text-gray-500">No stages completed yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedTeam.completed_stages.map((c, idx) => (
                    <div key={idx} className="p-2.5 bg-emerald-950/80 rounded-xl border border-emerald-800 text-xs flex justify-between">
                      <span className="font-bold text-amber-200">✓ Stage {c.stage_number}</span>
                      <span className="text-gray-400 font-mono">{new Date(c.completed_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedTeam(null)}
                className="px-5 py-2 bg-[#F59E0B] text-[#071912] font-bold text-xs rounded-xl"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APP SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0D261E] border-2 border-[#F59E0B] rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-heading font-bold text-xl text-amber-200">SETTINGS & CAPACITY CONFIGURATION</h3>
            
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">Max Total Participants (Capacity Limit)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="150"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 150)}
                  className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-4 py-2 text-xs text-amber-100"
                />
                <p className="text-[10px] text-emerald-400 mt-1">Default: 150 participants max across all teams.</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Min Members</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={minMembers}
                    onChange={(e) => setMinMembers(parseInt(e.target.value) || 4)}
                    className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-3 py-2 text-xs text-amber-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Default Members</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={defaultMembers}
                    onChange={(e) => setDefaultMembers(parseInt(e.target.value) || 5)}
                    className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-3 py-2 text-xs text-amber-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Max Members</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(parseInt(e.target.value) || 10)}
                    className="w-full bg-emerald-950 border border-emerald-800 rounded-xl px-3 py-2 text-xs text-amber-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-emerald-950 border border-emerald-800 text-gray-400 text-xs font-bold rounded-xl"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#F59E0B] text-[#071912] text-xs font-extrabold rounded-xl"
                >
                  SAVE CONFIGURATION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage Questions & Headings Editor Modal */}
      {showStageModal && (
        <StageManagerModal onClose={() => setShowStageModal(false)} />
      )}

    </div>
  );
}

