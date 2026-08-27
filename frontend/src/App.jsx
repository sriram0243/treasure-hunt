import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import HowToPlayPage from './pages/HowToPlayPage';
import GameView from './pages/GameView';
import VictoryPage from './pages/VictoryPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminQRPage from './pages/AdminQRPage';
import WinnerModal from './components/WinnerModal';
import { api } from './api/client';
import { getSocket, joinAdminRoom } from './api/socket';
import { isSoundEnabled } from './utils/soundEffects';

export default function App() {
  const [viewMode, setViewMode] = useState('landing');
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [userSession, setUserSession] = useState(null);
  const [globalWinnerModal, setGlobalWinnerModal] = useState(null); // { winner_team_name }

  useEffect(() => {
    // Clear previous team token on refresh so user lands back on login page
    localStorage.removeItem('th_jwt_token');
    setUserSession(null);
    setViewMode('landing');

    // Connect Socket.IO global listeners
    const socket = getSocket();
    joinAdminRoom();


    socket.on('hunt_winner_declared', (data) => {
      console.log('🏆 Global winner declared via socket:', data);
      setGlobalWinnerModal({
        winner_name: data.winner_team_name
      });
    });

    socket.on('hunt_closed', (data) => {
      console.log('🔒 Global hunt closed via socket:', data);
      if (!globalWinnerModal && data.winner_team_name) {
        setGlobalWinnerModal({
          winner_name: data.winner_team_name
        });
      }
    });

    return () => {
      socket.off('hunt_winner_declared');
      socket.off('hunt_closed');
    };
  }, []);

  const handleStartHunt = (userData) => {
    setUserSession(userData);
    setViewMode('game');
  };

  const handleResetSession = () => {
    localStorage.removeItem('th_jwt_token');
    setUserSession(null);
    setViewMode('landing');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#071912] text-[#E2E8F0] selection:bg-[#F59E0B] selection:text-[#071912]">
      
      {/* Persistent Header */}
      <Header
        soundOn={soundOn}
        setSoundOn={setSoundOn}
        onResetSession={userSession ? handleResetSession : null}
        currentStage={1}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Dynamic View Router */}
      <main className="flex-1 pb-12">
        {viewMode === 'landing' && (
          <LandingPage
            onStartHunt={handleStartHunt}
            onOpenGuide={() => setViewMode('how-to-play')}
            userSession={userSession}
          />
        )}

        {viewMode === 'how-to-play' && (
          <HowToPlayPage
            onBackToGame={() => setViewMode(userSession ? 'game' : 'landing')}
          />
        )}

        {viewMode === 'game' && (
          <GameView
            userSession={userSession}
            setUserSession={setUserSession}
            onGameCompleted={() => setViewMode('victory')}
          />
        )}

        {viewMode === 'victory' && (
          <VictoryPage
            userSession={userSession}
            onResetSession={handleResetSession}
          />
        )}

        {viewMode === 'admin' && (
          <AdminDashboard
            onOpenQRManagement={() => setViewMode('admin-qr')}
          />
        )}

        {viewMode === 'admin-qr' && (
          <AdminQRPage
            onBackToDashboard={() => setViewMode('admin')}
          />
        )}
      </main>

      {/* Global Winner Broadcast Modal */}
      {globalWinnerModal && (
        <WinnerModal
          winnerName={globalWinnerModal.winner_name}
          onClose={() => setGlobalWinnerModal(null)}
          onViewSummary={() => {
            setGlobalWinnerModal(null);
            setViewMode('victory');
          }}
        />
      )}

      {/* Footer */}
      <footer className="py-4 px-4 border-t border-emerald-950 text-center text-xs text-emerald-600 print:hidden">
        <p>© 2026 College Event Treasure Hunt Engine • Real-Time Team System</p>
      </footer>

    </div>
  );
}

