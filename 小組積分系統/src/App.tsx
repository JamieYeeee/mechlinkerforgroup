import React, { useState, useEffect } from 'react';
import { RoomData, SyncStatus, Team } from './types';
import { syncEngine } from './utils/syncEngine';
import { Header } from './components/Header';
import { Leaderboard } from './components/Leaderboard';
import { AddScoreModal } from './components/AddScoreModal';
import { TeamEditModal } from './components/TeamEditModal';
import { HistoryView } from './components/HistoryView';
import { ShareRoomModal } from './components/ShareRoomModal';
import { ProjectorView } from './components/ProjectorView';
import { Trophy, Award, History, Plus, Smartphone, RefreshCw, Zap } from 'lucide-react';

export default function App() {
  const [roomData, setRoomData] = useState<RoomData>(syncEngine['roomData']);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncEngine['status']);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'history'>('leaderboard');

  // Modals
  const [isAddScoreOpen, setIsAddScoreOpen] = useState(false);
  const [initialTeamForAdd, setInitialTeamForAdd] = useState<string | undefined>(undefined);
  const [isTeamEditOpen, setIsTeamEditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isProjector, setIsProjector] = useState(false);

  useEffect(() => {
    // Check URL query param for room ID (e.g. ?room=ROOM101)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        syncEngine.setRoomId(roomParam);
      }
    }

    syncEngine.init();

    const unsubscribe = syncEngine.subscribe((latestRoom, latestStatus) => {
      setRoomData(latestRoom);
      setSyncStatus(latestStatus);
    });

    return () => {
      unsubscribe();
      syncEngine.destroy();
    };
  }, []);

  const handleOpenAddModal = (teamId?: string) => {
    setInitialTeamForAdd(teamId);
    setIsAddScoreOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <Header
        roomId={syncEngine.getRoomId()}
        syncStatus={syncStatus}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenTeamEdit={() => setIsTeamEditOpen(true)}
        onToggleProjector={() => setIsProjector(!isProjector)}
        isProjector={isProjector}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                activeTab === 'leaderboard'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>綜合排名與總分</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <History className="w-4 h-4 text-indigo-400" />
              <span>歷史紀錄查詢 ({roomData.history.length})</span>
            </button>
          </div>

          {/* Quick Manual Add Score Button */}
          <button
            onClick={() => handleOpenAddModal()}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>手動加減分</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'leaderboard' ? (
          <Leaderboard teams={roomData.teams} onOpenAddModal={handleOpenAddModal} />
        ) : (
          <HistoryView history={roomData.history} teams={roomData.teams} />
        )}
      </main>

      {/* Floating Action Button (FAB) for Mobile Quick Scoring */}
      <button
        onClick={() => handleOpenAddModal()}
        className="sm:hidden fixed right-5 bottom-6 z-40 bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center border-2 border-white animate-bounce"
        aria-label="手動加減分"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-500 space-y-1">
          <p>小組積分系統 ‧ 支援多機即時同步 ‧ 離線佇列編輯 ‧ 繁體中文版</p>
          <p className="font-mono text-[11px] text-slate-400">
            房間：{syncEngine.getRoomId()} | 當前操作員：{syncEngine.getOperatorName()} | 狀態：
            {syncStatus.isOnline ? '🟢 已連線' : '🟡 離線中'}
          </p>
        </div>
      </footer>

      {/* Overlays / Modals */}
      <AddScoreModal
        isOpen={isAddScoreOpen}
        onClose={() => setIsAddScoreOpen(false)}
        teams={roomData.teams}
        initialTeamId={initialTeamForAdd}
      />

      <TeamEditModal
        isOpen={isTeamEditOpen}
        onClose={() => setIsTeamEditOpen(false)}
        teams={roomData.teams}
      />

      <ShareRoomModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        roomId={syncEngine.getRoomId()}
      />

      {isProjector && (
        <ProjectorView teams={roomData.teams} onExit={() => setIsProjector(false)} />
      )}
    </div>
  );
}
