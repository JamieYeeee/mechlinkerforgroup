import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createDefaultRoom } from './src/data/defaults.js';
import { OfflineAction, RoomData, ScoreLog, Team } from './src/types.js';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

// Memory store for rooms
const rooms: Record<string, RoomData> = {};

// Active SSE subscribers per room
const subscribers: Record<string, Set<Response>> = {};

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load persisted room data if exists
function loadRoomsFromDisk() {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const data = fs.readFileSync(ROOMS_FILE, 'utf-8');
      const loaded = JSON.parse(data);
      Object.assign(rooms, loaded);
      console.log(`[Server] Loaded ${Object.keys(rooms).length} rooms from disk.`);
    }
  } catch (err) {
    console.error('[Server] Failed to load rooms from disk:', err);
  }
}

// Save room data to disk (debounced to avoid blocking I/O)
let saveTimer: NodeJS.Timeout | null = null;
function saveRoomsToDisk() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.writeFile(ROOMS_FILE, JSON.stringify(rooms, null, 2), 'utf-8', (err) => {
      if (err) console.error('[Server] Failed to save rooms to disk:', err);
    });
  }, 300);
}

// Broadcast updated room state to all SSE subscribers of a room
function notifySubscribers(roomId: string) {
  const roomData = rooms[roomId];
  if (!roomData) return;

  const roomSubs = subscribers[roomId];
  if (roomSubs && roomSubs.size > 0) {
    const payload = `data: ${JSON.stringify(roomData)}\n\n`;
    roomSubs.forEach((res) => {
      try {
        res.write(payload);
      } catch (err) {
        roomSubs.delete(res);
      }
    });
  }
}

// Helper to get or create room
function getOrCreateRoom(roomId: string): RoomData {
  const normalizedId = roomId.toUpperCase().trim() || '5TEAMS';
  if (!rooms[normalizedId]) {
    rooms[normalizedId] = createDefaultRoom(normalizedId);
    saveRoomsToDisk();
  }
  return rooms[normalizedId];
}

// Recalculate team scores from non-undone history
function recalculateTeamScores(room: RoomData) {
  // Reset all scores to 0
  const scoreMap: Record<string, number> = {};
  room.teams.forEach((t) => {
    scoreMap[t.id] = 0;
  });

  // Calculate from valid history
  room.history.forEach((log) => {
    if (!log.undone && scoreMap[log.teamId] !== undefined) {
      scoreMap[log.teamId] += log.delta;
    }
  });

  room.teams.forEach((t) => {
    t.score = Math.max(0, scoreMap[t.id] || 0);
  });

  room.updatedAt = Date.now();
}

loadRoomsFromDisk();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Router
  const apiRouter = express.Router();

  // Get Room State
  apiRouter.get('/rooms/:roomId', (req: Request, res: Response) => {
    const { roomId } = req.params;
    const room = getOrCreateRoom(roomId);
    res.json(room);
  });

  // SSE Stream for Real-time Sync
  apiRouter.get('/rooms/:roomId/stream', (req: Request, res: Response) => {
    const { roomId } = req.params;
    const normalizedId = roomId.toUpperCase().trim() || '5TEAMS';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!subscribers[normalizedId]) {
      subscribers[normalizedId] = new Set();
    }
    subscribers[normalizedId].add(res);

    // Send initial state immediately
    const room = getOrCreateRoom(normalizedId);
    res.write(`data: ${JSON.stringify(room)}\n\n`);

    req.on('close', () => {
      subscribers[normalizedId]?.delete(res);
    });
  });

  // Add Score
  apiRouter.post('/rooms/:roomId/score', (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { teamId, delta, reason, operator } = req.body;

    const room = getOrCreateRoom(roomId);
    const team = room.teams.find((t) => t.id === teamId);

    if (!team) {
      res.status(400).json({ error: '找不到指定小組' });
      return;
    }

    let numDelta = Number(delta) || 0;
    if (numDelta < 0) {
      numDelta = Math.max(-team.score, numDelta);
    }

    if (numDelta === 0 && Number(delta) !== 0 && team.score === 0) {
      res.json({ success: true, room });
      return;
    }

    const log: ScoreLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      teamId,
      teamName: team.name,
      delta: numDelta,
      reason: reason ? String(reason).trim() : '手動調整分數',
      operator: operator ? String(operator).trim() : '匿名使用者',
      timestamp: Date.now(),
      undone: false,
    };

    room.history.unshift(log); // 最新的放在最前面
    recalculateTeamScores(room);

    saveRoomsToDisk();
    notifySubscribers(room.roomId);

    res.json({ success: true, room, newLog: log });
  });

  // Update Team Names / Info
  apiRouter.put('/rooms/:roomId/teams', (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { teams } = req.body;

    if (!Array.isArray(teams) || teams.length !== 5) {
      res.status(400).json({ error: '必須提供完整的 5 組小組資料' });
      return;
    }

    const room = getOrCreateRoom(roomId);

    teams.forEach((updatedTeam: Team) => {
      const existing = room.teams.find((t) => t.id === updatedTeam.id);
      if (existing) {
        existing.name = String(updatedTeam.name || existing.name).trim();
        existing.icon = updatedTeam.icon || existing.icon;
        existing.color = updatedTeam.color || existing.color;
      }
    });

    // Update historical snapshots teamName where relevant if needed
    room.updatedAt = Date.now();
    saveRoomsToDisk();
    notifySubscribers(room.roomId);

    res.json({ success: true, room });
  });

  // Undo specific score log
  apiRouter.post('/rooms/:roomId/undo', (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { logId } = req.body;

    const room = getOrCreateRoom(roomId);
    const log = room.history.find((l) => l.id === logId);

    if (!log) {
      res.status(404).json({ error: '找不到該筆歷史紀錄' });
      return;
    }

    log.undone = true;
    recalculateTeamScores(room);

    saveRoomsToDisk();
    notifySubscribers(room.roomId);

    res.json({ success: true, room });
  });

  // Reset room scores/history
  apiRouter.post('/rooms/:roomId/reset', (req: Request, res: Response) => {
    const { roomId } = req.params;
    const room = getOrCreateRoom(roomId);

    room.history = [];
    room.teams.forEach((t) => {
      t.score = 0;
    });
    room.updatedAt = Date.now();

    saveRoomsToDisk();
    notifySubscribers(room.roomId);

    res.json({ success: true, room });
  });

  // Offline Sync Batch Processing
  apiRouter.post('/rooms/:roomId/sync-batch', (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { actions } = req.body as { actions: OfflineAction[] };

    if (!Array.isArray(actions) || actions.length === 0) {
      const room = getOrCreateRoom(roomId);
      res.json({ success: true, room, processedCount: 0 });
      return;
    }

    const room = getOrCreateRoom(roomId);

    let processedCount = 0;
    // Process actions sequentially by timestamp
    const sortedActions = [...actions].sort((a, b) => a.timestamp - b.timestamp);

    for (const action of sortedActions) {
      if (action.type === 'ADD_SCORE') {
        const { teamId, delta, reason, operator, timestamp } = action.payload;
        const team = room.teams.find((t) => t.id === teamId);
        if (team) {
          const log: ScoreLog = {
            id: `log_off_${action.id}_${Math.random().toString(36).substring(2, 5)}`,
            teamId,
            teamName: team.name,
            delta: Number(delta) || 0,
            reason: (reason || '離線同步加分').trim(),
            operator: (operator || '離線使用者').trim(),
            timestamp: timestamp || Date.now(),
            undone: false,
          };
          room.history.unshift(log);
          processedCount++;
        }
      } else if (action.type === 'UPDATE_TEAMS') {
        const { teams } = action.payload;
        if (Array.isArray(teams)) {
          teams.forEach((updatedTeam: Team) => {
            const existing = room.teams.find((t) => t.id === updatedTeam.id);
            if (existing) {
              existing.name = String(updatedTeam.name || existing.name).trim();
              existing.icon = updatedTeam.icon || existing.icon;
              existing.color = updatedTeam.color || existing.color;
            }
          });
          processedCount++;
        }
      } else if (action.type === 'UNDO_SCORE') {
        const { logId } = action.payload;
        const log = room.history.find((l) => l.id === logId);
        if (log) {
          log.undone = true;
          processedCount++;
        }
      } else if (action.type === 'RESET_ROOM') {
        room.history = [];
        room.teams.forEach((t) => {
          t.score = 0;
        });
        processedCount++;
      }
    }

    recalculateTeamScores(room);
    saveRoomsToDisk();
    notifySubscribers(room.roomId);

    res.json({ success: true, room, processedCount });
  });

  app.use('/api', apiRouter);

  // Serve static files or Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] App running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
