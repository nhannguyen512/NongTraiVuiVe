import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, KeyRound, Sparkles, Trophy, X } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import type { AudioSettings } from './audio/soundEngine';
import { DailyChallengesModal } from './components/DailyChallengesModal';
import { FarmWorldCanvas } from './components/FarmWorldCanvas';
import type { GameMode } from './components/FarmWorldCanvas';
import { GameHUD } from './components/GameHUD';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MathQuizModal } from './components/MathQuizModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { OptionsModal } from './components/OptionsModal';
import type { OptionsTab } from './components/OptionsModal';
import { PetSanctuaryModal } from './components/PetSanctuaryModal';
import { ShopDecorateDrawer } from './components/ShopDecorateDrawer';
import { TitleOverlay } from './components/TitleOverlay';
import { generateMathQuestion, isWaterPoint } from './shared/gameTypes';
import type {
  AvatarCustomization,
  BattlePlayerState,
  BattleRoomState,
  DailyChallengeDef,
  LeaderboardEntry,
  MathQuestion,
  PlayerProfile,
  WorldOrb,
} from './shared/gameTypes';

function createLocalOrb(existing: WorldOrb[]): WorldOrb {
  for (let i = 0; i < 30; i++) {
    const x = Math.round((Math.random() * 20 - 10) * 10) / 10;
    const z = Math.round((Math.random() * 20 - 10) * 10) / 10;
    if (!isWaterPoint(x, z)) {
      const tooClose = existing.some((o) => Math.hypot(o.x - x, o.z - z) < 2.2);
      if (!tooClose) {
        return {
          id: `orb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          x,
          z,
          isBonus: Math.random() < 0.22,
        };
      }
    }
  }
  return {
    id: `orb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    x: -5,
    z: 4,
    isBonus: false,
  };
}

function createInitialOrbs(count = 9): WorldOrb[] {
  const list: WorldOrb[] = [];
  for (let i = 0; i < count; i++) {
    list.push(createLocalOrb(list));
  }
  return list;
}

export default function App() {
  const [mode, setMode] = useState<GameMode>('title');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [challengesDef, setChallengesDef] = useState<DailyChallengeDef[]>([]);
  const [nextResetMs, setNextResetMs] = useState<number>(3600 * 1000 * 12);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [apiBusy, setApiBusy] = useState(false);
  const [quickCredentials, setQuickCredentials] = useState<{ username: string; pin: string } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Gameplay state
  const [selectedTables, setSelectedTables] = useState<number[]>([2, 3, 4, 5, 6, 7, 8, 9]);
  const [harvestOrbs, setHarvestOrbs] = useState<WorldOrb[]>(() => createInitialOrbs(9));
  const [combo, setCombo] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState<MathQuestion | null>(null);
  const [activeOrbId, setActiveOrbId] = useState<string | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: number;
    coinsEarned: number;
    expEarned: number;
  } | null>(null);
  const [celebrateCounter, setCelebrateCounter] = useState(0);
  const [resetCameraCounter, setResetCameraCounter] = useState(0);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => soundEngine.getSettings());

  // Modals & Drawers
  const [showPets, setShowPets] = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [optionsTab, setOptionsTab] = useState<OptionsTab | null>(null);

  // Decorate mode state
  const [selectedDecoInstanceId, setSelectedDecoInstanceId] = useState<string | null>(null);
  const [pendingPlaceDecoId, setPendingPlaceDecoId] = useState<string | null>(null);
  const [draggingShopDecoId, setDraggingShopDecoId] = useState<string | null>(null);

  // Toast notification
  const [toast, setToast] = useState<{ text: string; tone: 'success' | 'info' | 'error' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((text: string, tone: 'success' | 'info' | 'error' = 'info') => {
    setToast({ text, tone });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3400);
  }, []);

  // Touch joystick vector
  const joystickVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // WebSocket Multiplayer State
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [battleRoom, setBattleRoom] = useState<BattleRoomState | null>(null);
  const [battleError, setBattleError] = useState<string | null>(null);
  const [battleRankings, setBattleRankings] = useState<BattlePlayerState[] | null>(null);

  // Keyboard shortcuts (Esc for Options)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && mode !== 'title') {
        if (activeQuestion) return;
        if (showPets || showDaily || showLeaderboard || showMultiplayer) {
          setShowPets(false);
          setShowDaily(false);
          setShowLeaderboard(false);
          setShowMultiplayer(false);
        } else {
          setOptionsTab((prev) => (prev ? null : 'system'));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, activeQuestion, showPets, showDaily, showLeaderboard, showMultiplayer]);

  // Connect WebSocket when profile is logged in
  useEffect(() => {
    if (!profile) return;
    let closedByUnmount = false;

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        setBattleError(null);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as Record<string, unknown>;
          const type = String(msg.type || '');

          if (type === 'room_error') {
            setBattleError(String(msg.message || 'Lỗi phòng đấu.'));
          } else if (type === 'room_state') {
            const room = msg.room as BattleRoomState;
            setBattleRoom(room);
            setBattleError(null);
            if (room.status === 'countdown' || room.status === 'playing') {
              setShowMultiplayer(false);
              setBattleRankings(null);
              setMode('battle');
            }
          } else if (type === 'timer_tick') {
            const timeLeft = Number(msg.timeLeft);
            setBattleRoom((prev) => (prev ? { ...prev, timeLeft } : prev));
          } else if (type === 'player_moved') {
            const pid = String(msg.playerId);
            const x = Number(msg.x);
            const z = Number(msg.z);
            const rotY = Number(msg.rotY);
            setBattleRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                players: prev.players.map((p) => (p.id === pid ? { ...p, x, z, rotY } : p)),
              };
            });
          } else if (type === 'orb_swapped') {
            const removedOrbId = String(msg.removedOrbId);
            const spawnedOrb = msg.spawnedOrb as WorldOrb;
            setBattleRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                orbs: [...prev.orbs.filter((o) => o.id !== removedOrbId), spawnedOrb],
              };
            });
          } else if (type === 'math_challenge') {
            const q = msg.question as MathQuestion;
            soundEngine.playPickup();
            setQuizFeedback(null);
            setActiveQuestion(q);
          } else if (type === 'math_result') {
            const isCorrect = Boolean(msg.isCorrect);
            const correctAnswer = Number(msg.correctAnswer);
            const newCombo = Number(msg.combo || 0);
            setCombo(newCombo);
            if (isCorrect) {
              soundEngine.playCorrect(newCombo);
              setCelebrateCounter((c) => c + 1);
            } else {
              soundEngine.playWrong();
            }
            setQuizFeedback({
              isCorrect,
              correctAnswer,
              coinsEarned: isCorrect ? 25 : 0,
              expEarned: isCorrect ? 20 : 0,
            });
            setTimeout(() => {
              setActiveQuestion(null);
              setQuizFeedback(null);
            }, 750);
          } else if (type === 'score_updated') {
            const players = msg.players as BattlePlayerState[];
            setBattleRoom((prev) => (prev ? { ...prev, players } : prev));
          } else if (type === 'match_finished') {
            const room = msg.room as BattleRoomState;
            const rankings = msg.rankings as BattlePlayerState[];
            setBattleRoom(room);
            setBattleRankings(rankings);
            setActiveQuestion(null);
            setQuizFeedback(null);
            soundEngine.playLevelUp();
            // Refresh profile to get updated coins & leaderboard score
            fetch(`/api/profile/${profile.id}`)
              .then((r) => r.json())
              .then((data) => {
                if (data.profile) setProfile(data.profile);
                if (data.leaderboard) setLeaderboard(data.leaderboard);
              })
              .catch(() => {});
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByUnmount) {
          setTimeout(connect, 2000);
        }
      };
    };

    connect();
    return () => {
      closedByUnmount = true;
      wsRef.current?.close();
    };
  }, [profile?.id]);

  // Restore existing session on mount so returning players stay logged in
  useEffect(() => {
    let token = '';
    try {
      token = localStorage.getItem('vqcc_session_token') || '';
    } catch {
      token = '';
    }
    if (!token) return;

    fetch('/api/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          try {
            localStorage.removeItem('vqcc_session_token');
          } catch {
            // ignore
          }
          return;
        }
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          setChallengesDef(data.dailyChallengesDef || []);
          setNextResetMs(data.nextResetMs ?? 3600 * 1000 * 12);
          setLeaderboard(data.leaderboard || []);
        }
      })
      .catch(() => {});
  }, []);

  const applyAuthSuccess = (data: {
    profile: PlayerProfile;
    sessionToken?: string;
    dailyChallengesDef?: DailyChallengeDef[];
    nextResetMs?: number;
    leaderboard?: LeaderboardEntry[];
    credentials?: { username: string; pin: string };
  }, toastMsg: string) => {
    if (data.sessionToken) {
      try {
        localStorage.setItem('vqcc_session_token', data.sessionToken);
      } catch {
        // ignore
      }
    }
    setProfile(data.profile);
    setChallengesDef(data.dailyChallengesDef || []);
    setNextResetMs(data.nextResetMs ?? 3600 * 1000 * 12);
    setLeaderboard(data.leaderboard || []);
    if (data.credentials) {
      setQuickCredentials(data.credentials);
      setCopiedCreds(false);
    } else {
      setQuickCredentials(null);
    }
    setMode('harvest');
    soundEngine.unlock();
    soundEngine.playGift();
    showToast(toastMsg, 'success');
  };

  const handleAuthLogin = async (username: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Không thể đăng nhập.');
        return;
      }
      applyAuthSuccess(data, `Chào mừng ${data.profile.name} trở lại nhà cũ!`);
    } catch {
      setLoginError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAuthRegister = async (displayName: string, username: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Không thể tạo tài khoản.');
        return;
      }
      applyAuthSuccess(data, `Tạo tài khoản thành công! Chào mừng ${data.profile.name}!`);
    } catch {
      setLoginError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickRegister = async (displayName: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/quick-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Không thể đăng ký nhanh.');
        return;
      }
      applyAuthSuccess(data, `Đã tạo nhanh tài khoản @${data.credentials?.username}! Hãy lưu mã PIN nhé.`);
    } catch {
      setLoginError('Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    let token = '';
    try {
      token = localStorage.getItem('vqcc_session_token') || '';
      localStorage.removeItem('vqcc_session_token');
    } catch {
      // ignore
    }
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    if (battleRoom) {
      handleLeaveBattle();
    }
    setProfile(null);
    setQuickCredentials(null);
    setOptionsTab(null);
    setLoginError(null);
    soundEngine.stopMusic();
    setMode('title');
  };

  const handleChangeAudio = (patch: Partial<AudioSettings>) => {
    soundEngine.unlock();
    setAudioSettings(soundEngine.updateSettings(patch));
  };

  const handleSaveAvatar = async (custom: AvatarCustomization) => {
    if (!profile || apiBusy) return;
    setApiBusy(true);
    try {
      const res = await fetch(`/api/profile/${profile.id}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(custom),
      });
      const data = await res.json();
      if (!res.ok) {
        soundEngine.playWrong();
        showToast(data.error || 'Không thể lưu tạo hình nhân vật.', 'error');
        return;
      }
      setProfile(data.profile);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      setCelebrateCounter((c) => c + 1);
      soundEngine.playCelebrate();
      setOptionsTab(null);
      showToast('Đã lưu tạo hình nhân vật 3D mới!', 'success');
    } catch {
      showToast('Lỗi kết nối khi lưu nhân vật.', 'error');
    } finally {
      setApiBusy(false);
    }
  };

  const handleCollectHarvestOrb = useCallback(
    (orb: WorldOrb) => {
      if (activeQuestion) return;
      soundEngine.playPickup();
      setActiveOrbId(orb.id);
      setQuizFeedback(null);
      setActiveQuestion(generateMathQuestion(selectedTables, orb.isBonus));
    },
    [activeQuestion, selectedTables]
  );

  const handleCollectBattleOrb = useCallback((orb: WorldOrb) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'collect_orb', orbId: orb.id }));
    }
  }, []);

  const handleBattleMove = useCallback((x: number, z: number, rotY: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'player_move', x, z, rotY }));
    }
  }, []);

  const handleAnswerSelect = async (choice: number) => {
    if (!activeQuestion || !profile || apiBusy) return;

    if (mode === 'battle') {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'submit_math', answer: choice }));
      }
      return;
    }

    const isCorrectLocally = activeQuestion.a * activeQuestion.b === choice;
    const nextCombo = isCorrectLocally ? combo + 1 : 0;
    setCombo(nextCombo);

    setApiBusy(true);
    try {
      const res = await fetch(`/api/profile/${profile.id}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          a: activeQuestion.a,
          b: activeQuestion.b,
          answer: choice,
          combo: nextCombo,
          isBonus: activeQuestion.isBonus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setChallengesDef(data.dailyChallengesDef || challengesDef);
        setLeaderboard(data.leaderboard || leaderboard);

        if (data.isCorrect) {
          soundEngine.playCorrect(nextCombo);
          setCelebrateCounter((c) => c + 1);
          if (data.levelResult?.leveledUp) {
            setTimeout(() => soundEngine.playLevelUp(), 280);
            const skills = (data.levelResult.unlockedSkills as string[]) || [];
            if (skills.length > 0) {
              setTimeout(() => soundEngine.playSkillUnlock(), 550);
              showToast(
                `Thú cưng lên Cấp ${data.levelResult.newLevel}! Mở khóa kỹ năng: ${skills.join(', ')}`,
                'success'
              );
            } else {
              showToast(`Tuyệt vời! Thú cưng đã lên Cấp ${data.levelResult.newLevel}!`, 'success');
            }
          }
        } else {
          soundEngine.playWrong();
        }

        setQuizFeedback({
          isCorrect: data.isCorrect,
          correctAnswer: data.correctAnswer,
          coinsEarned: data.coinsEarned,
          expEarned: data.expEarned,
        });

        // Swap collected orb
        if (activeOrbId) {
          setHarvestOrbs((prev) => {
            const remaining = prev.filter((o) => o.id !== activeOrbId);
            return [...remaining, createLocalOrb(remaining)];
          });
        }

        setTimeout(() => {
          setActiveQuestion(null);
          setActiveOrbId(null);
          setQuizFeedback(null);
        }, 950);
      }
    } catch {
      showToast('Không thể lưu kết quả phép tính.', 'error');
    } finally {
      setApiBusy(false);
    }
  };

  const handleSelectOrUnlockPet = async (petId: string) => {
    if (!profile || apiBusy) return;
    setApiBusy(true);
    try {
      const res = await fetch(`/api/profile/${profile.id}/pet/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId }),
      });
      const data = await res.json();
      if (!res.ok) {
        soundEngine.playWrong();
        showToast(data.error || 'Chưa đủ Xu Sao.', 'error');
        return;
      }
      setProfile(data.profile);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      soundEngine.playGift();
      setCelebrateCounter((c) => c + 1);
      showToast('Đã đổi thú cưng đồng hành mới!', 'success');
    } finally {
      setApiBusy(false);
    }
  };

  const handleFeedPet = async (petId: string, foodId: string) => {
    if (!profile || apiBusy) return;
    setApiBusy(true);
    try {
      const res = await fetch(`/api/profile/${profile.id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, foodId }),
      });
      const data = await res.json();
      if (!res.ok) {
        soundEngine.playWrong();
        showToast(data.error || 'Không thể cho ăn.', 'error');
        return;
      }
      setProfile(data.profile);
      if (data.leaderboard) setLeaderboard(data.leaderboard);
      soundEngine.playFeed();
      setCelebrateCounter((c) => c + 1);
      if (data.levelResult?.leveledUp) {
        setTimeout(() => soundEngine.playLevelUp(), 250);
        const skills = (data.levelResult.unlockedSkills as string[]) || [];
        showToast(
          skills.length > 0
            ? `Lên Cấp ${data.levelResult.newLevel}! Mở kỹ năng: ${skills.join(', ')}`
            : `Thú cưng tăng lên Cấp ${data.levelResult.newLevel}!`,
          'success'
        );
      } else {
        showToast(`Thú cưng ăn ngon lành (+${data.expGain} EXP)!`, 'success');
      }
    } finally {
      setApiBusy(false);
    }
  };

  const handleBuyItem = async (kind: 'deco' | 'food', itemId: string) => {
    if (!profile || apiBusy) return;
    setApiBusy(true);
    try {
      const res = await fetch(`/api/profile/${profile.id}/shop/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, itemId }),
      });
      const data = await res.json();
      if (!res.ok) {
        soundEngine.playWrong();
        showToast(data.error || 'Không đủ Xu Sao.', 'error');
        return;
      }
      setProfile(data.profile);
      soundEngine.playPickup();
      showToast('Đã mua thành công! Kéo từ Kho lên nông trại 3D nhé.', 'success');
    } finally {
      setApiBusy(false);
    }
  };

  const handlePlaceDecoAt = async (decoId: string, gridX: number, gridZ: number) => {
    if (!profile || apiBusy) return;
    setApiBusy(true);
    try {
      const res = await fetch(`/api/profile/${profile.id}/farm/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'place', decoId, gridX, gridZ, rotation: 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        soundEngine.playWrong();
        showToast(data.error || 'Vị trí đặt chưa hợp lệ!', 'error');
        return;
      }
      setProfile(data.profile);
      setPendingPlaceDecoId(null);
      soundEngine.playPlace(isWaterPoint(gridX, gridZ));
    } finally {
      setApiBusy(false);
    }
  };

  const handleMoveDecoAt = async (instanceId: string, gridX: number, gridZ: number) => {
    if (!profile || apiBusy) return;
    setApiBusy(true);
    try {
      const res = await fetch(`/api/profile/${profile.id}/farm/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', instanceId, gridX, gridZ }),
      });
      const data = await res.json();
      if (!res.ok) {
        soundEngine.playWrong();
        showToast(data.error || 'Không thể di chuyển tới ô này!', 'error');
        return;
      }
      setProfile(data.profile);
      soundEngine.playPlace(isWaterPoint(gridX, gridZ));
    } finally {
      setApiBusy(false);
    }
  };

  const handleRotateSelected = async () => {
    if (!profile || !selectedDecoInstanceId || apiBusy) return;
    const item = profile.placedDecorations.find((d) => d.instanceId === selectedDecoInstanceId);
    if (!item) return;
    setApiBusy(true);
    try {
      const res = await fetch(`/api/profile/${profile.id}/farm/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          instanceId: item.instanceId,
          gridX: item.gridX,
          gridZ: item.gridZ,
          rotation: (item.rotation + 1) % 4,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        soundEngine.playPlace(false);
      }
    } finally {
      setApiBusy(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (!profile || !selectedDecoInstanceId || apiBusy) return;
    setApiBusy(true);
    try {
      const res = await fetch(`/api/profile/${profile.id}/farm/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', instanceId: selectedDecoInstanceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setSelectedDecoInstanceId(null);
        soundEngine.playPickup();
        showToast('Đã cất vật phẩm về kho.', 'info');
      }
    } finally {
      setApiBusy(false);
    }
  };

  const handleClaimDailyGift = async () => {
    if (!profile || apiBusy) return;
    setApiBusy(true);
    try {
      const res = await fetch(`/api/profile/${profile.id}/daily-gift/claim`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Chưa thể nhận quà.', 'error');
        return;
      }
      setProfile(data.profile);
      soundEngine.playGift();
      setCelebrateCounter((c) => c + 1);
      showToast(`Đã mở Quà Ngày ${data.gift.day}: +${data.gift.coins} Xu & +${data.gift.tickets} Vé!`, 'success');
    } finally {
      setApiBusy(false);
    }
  };

  const handleClaimChallenge = async (challengeId: string) => {
    if (!profile || apiBusy) return;
    setApiBusy(true);
    try {
      const res = await fetch(`/api/profile/${profile.id}/challenge/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Chưa đủ điều kiện nhận thưởng.', 'error');
        return;
      }
      setProfile(data.profile);
      setChallengesDef(data.dailyChallengesDef || challengesDef);
      soundEngine.playSkillUnlock();
      setCelebrateCounter((c) => c + 1);
      showToast('Hoàn thành thử thách! Đã nhận phần thưởng đặc biệt!', 'success');
    } finally {
      setApiBusy(false);
    }
  };

  const handleLeaveBattle = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave_room' }));
    }
    setBattleRoom(null);
    setBattleRankings(null);
    setActiveQuestion(null);
    setMode('harvest');
  };

  const unlockedPets = profile ? Object.values(profile.pets) : [];
  const activePetState = profile ? profile.pets[profile.activePetId] : undefined;
  const isGamePaused =
    Boolean(optionsTab) ||
    showPets ||
    showDaily ||
    showLeaderboard ||
    showMultiplayer ||
    Boolean(activeQuestion) ||
    Boolean(battleRankings) ||
    Boolean(quickCredentials);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Persistent 3D World Engine */}
      <FarmWorldCanvas
        mode={mode}
        playerId={profile?.id || 'guest'}
        avatarColor={profile?.avatarColor || '#f97316'}
        avatarCustom={profile?.avatarCustom}
        activePetId={profile?.activePetId || 'rabbit'}
        activePetState={activePetState}
        unlockedPets={unlockedPets}
        placedDecorations={profile?.placedDecorations || []}
        harvestOrbs={harvestOrbs}
        battleOrbs={battleRoom?.orbs || []}
        battlePlayers={battleRoom?.players || []}
        selectedDecoInstanceId={selectedDecoInstanceId}
        pendingPlaceDecoId={pendingPlaceDecoId}
        draggingShopDecoId={draggingShopDecoId}
        paused={isGamePaused}
        celebrateCounter={celebrateCounter}
        resetCameraCounter={resetCameraCounter}
        joystickVecRef={joystickVecRef}
        onCollectHarvestOrb={handleCollectHarvestOrb}
        onCollectBattleOrb={handleCollectBattleOrb}
        onBattleMove={handleBattleMove}
        onSelectPlacedDeco={setSelectedDecoInstanceId}
        onPlaceDecoAt={handlePlaceDecoAt}
        onMoveDecoAt={handleMoveDecoAt}
        onClearDraggingShop={() => setDraggingShopDecoId(null)}
      />

      {/* Title Screen */}
      {mode === 'title' && (
        <TitleOverlay
          restoredProfile={profile}
          loading={loginLoading}
          error={loginError}
          onContinueRestored={() => {
            setMode('harvest');
            soundEngine.unlock();
            soundEngine.playGift();
          }}
          onLogout={handleLogout}
          onLogin={handleAuthLogin}
          onRegister={handleAuthRegister}
          onQuickRegister={handleQuickRegister}
        />
      )}

      {/* Active HUD */}
      {mode !== 'title' && profile && (
        <GameHUD
          mode={mode}
          profile={profile}
          challengesDef={challengesDef}
          selectedTables={selectedTables}
          combo={combo}
          battleRoom={battleRoom}
          joystickVecRef={joystickVecRef}
          onChangeMode={(next) => {
            setSelectedDecoInstanceId(null);
            setPendingPlaceDecoId(null);
            soundEngine.playClick();
            setMode(next);
          }}
          onOpenPets={() => {
            soundEngine.playClick();
            setShowPets(true);
          }}
          onOpenDaily={() => {
            soundEngine.playClick();
            setShowDaily(true);
          }}
          onOpenLeaderboard={() => {
            soundEngine.playClick();
            fetch('/api/leaderboard')
              .then((r) => r.json())
              .then((d) => {
                if (d.leaderboard) setLeaderboard(d.leaderboard);
              })
              .catch(() => {});
            setShowLeaderboard(true);
          }}
          onOpenMultiplayer={() => {
            soundEngine.playClick();
            setShowMultiplayer(true);
          }}
          onOpenOptions={(tab = 'character') => {
            soundEngine.playClick();
            setOptionsTab(tab);
          }}
          onChangeTableFilter={setSelectedTables}
          onLeaveBattle={handleLeaveBattle}
        />
      )}

      {/* Shop & Drag-and-Drop Builder Drawer */}
      {mode === 'decorate' && profile && (
        <ShopDecorateDrawer
          profile={profile}
          selectedInstanceId={selectedDecoInstanceId}
          pendingPlaceDecoId={pendingPlaceDecoId}
          busy={apiBusy}
          onStartDragShopItem={(decoId) => setDraggingShopDecoId(decoId)}
          onEndDragShopItem={() => setDraggingShopDecoId(null)}
          onSelectPendingPlace={setPendingPlaceDecoId}
          onBuyItem={handleBuyItem}
          onRotateSelected={handleRotateSelected}
          onRemoveSelected={handleRemoveSelected}
          onDoneDecorate={() => {
            setSelectedDecoInstanceId(null);
            setPendingPlaceDecoId(null);
            setMode('harvest');
          }}
        />
      )}

      {/* Quick Multiplication Quiz */}
      {activeQuestion && (
        <MathQuizModal
          question={activeQuestion}
          combo={combo}
          activePet={activePetState}
          submitting={apiBusy}
          resultFeedback={quizFeedback}
          onSelectAnswer={handleAnswerSelect}
        />
      )}

      {/* Pet Sanctuary & Skill Tree */}
      {showPets && profile && (
        <PetSanctuaryModal
          profile={profile}
          busy={apiBusy}
          onClose={() => setShowPets(false)}
          onSelectOrUnlockPet={handleSelectOrUnlockPet}
          onFeedPet={handleFeedPet}
        />
      )}

      {/* Daily Challenges & Virtual Gifts */}
      {showDaily && profile && (
        <DailyChallengesModal
          profile={profile}
          challengesDef={challengesDef}
          initialResetMs={nextResetMs}
          busy={apiBusy}
          onClose={() => setShowDaily(false)}
          onClaimDailyGift={handleClaimDailyGift}
          onClaimChallenge={handleClaimChallenge}
        />
      )}

      {/* Global Leaderboard */}
      {showLeaderboard && profile && (
        <LeaderboardModal
          entries={leaderboard}
          currentPlayerId={profile.id}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* Online Multiplayer Lobby */}
      {showMultiplayer && profile && (
        <MultiplayerModal
          profile={profile}
          room={battleRoom}
          error={battleError}
          wsConnected={wsConnected}
          onCreateRoom={() => wsRef.current?.send(JSON.stringify({ type: 'create_room', playerId: profile.id, name: profile.name }))}
          onJoinRoom={(code) => wsRef.current?.send(JSON.stringify({ type: 'join_room', playerId: profile.id, name: profile.name, code }))}
          onQuickJoin={() => wsRef.current?.send(JSON.stringify({ type: 'quick_join', playerId: profile.id, name: profile.name }))}
          onStartMatch={() => wsRef.current?.send(JSON.stringify({ type: 'start_match' }))}
          onLeaveRoom={() => {
            wsRef.current?.send(JSON.stringify({ type: 'leave_room' }));
            setBattleRoom(null);
          }}
          onClose={() => setShowMultiplayer(false)}
        />
      )}

      {/* Battle Finished Podium Modal */}
      {battleRankings && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="w-full max-w-md bg-[#fffdf7] border border-[#e5dec9] rounded-3xl p-6 shadow-2xl animate-pop-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                <h2 className="font-display text-2xl font-bold text-slate-900">Kết Quả Thi Đấu</h2>
              </div>
              <button
                type="button"
                onClick={handleLeaveBattle}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 mb-5">
              {battleRankings.map((pl, idx) => (
                <div
                  key={pl.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between ${
                    idx === 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-[#e5dec9]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-num font-bold text-sm text-amber-600">#{idx + 1}</span>
                    <span className="font-bold text-sm text-slate-900">
                      {pl.name} {pl.id === profile.id ? '(Bé)' : ''}
                    </span>
                  </div>
                  <div className="text-right font-mono-num text-xs font-bold text-emerald-700">
                    <div>{pl.score} điểm</div>
                    <div className="text-slate-500">{pl.solvedCount} câu đúng</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleLeaveBattle}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-display font-bold text-base cursor-pointer"
            >
              Quay Về Nông Trại
            </button>
          </div>
        </div>
      )}

      {/* Consolidated Options Modal (Character Customizer · Audio & Music · Account & System) */}
      {optionsTab && profile && (
        <OptionsModal
          profile={profile}
          initialTab={optionsTab}
          audioSettings={audioSettings}
          busy={apiBusy}
          onClose={() => setOptionsTab(null)}
          onSaveAvatar={handleSaveAvatar}
          onChangeAudio={handleChangeAudio}
          onRefreshOrbs={() => {
            setHarvestOrbs(createInitialOrbs(9));
            showToast('Đã làm mới vị trí các quả cầu toán học!', 'info');
          }}
          onResetCamera={() => setResetCameraCounter((c) => c + 1)}
          onBackToTitle={() => {
            setOptionsTab(null);
            if (battleRoom) handleLeaveBattle();
            setMode('title');
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Quick-Register Credentials Reminder Card */}
      {mode !== 'title' && quickCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45">
          <div className="w-full max-w-sm bg-[#fffdf7] border-2 border-amber-400 rounded-3xl p-6 shadow-2xl animate-pop-in space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 leading-tight">
                    Thẻ Ghi Nhớ Tài Khoản
                  </h3>
                  <p className="text-xs text-slate-600">Dùng để đăng nhập lại trên máy khác</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickCredentials(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Tên đăng nhập:</span>
                <span className="font-mono-num text-base font-bold text-slate-900 select-all">
                  {quickCredentials.username}
                </span>
              </div>
              <div className="h-px bg-amber-200" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Mã PIN:</span>
                <span className="font-mono-num text-xl font-bold text-rose-600 tracking-widest select-all">
                  {quickCredentials.pin}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bé hãy ghi lại hoặc bấm sao chép 2 thông tin trên. Khi chuyển sang điện thoại hay máy tính khác, chỉ cần chọn <strong>Đăng nhập</strong> là nhà cũ & thú cưng vẫn còn nguyên vẹn!
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const text = `Vương Quốc Cửu Chương 3D - Tên đăng nhập: ${quickCredentials.username} | Mã PIN: ${quickCredentials.pin}`;
                  navigator.clipboard?.writeText(text).then(() => {
                    setCopiedCreds(true);
                    showToast('Đã sao chép Tên đăng nhập & Mã PIN!', 'success');
                  }).catch(() => {});
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedCreds ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCreds ? 'Đã sao chép' : 'Sao chép thông tin'}</span>
              </button>
              <button
                type="button"
                onClick={() => setQuickCredentials(null)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
              >
                Vào chơi ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking Toast Banner */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-pop-in">
          <div
            className={`px-4 py-2.5 rounded-2xl border shadow-lg text-xs font-bold flex items-center gap-2 ${
              toast.tone === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : toast.tone === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-[#fffdf7] border-[#e5dec9] text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
