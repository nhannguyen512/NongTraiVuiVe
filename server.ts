import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocket, WebSocketServer } from 'ws';
import {
  DAILY_GIFTS,
  DECO_CATALOG,
  DEFAULT_AVATAR_CUSTOMIZATION,
  FOOD_CATALOG,
  PET_CATALOG,
  PET_SKILLS,
  generateMathQuestion,
  getDailyChallengesForDate,
  getExpForNextLevel,
  getTodayKey,
  hasPetSkill,
  isWaterPoint,
} from './src/shared/gameTypes.ts';
import type {
  AvatarCustomization,
  BattlePlayerState,
  BattleRoomState,
  DailyChallengeProgress,
  LeaderboardEntry,
  MathQuestion,
  PetInstanceState,
  PlacedDecoration,
  PlayerProfile,
  WorldOrb,
} from './src/shared/gameTypes.ts';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'kingdom-db.json');

interface AuthAccountRecord {
  username: string;
  salt: string;
  hash: string;
  playerId: string;
}

interface DatabaseSchema {
  profiles: Record<string, PlayerProfile>;
  auth: Record<string, AuthAccountRecord>;
  sessions: Record<string, string>;
}

const AVATAR_COLORS = ['#F97316', '#0EA5E9', '#10B981', '#EC4899', '#8B5CF6', '#EAB308'];

function ensureDbDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDb(): DatabaseSchema {
  ensureDbDir();
  if (!fs.existsSync(DB_PATH)) {
    const initial: DatabaseSchema = { profiles: {}, auth: {}, sessions: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      profiles: parsed && typeof parsed.profiles === 'object' ? parsed.profiles : {},
      auth: parsed && typeof parsed.auth === 'object' ? parsed.auth : {},
      sessions: parsed && typeof parsed.sessions === 'object' ? parsed.sessions : {},
    };
  } catch {
    return { profiles: {}, auth: {}, sessions: {} };
  }
}

const db: DatabaseSchema = loadDb();

function saveDb(): void {
  ensureDbDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function getNextMidnightMs(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

function createDefaultPets(): Record<string, PetInstanceState> {
  const pets: Record<string, PetInstanceState> = {};
  for (const pet of PET_CATALOG) {
    pets[pet.id] = {
      petId: pet.id,
      unlocked: pet.id === 'rabbit',
      level: 1,
      exp: 0,
      lastFedDate: '',
    };
  }
  return pets;
}

function createStarterDecorations(): PlacedDecoration[] {
  return [
    { instanceId: 'starter_tree_1', decoId: 'apple_tree', gridX: -6, gridZ: -6, rotation: 0 },
    { instanceId: 'starter_sun_1', decoId: 'sunflower_patch', gridX: -4, gridZ: 4, rotation: 0 },
    { instanceId: 'starter_bridge_1', decoId: 'wooden_bridge', gridX: 4, gridZ: 0, rotation: 0 },
    { instanceId: 'starter_lotus_1', decoId: 'lotus_lantern', gridX: 7, gridZ: 5, rotation: 0 },
    { instanceId: 'starter_fence_1', decoId: 'wooden_fence', gridX: -7, gridZ: -2, rotation: 1 },
  ];
}

function hashSecret(secret: string, salt?: string): { salt: string; hash: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(secret, usedSalt, 32).toString('hex');
  return { salt: usedSalt, hash: derived };
}

function verifySecret(secret: string, salt: string, expectedHash: string): boolean {
  const { hash } = hashSecret(secret, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createSessionToken(playerId: string): string {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = playerId;
  return token;
}

function createNewProfile(displayName: string, username?: string): PlayerProfile {
  const id = `player_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const today = getTodayKey();
  const defs = getDailyChallengesForDate(today);
  const avatarColor = AVATAR_COLORS[Object.keys(db.profiles).length % AVATAR_COLORS.length];
  return {
    id,
    username,
    name: displayName,
    avatarColor,
    avatarCustom: {
      ...DEFAULT_AVATAR_CUSTOMIZATION,
      outfitColor: avatarColor,
    },
    coins: 120,
    gems: 5,
    tickets: 3,
    totalScore: 0,
    bestStreak: 0,
    totalSolved: 0,
    activePetId: 'rabbit',
    pets: createDefaultPets(),
    decoInventory: {
      wooden_fence: 2,
      sunflower_patch: 1,
    },
    foodInventory: {
      golden_carrot: 2,
      nectar_drop: 1,
    },
    placedDecorations: createStarterDecorations(),
    dailyGiftStreak: 0,
    lastGiftDate: '',
    dailyDate: today,
    dailyChallenges: defs.map((d) => ({
      challengeId: d.id,
      progress: 0,
      claimed: false,
    })),
    updatedAt: Date.now(),
  };
}

function slugifyUsername(raw: string): string {
  const ascii = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  return ascii.slice(0, 12) || 'be';
}

function generateQuickUsername(displayName: string): string {
  const base = slugifyUsername(displayName);
  for (let i = 0; i < 20; i++) {
    const suffix = Math.floor(100 + Math.random() * 900);
    const candidate = `${base}${suffix}`;
    if (!db.auth[candidate]) return candidate;
  }
  return `${base}_${Date.now().toString(36).slice(-4)}`;
}

function syncDailyState(profile: PlayerProfile): boolean {
  const today = getTodayKey();
  let changed = false;

  if (profile.dailyDate !== today || !Array.isArray(profile.dailyChallenges) || profile.dailyChallenges.length === 0) {
    const defs = getDailyChallengesForDate(today);
    profile.dailyDate = today;
    profile.dailyChallenges = defs.map((def): DailyChallengeProgress => ({
      challengeId: def.id,
      progress: 0,
      claimed: false,
    }));
    changed = true;
  }

  for (const item of PET_CATALOG) {
    if (!profile.pets[item.id]) {
      profile.pets[item.id] = {
        petId: item.id,
        unlocked: item.id === 'rabbit',
        level: 1,
        exp: 0,
        lastFedDate: '',
      };
      changed = true;
    }
  }

  if (!profile.avatarCustom) {
    profile.avatarCustom = {
      ...DEFAULT_AVATAR_CUSTOMIZATION,
      outfitColor: profile.avatarColor || DEFAULT_AVATAR_CUSTOMIZATION.outfitColor,
    };
    changed = true;
  }

  return changed;
}

function addExpToPet(
  pet: PetInstanceState,
  expGain: number
): { leveledUp: boolean; newLevel: number; unlockedSkills: string[] } {
  const startLevel = pet.level;
  const unlockedSkills: string[] = [];
  pet.exp += expGain;

  while (pet.level < 10) {
    const needed = getExpForNextLevel(pet.level);
    if (pet.exp >= needed) {
      pet.exp -= needed;
      pet.level += 1;
      for (const skill of PET_SKILLS) {
        if (skill.unlockLevel === pet.level) {
          unlockedSkills.push(skill.name);
        }
      }
    } else {
      break;
    }
  }

  return {
    leveledUp: pet.level > startLevel,
    newLevel: pet.level,
    unlockedSkills,
  };
}

function buildLeaderboard(): LeaderboardEntry[] {
  return Object.values(db.profiles)
    .map((p): LeaderboardEntry => {
      const activePet = p.pets[p.activePetId];
      return {
        id: p.id,
        name: p.name,
        avatarColor: p.avatarColor,
        totalScore: p.totalScore,
        bestStreak: p.bestStreak,
        totalSolved: p.totalSolved,
        activePetId: p.activePetId,
        petLevel: activePet ? activePet.level : 1,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore || b.bestStreak - a.bestStreak)
    .slice(0, 15);
}

function createOrb(idPrefix = 'orb'): WorldOrb {
  for (let attempt = 0; attempt < 25; attempt++) {
    const x = Math.round((Math.random() * 20 - 10) * 10) / 10;
    const z = Math.round((Math.random() * 20 - 10) * 10) / 10;
    if (!isWaterPoint(x, z) && (Math.abs(x) > 1.5 || Math.abs(z) > 1.5)) {
      return {
        id: `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x,
        z,
        isBonus: Math.random() < 0.22,
      };
    }
  }
  return {
    id: `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    x: -4,
    z: 3,
    isBonus: false,
  };
}

// ==========================================
// Real-Time WebSocket Multiplayer Room Engine
// ==========================================

interface InternalRoom {
  state: BattleRoomState;
  sockets: Map<string, WebSocket>;
  pendingQuestions: Map<string, MathQuestion>;
  timer?: ReturnType<typeof setInterval>;
}

const rooms = new Map<string, InternalRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function broadcastRoom(room: InternalRoom, payload: Record<string, unknown>, excludePlayerId?: string): void {
  const msg = JSON.stringify(payload);
  for (const [pid, ws] of room.sockets.entries()) {
    if (excludePlayerId && pid === excludePlayerId) continue;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function stopRoomTimer(room: InternalRoom): void {
  if (room.timer) {
    clearInterval(room.timer);
    room.timer = undefined;
  }
}

function spawnInitialBattleOrbs(): WorldOrb[] {
  const orbs: WorldOrb[] = [];
  for (let i = 0; i < 12; i++) {
    orbs.push(createOrb(`b${i}`));
  }
  return orbs;
}

function startBattleCountdown(room: InternalRoom): void {
  if (room.state.status !== 'waiting') return;
  stopRoomTimer(room);

  room.state.status = 'countdown';
  room.state.countdown = 3;
  room.state.timeLeft = 60;
  room.state.orbs = spawnInitialBattleOrbs();

  const spawnPoints = [
    { x: -6, z: -6 },
    { x: -6, z: 6 },
    { x: -2, z: -7 },
    { x: -2, z: 7 },
  ];
  room.state.players.forEach((pl, idx) => {
    const sp = spawnPoints[idx % spawnPoints.length];
    pl.x = sp.x;
    pl.z = sp.z;
    pl.score = 0;
    pl.combo = 0;
    pl.solvedCount = 0;
  });

  broadcastRoom(room, { type: 'room_state', room: room.state });

  room.timer = setInterval(() => {
    if (room.state.status === 'countdown') {
      room.state.countdown -= 1;
      if (room.state.countdown <= 0) {
        room.state.status = 'playing';
        room.state.countdown = 0;
      }
      broadcastRoom(room, { type: 'room_state', room: room.state });
      return;
    }

    if (room.state.status === 'playing') {
      room.state.timeLeft -= 1;
      if (room.state.timeLeft <= 0) {
        room.state.timeLeft = 0;
        room.state.status = 'finished';
        stopRoomTimer(room);

        // Award battle coins & leaderboard points to real player profiles
        const sorted = [...room.state.players].sort((a, b) => b.score - a.score);
        sorted.forEach((bp, idx) => {
          const prof = db.profiles[bp.id];
          if (prof) {
            const rankBonus = idx === 0 ? 120 : idx === 1 ? 80 : 50;
            prof.coins += rankBonus + Math.floor(bp.score / 4);
            prof.totalScore += bp.score;
            prof.totalSolved += bp.solvedCount;
            prof.updatedAt = Date.now();
          }
        });
        saveDb();
        broadcastRoom(room, { type: 'match_finished', room: room.state, rankings: sorted });
      } else {
        broadcastRoom(room, { type: 'timer_tick', timeLeft: room.state.timeLeft });
      }
    }
  }, 1000);
}

function removePlayerFromRoom(playerId: string, code?: string): void {
  const codes = code ? [code] : Array.from(rooms.keys());
  for (const c of codes) {
    const room = rooms.get(c);
    if (!room) continue;
    const hadPlayer = room.sockets.has(playerId) || room.state.players.some((p) => p.id === playerId);
    if (!hadPlayer) continue;

    room.sockets.delete(playerId);
    room.pendingQuestions.delete(playerId);
    room.state.players = room.state.players.filter((p) => p.id !== playerId);

    if (room.state.players.length === 0) {
      stopRoomTimer(room);
      rooms.delete(c);
    } else {
      if (room.state.hostId === playerId) {
        room.state.hostId = room.state.players[0].id;
      }
      broadcastRoom(room, { type: 'room_state', room: room.state });
    }
  }
}

async function bootstrap(): Promise<void> {
  const app = express();
  app.use(express.json());

  // ==========================================
  // REST API Routes
  // ==========================================

  // ==========================================
  // Account & Session Auth Routes
  // ==========================================

  app.post('/api/auth/register', (req, res) => {
    const rawUsername = String(req.body?.username ?? '').trim();
    const rawPassword = String(req.body?.password ?? '');
    const rawName = String(req.body?.displayName ?? '').trim().slice(0, 20);

    const usernameKey = rawUsername.toLowerCase();
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(rawUsername)) {
      res.status(400).json({
        error: 'Tên đăng nhập cần dài 3–20 ký tự, viết liền không dấu (chữ, số, dấu _ hoặc .).',
      });
      return;
    }
    if (rawPassword.length < 4) {
      res.status(400).json({ error: 'Mật khẩu hoặc mã PIN cần ít nhất 4 ký tự.' });
      return;
    }
    if (db.auth[usernameKey]) {
      res.status(409).json({ error: `Tên đăng nhập "${rawUsername}" đã có người dùng. Hãy chọn tên khác hoặc chuyển sang Đăng nhập!` });
      return;
    }

    const displayName = rawName || rawUsername;
    const profile = createNewProfile(displayName, rawUsername);
    const { salt, hash } = hashSecret(rawPassword);

    db.profiles[profile.id] = profile;
    db.auth[usernameKey] = {
      username: rawUsername,
      salt,
      hash,
      playerId: profile.id,
    };
    const sessionToken = createSessionToken(profile.id);
    saveDb();

    res.json({
      profile,
      sessionToken,
      dailyChallengesDef: getDailyChallengesForDate(profile.dailyDate),
      nextResetMs: getNextMidnightMs(),
      leaderboard: buildLeaderboard(),
    });
  });

  app.post('/api/auth/quick-register', (req, res) => {
    const rawName = String(req.body?.displayName ?? '').trim().slice(0, 20) || 'Nhà Thám Hiểm';
    const username = generateQuickUsername(rawName);
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const profile = createNewProfile(rawName, username);
    const { salt, hash } = hashSecret(pin);

    db.profiles[profile.id] = profile;
    db.auth[username.toLowerCase()] = {
      username,
      salt,
      hash,
      playerId: profile.id,
    };
    const sessionToken = createSessionToken(profile.id);
    saveDb();

    res.json({
      profile,
      sessionToken,
      credentials: { username, pin },
      dailyChallengesDef: getDailyChallengesForDate(profile.dailyDate),
      nextResetMs: getNextMidnightMs(),
      leaderboard: buildLeaderboard(),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const rawUsername = String(req.body?.username ?? '').trim();
    const rawPassword = String(req.body?.password ?? '');
    if (!rawUsername || !rawPassword) {
      res.status(400).json({ error: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu / Mã PIN.' });
      return;
    }

    const account = db.auth[rawUsername.toLowerCase()];
    if (!account || !verifySecret(rawPassword, account.salt, account.hash)) {
      res.status(401).json({ error: 'Tên đăng nhập hoặc Mật khẩu / Mã PIN chưa đúng.' });
      return;
    }

    const profile = db.profiles[account.playerId];
    if (!profile) {
      res.status(404).json({ error: 'Không tìm thấy dữ liệu nông trại của tài khoản này.' });
      return;
    }

    profile.username = account.username;
    if (syncDailyState(profile)) {
      saveDb();
    }
    const sessionToken = createSessionToken(profile.id);
    saveDb();

    res.json({
      profile,
      sessionToken,
      dailyChallengesDef: getDailyChallengesForDate(profile.dailyDate),
      nextResetMs: getNextMidnightMs(),
      leaderboard: buildLeaderboard(),
    });
  });

  app.get('/api/auth/session', (req, res) => {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token || !db.sessions[token]) {
      res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn.' });
      return;
    }
    const playerId = db.sessions[token];
    const profile = db.profiles[playerId];
    if (!profile) {
      delete db.sessions[token];
      saveDb();
      res.status(401).json({ error: 'Tài khoản không còn tồn tại.' });
      return;
    }
    if (syncDailyState(profile)) {
      saveDb();
    }
    res.json({
      profile,
      dailyChallengesDef: getDailyChallengesForDate(profile.dailyDate),
      nextResetMs: getNextMidnightMs(),
      leaderboard: buildLeaderboard(),
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token && db.sessions[token]) {
      delete db.sessions[token];
      saveDb();
    }
    res.json({ ok: true });
  });

  // Legacy/Fallback nickname route
  app.post('/api/profile/login', (req, res) => {
    const rawName = String(req.body?.name ?? '').trim().slice(0, 20);
    if (!rawName) {
      res.status(400).json({ error: 'Vui lòng nhập tên nhà thám hiểm!' });
      return;
    }

    const normalized = rawName.toLowerCase();
    let profile = Object.values(db.profiles).find((p) => p.name.toLowerCase() === normalized);

    if (!profile) {
      profile = createNewProfile(rawName);
      db.profiles[profile.id] = profile;
      saveDb();
    } else if (syncDailyState(profile)) {
      saveDb();
    }

    res.json({
      profile,
      dailyChallengesDef: getDailyChallengesForDate(profile.dailyDate),
      nextResetMs: getNextMidnightMs(),
      leaderboard: buildLeaderboard(),
    });
  });

  app.get('/api/profile/:id', (req, res) => {
    const profile = db.profiles[req.params.id];
    if (!profile) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ người chơi.' });
      return;
    }
    if (syncDailyState(profile)) {
      saveDb();
    }
    res.json({
      profile,
      dailyChallengesDef: getDailyChallengesForDate(profile.dailyDate),
      nextResetMs: getNextMidnightMs(),
      leaderboard: buildLeaderboard(),
    });
  });

  app.post('/api/profile/:id/avatar', (req, res) => {
    const profile = db.profiles[req.params.id];
    if (!profile) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ.' });
      return;
    }

    const body = (req.body || {}) as Partial<AvatarCustomization>;
    const validHair = ['short', 'pigtails', 'spiky', 'bob'];
    const validHat = ['explorer', 'crown', 'bunny_ears', 'wizard', 'none'];
    const validGlasses = ['none', 'round', 'star_shades'];
    const validBackpack = ['adventure', 'wings', 'rocket', 'none'];
    const isHex = (v: unknown) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

    const prev = profile.avatarCustom || {
      ...DEFAULT_AVATAR_CUSTOMIZATION,
      outfitColor: profile.avatarColor,
    };

    const nextCustom: AvatarCustomization = {
      skinColor: isHex(body.skinColor) ? body.skinColor! : prev.skinColor,
      outfitColor: isHex(body.outfitColor) ? body.outfitColor! : prev.outfitColor,
      hairColor: isHex(body.hairColor) ? body.hairColor! : prev.hairColor,
      hairStyle: validHair.includes(String(body.hairStyle)) ? (body.hairStyle as AvatarCustomization['hairStyle']) : prev.hairStyle,
      hatStyle: validHat.includes(String(body.hatStyle)) ? (body.hatStyle as AvatarCustomization['hatStyle']) : prev.hatStyle,
      glassesStyle: validGlasses.includes(String(body.glassesStyle))
        ? (body.glassesStyle as AvatarCustomization['glassesStyle'])
        : prev.glassesStyle,
      backpackStyle: validBackpack.includes(String(body.backpackStyle))
        ? (body.backpackStyle as AvatarCustomization['backpackStyle'])
        : prev.backpackStyle,
    };

    profile.avatarCustom = nextCustom;
    profile.avatarColor = nextCustom.outfitColor;
    profile.updatedAt = Date.now();
    saveDb();

    res.json({
      profile,
      leaderboard: buildLeaderboard(),
    });
  });

  app.post('/api/profile/:id/solve', (req, res) => {
    const profile = db.profiles[req.params.id];
    if (!profile) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ.' });
      return;
    }
    syncDailyState(profile);

    const a = Number(req.body?.a);
    const b = Number(req.body?.b);
    const answer = Number(req.body?.answer);
    const combo = Math.max(0, Number(req.body?.combo) || 0);
    const isBonus = Boolean(req.body?.isBonus);
    const isCorrect = Number.isFinite(a) && Number.isFinite(b) && a * b === answer;

    const activePet = profile.pets[profile.activePetId] ?? profile.pets.rabbit;
    let coinsEarned = 0;
    let scoreEarned = 0;
    let expEarned = 0;
    let levelResult = { leveledUp: false, newLevel: activePet.level, unlockedSkills: [] as string[] };

    if (isCorrect) {
      const hasDouble = hasPetSkill(activePet, 'double_score') && combo >= 2;
      const hasBonusExp = hasPetSkill(activePet, 'bonus_exp');
      const hasTimeBonus = hasPetSkill(activePet, 'time_bonus');

      const multiplier = hasDouble ? 2 : 1;
      const baseCoins = (isBonus ? 25 : 15) + Math.min(combo * 3, 24);
      const baseScore = (isBonus ? 40 : 25) + combo * 5 + (hasTimeBonus ? 15 : 0);
      const baseExp = isBonus ? 28 : 18;

      coinsEarned = baseCoins * multiplier;
      scoreEarned = baseScore * multiplier;
      expEarned = hasBonusExp ? Math.round(baseExp * 1.35) : baseExp;

      profile.coins += coinsEarned;
      profile.totalScore += scoreEarned;
      profile.totalSolved += 1;
      if (combo > profile.bestStreak) {
        profile.bestStreak = combo;
      }

      levelResult = addExpToPet(activePet, expEarned);

      // Update daily challenges
      const defs = getDailyChallengesForDate(profile.dailyDate);
      for (const prog of profile.dailyChallenges) {
        const def = defs.find((d) => d.id === prog.challengeId);
        if (!def || prog.claimed) continue;
        if (def.type === 'table_focus' && def.targetTables) {
          if (def.targetTables.includes(a) || def.targetTables.includes(b)) {
            prog.progress = Math.min(def.targetCount, prog.progress + 1);
          }
        } else if (def.type === 'streak') {
          prog.progress = Math.min(def.targetCount, Math.max(prog.progress, combo));
        } else if (def.type === 'collect_total') {
          prog.progress = Math.min(def.targetCount, prog.progress + 1);
        }
      }
    }

    profile.updatedAt = Date.now();
    saveDb();

    res.json({
      isCorrect,
      correctAnswer: a * b,
      coinsEarned,
      scoreEarned,
      expEarned,
      levelResult,
      profile,
      dailyChallengesDef: getDailyChallengesForDate(profile.dailyDate),
      leaderboard: buildLeaderboard(),
    });
  });

  app.post('/api/profile/:id/feed', (req, res) => {
    const profile = db.profiles[req.params.id];
    if (!profile) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ.' });
      return;
    }
    syncDailyState(profile);

    const petId = String(req.body?.petId || profile.activePetId);
    const foodId = String(req.body?.foodId || 'daily_free');
    const pet = profile.pets[petId];
    if (!pet || !pet.unlocked) {
      res.status(400).json({ error: 'Thú cưng chưa được mở khóa.' });
      return;
    }

    const today = getTodayKey();
    let expGain = 0;

    if (foodId === 'daily_free') {
      if (pet.lastFedDate === today) {
        res.status(400).json({ error: 'Hôm nay bé đã cho bạn thú này ăn phần miễn phí rồi! Hãy dùng thức ăn trong túi nhé.' });
        return;
      }
      pet.lastFedDate = today;
      expGain = 40;
    } else {
      const foodDef = FOOD_CATALOG.find((f) => f.id === foodId);
      const count = profile.foodInventory[foodId] || 0;
      if (!foodDef || count <= 0) {
        res.status(400).json({ error: 'Không còn thức ăn loại này trong túi.' });
        return;
      }
      profile.foodInventory[foodId] = count - 1;
      pet.lastFedDate = today;
      expGain = foodDef.expGain;
    }

    const levelResult = addExpToPet(pet, expGain);
    profile.updatedAt = Date.now();
    saveDb();

    res.json({
      expGain,
      levelResult,
      profile,
      leaderboard: buildLeaderboard(),
    });
  });

  app.post('/api/profile/:id/pet/select', (req, res) => {
    const profile = db.profiles[req.params.id];
    if (!profile) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ.' });
      return;
    }
    const petId = String(req.body?.petId || '');
    const catalogPet = PET_CATALOG.find((p) => p.id === petId);
    const petState = profile.pets[petId];
    if (!catalogPet || !petState) {
      res.status(400).json({ error: 'Thú cưng không hợp lệ.' });
      return;
    }

    if (!petState.unlocked) {
      if (profile.coins < catalogPet.unlockCost) {
        res.status(400).json({ error: `Bé cần ${catalogPet.unlockCost} Xu Sao để đón ${catalogPet.name}!` });
        return;
      }
      profile.coins -= catalogPet.unlockCost;
      petState.unlocked = true;
    }

    profile.activePetId = petId;
    profile.updatedAt = Date.now();
    saveDb();
    res.json({ profile, leaderboard: buildLeaderboard() });
  });

  app.post('/api/profile/:id/shop/buy', (req, res) => {
    const profile = db.profiles[req.params.id];
    if (!profile) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ.' });
      return;
    }

    const kind = String(req.body?.kind || 'deco');
    const itemId = String(req.body?.itemId || '');

    if (kind === 'food') {
      const food = FOOD_CATALOG.find((f) => f.id === itemId && !f.rare);
      if (!food) {
        res.status(400).json({ error: 'Món ăn không hợp lệ.' });
        return;
      }
      if (profile.coins < food.cost) {
        res.status(400).json({ error: 'Bé chưa đủ Xu Sao để mua thức ăn này.' });
        return;
      }
      profile.coins -= food.cost;
      profile.foodInventory[food.id] = (profile.foodInventory[food.id] || 0) + 1;
    } else {
      const deco = DECO_CATALOG.find((d) => d.id === itemId && !d.rare);
      if (!deco) {
        res.status(400).json({ error: 'Vật phẩm trang trí không hợp lệ.' });
        return;
      }
      if (profile.coins < deco.cost) {
        res.status(400).json({ error: 'Bé chưa đủ Xu Sao để mua vật phẩm này.' });
        return;
      }
      profile.coins -= deco.cost;
      profile.decoInventory[deco.id] = (profile.decoInventory[deco.id] || 0) + 1;
    }

    profile.updatedAt = Date.now();
    saveDb();
    res.json({ profile });
  });

  app.post('/api/profile/:id/farm/update', (req, res) => {
    const profile = db.profiles[req.params.id];
    if (!profile) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ.' });
      return;
    }

    const action = String(req.body?.action || '');

    if (action === 'place') {
      const decoId = String(req.body?.decoId || '');
      const gridX = Math.round(Number(req.body?.gridX));
      const gridZ = Math.round(Number(req.body?.gridZ));
      const rotation = ((Math.round(Number(req.body?.rotation) || 0) % 4) + 4) % 4;
      const decoDef = DECO_CATALOG.find((d) => d.id === decoId);

      if (!decoDef || (profile.decoInventory[decoId] || 0) <= 0) {
        res.status(400).json({ error: 'Vật phẩm không có trong kho.' });
        return;
      }
      if (Math.abs(gridX) > 12 || Math.abs(gridZ) > 12) {
        res.status(400).json({ error: 'Vị trí nằm ngoài khu vực nông trại.' });
        return;
      }
      const water = isWaterPoint(gridX, gridZ);
      if (decoDef.terrain === 'water' && !water) {
        res.status(400).json({ error: 'Vật phẩm này cần đặt trên ao cá hoặc dòng suối!' });
        return;
      }
      if (decoDef.terrain === 'land' && water) {
        res.status(400).json({ error: 'Vật phẩm này cần đặt trên bãi cỏ!' });
        return;
      }
      const occupied = profile.placedDecorations.some((d) => d.gridX === gridX && d.gridZ === gridZ);
      if (occupied) {
        res.status(400).json({ error: 'Ô này đã có vật phẩm trang trí rồi!' });
        return;
      }

      profile.decoInventory[decoId] -= 1;
      profile.placedDecorations.push({
        instanceId: `placed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        decoId,
        gridX,
        gridZ,
        rotation,
      });
    } else if (action === 'move') {
      const instanceId = String(req.body?.instanceId || '');
      const gridX = Math.round(Number(req.body?.gridX));
      const gridZ = Math.round(Number(req.body?.gridZ));
      const rotation = req.body?.rotation !== undefined ? ((Math.round(Number(req.body.rotation)) % 4) + 4) % 4 : undefined;

      const existing = profile.placedDecorations.find((d) => d.instanceId === instanceId);
      if (!existing) {
        res.status(404).json({ error: 'Không tìm thấy vật phẩm trên sân.' });
        return;
      }
      const decoDef = DECO_CATALOG.find((d) => d.id === existing.decoId);
      if (!decoDef) {
        res.status(400).json({ error: 'Dữ liệu vật phẩm không hợp lệ.' });
        return;
      }
      if (Math.abs(gridX) > 12 || Math.abs(gridZ) > 12) {
        res.status(400).json({ error: 'Vị trí nằm ngoài khu vực nông trại.' });
        return;
      }
      const water = isWaterPoint(gridX, gridZ);
      if (decoDef.terrain === 'water' && !water) {
        res.status(400).json({ error: 'Vật phẩm ao suối phải đặt trên nước!' });
        return;
      }
      if (decoDef.terrain === 'land' && water) {
        res.status(400).json({ error: 'Vật phẩm vườn phải đặt trên bãi cỏ!' });
        return;
      }
      const occupied = profile.placedDecorations.some(
        (d) => d.instanceId !== instanceId && d.gridX === gridX && d.gridZ === gridZ
      );
      if (occupied) {
        res.status(400).json({ error: 'Ô này đang có vật phẩm khác!' });
        return;
      }

      existing.gridX = gridX;
      existing.gridZ = gridZ;
      if (rotation !== undefined) existing.rotation = rotation;
    } else if (action === 'remove') {
      const instanceId = String(req.body?.instanceId || '');
      const idx = profile.placedDecorations.findIndex((d) => d.instanceId === instanceId);
      if (idx === -1) {
        res.status(404).json({ error: 'Không tìm thấy vật phẩm.' });
        return;
      }
      const [removed] = profile.placedDecorations.splice(idx, 1);
      profile.decoInventory[removed.decoId] = (profile.decoInventory[removed.decoId] || 0) + 1;
    }

    profile.updatedAt = Date.now();
    saveDb();
    res.json({ profile });
  });

  app.post('/api/profile/:id/daily-gift/claim', (req, res) => {
    const profile = db.profiles[req.params.id];
    if (!profile) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ.' });
      return;
    }
    syncDailyState(profile);

    const today = getTodayKey();
    if (profile.lastGiftDate === today) {
      res.status(400).json({ error: 'Hôm nay bé đã nhận hộp quà điểm danh rồi!' });
      return;
    }

    const nextDay = (profile.dailyGiftStreak % DAILY_GIFTS.length) + 1;
    const gift = DAILY_GIFTS.find((g) => g.day === nextDay) || DAILY_GIFTS[0];

    profile.dailyGiftStreak = nextDay;
    profile.lastGiftDate = today;
    profile.coins += gift.coins;
    profile.tickets += gift.tickets;
    if (gift.foodId && gift.foodCount) {
      profile.foodInventory[gift.foodId] = (profile.foodInventory[gift.foodId] || 0) + gift.foodCount;
    }

    profile.updatedAt = Date.now();
    saveDb();
    res.json({ gift, profile });
  });

  app.post('/api/profile/:id/challenge/claim', (req, res) => {
    const profile = db.profiles[req.params.id];
    if (!profile) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ.' });
      return;
    }
    syncDailyState(profile);

    const challengeId = String(req.body?.challengeId || '');
    const defs = getDailyChallengesForDate(profile.dailyDate);
    const def = defs.find((d) => d.id === challengeId);
    const prog = profile.dailyChallenges.find((c) => c.challengeId === challengeId);

    if (!def || !prog) {
      res.status(404).json({ error: 'Không tìm thấy thử thách.' });
      return;
    }
    if (prog.claimed) {
      res.status(400).json({ error: 'Bé đã nhận thưởng thử thách này rồi.' });
      return;
    }
    if (prog.progress < def.targetCount) {
      res.status(400).json({ error: 'Bé chưa hoàn thành thử thách này!' });
      return;
    }

    prog.claimed = true;
    profile.coins += def.rewardCoins;
    profile.tickets += def.rewardTickets;
    if (def.rewardFoodId) {
      profile.foodInventory[def.rewardFoodId] = (profile.foodInventory[def.rewardFoodId] || 0) + 1;
    }
    if (def.rewardDecoId) {
      profile.decoInventory[def.rewardDecoId] = (profile.decoInventory[def.rewardDecoId] || 0) + 1;
    }

    profile.updatedAt = Date.now();
    saveDb();
    res.json({
      reward: def,
      profile,
      dailyChallengesDef: defs,
    });
  });

  app.get('/api/leaderboard', (_req, res) => {
    res.json({ leaderboard: buildLeaderboard() });
  });

  // ==========================================
  // HTTP + WebSocket Server + Vite Middleware
  // ==========================================

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let boundPlayerId = '';
    let boundRoomCode = '';

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'create_room' || type === 'join_room' || type === 'quick_join') {
        const playerId = String(msg.playerId || '');
        const prof = db.profiles[playerId];
        const name = prof ? prof.name : String(msg.name || 'Nhà Thám Hiểm').slice(0, 20);
        const avatarColor = prof ? prof.avatarColor : AVATAR_COLORS[0];
        const petId = prof ? prof.activePetId : 'rabbit';
        const petLevel = prof?.pets[petId]?.level ?? 1;

        if (!playerId) return;
        if (boundPlayerId && boundRoomCode) {
          removePlayerFromRoom(boundPlayerId, boundRoomCode);
        }
        boundPlayerId = playerId;

        let targetRoom: InternalRoom | undefined;

        if (type === 'create_room') {
          const code = generateRoomCode();
          targetRoom = {
            state: {
              code,
              hostId: playerId,
              status: 'waiting',
              countdown: 3,
              timeLeft: 60,
              players: [],
              orbs: [],
            },
            sockets: new Map(),
            pendingQuestions: new Map(),
          };
          rooms.set(code, targetRoom);
        } else if (type === 'join_room') {
          const requestedCode = String(msg.code || '').trim().toUpperCase();
          targetRoom = rooms.get(requestedCode);
          if (!targetRoom) {
            ws.send(JSON.stringify({ type: 'room_error', message: `Không tìm thấy phòng mã "${requestedCode}".` }));
            return;
          }
          if (targetRoom.state.players.length >= 4) {
            ws.send(JSON.stringify({ type: 'room_error', message: 'Phòng đấu đã đủ 4 bạn rồi!' }));
            return;
          }
          if (targetRoom.state.status !== 'waiting') {
            ws.send(JSON.stringify({ type: 'room_error', message: 'Phòng này đang trong trận đấu!' }));
            return;
          }
        } else {
          // quick_join: find waiting room with < 4 players or create one
          for (const r of rooms.values()) {
            if (r.state.status === 'waiting' && r.state.players.length < 4) {
              targetRoom = r;
              break;
            }
          }
          if (!targetRoom) {
            const code = generateRoomCode();
            targetRoom = {
              state: {
                code,
                hostId: playerId,
                status: 'waiting',
                countdown: 3,
                timeLeft: 60,
                players: [],
                orbs: [],
              },
              sockets: new Map(),
              pendingQuestions: new Map(),
            };
            rooms.set(code, targetRoom);
          }
        }

        boundRoomCode = targetRoom.state.code;
        targetRoom.sockets.set(playerId, ws);

        // Idempotent player addition
        if (!targetRoom.state.players.some((p) => p.id === playerId)) {
          const newPlayer: BattlePlayerState = {
            id: playerId,
            name,
            avatarColor,
            avatarCustom: prof?.avatarCustom,
            petId,
            petLevel,
            x: -5,
            z: 0,
            rotY: 0,
            score: 0,
            combo: 0,
            solvedCount: 0,
            ready: true,
          };
          targetRoom.state.players.push(newPlayer);
        }

        broadcastRoom(targetRoom, { type: 'room_state', room: targetRoom.state });
        return;
      }

      if (!boundRoomCode || !boundPlayerId) return;
      const room = rooms.get(boundRoomCode);
      if (!room) return;

      if (type === 'start_match') {
        if (room.state.hostId === boundPlayerId && room.state.status === 'waiting') {
          startBattleCountdown(room);
        }
        return;
      }

      if (type === 'player_move') {
        if (room.state.status !== 'playing') return;
        const player = room.state.players.find((p) => p.id === boundPlayerId);
        if (!player) return;
        player.x = Math.max(-13, Math.min(13, Number(msg.x) || 0));
        player.z = Math.max(-13, Math.min(13, Number(msg.z) || 0));
        player.rotY = Number(msg.rotY) || 0;
        broadcastRoom(
          room,
          {
            type: 'player_moved',
            playerId: boundPlayerId,
            x: player.x,
            z: player.z,
            rotY: player.rotY,
          },
          boundPlayerId
        );
        return;
      }

      if (type === 'collect_orb') {
        if (room.state.status !== 'playing') return;
        const orbId = String(msg.orbId || '');
        const orbIdx = room.state.orbs.findIndex((o) => o.id === orbId);
        if (orbIdx === -1) return;

        const [collected] = room.state.orbs.splice(orbIdx, 1);
        const replacement = createOrb('b');
        room.state.orbs.push(replacement);

        broadcastRoom(room, {
          type: 'orb_swapped',
          removedOrbId: orbId,
          spawnedOrb: replacement,
          collectorId: boundPlayerId,
        });

        const q = generateMathQuestion(undefined, collected.isBonus);
        room.pendingQuestions.set(boundPlayerId, q);
        ws.send(JSON.stringify({ type: 'math_challenge', question: q }));
        return;
      }

      if (type === 'submit_math') {
        if (room.state.status !== 'playing') return;
        const player = room.state.players.find((p) => p.id === boundPlayerId);
        const q = room.pendingQuestions.get(boundPlayerId);
        if (!player || !q) return;

        room.pendingQuestions.delete(boundPlayerId);
        const chosen = Number(msg.answer);
        const isCorrect = chosen === q.answer;

        if (isCorrect) {
          player.combo += 1;
          player.solvedCount += 1;
          const prof = db.profiles[boundPlayerId];
          const activePet = prof?.pets[prof.activePetId];
          const hasDouble = hasPetSkill(activePet, 'double_score') && player.combo >= 2;
          const pts = ((q.isBonus ? 40 : 25) + player.combo * 5) * (hasDouble ? 2 : 1);
          player.score += pts;
        } else {
          player.combo = 0;
        }

        ws.send(
          JSON.stringify({
            type: 'math_result',
            isCorrect,
            correctAnswer: q.answer,
            score: player.score,
            combo: player.combo,
          })
        );
        broadcastRoom(room, { type: 'score_updated', players: room.state.players });
        return;
      }

      if (type === 'leave_room') {
        removePlayerFromRoom(boundPlayerId, boundRoomCode);
        boundRoomCode = '';
      }
    });

    ws.on('close', () => {
      if (boundPlayerId) {
        removePlayerFromRoom(boundPlayerId, boundRoomCode);
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Vương Quốc Cửu Chương 3D server listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
