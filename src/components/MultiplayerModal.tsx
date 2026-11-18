import React, { useState } from 'react';
import { Copy, Crown, Play, Swords, Users, X } from 'lucide-react';
import type { BattleRoomState, PlayerProfile } from '../shared/gameTypes';

interface MultiplayerModalProps {
  profile: PlayerProfile;
  room: BattleRoomState | null;
  error: string | null;
  wsConnected: boolean;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onQuickJoin: () => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  profile,
  room,
  error,
  wsConnected,
  onCreateRoom,
  onJoinRoom,
  onQuickJoin,
  onStartMatch,
  onLeaveRoom,
  onClose,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const isHost = room?.hostId === profile.id;

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/45">
      <div className="w-full max-w-xl bg-[#fffdf7] border border-[#e5dec9] rounded-3xl shadow-2xl overflow-hidden animate-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5dec9]">
          <div className="flex items-center gap-2.5">
            <Swords className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Đấu Trường Trực Tuyến
              </h2>
              <p className="text-xs font-medium text-slate-600">
                Thi đua giải bảng cửu chương 60 giây cùng tối đa 4 bạn nhỏ theo thời gian thực
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (room) onLeaveRoom();
              onClose();
            }}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!wsConnected && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
              Đang kết nối tới máy chủ thi đấu trực tuyến...
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {!room ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!wsConnected}
                  onClick={onCreateRoom}
                  className="p-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-left transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <div className="font-display text-lg font-bold mb-1">Tạo Phòng Mới</div>
                  <p className="text-xs text-amber-50">
                    Lấy mã phòng 4 ký tự gửi cho bạn bè cùng vào thi đấu
                  </p>
                </button>

                <button
                  type="button"
                  disabled={!wsConnected}
                  onClick={onQuickJoin}
                  className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-left transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <div className="font-display text-lg font-bold mb-1">Ghép Nhanh</div>
                  <p className="text-xs text-emerald-50">
                    Tự động vào phòng đang chờ hoặc mở phòng mới ngay
                  </p>
                </button>
              </div>

              <div className="bg-white border border-[#e5dec9] rounded-2xl p-4">
                <label htmlFor="room-code-input" className="block text-xs font-bold text-slate-700 mb-2">
                  Hoặc nhập mã phòng từ bạn bè
                </label>
                <div className="flex gap-2">
                  <input
                    id="room-code-input"
                    type="text"
                    maxLength={4}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="VD: A7K2"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono-num text-base font-bold tracking-widest uppercase focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    disabled={!wsConnected || joinCode.trim().length < 4}
                    onClick={() => onJoinRoom(joinCode.trim())}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                  >
                    Vào Phòng
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Waiting Room Lobby */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div>
                  <div className="text-xs font-bold text-amber-800">Mã phòng của bé</div>
                  <div className="font-mono-num text-3xl font-bold text-slate-900 tracking-widest">
                    {room.code}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-xs font-bold text-amber-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Đã chép mã!' : 'Chép mã mời bạn'}</span>
                </button>
              </div>

              <div className="bg-white border border-[#e5dec9] rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-3">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-sky-600" />
                    Người chơi trong phòng
                  </span>
                  <span className="font-mono-num">{room.players.length} / 4</span>
                </div>
                <div className="space-y-2">
                  {room.players.map((pl) => (
                    <div
                      key={pl.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: pl.avatarColor }}
                        />
                        <span className="text-sm font-bold text-slate-900">
                          {pl.name} {pl.id === profile.id ? '(Bé)' : ''}
                        </span>
                      </div>
                      {pl.id === room.hostId && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                          <Crown className="w-3.5 h-3.5" />
                          Chủ phòng
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Rời phòng
                </button>

                {isHost ? (
                  <button
                    type="button"
                    onClick={onStartMatch}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold text-base flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Bắt Đầu Đấu Ngay ({room.players.length} người)</span>
                  </button>
                ) : (
                  <div className="text-xs font-bold text-slate-600">
                    Đang chờ chủ phòng bấm Bắt đầu...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
