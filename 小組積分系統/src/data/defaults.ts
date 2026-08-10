import { RoomData, Team } from '../types';

export const DEFAULT_TEAMS: Team[] = [
  { id: 'team-1', name: '第 1 組', color: 'red', icon: '⚡', score: 0 },
  { id: 'team-2', name: '第 2 組', color: 'amber', icon: '🔥', score: 0 },
  { id: 'team-3', name: '第 3 組', color: 'emerald', icon: '🚀', score: 0 },
  { id: 'team-4', name: '第 4 組', color: 'blue', icon: '🦁', score: 0 },
  { id: 'team-5', name: '第 5 組', color: 'purple', icon: '👑', score: 0 },
];

export const TEAM_COLOR_MAP: Record<string, { bg: string; border: string; text: string; lightBg: string; ring: string }> = {
  red: { bg: 'bg-red-500', border: 'border-red-400', text: 'text-red-600', lightBg: 'bg-red-50', ring: 'ring-red-400' },
  amber: { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-600', lightBg: 'bg-amber-50', ring: 'ring-amber-400' },
  emerald: { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-600', lightBg: 'bg-emerald-50', ring: 'ring-emerald-400' },
  blue: { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-600', lightBg: 'bg-blue-50', ring: 'ring-blue-400' },
  purple: { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-600', lightBg: 'bg-purple-50', ring: 'ring-purple-400' },
  rose: { bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-rose-600', lightBg: 'bg-rose-50', ring: 'ring-rose-400' },
  indigo: { bg: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-indigo-600', lightBg: 'bg-indigo-50', ring: 'ring-indigo-400' },
  teal: { bg: 'bg-teal-500', border: 'border-teal-400', text: 'text-teal-600', lightBg: 'bg-teal-50', ring: 'ring-teal-400' },
};

export const PRESET_REASONS = [
  '🎯 課堂搶答成功',
  '🏆 團隊競賽第一名',
  '💡 創意回答與發表',
  '🤝 良好團隊合作',
  '✨ 秩序維護良好',
  '📝 作業完成優良',
  '👏 踴躍互動分享',
  '⚠️ 秩序提醒減分',
];

export const PRESET_ICONS = ['⚡', '🔥', '🚀', '🦁', '👑', '🎯', '💎', '🦅', '🐉', '🌟', '🦄', '🐺'];

export function createDefaultRoom(roomId: string = '5TEAMS'): RoomData {
  return {
    roomId,
    roomName: '小組競賽積分房',
    teams: JSON.parse(JSON.stringify(DEFAULT_TEAMS)),
    history: [],
    updatedAt: Date.now(),
  };
}
