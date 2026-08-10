import React, { useState } from 'react';
import { ScoreLog, Team } from '../types';
import { syncEngine } from '../utils/syncEngine';
import { soundManager } from '../utils/sound';
import {
  History,
  Search,
  RotateCcw,
  Download,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface HistoryViewProps {
  history: ScoreLog[];
  teams: Team[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, teams }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'PLUS' | 'MINUS'>('ALL');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Filter history
  const filteredLogs = history.filter((log) => {
    // Search keyword
    const matchSearch =
      searchTerm === '' ||
      log.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operator.toLowerCase().includes(searchTerm.toLowerCase());

    // Team filter
    const matchTeam = selectedTeamFilter === 'ALL' || log.teamId === selectedTeamFilter;

    // Type filter
    let matchType = true;
    if (selectedTypeFilter === 'PLUS') matchType = log.delta > 0;
    if (selectedTypeFilter === 'MINUS') matchType = log.delta < 0;

    return matchSearch && matchTeam && matchType;
  });

  const handleUndo = (logId: string) => {
    if (window.confirm('確定要復原此筆給分紀錄嗎？相關分數將會自動扣除或補回。')) {
      soundManager.playUndo();
      syncEngine.undoScore(logId);
    }
  };

  const handleReset = () => {
    soundManager.playUndo();
    syncEngine.resetRoom();
    setShowResetConfirm(false);
  };

  const exportToCSV = () => {
    if (history.length === 0) {
      alert('尚無任何歷史紀錄可供匯出');
      return;
    }

    const headers = ['時間', '小組 ID', '小組名稱', '加減分數', '事由/備註', '操作人員', '狀態'];
    const rows = history.map((log) => [
      new Date(log.timestamp).toLocaleString('zh-TW'),
      log.teamId,
      log.teamName,
      log.delta > 0 ? `+${log.delta}` : `${log.delta}`,
      `"${log.reason.replace(/"/g, '""')}"`,
      `"${log.operator.replace(/"/g, '""')}"`,
      log.undone ? '已復原' : '有效',
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `小組積分紀錄_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Search & Actions Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">歷史紀錄與詳細日誌</h2>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              共 {history.length} 筆
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出 CSV</span>
            </button>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition border border-rose-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空重置</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              placeholder="搜尋小組、原因或操作者..."
            />
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">所有小組 (1~5組)</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Plus / Minus Type Filter */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setSelectedTypeFilter('ALL')}
              className={`flex-1 py-1 rounded-lg transition ${
                selectedTypeFilter === 'ALL' ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-500'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setSelectedTypeFilter('PLUS')}
              className={`flex-1 py-1 rounded-lg transition ${
                selectedTypeFilter === 'PLUS' ? 'bg-white text-emerald-700 font-bold shadow-sm' : 'text-slate-500'
              }`}
            >
              加分
            </button>
            <button
              onClick={() => setSelectedTypeFilter('MINUS')}
              className={`flex-1 py-1 rounded-lg transition ${
                selectedTypeFilter === 'MINUS' ? 'bg-white text-rose-700 font-bold shadow-sm' : 'text-slate-500'
              }`}
            >
              扣分
            </button>
          </div>
        </div>
      </div>

      {/* History Log Timeline Cards */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <History className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500 text-sm font-medium">尚無符合條件的給分歷史紀錄</p>
          <p className="text-slate-400 text-xs">點擊「手動給分」開始登記小組積分</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString('zh-TW', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const dateStr = new Date(log.timestamp).toLocaleDateString('zh-TW');

            return (
              <div
                key={log.id}
                className={`bg-white rounded-xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
                  log.undone ? 'opacity-50 border-slate-200 bg-slate-50 line-through' : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                {/* Left: Team & Reason */}
                <div className="flex items-start gap-3">
                  <div
                    className={`px-3 py-1.5 rounded-xl font-extrabold font-mono text-sm shrink-0 flex items-center justify-center ${
                      log.delta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {log.delta > 0 ? `+${log.delta}` : log.delta}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{log.teamName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({log.teamId})</span>
                      {log.undone && (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                          已復原
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 font-medium">{log.reason}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>操作：{log.operator}</span>
                      <span>•</span>
                      <span>
                        {dateStr} {timeStr}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Undo Action Button */}
                {!log.undone && (
                  <button
                    onClick={() => handleUndo(log.id)}
                    className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-medium border border-slate-200 transition flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>復原此筆</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h3 className="font-bold text-lg text-slate-900">確認清空所有積分與歷史紀錄？</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              此操作將會將所有 5 個小組的分數重置為 0 分，並清空所有的歷史給分日誌。所有連接中的手機也會同時重置。
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
              >
                取消
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md"
              >
                確定重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
