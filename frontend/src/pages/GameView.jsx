import React, { useEffect, useState, useRef } from 'react';
import { Camera, MapPin, Sparkles, AlertOctagon, CheckCircle2, RefreshCw, Scroll, ShieldCheck, Compass, Lock, Eye, Crown, Users } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import ScannerModal from '../components/ScannerModal';
import ClueCard from '../components/ClueCard';
import { api } from '../api/client';
import { getSocket, joinTeamRoom } from '../api/socket';
import { playScanErrorSound, playScanSuccessSound, playStageUnlockSound } from '../utils/soundEffects';

export default function GameView({ userSession, onGameCompleted, setUserSession }) {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResultModal, setScanResultModal] = useState(null);
  const [realtimeNotice, setRealtimeNotice] = useState(null);

  // Anti-Cheat & Restriction States
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [antiCheatViolationModal, setAntiCheatViolationModal] = useState(null);
  const isResettingRef = useRef(false);

  useEffect(() => {
    fetchLatestProgress();

    // Setup Socket.IO subscription
    const socket = getSocket();
    if (userSession && userSession.team_id) {
      joinTeamRoom(userSession.team_id);
    }

    const handleStageCompleted = (data) => {
      console.log('⚡ Real-time stage_completed event received:', data);
      if (data.is_final) {
        onGameCompleted();
      } else {
        setRealtimeNotice(`✓ QR code scanned by Team Leader! Advanced to next location.`);
        fetchLatestProgress();
        playStageUnlockSound();
      }
    };

    const handleWrongScan = (data) => {
      setRealtimeNotice(`⚠ Team Leader scanned wrong QR code.`);
    };

    const handleWinnerDeclared = (data) => {
      console.log('🏆 Real-time winner declared event in GameView:', data);
      setRealtimeNotice(`🏆 TREASURE FOUND! Team ${data.winner_team_name} has won the hunt!`);
      fetchLatestProgress();
      setTimeout(() => {
        onGameCompleted();
      }, 1200);
    };

    const handleStageUpdated = (data) => {
      console.log('⚡ Stage updated by admin event received:', data);
      fetchLatestProgress();
    };

    const handleTeamProgressReset = (data) => {
      console.log('⚠️ Real-time team_progress_reset event received:', data);
      fetchLatestProgress();
      playScanErrorSound();
      setAntiCheatViolationModal(
        data.reason || 'Your team\'s progress has been reset back to Stage 1 due to anti-cheat enforcement.'
      );
    };

    socket.on('stage_completed', handleStageCompleted);
    socket.on('wrong_qr_scan', handleWrongScan);
    socket.on('hunt_winner_declared', handleWinnerDeclared);
    socket.on('hunt_closed', handleWinnerDeclared);
    socket.on('stage_updated', handleStageUpdated);
    socket.on('team_progress_reset', handleTeamProgressReset);

    return () => {
      socket.off('stage_completed', handleStageCompleted);
      socket.off('wrong_qr_scan', handleWrongScan);
      socket.off('hunt_winner_declared', handleWinnerDeclared);
      socket.off('hunt_closed', handleWinnerDeclared);
      socket.off('stage_updated', handleStageUpdated);
      socket.off('team_progress_reset', handleTeamProgressReset);
    };
  }, [userSession]);

  const fetchLatestProgress = async () => {
    setLoading(true);
    try {
      const data = await api.getTeamProgress();
      if (data.success) {
        setProgressData(data);
        if (data.is_completed || data.hunt?.status === 'CLOSED') {
          onGameCompleted();
        }
      }
    } catch (err) {
      console.error('Error fetching team progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const isLeader = progressData?.role === 'TEAM_LEADER' || userSession?.role === 'TEAM_LEADER';

  // Request Fullscreen Helper
  const requestFullscreenMode = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request could not be completed:', err);
    }
  };

  // 1. Fullscreen Change Monitor
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFull = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      );
      setIsFullscreen(inFull);

      // If Leader exits fullscreen while game is active, trigger anti-cheat reset!
      if (isLeader && !inFull && !progressData?.is_completed) {
        triggerAntiCheatReset('Exited required Fullscreen mode');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, [isLeader, progressData?.is_completed]);

  // 2. Anti-Cheat: Disable Copy, Cut, Paste, Right-Click, Selection, Shortcuts (LEADER ONLY)
  useEffect(() => {
    if (!isLeader) return;

    const blockEvent = (e) => {
      // Allow input typing if inside an input box, but block copy/cut/paste
      if (e.type === 'copy' || e.type === 'cut' || e.type === 'paste' || e.type === 'contextmenu' || e.type === 'selectstart' || e.type === 'dragstart') {
        e.preventDefault();
        return false;
      }
    };

    const handleKeydown = (e) => {
      const key = e.key ? e.key.toLowerCase() : '';
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+U, Ctrl+P, Ctrl+S, F12, Ctrl+Shift+I/J/C
      if (
        (isCtrlOrCmd && ['c', 'v', 'x', 'a', 'u', 'p', 's'].includes(key)) ||
        e.key === 'F12' ||
        (isCtrlOrCmd && e.shiftKey && ['i', 'j', 'c'].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('paste', blockEvent);
    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('selectstart', blockEvent);
    document.addEventListener('dragstart', blockEvent);
    document.addEventListener('keydown', handleKeydown, true);

    return () => {
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('cut', blockEvent);
      document.removeEventListener('paste', blockEvent);
      document.removeEventListener('contextmenu', blockEvent);
      document.removeEventListener('selectstart', blockEvent);
      document.removeEventListener('dragstart', blockEvent);
      document.removeEventListener('keydown', handleKeydown, true);
    };
  }, [isLeader]);

  // 3. Anti-Cheat: Tab Switch / Leaving Page / Window Blur (LEADER ONLY)
  const triggerAntiCheatReset = async (reason) => {
    if (isResettingRef.current || progressData?.is_completed) return;
    isResettingRef.current = true;

    console.warn('⚠️ Anti-cheat reset triggered:', reason);
    playScanErrorSound();

    setAntiCheatViolationModal(
      `⚠️ ANTI-CHEAT VIOLATION DETECTED!\n\nReason: ${reason}\n\nYour team's progress has been reset back to Stage 1!`
    );

    try {
      await api.resetTeamProgress();
      fetchLatestProgress();
    } catch (err) {
      console.error('Failed to trigger anti-cheat reset on backend:', err);
    } finally {
      setTimeout(() => {
        isResettingRef.current = false;
      }, 2500);
    }
  };

  useEffect(() => {
    if (!isLeader) return;

    // Visibility change (tab switch, window minimization)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerAntiCheatReset('Switched browser tab or minimized window');
      }
    };

    // Window blur (leaving window / switching application)
    const handleWindowBlur = () => {
      triggerAntiCheatReset('Left game page / lost window focus');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isLeader, progressData?.is_completed]);

  const handleQRScanSuccess = async (qrTokenStr) => {
    setIsScannerOpen(false);

    try {
      const res = await api.scanQR(qrTokenStr);

      if (res.success) {
        if (res.is_final) {
          playScanSuccessSound();
          onGameCompleted();
          return;
        }

        playScanSuccessSound();
        playStageUnlockSound();

        setScanResultModal({
          type: 'success',
          title: res.title || '✓ MARK UNLOCKED',
          message: res.message || `Mark unlocked! Your next clue has been revealed below.`,
          nextStage: res.next_stage
        });

        fetchLatestProgress();

      } else {
        playScanErrorSound();
        setScanResultModal({
          type: 'error',
          code: res.code,
          title: res.title || '⚠ SCAN FAILED',
          message: res.message || 'The scanned mark could not be verified for your current location.'
        });
      }
    } catch (err) {
      playScanErrorSound();
      setScanResultModal({
        type: 'error',
        title: err.code === 'FORBIDDEN_MEMBER_SCAN' ? '403 FORBIDDEN' : 'SCAN ERROR',
        message: err.message || 'QR scanning could not be processed.'
      });
    }
  };

  if (loading && !progressData) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <Compass className="w-12 h-12 text-[#FBBF24] animate-spin mb-3" style={{ animationDuration: '4s' }} />
        <p className="text-sm font-heading text-amber-200 animate-pulse">
          FETCHING LIVE TEAM ROUTE...
        </p>
      </div>
    );
  }

  const teamInfo = progressData?.team || {};
  const currentPos = progressData?.current_position || 1;
  const currentHint = progressData?.current_hint || {};
  const stageSequence = progressData?.stage_sequence || [];
  const completedCount = progressData?.completed_stages_count || 0;
  const members = progressData?.members || [];

  return (
    <div className={`max-w-4xl mx-auto px-4 py-6 space-y-6 ${isLeader ? 'select-none' : ''}`}>
      
      {/* FULLSCREEN & ANTI-CHEAT MANDATORY OVERLAY FOR LEADER */}
      {isLeader && !isFullscreen && !progressData?.is_completed && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full bg-[#0D261E] border-2 border-amber-500 rounded-3xl p-8 shadow-[0_0_50px_rgba(245,158,11,0.4)] space-y-6 animate-fade-in">
            <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-400 rounded-full flex items-center justify-center mx-auto text-amber-400 animate-pulse">
              <ShieldCheck className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-black font-heading text-amber-200 uppercase tracking-wider">
                LEADER ANTI-CHEAT MODE
              </h3>
              <p className="text-xs text-emerald-200/90 mt-2 leading-relaxed">
                Restrictions are active for Team Leaders! Fullscreen mode, copy/paste protection, and page integrity controls are enforced. Switching tabs, leaving the page, or exiting fullscreen will reset your team's progress back to Stage 1.
              </p>
            </div>

            <button
              onClick={requestFullscreenMode}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-[#FBBF24] hover:brightness-110 text-[#071912] font-heading font-extrabold text-sm md:text-base rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.5)] border border-amber-200 transition-all transform active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 fill-current" />
              <span>ENTER FULLSCREEN TO PLAY & UNLOCK SCANNER 🚀</span>
            </button>
          </div>
        </div>
      )}

      {/* ANTI-CHEAT VIOLATION NOTIFICATION MODAL */}
      {antiCheatViolationModal && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1A0909] border-2 border-red-500 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(239,68,68,0.5)] space-y-5">
            <div className="w-16 h-16 bg-red-950 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto text-red-500 animate-bounce">
              <AlertOctagon className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-black font-heading text-red-200 uppercase tracking-wider">
              ANTI-CHEAT VIOLATION!
            </h3>

            <div className="p-4 bg-black/70 rounded-xl border border-red-800 text-xs text-red-100 leading-relaxed font-mono whitespace-pre-line text-left">
              {antiCheatViolationModal}
            </div>

            <button
              onClick={() => {
                setAntiCheatViolationModal(null);
                requestFullscreenMode();
              }}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-heading font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg transition transform active:scale-95 cursor-pointer"
            >
              RESTART HUNT FROM STAGE 1 🔄
            </button>
          </div>
        </div>
      )}

      {/* Leader Anti-Cheat Active Header Banner */}
      {isLeader && (
        <div className="bg-amber-950/80 border border-amber-500/60 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-200 shadow-md">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong>ANTI-CHEAT ACTIVE:</strong> Fullscreen Enforced • Copy/Paste Disabled • Leaving Page Resets Hunt
            </span>
          </div>
          <button
            onClick={requestFullscreenMode}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-[#071912] font-extrabold text-[11px] rounded-lg transition shrink-0 shadow-sm"
          >
            {isFullscreen ? 'FULLSCREEN ACTIVE 🟢' : 'ENABLE FULLSCREEN 🔴'}
          </button>
        </div>
      )}

      {/* Team Header */}
      <div className="bg-[#0D261E]/90 border border-[#F59E0B]/40 p-5 rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-widest flex items-center gap-1">
              {isLeader ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  TEAM LEADER CONTROLLING HUNT
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  TEAM MEMBER READ-ONLY MODE
                </>
              )}
            </span>
          </div>
          <h2 className="text-2xl font-black font-heading text-amber-100 tracking-wider">
            {teamInfo.team_name || 'Treasure Titans'}
          </h2>
          <p className="text-xs text-emerald-300 mt-0.5">
            Members: {members.map(m => m.name).join(', ') || 'Team Squad'}
          </p>
        </div>

        <button
          onClick={fetchLatestProgress}
          className="px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-800 text-amber-300 hover:bg-emerald-900 transition-colors text-xs font-bold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Live</span>
        </button>
      </div>

      {/* Real-time Toast Alert */}
      {realtimeNotice && (
        <div className="p-3 bg-amber-950/90 border border-amber-500 text-amber-200 text-xs rounded-xl font-semibold flex items-center justify-between animate-fade-in shadow-md">
          <span>{realtimeNotice}</span>
          <button onClick={() => setRealtimeNotice(null)} className="text-amber-400 hover:text-white text-xs ml-3 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Team Member Read-Only Banner */}
      {!isLeader && (
        <div className="p-4 bg-emerald-950/80 border-2 border-emerald-700/60 rounded-2xl text-left space-y-1 shadow-md">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Team Leader controls the Treasure Hunt</span>
          </div>
          <p className="text-xs text-emerald-200 leading-relaxed">
            Your Team Leader is actively searching for the physical QR code marks. QR scanning is available only to the Team Leader. You can follow your team's live route progress below!
          </p>
        </div>
      )}

      {/* Progress Bar Timeline */}
      <ProgressBar currentStage={currentPos} completedStagesCount={completedCount} />

      {/* Main Target Objective & QR Scanner Trigger */}
      <div className="bg-gradient-to-b from-[#0D261E] to-[#071912] border-2 border-[#F59E0B] rounded-3xl p-6 md:p-8 shadow-[0_0_35px_rgba(245,158,11,0.2)] text-center relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <span className="inline-block bg-[#F59E0B] text-[#071912] text-xs font-black font-heading px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
            CURRENT TEAM OBJECTIVE
          </span>

          <h2 className="text-2xl md:text-4xl font-extrabold font-heading text-amber-200 tracking-wider">
            {currentHint.title || 'THE MARK'}
          </h2>

          <p className="text-sm md:text-base text-emerald-200/90 leading-relaxed max-w-xl mx-auto italic">
            "{currentHint.mission_description || 'Locate the hidden QR mark for this location.'}"
          </p>

          {/* Scanner Controls (TEAM LEADER ONLY) */}
          {isLeader ? (
            <div className="pt-4">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-[#FBBF24] hover:brightness-110 text-[#071912] font-heading font-extrabold text-base md:text-lg rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.5)] border-2 border-amber-200 transition-all flex items-center justify-center space-x-3 mx-auto active:scale-95 cursor-pointer"
              >
                <Camera className="w-6 h-6 fill-current animate-pulse" />
                <span>SCAN THE QR CODE</span>
              </button>
              <p className="text-[11px] text-emerald-400/80 font-sans tracking-wide pt-2">
                Position phone camera reticle over the physical QR code.
              </p>
            </div>
          ) : (
            <div className="pt-4 p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl inline-block max-w-md mx-auto">
              <p className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 mb-1">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>QR scanning is available only to the Team Leader</span>
              </p>
              <p className="text-[11px] text-emerald-300">
                Help your Team Leader find the mark by solving the hint below!
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Currently Unlocked Hint Section */}
      {currentHint.clue_text && (
        <div className="bg-[#0D261E]/90 border-2 border-amber-500/60 rounded-3xl p-6 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm tracking-wider uppercase">
            <Scroll className="w-5 h-5 text-amber-400" />
            <span>🔎 CURRENT TEAM UNLOCKED HINT</span>
          </div>

          <div className="p-5 bg-[#061711] border border-amber-500/30 rounded-2xl font-serif text-amber-100 text-sm md:text-base leading-relaxed italic shadow-inner">
            "{currentHint.clue_text}"
          </div>

          <p className="text-xs text-emerald-300">
            Follow this clue to locate your team's next mark on campus!
          </p>
        </div>
      )}

      {/* Randomized Team Route Timeline */}
      <div className="bg-[#0D261E]/80 border border-emerald-800 rounded-3xl p-6 space-y-4">
        <h3 className="font-heading font-bold text-amber-200 text-base flex items-center gap-2">
          <Compass className="w-5 h-5 text-amber-400" />
          <span>YOUR TEAM'S ROUTE</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {stageSequence.map((item) => (
            <div
              key={item.position}
              className={`p-3.5 rounded-2xl border transition text-left space-y-1 ${
                item.status === 'COMPLETED'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : item.status === 'CURRENT'
                  ? 'bg-amber-950/80 border-amber-400 text-amber-100 ring-2 ring-amber-400/40'
                  : 'bg-emerald-950/30 border-emerald-900 text-emerald-600'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Step {item.position.toString().padStart(2, '0')}</span>
                {item.status === 'COMPLETED' ? (
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1">✓ Done</span>
                ) : item.status === 'CURRENT' ? (
                  <span className="text-amber-400 font-extrabold flex items-center gap-1">🔍 NEXT</span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
                )}
              </div>
              <p className="text-xs font-semibold truncate">{item.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Camera QR Scanner Modal (LEADER ONLY) */}
      {isLeader && (
        <ScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleQRScanSuccess}
        />
      )}

      {/* Scan Result Overlay Modal (Wrong Mark vs Success) */}
      {scanResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-md bg-[#0D261E] border-2 rounded-2xl p-6 text-center shadow-2xl space-y-4 ${
            scanResultModal.type === 'error' ? 'border-amber-600 shadow-amber-950/50' : 'border-[#F59E0B] shadow-amber-500/30'
          }`}>
            
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center shadow-inner">
              {scanResultModal.type === 'error' ? (
                <AlertOctagon className="w-10 h-10 text-amber-500 animate-bounce" />
              ) : (
                <CheckCircle2 className="w-10 h-10 text-[#FBBF24] animate-pulse" />
              )}
            </div>

            <h3 className="font-heading font-bold text-2xl text-amber-200 tracking-wide">
              {scanResultModal.title}
            </h3>

            <p className="text-xs md:text-sm text-emerald-200 leading-relaxed bg-emerald-950/80 p-4 rounded-xl border border-emerald-900">
              {scanResultModal.message}
            </p>

            <button
              onClick={() => setScanResultModal(null)}
              className="w-full py-3 bg-[#F59E0B] hover:bg-amber-400 text-[#071912] font-heading font-bold text-xs rounded-xl shadow-md transition-transform active:scale-95"
            >
              CONTINUE HUNT
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
