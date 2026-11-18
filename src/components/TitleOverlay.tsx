import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  LogOut,
  Play,
  Sparkles,
  UserPlus,
  Zap,
} from 'lucide-react';
import type { PlayerProfile } from '../shared/gameTypes';

type AuthTab = 'login' | 'register' | 'quick';

interface TitleOverlayProps {
  restoredProfile: PlayerProfile | null;
  loading: boolean;
  error: string | null;
  onContinueRestored: () => void;
  onLogout: () => void;
  onLogin: (username: string, password: string) => void;
  onRegister: (displayName: string, username: string, password: string) => void;
  onQuickRegister: (displayName: string) => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  restoredProfile,
  loading,
  error,
  onContinueRestored,
  onLogout,
  onLogin,
  onRegister,
  onQuickRegister,
}) => {
  const [tab, setTab] = useState<AuthTab>('quick');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('Bé Minh Khôi');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (tab === 'login') {
      onLogin(username.trim(), password);
    } else if (tab === 'register') {
      onRegister(displayName.trim() || username.trim(), username.trim(), password);
    } else {
      onQuickRegister(displayName.trim() || 'Nhà Thám Hiểm');
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-5 md:p-10 pointer-events-none overflow-y-auto">
      {/* Top Hero Lockup over calm upper valley space */}
      <div className="max-w-lg pointer-events-auto animate-pop-in">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-900 mb-2.5">
          <span>Lớp 3 – Lớp 5</span>
          <span aria-hidden="true">·</span>
          <span>Bảng Cửu Chương 2–9</span>
          <span aria-hidden="true">·</span>
          <span>Lưu Nhà & Thú Qua Mọi Máy</span>
        </div>

        {/* Bespoke SVG Title Lockup */}
        <div className="flex items-center gap-4 mb-3">
          <svg
            width="60"
            height="60"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 drop-shadow-md"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="56" height="56" rx="16" fill="#F59E0B" stroke="#FFFDF7" strokeWidth="3" />
            <path d="M18 44L25 22L32 34L39 22L46 44H18Z" fill="#FFFDF7" />
            <circle cx="25" cy="18" r="3.5" fill="#FEF08A" />
            <circle cx="32" cy="15" r="4" fill="#FEF08A" />
            <circle cx="39" cy="18" r="3.5" fill="#FEF08A" />
          </svg>
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight drop-shadow-sm">
              Vương Quốc Cửu Chương 3D
            </h1>
          </div>
        </div>

        <p className="text-xs md:text-sm text-slate-800 font-medium max-w-md mb-4 bg-[#fffdf7]/95 border border-[#e5dec9] rounded-xl px-4 py-2.5 shadow-sm">
          Thu thập quả cầu phép nhân, nuôi thú & côn trùng lên cấp mở kỹ năng, trang trí nông trại và đăng nhập trên máy khác vẫn giữ nguyên nhà cũ.
        </p>

        {/* Restored Active Session Card */}
        {restoredProfile ? (
          <div className="bg-[#fffdf7] border-2 border-emerald-300 rounded-2xl p-4 shadow-xl max-w-md space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-display font-bold text-lg shadow-sm shrink-0"
                  style={{ backgroundColor: restoredProfile.avatarColor }}
                >
                  {restoredProfile.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã đăng nhập sẵn</span>
                  </div>
                  <div className="font-display text-lg font-bold text-slate-900 leading-tight">
                    {restoredProfile.name}
                  </div>
                  {restoredProfile.username && (
                    <div className="text-xs font-mono-num text-slate-500">
                      @{restoredProfile.username}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right font-mono-num text-xs font-bold text-slate-700">
                <div className="text-amber-700">{restoredProfile.coins} Xu Sao</div>
                <div className="text-slate-500">{restoredProfile.placedDecorations.length} đồ trang trí</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={onContinueRestored}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-display font-bold text-base shadow-sm transition-transform flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Tiếp Tục Vào Nhà Cũ</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={onLogout}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đổi tài khoản</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#fffdf7] border border-[#e5dec9] rounded-2xl p-4 shadow-xl max-w-md space-y-3.5">
            {/* Mode Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-amber-50/70 p-1 rounded-xl border border-[#e5dec9]">
              <button
                type="button"
                onClick={() => setTab('quick')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  tab === 'quick'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-amber-100/60'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Đăng ký nhanh</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  tab === 'login'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-amber-100/60'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  tab === 'register'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-amber-100/60'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tạo tài khoản</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {tab === 'quick' && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-950 font-medium">
                    Chỉ 1 chạm tạo nhà mới! Hệ thống sẽ cấp sẵn <strong>Tên đăng nhập</strong> và <strong>Mã PIN 4 số</strong> để bé qua máy khác đăng nhập lại vẫn còn nguyên nhà cũ.
                  </div>
                  <div>
                    <label htmlFor="quick-name" className="block text-xs font-bold text-slate-700 mb-1">
                      Tên nhân vật của bé
                    </label>
                    <input
                      id="quick-name"
                      type="text"
                      maxLength={20}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ví dụ: Bé Minh Khôi"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-display font-bold text-base shadow-sm transition-transform flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>{loading ? 'Đang tạo nhà...' : 'Tạo Nhanh & Vào Chơi Ngay'}</span>
                  </button>
                </>
              )}

              {tab === 'login' && (
                <>
                  <div>
                    <label htmlFor="login-username" className="block text-xs font-bold text-slate-700 mb-1">
                      Tên đăng nhập
                    </label>
                    <input
                      id="login-username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nhập tên đăng nhập của bé..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 mb-1">
                      Mật khẩu hoặc Mã PIN 4 số
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu / mã PIN..."
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        aria-label="Hiện hoặc ẩn mật khẩu"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-display font-bold text-base shadow-sm transition-transform flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{loading ? 'Đang mở cửa nhà...' : 'Đăng Nhập Về Nhà Cũ'}</span>
                  </button>
                </>
              )}

              {tab === 'register' && (
                <>
                  <div>
                    <label htmlFor="reg-display" className="block text-xs font-bold text-slate-700 mb-1">
                      Tên hiển thị trong game
                    </label>
                    <input
                      id="reg-display"
                      type="text"
                      maxLength={20}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ví dụ: Sóc Nhỏ Thông Minh"
                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="reg-username" className="block text-xs font-bold text-slate-700 mb-1">
                        Tên đăng nhập (không dấu)
                      </label>
                      <input
                        id="reg-username"
                        type="text"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="vd: minhkhoi2015"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold text-sm focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="reg-password" className="block text-xs font-bold text-slate-700 mb-1">
                        Mật khẩu / PIN (từ 4 ký tự)
                      </label>
                      <div className="relative">
                        <input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="vd: 1234"
                          className="w-full pl-3 pr-9 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold text-sm focus:outline-none focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                          aria-label="Hiện hoặc ẩn mật khẩu"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-display font-bold text-base shadow-sm transition-transform flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản Mới'}</span>
                  </button>
                </>
              )}

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Single flat control-hint line */}
      <div className="pointer-events-none flex items-center justify-between mt-4">
        <div className="inline-flex items-center gap-2 bg-[#fffdf7]/95 border border-[#e5dec9] rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>WASD / Mũi tên di chuyển · Kéo chuột xoay góc nhìn · Cuộn chuột thu phóng · Phím 1–4 trả lời nhanh</span>
        </div>
      </div>
    </div>
  );
};
