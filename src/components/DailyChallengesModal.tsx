import React, { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Gift, Sparkles, Ticket, Trophy, X } from 'lucide-react';
import { DAILY_GIFTS, DECO_CATALOG, FOOD_CATALOG, getTodayKey } from '../shared/gameTypes';
import type { DailyChallengeDef, PlayerProfile } from '../shared/gameTypes';

interface DailyChallengesModalProps {
  profile: PlayerProfile;
  challengesDef: DailyChallengeDef[];
  initialResetMs: number;
  busy: boolean;
  onClose: () => void;
  onClaimDailyGift: () => void;
  onClaimChallenge: (challengeId: string) => void;
}

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const DailyChallengesModal: React.FC<DailyChallengesModalProps> = ({
  profile,
  challengesDef,
  initialResetMs,
  busy,
  onClose,
  onClaimDailyGift,
  onClaimChallenge,
}) => {
  const [remainingMs, setRemainingMs] = useState(initialResetMs);

  useEffect(() => {
    setRemainingMs(initialResetMs);
  }, [initialResetMs]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const today = getTodayKey();
  const giftClaimedToday = profile.lastGiftDate === today;
  const nextGiftDay = (profile.dailyGiftStreak % DAILY_GIFTS.length) + 1;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/45">
      <div className="w-full max-w-3xl max-h-[88vh] bg-[#fffdf7] border border-[#e5dec9] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-pop-in">
        {/* Header with Live Countdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[#e5dec9]">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Thử Thách & Quà Tặng Hàng Ngày
            </h2>
            <p className="text-xs font-medium text-slate-600">
              Hoàn thành phép nhân đặc biệt hôm nay để nhận đồ trang trí hiếm, thức ăn và vé đấu trường
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
              <CalendarClock className="w-4 h-4 text-amber-600" />
              <span>Còn lại:</span>
              <span className="font-mono-num text-sm">{formatCountdown(remainingMs)}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Daily Virtual Gift Section */}
          <section className="bg-white border border-[#e5dec9] rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Hộp Quà Điểm Danh Hàng Ngày
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chuỗi nhận quà hiện tại: <strong className="text-slate-800">{profile.dailyGiftStreak}/7 ngày</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy || giftClaimedToday}
                onClick={onClaimDailyGift}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-transform cursor-pointer ${
                  giftClaimedToday
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-500 hover:bg-rose-600 active:scale-95 text-white shadow-sm'
                }`}
              >
                {giftClaimedToday ? 'Đã nhận quà hôm nay' : `Mở Quà Ngày ${nextGiftDay}`}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {DAILY_GIFTS.map((g) => {
                const isPast = g.day <= profile.dailyGiftStreak;
                const isTodayTarget = !giftClaimedToday && g.day === nextGiftDay;
                return (
                  <div
                    key={g.day}
                    className={`p-2.5 rounded-xl border text-center flex flex-col justify-between gap-1 ${
                      isTodayTarget
                        ? 'bg-amber-50 border-amber-400 shadow-sm'
                        : isPast
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-slate-500">Ngày {g.day}</div>
                    <div className="font-mono-num text-xs font-bold text-amber-700">+{g.coins} Xu</div>
                    <div className="font-mono-num text-[11px] font-semibold text-sky-700">+{g.tickets} Vé</div>
                    {g.foodId && (
                      <div className="text-[10px] font-semibold text-emerald-700 truncate">
                        +{g.foodCount} {FOOD_CATALOG.find((f) => f.id === g.foodId)?.name}
                      </div>
                    )}
                    {isPast && (
                      <div className="flex justify-center pt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Daily Special Math Challenges */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-display text-lg font-bold text-slate-900">
                Nhiệm Vụ Toán Học Đặc Biệt Hôm Nay
              </h3>
            </div>

            <div className="space-y-3">
              {challengesDef.map((def) => {
                const prog = profile.dailyChallenges.find((c) => c.challengeId === def.id);
                const current = prog?.progress ?? 0;
                const claimed = prog?.claimed ?? false;
                const completed = current >= def.targetCount;
                const pct = Math.min(100, Math.round((current / def.targetCount) * 100));

                const rareDeco = def.rewardDecoId
                  ? DECO_CATALOG.find((d) => d.id === def.rewardDecoId)
                  : undefined;
                const foodReward = def.rewardFoodId
                  ? FOOD_CATALOG.find((f) => f.id === def.rewardFoodId)
                  : undefined;

                return (
                  <div
                    key={def.id}
                    className={`p-4 rounded-2xl border bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      completed && !claimed ? 'border-amber-400 shadow-sm' : 'border-[#e5dec9]'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display font-bold text-base text-slate-900">{def.title}</h4>
                        <span className="font-mono-num text-xs font-bold text-emerald-700">
                          {current}/{def.targetCount}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-2.5">{def.description}</p>

                      {/* Progress Bar */}
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2.5">
                        <div
                          className={`h-full transition-all duration-300 ${
                            completed ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Rewards Line */}
                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1 text-amber-700 font-mono-num">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          +{def.rewardCoins} Xu
                        </span>
                        <span className="flex items-center gap-1 text-sky-700 font-mono-num">
                          <Ticket className="w-3.5 h-3.5 text-sky-500" />
                          +{def.rewardTickets} Vé Thi Đấu
                        </span>
                        {foodReward && (
                          <span className="text-orange-700">+1 {foodReward.name}</span>
                        )}
                        {rareDeco && (
                          <span className="text-purple-700">Vật phẩm hiếm: {rareDeco.name}</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busy || claimed || !completed}
                      onClick={() => onClaimChallenge(def.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                        claimed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : completed
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? 'Đã nhận thưởng' : completed ? 'Nhận Thưởng' : 'Đang thực hiện'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
