import React, { useState } from 'react';
import { GripVertical, RotateCw, ShoppingBag, Trash2, Trees, Waves } from 'lucide-react';
import { DECO_CATALOG, FOOD_CATALOG } from '../shared/gameTypes';
import type { DecoCategory, PlayerProfile } from '../shared/gameTypes';

interface ShopDecorateDrawerProps {
  profile: PlayerProfile;
  selectedInstanceId: string | null;
  pendingPlaceDecoId: string | null;
  busy: boolean;
  onStartDragShopItem: (decoId: string) => void;
  onEndDragShopItem: () => void;
  onSelectPendingPlace: (decoId: string | null) => void;
  onBuyItem: (kind: 'deco' | 'food', itemId: string) => void;
  onRotateSelected: () => void;
  onRemoveSelected: () => void;
  onDoneDecorate: () => void;
}

export const ShopDecorateDrawer: React.FC<ShopDecorateDrawerProps> = ({
  profile,
  selectedInstanceId,
  pendingPlaceDecoId,
  busy,
  onStartDragShopItem,
  onEndDragShopItem,
  onSelectPendingPlace,
  onBuyItem,
  onRotateSelected,
  onRemoveSelected,
  onDoneDecorate,
}) => {
  const [tab, setTab] = useState<'inventory' | 'shop'>('inventory');
  const [catFilter, setCatFilter] = useState<DecoCategory | 'all'>('all');
  const [shopSubTab, setShopSubTab] = useState<'deco' | 'food'>('deco');

  const inventoryItems = DECO_CATALOG.filter((d) => (profile.decoInventory[d.id] || 0) > 0);
  const shopDecos = DECO_CATALOG.filter(
    (d) => !d.rare && (catFilter === 'all' || d.category === catFilter)
  );

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(940px,95vw)] bg-[#fffdf7] border border-[#e5dec9] rounded-2xl shadow-xl p-3.5 pointer-events-auto animate-pop-in">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#f0ead8]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab('inventory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
              tab === 'inventory'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#f5f0e1] text-slate-700 hover:bg-[#ebe3ce]'
            }`}
          >
            Kho Kéo Thả ({inventoryItems.reduce((acc, i) => acc + (profile.decoInventory[i.id] || 0), 0)})
          </button>
          <button
            type="button"
            onClick={() => setTab('shop')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
              tab === 'shop'
                ? 'bg-amber-500 text-white'
                : 'bg-[#f5f0e1] text-slate-700 hover:bg-[#ebe3ce]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Cửa Hàng Nông Trại</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedInstanceId && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={onRotateSelected}
                className="px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Xoay 90°</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onRemoveSelected}
                className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cất kho</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onDoneDecorate}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
          >
            Xong
          </button>
        </div>
      </div>

      {/* Inventory Drag & Drop Tray */}
      {tab === 'inventory' ? (
        <div>
          <p className="text-[11px] font-semibold text-slate-500 mb-2">
            Kéo thả trực tiếp đồ trang trí từ khay bên dưới lên bãi cỏ hoặc ao suối 3D (hoặc bấm chọn rồi chạm ô muốn đặt). Kéo vật phẩm đã đặt để di chuyển!
          </p>
          {inventoryItems.length === 0 ? (
            <div className="py-4 text-center text-xs font-semibold text-slate-500">
              Kho trang trí đang trống. Hãy mở tab <strong className="text-amber-700">Cửa Hàng Nông Trại</strong> để mua cây, hoa, hàng rào và đồ ao suối nhé!
            </div>
          ) : (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {inventoryItems.map((item) => {
                const count = profile.decoInventory[item.id] || 0;
                const isPending = pendingPlaceDecoId === item.id;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', item.id);
                      onStartDragShopItem(item.id);
                    }}
                    onDragEnd={onEndDragShopItem}
                    onClick={() => onSelectPendingPlace(isPending ? null : item.id)}
                    className={`min-w-[155px] p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing shrink-0 select-none ${
                      isPending
                        ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                        : 'bg-white border-[#e5dec9] hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className="w-4 h-4 rounded-md border border-black/10 shrink-0"
                        style={{ backgroundColor: item.previewColor }}
                      />
                      <span className="font-mono-num text-[11px] font-bold text-slate-600">
                        ×{count}
                      </span>
                      <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                    <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                      {item.terrain === 'water' ? (
                        <>
                          <Waves className="w-3 h-3 text-sky-500" />
                          <span>Đặt trên suối/ao</span>
                        </>
                      ) : (
                        <>
                          <Trees className="w-3 h-3 text-emerald-600" />
                          <span>Đặt trên cỏ</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Shop Tab */
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: 'Tất cả đồ' },
                { id: 'fence', label: 'Hàng rào' },
                { id: 'flora', label: 'Cây & Hoa' },
                { id: 'water', label: 'Ao cá & Suối' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setShopSubTab('deco');
                    setCatFilter(cat.id as DecoCategory | 'all');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                    shopSubTab === 'deco' && catFilter === cat.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShopSubTab('food')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                  shopSubTab === 'food'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
                }`}
              >
                Thức ăn thú cưng
              </button>
            </div>
            <div className="font-mono-num text-xs font-bold text-amber-700">
              Số dư: {profile.coins} Xu Sao
            </div>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {shopSubTab === 'deco'
              ? shopDecos.map((item) => {
                  const canAfford = profile.coins >= item.cost;
                  return (
                    <div
                      key={item.id}
                      className="min-w-[175px] max-w-[185px] p-2.5 rounded-xl bg-white border border-[#e5dec9] shrink-0 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className="w-4 h-4 rounded-md border border-black/10"
                            style={{ backgroundColor: item.previewColor }}
                          />
                          <span className="text-[10px] font-semibold text-slate-500">
                            {item.terrain === 'water' ? 'Ao/Suối' : 'Bãi cỏ'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                      </div>
                      <button
                        type="button"
                        disabled={busy || !canAfford}
                        onClick={() => onBuyItem('deco', item.id)}
                        className={`w-full py-1.5 rounded-lg text-xs font-bold font-mono-num cursor-pointer ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Mua · {item.cost} Xu
                      </button>
                    </div>
                  );
                })
              : FOOD_CATALOG.filter((f) => !f.rare).map((food) => {
                  const canAfford = profile.coins >= food.cost;
                  return (
                    <div
                      key={food.id}
                      className="min-w-[185px] p-2.5 rounded-xl bg-white border border-[#e5dec9] shrink-0 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{food.name}</div>
                        <div className="text-[11px] font-semibold text-emerald-700">
                          +{food.expGain} EXP thú cưng
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy || !canAfford}
                        onClick={() => onBuyItem('food', food.id)}
                        className={`w-full py-1.5 rounded-lg text-xs font-bold font-mono-num cursor-pointer ${
                          canAfford
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Mua · {food.cost} Xu
                      </button>
                    </div>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
};
