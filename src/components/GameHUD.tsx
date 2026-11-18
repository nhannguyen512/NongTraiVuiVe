import React, { useRef, useState } from 'react';
import {
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Coins,
  Hammer,
  Heart,
  Play,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Ticket,
  Trophy,
} from 'lucide-react';
import {
  PET_CATALOG,
  getExpForNextLevel,
  getTodayKey,
  getUnlockedSkills,
} from '../shared/gameTypes';
import type { BattleRoomState, DailyChallengeDef, PlayerProfile } from '../shared/gameTypes';
import type { GameMode } from './FarmWorldCanvas';
import type { OptionsTab } from './OptionsModal';

interface GameHUDProps {
  mode: GameMode;
  profile: PlayerProfile;
  challengesDef: DailyChallengeDef[];
  selectedTables: number[];
  combo: number;
  battleRoom: BattleRoomState | null;
  joystickVecRef: React.MutableRefObject<{ x: number; y: number }>;
  onChangeMode: (next: 'harvest' | 'decorate') => void;
  onOpenPets: () => void;
  onOpenDaily: () => void;
  onOpenLeaderboard: () => void;
  onOpenMultiplayer: () => void;
  onOpenOptions: (tab?: OptionsTab) => void;
  onChangeTableFilter: (tables: number[]) => void;
  onLeaveBattle: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  mode,
  profile,
  challengesDef,
  selectedTables,
  combo,
  battleRoom,
  joystickVecRef,
  onChangeMode,
  onOpenPets,
  onOpenDaily,
  onOpenLeaderboard,
  onOpenMultiplayer,
  onOpenOptions,
  onChangeTableFilter,
  onLeaveBattle,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const padRef = useRef<HTMLDivElement | null>(null);
  const draggingJoy = useRef(false);

  const activePetDef = PET_CATALOG.find((p) => p.id === profile.activePetId) || PET_CATALOG[0];
  const activePetState = profile.pets[profile.activePetId];
  const petLevel = activePetState?.level ?? 1;
  const petExp = activePetState?.exp ?? 0;
  const petNeed = getExpForNextLevel(petLevel);
  const petPct = Math.min(100, Math.round((petExp / petNeed) * 100));
  const unlockedSkills = getUnlockedSkills(petLevel);

  const today = getTodayKey();
  const giftReady = profile.lastGiftDate !== today;
  const claimableChallenges = challengesDef.filter((def) => {
    const p = profile.dailyChallenges.find((c) => c.challengeId === def.id);
    return p && !p.claimed && p.progress >= def.targetCount;
  }).length;
  const dailyActionCount = (giftReady ? 1 : 0) + claimableChallenges;

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnobOffset({ x: dx, y: dy });
    joystickVecRef.current = { x: dx / maxR, y: dy / maxR };
  };

  const resetJoystick = () => {
    draggingJoy.current = false;
    setKnobOffset({ x: 0, y: 0 });
    joystickVecRef.current = { x: 0, y: 0 };
  };

  const tableLabel =
    selectedTables.length === 8
      ? 'Bảng 2–9'
      : selectedTables.length === 1
      ? `Bảng ${selectedTables[0]}`
      : `Bảng ${selectedTables.join(',')}`;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      {/* Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-3 p-3 md:p-4">
        {/* Top-Left: Explorer & Pet Status */}
        <div className="pointer-events-auto bg-[#fffdf7]/95 border border-[#e5dec9] rounded-2xl px-3.5 py-2.5 shadow-md flex flex-col gap-1.5 max-w-[330px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenOptions('character')}
              className="flex items-center gap-2 hover:opacity-80 cursor-pointer"
              title="Bấm để tuỳ chỉnh nhân vật 3D"
            >
              <span
                className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                style={{ backgroundColor: profile.avatarCustom?.outfitColor || profile.avatarColor }}
              />
              <span className="font-display font-bold text-sm text-slate-900 truncate max-w-[120px]">
                {profile.name}
              </span>
            </button>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="inline-flex items-center gap-1 font-mono-num text-xs font-bold text-amber-700">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              {profile.coins}
            </span>
            <span className="inline-flex items-center gap-1 font-mono-num text-xs font-bold text-sky-700">
              <Ticket className="w-3.5 h-3.5 text-sky-500" />
              {profile.tickets}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={onOpenPets}
              className="hover:text-amber-700 cursor-pointer truncate text-left"
            >
              {activePetDef.name} · <strong className="font-mono-num text-emerald-700">Cấp {petLevel}</strong>
              {unlockedSkills.length > 0 && ` · ${unlockedSkills.length} kỹ năng`}
            </button>
            {combo >= 2 && (
              <span className="font-mono-num font-bold text-orange-600 shrink-0">
                Chuỗi ×{combo}
              </span>
            )}
          </div>

          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${petPct}%` }}
            />
          </div>
        </div>

        {/* Top-Center: Battle Live Race Scoreboard (Battle Mode Only) */}
        {mode === 'battle' && battleRoom && (
          <div className="pointer-events-auto bg-[#fffdf7]/95 border-2 border-orange-300 rounded-2xl px-4 py-2 shadow-md flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="text-orange-700">Phòng {battleRoom.code}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-base text-slate-900">
                {battleRoom.status === 'countdown'
                  ? `Bắt đầu: ${battleRoom.countdown}s`
                  : `${battleRoom.timeLeft}s`}
              </span>
              <button
                type="button"
                onClick={onLeaveBattle}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] cursor-pointer"
              >
                Thoát
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
              {[...battleRoom.players]
                .sort((a, b) => b.score - a.score)
                .map((bp) => (
                  <div key={bp.id} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: bp.avatarColor }}
                    />
                    <span className="text-slate-700 max-w-[90px] truncate">{bp.name}</span>
                    <span className="font-mono-num text-emerald-700">{bp.score}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Top-Right: Table Practice Filter & Utilities */}
        <div className="pointer-events-auto flex items-center gap-2 relative">
          {mode === 'harvest' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTablePicker((prev) => !prev)}
                className="h-10 px-3 rounded-xl bg-[#fffdf7]/95 border border-[#e5dec9] hover:border-amber-400 text-xs font-bold text-slate-800 shadow-sm cursor-pointer whitespace-nowrap"
              >
                {tableLabel}
              </button>

              {showTablePicker && (
                <div className="absolute right-0 top-12 w-60 bg-[#fffdf7] border border-[#e5dec9] rounded-2xl p-3 shadow-xl z-40">
                  <div className="text-xs font-bold text-slate-800 mb-2">Chọn bảng cửu chương</div>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[2, 3, 4, 5, 6, 7, 8, 9].map((t) => {
                      const active = selectedTables.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            if (active && selectedTables.length > 1) {
                              onChangeTableFilter(selectedTables.filter((x) => x !== t));
                            } else if (!active) {
                              onChangeTableFilter([...selectedTables, t].sort((a, b) => a - b));
                            }
                          }}
                          className={`py-1.5 rounded-lg font-mono-num text-xs font-bold cursor-pointer ${
                            active
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          ×{t}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeTableFilter([2, 3, 4, 5, 6, 7, 8, 9]);
                      setShowTablePicker(false);
                    }}
                    className="w-full py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer"
                  >
                    Chọn tất cả (2–9)
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="h-10 px-3 rounded-xl bg-[#fffdf7]/95 border border-[#e5dec9] hover:border-amber-400 text-slate-800 shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap"
            title="Bảng xếp hạng"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">Xếp Hạng</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenOptions('character')}
            className="h-10 px-3.5 rounded-xl bg-[#fffdf7]/95 border border-[#e5dec9] hover:border-amber-400 text-slate-800 shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer whitespace-nowrap"
            title="Nhân vật · Âm thanh · Tài khoản"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-600" />
            <span>Tuỳ Chọn</span>
          </button>
        </div>
      </div>

      {/* Virtual Movement Pad (Bottom-Left during Harvest & Battle) */}
      {(mode === 'harvest' || mode === 'battle') && (
        <div
          ref={padRef}
          onPointerDown={(e) => {
            draggingJoy.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateJoystick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (draggingJoy.current) updateJoystick(e.clientX, e.clientY);
          }}
          onPointerUp={resetJoystick}
          onPointerCancel={resetJoystick}
          className="pointer-events-auto fixed bottom-24 left-4 md:bottom-6 md:left-6 w-24 h-24 rounded-full bg-[#fffdf7]/70 border-2 border-[#e5dec9] shadow-md flex items-center justify-center touch-none cursor-pointer"
          aria-label="Phím điều hướng di chuyển"
        >
          <div
            className="w-10 h-10 rounded-full bg-amber-500 border-2 border-white shadow-sm pointer-events-none"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Hidden in Decorate Mode since ShopDrawer takes bottom) */}
      {mode !== 'decorate' && mode !== 'battle' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="pointer-events-auto mb-1.5 px-3 py-1 rounded-lg bg-[#fffdf7]/95 border border-[#e5dec9] text-[11px] font-bold text-slate-600 hover:text-slate-900 shadow-sm flex items-center gap-1 cursor-pointer"
          >
            {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{dockCollapsed ? 'Mở thanh công cụ' : 'Thu gọn'}</span>
          </button>

          {!dockCollapsed && (
            <div className="pointer-events-auto bg-[#fffdf7] border border-[#e5dec9] rounded-2xl p-1.5 shadow-xl flex items-center gap-1.5 overflow-x-auto max-w-[94vw]">
              <button
                type="button"
                onClick={() => onChangeMode('harvest')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  mode === 'harvest'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-700 hover:bg-[#f5f0e1]'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Thu Thập Toán</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeMode('decorate')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-[#f5f0e1] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Hammer className="w-3.5 h-3.5 text-amber-600" />
                <span>Trang Trí & Cửa Hàng</span>
              </button>

              <button
                type="button"
                onClick={onOpenPets}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-[#f5f0e1] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Thú Cưng & Kỹ Năng</span>
              </button>

              <button
                type="button"
                onClick={onOpenDaily}
                className="relative px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-[#f5f0e1] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Thử Thách & Quà</span>
                {dailyActionCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-mono-num text-[10px]">
                    {dailyActionCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenMultiplayer}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Thi Đấu Online</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Subtle skill activation banner if magnet or speed unlocked */}
      {mode === 'harvest' && unlockedSkills.length > 0 && dockCollapsed && (
        <div className="fixed bottom-12 right-4 pointer-events-none text-[11px] font-bold text-emerald-900 bg-[#fffdf7]/90 border border-[#e5dec9] rounded-xl px-3 py-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{unlockedSkills.map((s) => s.name).join(' · ')}</span>
        </div>
      )}
    </div>
  );
};
