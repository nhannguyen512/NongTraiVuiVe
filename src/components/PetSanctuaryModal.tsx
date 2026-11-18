import React, { useState } from 'react';
import { Award, Check, Heart, Lock, Sparkles, Utensils, X } from 'lucide-react';
import {
  FOOD_CATALOG,
  PET_CATALOG,
  PET_SKILLS,
  getExpForNextLevel,
  getTodayKey,
} from '../shared/gameTypes';
import type { PetCategory, PlayerProfile } from '../shared/gameTypes';

interface PetSanctuaryModalProps {
  profile: PlayerProfile;
  busy: boolean;
  onClose: () => void;
  onSelectOrUnlockPet: (petId: string) => void;
  onFeedPet: (petId: string, foodId: string) => void;
}

export const PetSanctuaryModal: React.FC<PetSanctuaryModalProps> = ({
  profile,
  busy,
  onClose,
  onSelectOrUnlockPet,
  onFeedPet,
}) => {
  const [category, setCategory] = useState<PetCategory | 'all'>('all');
  const [inspectPetId, setInspectPetId] = useState<string>(profile.activePetId);

  const today = getTodayKey();
  const filteredPets =
    category === 'all' ? PET_CATALOG : PET_CATALOG.filter((p) => p.category === category);

  const inspectedCatalog = PET_CATALOG.find((p) => p.id === inspectPetId) || PET_CATALOG[0];
  const inspectedState = profile.pets[inspectedCatalog.id];
  const isActive = profile.activePetId === inspectedCatalog.id;
  const neededExp = getExpForNextLevel(inspectedState?.level ?? 1);
  const expPct = Math.min(100, Math.round(((inspectedState?.exp ?? 0) / neededExp) * 100));
  const freeFedToday = inspectedState?.lastFedDate === today;

  const growthStageLabel =
    (inspectedState?.level ?? 1) >= 5
      ? 'Siêu Thú Vương Quốc (Có Vương Miện)'
      : (inspectedState?.level ?? 1) >= 3
      ? 'Trưởng Thành (Có Vòng Sao)'
      : 'Bé Đáng Yêu';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/45">
      <div className="w-full max-w-4xl max-h-[88vh] bg-[#fffdf7] border border-[#e5dec9] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dec9]">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Vườn Thú, Côn Trùng & Ao Suối
            </h2>
            <p className="text-xs font-medium text-slate-600">
              Giải đúng phép nhân để tăng EXP lên cấp và mở khóa kỹ năng đặc biệt cho thú cưng
            </p>
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

        {/* Category Filter Tabs */}
        <div className="px-6 pt-3 pb-2 flex items-center gap-2 border-b border-[#f0ead8] overflow-x-auto">
          {[
            { id: 'all', label: 'Tất cả (8)' },
            { id: 'land', label: 'Thú cưng' },
            { id: 'insect', label: 'Côn trùng độc lạ' },
            { id: 'water', label: 'Ao cá & Suối' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id as PetCategory | 'all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                category === tab.id
                  ? 'bg-amber-500 text-white'
                  : 'bg-[#f5f0e1] text-slate-700 hover:bg-[#ebe3ce]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Split */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 p-6">
          {/* Left: Pet List */}
          <div className="md:col-span-5 flex flex-col gap-2.5">
            {filteredPets.map((pet) => {
              const st = profile.pets[pet.id];
              const unlocked = st?.unlocked;
              const selected = inspectPetId === pet.id;
              const active = profile.activePetId === pet.id;

              return (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => setInspectPetId(pet.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    selected
                      ? 'bg-amber-50 border-amber-400 shadow-sm'
                      : 'bg-white border-[#e5dec9] hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl shrink-0 border border-black/10 flex items-center justify-center font-display font-bold text-lg text-slate-900"
                      style={{ backgroundColor: pet.primaryColor }}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/10"
                        style={{ backgroundColor: pet.accentColor }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-bold text-sm text-slate-900 truncate">
                        {pet.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span>{pet.categoryLabel}</span>
                        {unlocked && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-num font-bold text-emerald-700">
                              Cấp {st.level}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-xs font-bold">
                    {active ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Đang đi cùng
                      </span>
                    ) : unlocked ? (
                      <span className="text-slate-500">Đã có</span>
                    ) : (
                      <span className="text-amber-700 font-mono-num">{pet.unlockCost} Xu</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Pet Details, Feeding & Skill Tree */}
          <div className="md:col-span-7 flex flex-col gap-4">
            <div className="bg-white border border-[#e5dec9] rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-xs font-semibold text-amber-700 mb-0.5">
                    {inspectedCatalog.categoryLabel} · {growthStageLabel}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-slate-900">
                    {inspectedCatalog.name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">{inspectedCatalog.description}</p>
                </div>

                {!isActive && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSelectOrUnlockPet(inspectedCatalog.id)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    {inspectedState?.unlocked
                      ? 'Chọn đồng hành'
                      : `Đón về nông trại (${inspectedCatalog.unlockCost} Xu)`}
                  </button>
                )}
              </div>

              {inspectedState?.unlocked ? (
                <>
                  {/* Level & EXP Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                      <span className="tabular-nums">Cấp độ {inspectedState.level}</span>
                      <span className="font-mono-num text-slate-500">
                        {inspectedState.exp} / {neededExp} EXP
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${expPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Daily Feeding Section */}
                  <div className="border-t border-[#f0ead8] pt-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                      <Utensils className="w-3.5 h-3.5 text-orange-500" />
                      <span>Cho thú ăn mỗi ngày để tăng trưởng nhanh</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || freeFedToday}
                        onClick={() => onFeedPet(inspectedCatalog.id, 'daily_free')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                          freeFedToday
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5" />
                        <span>{freeFedToday ? 'Đã ăn phần hôm nay' : 'Phần ăn miễn phí (+40 EXP)'}</span>
                      </button>

                      {FOOD_CATALOG.map((food) => {
                        const qty = profile.foodInventory[food.id] || 0;
                        return (
                          <button
                            key={food.id}
                            type="button"
                            disabled={busy || qty <= 0}
                            onClick={() => onFeedPet(inspectedCatalog.id, food.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                              qty > 0
                                ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                                : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {food.name} ({qty}) · +{food.expGain} EXP
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900">
                  Giải thêm phép nhân để tích lũy Xu Sao và đón {inspectedCatalog.name} về nông trại nhé!
                </div>
              )}
            </div>

            {/* Skill Tree Panel */}
            <div className="bg-white border border-[#e5dec9] rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm font-display font-bold text-slate-900 mb-3">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Hệ Thống Kỹ Năng Theo Cấp Độ</span>
              </div>
              <div className="space-y-2.5">
                {PET_SKILLS.map((skill) => {
                  const unlocked = (inspectedState?.level ?? 1) >= skill.unlockLevel && inspectedState?.unlocked;
                  return (
                    <div
                      key={skill.id}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                        unlocked ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white mt-0.5"
                          style={{ backgroundColor: unlocked ? skill.badgeColor : '#94a3b8' }}
                        >
                          {unlocked ? <Sparkles className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>{skill.name}</span>
                            <span className="text-slate-400 font-normal">·</span>
                            <span className="font-mono-num text-[11px] text-slate-600">
                              Mở ở Cấp {skill.unlockLevel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">{skill.description}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-bold shrink-0 ${
                          unlocked ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {unlocked ? 'Đã mở' : 'Chưa mở'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
