import React, { useState, useEffect } from 'react';
import { Team } from '../types';
import { PRESET_REASONS, TEAM_COLOR_MAP } from '../data/defaults';
import { syncEngine } from '../utils/syncEngine';
import { soundManager } from '../utils/sound';
import { X, Plus, Minus, Check, Sparkles, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  initialTeamId?: string;
}

export const AddScoreModal: React.FC<AddScoreModalProps> = ({
  isOpen,
  onClose,
  teams,
  initialTeamId,
}) => {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [deltaInput, setDeltaInput] = useState<string>('10');
  const [isNegative, setIsNegative] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [customOperator, setCustomOperator] = useState<string>(syncEngine.getOperatorName());

  useEffect(() => {
    if (initialTeamId) {
      setSelectedTeamIds([initialTeamId]);
    } else {
      setSelectedTeamIds(teams.map((t) => t.id)); // 預設全部選取或預設第1組
    }
  }, [initialTeamId, teams, isOpen]);

  if (!isOpen) return null;

  const toggleSelectTeam = (id: string) => {
    if (selectedTeamIds.includes(id)) {
      if (selectedTeamIds.length > 1) {
        setSelectedTeamIds(selectedTeamIds.filter((tId) => tId !== id));
      }
    } else {
      setSelectedTeamIds([...selectedTeamIds, id]);
    }
  };

  const selectAllTeams = () => {
    if (selectedTeamIds.length === teams.length) {
      setSelectedTeamIds([teams[0].id]);
    } else {
      setSelectedTeamIds(teams.map((t) => t.id));
    }
  };

  const handleQuickAmount = (amount: number) => {
    setDeltaInput(Math.abs(amount).toString());
    setIsNegative(amount < 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = parseInt(deltaInput, 10);
    if (isNaN(rawVal) || rawVal === 0) return;

    const finalDelta = isNegative ? -Math.abs(rawVal) : Math.abs(rawVal);
    const finalReason = reason.trim() || (finalDelta > 0 ? '手動加分' : '手動扣分');

    // Trigger audio & confetti if big score
    if (finalDelta > 0) {
      if (finalDelta >= 50) {
        soundManager.playBigBonus();
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      } else {
        soundManager.playScoreAdd();
      }
    } else {
      soundManager.playScoreDeduct();
    }

    // Process score for all selected teams
    selectedTeamIds.forEach((tId) => {
      syncEngine.addScore(tId, finalDelta, finalReason, customOperator);
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-lg">手動加減分輸入</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Step 1: Target Team Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. 選擇對象小組 ({selectedTeamIds.length}/{teams.length})
              </label>
              <button
                type="button"
                onClick={selectAllTeams}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {selectedTeamIds.length === teams.length ? '取消全選' : '全選 5 組'}
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {teams.map((team) => {
                const isSelected = selectedTeamIds.includes(team.id);
                const colorInfo = TEAM_COLOR_MAP[team.color] || TEAM_COLOR_MAP.blue;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggleSelectTeam(team.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition text-center ${
                      isSelected
                        ? `${colorInfo.lightBg} ${colorInfo.border} ${colorInfo.ring} ring-2`
                        : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className="text-xl">{team.icon}</span>
                    <span className="text-xs font-bold truncate w-full">{team.name}</span>
                    {isSelected && <Check className={`w-3.5 h-3.5 ${colorInfo.text}`} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Score Delta Input & Sign Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. 輸入變更分數
            </label>

            <div className="flex gap-2 mb-3">
              <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setIsNegative(false)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                    !isNegative ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className="w-4 h-4" /> 加分 (+)
                </button>
                <button
                  type="button"
                  onClick={() => setIsNegative(true)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                    isNegative ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Minus className="w-4 h-4" /> 扣分 (-)
                </button>
              </div>

              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="9999"
                  required
                  value={deltaInput}
                  onChange={(e) => setDeltaInput(e.target.value)}
                  className={`w-full px-4 py-2 rounded-xl border text-xl font-extrabold font-mono text-center focus:outline-none ${
                    isNegative
                      ? 'border-rose-300 text-rose-600 bg-rose-50/30'
                      : 'border-emerald-300 text-emerald-600 bg-emerald-50/30'
                  }`}
                  placeholder="分數"
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 5, 10, 20, 50, 100].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleQuickAmount(num)}
                  className="py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-xs font-bold border border-slate-200 transition"
                >
                  +{num}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Preset Reasons & Custom Reason Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              3. 加扣分原因 / 備註
            </label>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    reason === r
                      ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              placeholder="或手動輸入事由（例如：課堂發表優秀）"
            />
          </div>

          {/* Operator Name Option */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">給分人員暱稱：</label>
            <input
              type="text"
              value={customOperator}
              onChange={(e) => setCustomOperator(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-slate-50"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition flex items-center justify-center gap-2 ${
                isNegative
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>
                確定對 {selectedTeamIds.length} 個小組 {isNegative ? '扣減' : '增加'}{' '}
                {isNegative ? `-${deltaInput}` : `+${deltaInput}`} 分
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
