import React from 'react';
import { Medal, Trophy, X } from 'lucide-react';
import { PET_CATALOG } from '../shared/gameTypes';
import type { LeaderboardEntry } from '../shared/gameTypes';

interface LeaderboardModalProps {
  entries: LeaderboardEntry[];
  currentPlayerId: string;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  entries,
  currentPlayerId,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/45">
      <div className="w-full max-w-2xl max-h-[85vh] bg-[#fffdf7] border border-[#e5dec9] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-pop-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dec9]">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-500" />
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Bảng Xếp Hạng Vương Quốc
              </h2>
              <p className="text-xs font-medium text-slate-600">
                Vinh danh các nhà thám hiểm giải bảng cửu chương xuất sắc nhất
              </p>
            </div>
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

        <div className="flex-1 overflow-y-auto p-6">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-500">
              Chưa có dữ liệu xếp hạng. Hãy giải phép nhân đầu tiên để ghi danh nhé!
            </div>
          ) : (
            <div className="bg-white border border-[#e5dec9] rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e5dec9] bg-[#faf6eb] text-[11px] font-bold text-slate-600">
                    <th className="py-3 px-4">Hạng</th>
                    <th className="py-3 px-4">Nhà Thám Hiểm</th>
                    <th className="py-3 px-4">Thú Đồng Hành</th>
                    <th className="py-3 px-4 text-right">Chuỗi Max</th>
                    <th className="py-3 px-4 text-right">Điểm Số</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => {
                    const isMe = entry.id === currentPlayerId;
                    const petName = PET_CATALOG.find((p) => p.id === entry.activePetId)?.name || 'Thỏ Bông';
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b last:border-b-0 border-[#f0ead8] text-sm ${
                          isMe ? 'bg-amber-50/90 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono-num font-bold">
                          {idx < 3 ? (
                            <span
                              className={`inline-flex items-center gap-1 ${
                                idx === 0
                                  ? 'text-amber-500'
                                  : idx === 1
                                  ? 'text-slate-500'
                                  : 'text-orange-600'
                              }`}
                            >
                              <Medal className="w-4 h-4" />
                              {idx + 1}
                            </span>
                          ) : (
                            <span className="text-slate-500">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: entry.avatarColor }}
                            />
                            <span className="text-slate-900 truncate max-w-[150px]">
                              {entry.name} {isMe ? '(Bé)' : ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {petName} · <span className="font-mono-num font-bold">Lv.{entry.petLevel}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num text-orange-600 font-bold">
                          {entry.bestStreak}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num text-emerald-700 font-bold">
                          {entry.totalScore}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
