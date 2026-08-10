import React, { useState } from 'react';
import { SyncStatus } from '../types';
import { syncEngine } from '../utils/syncEngine';
import { soundManager } from '../utils/sound';
import { Wifi, WifiOff, RefreshCw, QrCode, Monitor, Volume2, VolumeX, User, Settings2 } from 'lucide-react';

interface HeaderProps {
  roomId: string;
  syncStatus: SyncStatus;
  onOpenShare: () => void;
  onOpenTeamEdit: () => void;
  onToggleProjector: () => void;
  isProjector: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  syncStatus,
  onOpenShare,
  onOpenTeamEdit,
  onToggleProjector,
  isProjector,
}) => {
  const [isEditingOperator, setIsEditingOperator] = useState(false);
  const [operatorName, setOperatorName] = useState(syncEngine.getOperatorName());
  const [isMuted, setIsMuted] = useState(soundManager.isMuted());

  const handleOperatorSave = () => {
    syncEngine.setOperatorName(operatorName);
    setIsEditingOperator(false);
  };

  const toggleSound = () => {
    const newMuted = !isMuted;
    soundManager.setMuted(newMuted);
    setIsMuted(newMuted);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Room Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xl shadow-inner">
            🏆
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg leading-tight tracking-tight">小組積分系統</h1>
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full font-mono border border-indigo-500/30">
                代碼: {roomId}
              </span>
            </div>
            <p className="text-xs text-slate-400">五組即時同步 ‧ 離線編輯 ‧ 歷史紀錄</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2 text-sm">
          {/* Network Sync Status Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
            {syncStatus.isOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                <Wifi className="w-3.5 h-3.5" />
                {syncStatus.pendingCount > 0 ? (
                  <span className="text-amber-400">待同步 {syncStatus.pendingCount} 筆</span>
                ) : (
                  <span>即時同步中</span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                <WifiOff className="w-3.5 h-3.5" />
                <span>離線模式 ({syncStatus.pendingCount} 筆待傳)</span>
              </span>
            )}

            {syncStatus.isSyncing && <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin ml-1" />}

            {syncStatus.pendingCount > 0 && syncStatus.isOnline && (
              <button
                onClick={() => syncEngine.flushOfflineQueue()}
                className="ml-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-0.5 rounded transition"
                title="立即將離線紀錄傳送至伺服器"
              >
                立即同步
              </button>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={isMuted ? '開啟音效' : '靜音'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Operator Nickname Badge */}
          <div className="relative">
            <button
              onClick={() => setIsEditingOperator(!isEditingOperator)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              title="修改我的操作者暱稱"
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[80px] truncate">{operatorName}</span>
            </button>

            {isEditingOperator && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-2xl z-50">
                <label className="block text-xs text-slate-300 mb-1 font-medium">操作人員暱稱（例如：主裁判）：</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="輸入暱稱"
                  />
                  <button
                    onClick={handleOperatorSave}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                  >
                    儲存
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* QR & Share Multi-device */}
          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>手機同步/分享</span>
          </button>

          {/* Edit Team Names */}
          <button
            onClick={onOpenTeamEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition border border-slate-700/80"
          >
            <Settings2 className="w-3.5 h-3.5 text-purple-400" />
            <span>自訂組名</span>
          </button>

          {/* Projector / Big Screen Mode */}
          <button
            onClick={onToggleProjector}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              isProjector ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{isProjector ? '離開大螢幕' : '投影大螢幕'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
