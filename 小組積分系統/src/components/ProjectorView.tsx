import React from 'react';
import { Team } from '../types';
import { TEAM_COLOR_MAP } from '../data/defaults';
import { Monitor, Trophy, Sparkles, X } from 'lucide-react';

interface ProjectorViewProps {
  teams: Team[];
  onExit: () => void;
}

export const ProjectorView: React.FC<ProjectorViewProps> = ({ teams, onExit }) => {
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const topScore = Math.max(...teams.map((t) => t.score), 1);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-6 md:p-10 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center text-2xl shadow-lg font-bold">
            🏆
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500">
              小組競賽綜合排名榜
            </h1>
            <p className="text-xs md:text-sm text-slate-400">大螢幕即時投影模式 ‧ 全方位分數同步</p>
          </div>
        </div>

        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition border border-slate-700"
        >
          <X className="w-4 h-4" />
          <span>退出大螢幕</span>
        </button>
      </div>

      {/* Main Big Rank Grid */}
      <div className="flex-1 my-6 grid grid-cols-1 gap-5 max-w-5xl mx-auto w-full justify-center">
        {sortedTeams.map((team, index) => {
          const rank = index + 1;
          const colorInfo = TEAM_COLOR_MAP[team.color] || TEAM_COLOR_MAP.blue;
          const pct = Math.max(0, Math.min(100, Math.round((team.score / topScore) * 100)));
          const isTop = rank === 1;

          return (
            <div
              key={team.id}
              className={`p-6 rounded-3xl border transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden ${
                isTop
                  ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border-amber-400/80 ring-2 ring-amber-400/30'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              {/* Background ambient glow for Rank 1 */}
              {isTop && (
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              )}

              {/* Rank & Team Name */}
              <div className="flex items-center gap-5 min-w-[280px]">
                <div className="shrink-0 font-extrabold text-2xl w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-800 border border-slate-700">
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-4xl p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
                    {team.icon}
                  </span>
                  <div>
                    <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                      {team.name}
                      {isTop && (
                        <span className="text-xs bg-amber-400 text-slate-950 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3 fill-current" />
                          領先中
                        </span>
                      )}
                    </h2>
                    <span className="text-xs text-slate-400 font-mono">第 {index + 1} 名</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar & Score Display */}
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400 font-medium">相對得分百分比</span>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-4xl font-black text-amber-400 tracking-tight">{team.score}</span>
                    <span className="text-sm text-slate-400">分</span>
                  </div>
                </div>

                <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${colorInfo.bg}`}
                    style={{ width: `${Math.max(5, pct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-900">
        提示：任何隊員或裁判手動加分後，本投影畫面將會零時差自動更新。
      </div>
    </div>
  );
};
