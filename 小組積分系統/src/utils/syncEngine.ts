import { createDefaultRoom } from '../data/defaults';
import { OfflineAction, OfflineActionType, RoomData, ScoreLog, SyncStatus, Team } from '../types';

type SyncListener = (room: RoomData, status: SyncStatus) => void;

class SyncEngine {
  private roomId: string = '5TEAMS';
  private roomData: RoomData = createDefaultRoom('5TEAMS');
  private pendingQueue: OfflineAction[] = [];
  private listeners: Set<SyncListener> = new Set();
  private eventSource: EventSource | null = null;
  private pollIntervalTimer: any = null;
  private operatorName: string = '預設裁判';

  private status: SyncStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: null,
    error: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      const savedOp = localStorage.getItem('SCORE_OPERATOR');
      if (savedOp) {
        this.operatorName = savedOp;
      } else {
        const randomPhoneId = Math.floor(1000 + Math.random() * 9000);
        this.operatorName = `裝置-${randomPhoneId}`;
        localStorage.setItem('SCORE_OPERATOR', this.operatorName);
      }

      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  public getOperatorName(): string {
    return this.operatorName;
  }

  public setOperatorName(name: string) {
    this.operatorName = name.trim() || '預設裁判';
    if (typeof window !== 'undefined') {
      localStorage.setItem('SCORE_OPERATOR', this.operatorName);
    }
  }

  public setRoomId(newRoomId: string) {
    const normalized = newRoomId.toUpperCase().trim() || '5TEAMS';
    if (this.roomId === normalized) return;

    this.disconnectSSE();
    this.roomId = normalized;
    this.loadFromLocalStorage();
    this.connectSSE();
    this.fetchLatestRoom();
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public init() {
    this.loadFromLocalStorage();
    this.connectSSE();
    this.fetchLatestRoom();

    // Setup backup poll every 5s if online
    if (typeof window !== 'undefined') {
      this.pollIntervalTimer = setInterval(() => {
        if (this.status.isOnline && this.pendingQueue.length === 0) {
          this.fetchLatestRoom(true);
        }
      }, 5000);
    }
  }

  public destroy() {
    this.disconnectSSE();
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
    }
  }

  public subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    // Send immediate initial state
    listener(this.roomData, this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private isFlushingQueue = false;

  private notify() {
    this.status.pendingCount = this.pendingQueue.length;
    // Create new object & array references for React re-render detection
    const cloneRoom: RoomData = {
      ...this.roomData,
      teams: this.roomData.teams.map((t) => ({ ...t })),
      history: [...this.roomData.history],
    };
    const cloneStatus: SyncStatus = { ...this.status };
    this.listeners.forEach((fn) => fn(cloneRoom, cloneStatus));
    this.saveToLocalStorage();
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      const roomKey = `SCORE_ROOM_${this.roomId}`;
      const queueKey = `SCORE_PENDING_${this.roomId}`;

      const savedRoom = localStorage.getItem(roomKey);
      if (savedRoom) {
        this.roomData = JSON.parse(savedRoom);
      } else {
        this.roomData = createDefaultRoom(this.roomId);
      }

      const savedQueue = localStorage.getItem(queueKey);
      if (savedQueue) {
        this.pendingQueue = JSON.parse(savedQueue);
      } else {
        this.pendingQueue = [];
      }
    } catch (err) {
      console.error('Failed loading from local storage:', err);
    }
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      const roomKey = `SCORE_ROOM_${this.roomId}`;
      const queueKey = `SCORE_PENDING_${this.roomId}`;

      localStorage.setItem(roomKey, JSON.stringify(this.roomData));
      localStorage.setItem(queueKey, JSON.stringify(this.pendingQueue));
    } catch (err) {
      console.error('Failed saving to local storage:', err);
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    this.status.isOnline = isOnline;
    if (isOnline) {
      this.connectSSE();
      this.flushOfflineQueue();
    } else {
      this.disconnectSSE();
      this.notify();
    }
  }

  private connectSSE() {
    if (typeof window === 'undefined' || !this.status.isOnline) return;
    this.disconnectSSE();

    try {
      this.eventSource = new EventSource(`/api/rooms/${encodeURIComponent(this.roomId)}/stream`);

      this.eventSource.onmessage = (event) => {
        try {
          const freshRoom: RoomData = JSON.parse(event.data);
          // Only replace local state if we don't have pending actions or active flush
          if (this.pendingQueue.length === 0 && !this.isFlushingQueue) {
            this.roomData = freshRoom;
            this.status.lastSyncedAt = Date.now();
            this.status.error = null;
            this.notify();
          }
        } catch (e) {
          console.error('Failed parsing SSE message:', e);
        }
      };

      this.eventSource.onerror = () => {
        this.disconnectSSE();
      };
    } catch (err) {
      console.error('SSE connection error:', err);
    }
  }

  private disconnectSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  public async fetchLatestRoom(silent: boolean = false) {
    if (!this.status.isOnline) return;
    try {
      if (!silent) this.status.isSyncing = true;
      const res = await fetch(`/api/rooms/${encodeURIComponent(this.roomId)}`);
      if (res.ok) {
        const room: RoomData = await res.json();
        if (this.pendingQueue.length === 0 && !this.isFlushingQueue) {
          this.roomData = room;
          this.status.lastSyncedAt = Date.now();
          this.status.error = null;
        } else {
          // Sync pending actions if any
          await this.flushOfflineQueue();
        }
      }
    } catch (err) {
      this.status.error = '無法連線至伺服器';
    } finally {
      this.status.isSyncing = false;
      this.notify();
    }
  }

  // Flush offline queue to server with atomic queue processing
  public async flushOfflineQueue() {
    if (!this.status.isOnline || this.pendingQueue.length === 0 || this.isFlushingQueue) return;

    this.isFlushingQueue = true;
    this.status.isSyncing = true;
    this.notify();

    try {
      while (this.pendingQueue.length > 0 && this.status.isOnline) {
        const actionsToSend = [...this.pendingQueue];
        const res = await fetch(`/api/rooms/${encodeURIComponent(this.roomId)}/sync-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actions: actionsToSend }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            // Remove sent actions from queue safely without wiping new optimistic actions
            this.pendingQueue.splice(0, actionsToSend.length);
            this.roomData = data.room;
            if (this.pendingQueue.length > 0) {
              this.recalculateLocalScores();
            }
            this.status.lastSyncedAt = Date.now();
            this.status.error = null;
          } else {
            break;
          }
        } else {
          this.status.error = '同步至伺服器失敗，將於重新連線後重試';
          break;
        }
      }
    } catch (err) {
      this.status.error = '連線失敗，變更已儲存於本機離線隊列';
    } finally {
      this.isFlushingQueue = false;
      this.status.isSyncing = false;
      this.notify();
    }
  }

  // --- LOCAL OPTIMISTIC ACTION WRAPPERS ---

  private recalculateLocalScores() {
    const scoreMap: Record<string, number> = {};
    this.roomData.teams.forEach((t) => (scoreMap[t.id] = 0));

    this.roomData.history.forEach((log) => {
      if (!log.undone && scoreMap[log.teamId] !== undefined) {
        scoreMap[log.teamId] += log.delta;
      }
    });

    this.roomData.teams.forEach((t) => {
      t.score = Math.max(0, scoreMap[t.id] || 0);
    });
    this.roomData.updatedAt = Date.now();
  }

  public async addScore(teamId: string, delta: number, reason: string, customOperator?: string) {
    const op = customOperator || this.operatorName;
    const team = this.roomData.teams.find((t) => t.id === teamId);
    if (!team) return;

    let numDelta = delta;
    if (numDelta < 0) {
      numDelta = Math.max(-team.score, numDelta);
    }

    if (numDelta === 0 && delta !== 0 && team.score === 0) {
      return;
    }

    const log: ScoreLog = {
      id: `log_loc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      teamId,
      teamName: team.name,
      delta: numDelta,
      reason: reason ? reason.trim() : '手動調整分數',
      operator: op,
      timestamp: Date.now(),
      undone: false,
    };

    // Optimistically add locally
    this.roomData.history.unshift(log);
    this.recalculateLocalScores();

    // Push to offline queue
    const action: OfflineAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: 'ADD_SCORE',
      payload: { teamId, delta: numDelta, reason: log.reason, operator: op, timestamp: log.timestamp },
      timestamp: Date.now(),
    };
    this.pendingQueue.push(action);

    this.notify();

    // Try immediate background sync
    if (this.status.isOnline) {
      this.flushOfflineQueue();
    }
  }

  public async updateTeams(updatedTeams: Team[]) {
    // Optimistically update locally
    updatedTeams.forEach((u) => {
      const existing = this.roomData.teams.find((t) => t.id === u.id);
      if (existing) {
        existing.name = u.name.trim() || existing.name;
        existing.icon = u.icon || existing.icon;
        existing.color = u.color || existing.color;
      }
    });
    this.roomData.updatedAt = Date.now();

    const action: OfflineAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: 'UPDATE_TEAMS',
      payload: { teams: updatedTeams },
      timestamp: Date.now(),
    };
    this.pendingQueue.push(action);

    this.notify();

    if (this.status.isOnline) {
      this.flushOfflineQueue();
    }
  }

  public async undoScore(logId: string) {
    const log = this.roomData.history.find((l) => l.id === logId);
    if (!log) return;

    log.undone = true;
    this.recalculateLocalScores();

    const action: OfflineAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: 'UNDO_SCORE',
      payload: { logId },
      timestamp: Date.now(),
    };
    this.pendingQueue.push(action);

    this.notify();

    if (this.status.isOnline) {
      this.flushOfflineQueue();
    }
  }

  public async resetRoom() {
    this.roomData.history = [];
    this.roomData.teams.forEach((t) => (t.score = 0));
    this.roomData.updatedAt = Date.now();

    const action: OfflineAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: 'RESET_ROOM',
      payload: {},
      timestamp: Date.now(),
    };
    this.pendingQueue.push(action);

    this.notify();

    if (this.status.isOnline) {
      this.flushOfflineQueue();
    }
  }
}

export const syncEngine = new SyncEngine();
