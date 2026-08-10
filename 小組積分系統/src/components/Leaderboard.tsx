import React, { useState } from 'react';
import { Team } from '../types';
import { TEAM_COLOR_MAP } from '../data/defaults';
import { soundManager } from '../utils/sound';
import { syncEngine } from '../utils/syncEngine';
import { Trophy, Plus, Minus, Zap, Award, Sparkles, RotateCcw, RefreshCw, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LeaderboardProps {
  teams: Team[];
  onOpenAddModal: (teamId?: string) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ teams, onOpenAddModal }) => {
  const [animatingTeamId, setAnimatingTeamId] = useState<string | null>(null);
  const [floatingScore, setFloatingScore] = useState<{ teamId: string; delta: number } | null>(null);
  const [resetTeamTarget, setResetTeamTarget] = useState<Team | null>(null);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);

  // Sort teams by score descending (highest score first)
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const topScore = Math.max(...teams.map((t) => t.score), 1);

  const handleQuickAdd = (teamId: string, delta: number, teamName: string) => {
    if (delta > 0) {
      if (delta >= 50) {
        soundManager.playBigBonus();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } else {
        soundManager.playScoreAdd();
      }
    } else {
      soundManager.playScoreDeduct();
    }

    setAnimatingTeamId(teamId);
    setFloatingScore({ teamId, delta });

    setTimeout(() => {
      setAnimatingTeamId(null);
      setFloatingScore(null);
    }, 1200);

    const reason = delta > 0 ? `快速加分 (+${delta})` : `快速減分 (${delta})`;
    syncEngine.addScore(teamId, delta, reason);
  };

  const handleResetSingleTeam = (team: Team) => {
    if (team.score <= 0) {
      setResetTeamTarget(null);
      return;
    }
    soundManager.playUndo();
    syncEngine.addScore(team.id, -team.score, `【${team.name}】分數歸零`);
    setResetTeamTarget(null);
  };

  const handleResetAllTeams = () => {
    soundManager.playUndo();
    // Deduct each team's score down to 0
    teams.forEach((t) => {
      if (t.score > 0) {
        syncEngine.addScore(t.id, -t.score, `【${t.name}】分數歸零`);
      }
    });
    setShowResetAllConfirm(false);
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-slate-900 font-extrabold text-lg shadow-lg ring-4 ring-amber-200">
            🥇
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-300 text-slate-900 font-extrabold text-lg shadow-md ring-2 ring-slate-200">
            🥈
          </div>
        );
      case 3:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-700 text-amber-100 font-extrabold text-lg shadow-md ring-2 ring-amber-600/30">
            🥉
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm border border-slate-200">
            #{rank}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Trigger */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
              <h2 className="text-xl font-bold tracking-tight">綜合排名與即時積分板</h2>
            </div>
            <p className="text-slate-300 text-sm">
              即時統計五小組最新總分。多台手機可同步給分與扣分。
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => onOpenAddModal()}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-indigo-500/25 transition flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>手動給分 / 批量給分</span>
            </button>

            <button
              onClick={() => setShowResetAllConfirm(true)}
              className="px-3 py-2.5 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
              title="將全部 5 組分數一鍵歸零"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>一鍵分數歸零</span>
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Team Cards */}
      <div className="grid grid-cols-1 gap-4">
        {sortedTeams.map((team, index) => {
          const rank = index + 1;
          const colorStyles = TEAM_COLOR_MAP[team.color] || TEAM_COLOR_MAP.blue;
          const pct = Math.max(0, Math.min(100, Math.round((team.score / topScore) * 100)));
          const isTop = rank === 1;

          return (
            <div
              key={team.id}
              className={`relative bg-white rounded-2xl border transition-all duration-300 p-5 shadow-sm hover:shadow-md ${
                isTop ? 'border-amber-300 ring-2 ring-amber-400/30 bg-gradient-to-r from-amber-50/40 to-white' : 'border-slate-200'
              } ${animatingTeamId === team.id ? 'scale-[1.01] transition-transform' : ''}`}
            >
              {/* Floating score indicator when updated */}
              {floatingScore && floatingScore.teamId === team.id && (
                <div
                  className={`absolute right-12 top-2 font-extrabold text-2xl animate-bounce z-20 ${
                    floatingScore.delta > 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {floatingScore.delta > 0 ? `+${floatingScore.delta}` : floatingScore.delta}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Team Info & Rank */}
                <div className="flex items-center gap-4 min-w-[200px]">
                  {getRankBadge(rank)}

                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-xl bg-slate-100 shadow-inner flex items-center justify-center">
                      {team.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-lg">{team.name}</h3>
                        {isTop && (
                          <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            暫定第一
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono">ID: {team.id}</span>
                    </div>
                  </div>
                </div>

                {/* Score Big Display */}
                <div className="flex items-baseline gap-1 sm:text-right">
                  <span className="text-xs text-slate-500 font-medium">總分：</span>
                  <span className={`text-3xl font-extrabold font-mono tracking-tight ${colorStyles.text}`}>
                    {team.score}
                  </span>
                  <span className="text-xs text-slate-400">分</span>
                </div>

                {/* Quick Scoring Buttons & Single Reset */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleQuickAdd(team.id, 1, team.name)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 text-xs font-bold border border-slate-200 transition"
                    title="+1 分"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => handleQuickAdd(team.id, 5, team.name)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition"
                    title="+5 分"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => handleQuickAdd(team.id, 10, team.name)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                    title="+10 分"
                  >
                    +10
                  </button>
                  <button
                    onClick={() => handleQuickAdd(team.id, -1, team.name)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-rose-700 text-xs font-bold border border-slate-200 transition"
                    title="-1 分"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => onOpenAddModal(team.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium border border-indigo-200 transition"
                  >
                    自訂...
                  </button>
                  <button
                    onClick={() => setResetTeamTarget(team)}
                    disabled={team.score === 0}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition border flex items-center gap-1 ${
                      team.score === 0
                        ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                        : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                    }`}
                    title="將此小組分數歸零"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>歸零</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar relative to leading score */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-500 mb-1 font-medium">
                  <span>積分進度條</span>
                  <span>{pct}% (相對最高分)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${colorStyles.bg}`}
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal for Resetting Single Team */}
      {resetTeamTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">確定將【{resetTeamTarget.name}】分數歸零？</h3>
            </div>
            <p className="text-xs text-slate-600">
              當前累積總分為 <span className="font-bold text-rose-600">{resetTeamTarget.score} 分</span>。歸零操作將會新增一筆歸零紀錄，並同步更新至所有連線裝置。
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResetTeamTarget(null)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
              >
                取消
              </button>
              <button
                onClick={() => handleResetSingleTeam(resetTeamTarget)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
              >
                確認歸零
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resetting ALL Teams */}
      {showResetAllConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">確認將所有 5 組分數一鍵歸零？</h3>
            </div>
            <p className="text-xs text-slate-600">
              所有小組的分數將會被調整重置為 0 分。此變更將會透過即時同步廣播給所有使用中的手機。
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetAllConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
              >
                取消
              </button>
              <button
                onClick={handleResetAllTeams}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
              >
                確定全組歸零
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

