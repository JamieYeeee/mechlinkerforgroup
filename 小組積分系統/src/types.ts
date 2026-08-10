export type TeamColor = 'red' | 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'indigo' | 'teal';

export interface Team {
  id: string; // 'team-1', 'team-2', 'team-3', 'team-4', 'team-5'
  name: string; // 自訂組名，例如：'閃電隊'
  color: TeamColor;
  icon: string; // 圖示，例如：'⚡'
  score: number; // 當前累積總分
}

export interface ScoreLog {
  id: string; // 唯一紀錄 ID
  teamId: string;
  teamName: string; // 紀錄當時的組名快照
  delta: number; // 加減分數，如 +10 或 -5
  reason: string; // 事由/備註，如 '課堂搶答第一名'
  operator: string; // 操作人員，如 '主裁判 手機 A'
  timestamp: number; // 毫秒時間戳
  undone?: boolean; // 是否已被復原
}

export interface RoomData {
  roomId: string;
  roomName: string;
  teams: Team[]; // 固定 5 組
  history: ScoreLog[];
  updatedAt: number;
}

export type OfflineActionType = 'ADD_SCORE' | 'UPDATE_TEAMS' | 'UNDO_SCORE' | 'RESET_ROOM';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: any;
  timestamp: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  error: string | null;
}
