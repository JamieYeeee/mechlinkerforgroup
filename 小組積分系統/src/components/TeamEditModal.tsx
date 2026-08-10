import React, { useState, useEffect } from 'react';
import { Team, TeamColor } from '../types';
import { PRESET_ICONS, TEAM_COLOR_MAP } from '../data/defaults';
import { syncEngine } from '../utils/syncEngine';
import { X, Settings2, Save, Palette } from 'lucide-react';

interface TeamEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
}

export const TeamEditModal: React.FC<TeamEditModalProps> = ({ isOpen, onClose, teams }) => {
  const [editedTeams, setEditedTeams] = useState<Team[]>([]);

  useEffect(() => {
    setEditedTeams(JSON.parse(JSON.stringify(teams)));
  }, [teams, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (id: string, newName: string) => {
    setEditedTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: newName } : t))
    );
  };

  const handleIconChange = (id: string, newIcon: string) => {
    setEditedTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, icon: newIcon } : t))
    );
  };

  const handleColorChange = (id: string, newColor: TeamColor) => {
    setEditedTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, color: newColor } : t))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    syncEngine.updateTeams(editedTeams);
    onClose();
  };

  const availableColors: TeamColor[] = ['red', 'amber', 'emerald', 'blue', 'purple', 'rose', 'indigo', 'teal'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-lg">自訂五組團隊名稱與圖示</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-slate-500">
            變更名稱或圖示後，將自動同步給所有連線的手機。
          </p>

          <div className="space-y-3">
            {editedTeams.map((team) => {
              const colorInfo = TEAM_COLOR_MAP[team.color] || TEAM_COLOR_MAP.blue;
              return (
                <div
                  key={team.id}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-center gap-3">
                    {/* Icon Selection Trigger */}
                    <div className="relative group">
                      <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xl shadow-sm">
                        {team.icon}
                      </div>
                    </div>

                    {/* Team Name Input */}
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">
                        {team.id.toUpperCase()} 團隊名稱
                      </label>
                      <input
                        type="text"
                        required
                        value={team.name}
                        onChange={(e) => handleNameChange(team.id, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-800 text-sm focus:outline-none focus:border-purple-500 bg-white"
                        placeholder="請輸入隊名"
                      />
                    </div>
                  </div>

                  {/* Icon Quick Picker */}
                  <div className="flex items-center gap-1 overflow-x-auto py-1">
                    <span className="text-[10px] text-slate-400 font-medium mr-1">圖示：</span>
                    {PRESET_ICONS.map((ico) => (
                      <button
                        key={ico}
                        type="button"
                        onClick={() => handleIconChange(team.id, ico)}
                        className={`w-7 h-7 text-sm rounded flex items-center justify-center transition ${
                          team.icon === ico ? 'bg-purple-100 border border-purple-400' : 'hover:bg-slate-200'
                        }`}
                      >
                        {ico}
                      </button>
                    ))}
                  </div>

                  {/* Color Picker */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-medium mr-1 flex items-center gap-1">
                      <Palette className="w-3 h-3" /> 主題顏色：
                    </span>
                    {availableColors.map((c) => {
                      const cBg = TEAM_COLOR_MAP[c]?.bg || 'bg-slate-400';
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleColorChange(team.id, c)}
                          className={`w-5 h-5 rounded-full ${cBg} transition ${
                            team.color === c ? 'ring-2 ring-slate-900 ring-offset-1 scale-110' : 'opacity-80 hover:opacity-100'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              <span>儲存並同步團隊資訊</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
