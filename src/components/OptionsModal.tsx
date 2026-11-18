import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Check,
  Compass,
  Dices,
  Home,
  KeyRound,
  LogOut,
  Music,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import type { AudioSettings } from '../audio/soundEngine';
import { createHeroModel } from '../game/models3d';
import { createContactShadowTexture } from '../game/textures';
import {
  AVATAR_BACKPACK_STYLES,
  AVATAR_GLASSES_STYLES,
  AVATAR_HAIR_COLORS,
  AVATAR_HAIR_STYLES,
  AVATAR_HAT_STYLES,
  AVATAR_OUTFIT_COLORS,
  AVATAR_SKIN_TONES,
  DEFAULT_AVATAR_CUSTOMIZATION,
} from '../shared/gameTypes';
import type { AvatarCustomization, PlayerProfile } from '../shared/gameTypes';

export type OptionsTab = 'character' | 'audio' | 'system';

interface OptionsModalProps {
  profile: PlayerProfile;
  initialTab?: OptionsTab;
  audioSettings: AudioSettings;
  busy: boolean;
  onClose: () => void;
  onSaveAvatar: (custom: AvatarCustomization) => Promise<void> | void;
  onChangeAudio: (patch: Partial<AudioSettings>) => void;
  onRefreshOrbs: () => void;
  onResetCamera: () => void;
  onBackToTitle: () => void;
  onLogout: () => void;
}

const CharacterPreview3D: React.FC<{ custom: AvatarCustomization }> = ({ custom }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const customRef = useRef(custom);
  customRef.current = custom;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || 200;
    const height = container.clientHeight || 240;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 30);
    camera.position.set(0, 1.45, 3.65);
    camera.lookAt(0, 0.92, 0);

    const hemi = new THREE.HemisphereLight('#e0f2fe', '#86efac', 1.1);
    const key = new THREE.DirectionalLight('#fff5da', 1.5);
    key.position.set(3, 5, 4);
    const rim = new THREE.DirectionalLight('#bae6fd', 0.65);
    rim.position.set(-3, 3, -3);
    scene.add(hemi, key, rim);

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.92, 0.14, 24),
      new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.65, metalness: 0.05 })
    );
    pedestal.position.y = -0.07;
    scene.add(pedestal);

    const shadowTex = createContactShadowTexture();
    let currentSig = JSON.stringify(customRef.current);
    let hero = createHeroModel(customRef.current.outfitColor, shadowTex, customRef.current);
    scene.add(hero);

    let dragRot = 0.35;
    let dragging = false;
    let lastX = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      dragRot += dx * 0.014;
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);

    let disposed = false;
    let frameId = 0;
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const nextSig = JSON.stringify(customRef.current);
      if (nextSig !== currentSig) {
        currentSig = nextSig;
        scene.remove(hero);
        hero = createHeroModel(customRef.current.outfitColor, shadowTex, customRef.current);
        scene.add(hero);
      }

      if (!dragging) {
        dragRot += dt * 0.55;
      }
      hero.rotation.y = dragRot;
      if (hero.userData.bodyGroup) {
        hero.userData.bodyGroup.position.y = Math.sin(clock.elapsedTime * 3) * 0.025;
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerup', onUp);
      envRT.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-56 sm:h-64 rounded-2xl bg-gradient-to-b from-sky-100 to-emerald-50 border border-[#e5dec9] overflow-hidden select-none cursor-grab active:cursor-grabbing">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-slate-600 whitespace-nowrap pointer-events-none">
        Kéo để xoay xem 3D
      </div>
    </div>
  );
};

export const OptionsModal: React.FC<OptionsModalProps> = ({
  profile,
  initialTab = 'character',
  audioSettings,
  busy,
  onClose,
  onSaveAvatar,
  onChangeAudio,
  onRefreshOrbs,
  onResetCamera,
  onBackToTitle,
  onLogout,
}) => {
  const [tab, setTab] = useState<OptionsTab>(initialTab);
  const [draft, setDraft] = useState<AvatarCustomization>(() => ({
    ...DEFAULT_AVATAR_CUSTOMIZATION,
    outfitColor: profile.avatarColor || DEFAULT_AVATAR_CUSTOMIZATION.outfitColor,
    ...profile.avatarCustom,
  }));

  const randomizeAvatar = () => {
    soundEngine.playClick();
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    setDraft({
      skinColor: pick(AVATAR_SKIN_TONES).color,
      outfitColor: pick(AVATAR_OUTFIT_COLORS).color,
      hairColor: pick(AVATAR_HAIR_COLORS).color,
      hairStyle: pick(AVATAR_HAIR_STYLES).id,
      hatStyle: pick(AVATAR_HAT_STYLES).id,
      glassesStyle: pick(AVATAR_GLASSES_STYLES).id,
      backpackStyle: pick(AVATAR_BACKPACK_STYLES).id,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45">
      <div className="w-full max-w-2xl bg-[#fffdf7] border border-[#e5dec9] rounded-3xl shadow-2xl overflow-hidden animate-pop-in flex flex-col max-h-[90vh]">
        {/* Header + Segmented Tabs */}
        <div className="px-5 pt-4 pb-3 border-b border-[#e5dec9] flex flex-wrap items-center justify-between gap-3 bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 leading-tight">Tuỳ Chọn</h2>
              <p className="text-[11px] font-semibold text-slate-500">
                Nhân vật · Âm thanh · Tài khoản
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#e5dec9]">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setTab('character');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                tab === 'character' ? 'bg-amber-500 text-white' : 'text-slate-700 hover:bg-amber-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nhân Vật</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setTab('audio');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                tab === 'audio' ? 'bg-sky-600 text-white' : 'text-slate-700 hover:bg-sky-50'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Âm Thanh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setTab('system');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                tab === 'system' ? 'bg-emerald-600 text-white' : 'text-slate-700 hover:bg-emerald-50'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Trò Chơi</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white border border-[#e5dec9] hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer"
            aria-label="Đóng tuỳ chọn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto">
          {tab === 'character' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left: Live 3D Character Preview + Randomize/Save */}
              <div className="md:col-span-5 flex flex-col gap-3">
                <CharacterPreview3D custom={draft} />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={randomizeAvatar}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Dices className="w-4 h-4" />
                    <span>Ngẫu nhiên</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSaveAvatar(draft)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Check className="w-4 h-4" />
                    <span>{busy ? 'Đang lưu...' : 'Lưu tạo hình'}</span>
                  </button>
                </div>
              </div>

              {/* Right: Compact Customization Controls */}
              <div className="md:col-span-7 space-y-3.5">
                {/* Outfit & Skin Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-1.5">Màu trang phục</div>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_OUTFIT_COLORS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          title={item.label}
                          onClick={() => {
                            soundEngine.playClick();
                            setDraft((d) => ({ ...d, outfitColor: item.color }));
                          }}
                          className={`w-7 h-7 rounded-lg border-2 cursor-pointer transition-transform ${
                            draft.outfitColor.toLowerCase() === item.color.toLowerCase()
                              ? 'border-slate-900 scale-110 shadow-sm'
                              : 'border-white shadow-xs hover:scale-105'
                          }`}
                          style={{ backgroundColor: item.color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-1.5">Màu da</div>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_SKIN_TONES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          title={item.label}
                          onClick={() => {
                            soundEngine.playClick();
                            setDraft((d) => ({ ...d, skinColor: item.color }));
                          }}
                          className={`w-7 h-7 rounded-lg border-2 cursor-pointer transition-transform ${
                            draft.skinColor.toLowerCase() === item.color.toLowerCase()
                              ? 'border-slate-900 scale-110 shadow-sm'
                              : 'border-white shadow-xs hover:scale-105'
                          }`}
                          style={{ backgroundColor: item.color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hair Style + Hair Color */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700">Kiểu tóc & màu tóc</span>
                    <div className="flex gap-1.5">
                      {AVATAR_HAIR_COLORS.map((hc) => (
                        <button
                          key={hc.id}
                          type="button"
                          title={hc.label}
                          onClick={() => {
                            soundEngine.playClick();
                            setDraft((d) => ({ ...d, hairColor: hc.color }));
                          }}
                          className={`w-5 h-5 rounded-md border-2 cursor-pointer ${
                            draft.hairColor.toLowerCase() === hc.color.toLowerCase()
                              ? 'border-slate-900 scale-110'
                              : 'border-white'
                          }`}
                          style={{ backgroundColor: hc.color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {AVATAR_HAIR_STYLES.map((hs) => (
                      <button
                        key={hs.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setDraft((d) => ({ ...d, hairStyle: hs.id }));
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer whitespace-nowrap ${
                          draft.hairStyle === hs.id
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-slate-700 border-[#e5dec9] hover:bg-amber-50'
                        }`}
                      >
                        {hs.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hat Style */}
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-1.5">Mũ & phụ kiện đầu</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {AVATAR_HAT_STYLES.map((hat) => (
                      <button
                        key={hat.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setDraft((d) => ({ ...d, hatStyle: hat.id }));
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer whitespace-nowrap ${
                          draft.hatStyle === hat.id
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-[#e5dec9] hover:bg-emerald-50'
                        }`}
                      >
                        {hat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Glasses & Backpack */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-1.5">Kính mắt</div>
                    <div className="flex flex-col gap-1.5">
                      {AVATAR_GLASSES_STYLES.map((gl) => (
                        <button
                          key={gl.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setDraft((d) => ({ ...d, glassesStyle: gl.id }));
                          }}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border text-left cursor-pointer ${
                            draft.glassesStyle === gl.id
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-white text-slate-700 border-[#e5dec9] hover:bg-sky-50'
                          }`}
                        >
                          {gl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-1.5">Phụ kiện lưng</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AVATAR_BACKPACK_STYLES.map((bp) => (
                        <button
                          key={bp.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            setDraft((d) => ({ ...d, backpackStyle: bp.id }));
                          }}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                            draft.backpackStyle === bp.id
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-white text-slate-700 border-[#e5dec9] hover:bg-violet-50'
                          }`}
                        >
                          {bp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div className="max-w-md mx-auto space-y-4 py-2">
              {/* Master Mute */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-[#e5dec9]">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      audioSettings.muted ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {audioSettings.muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Âm thanh tổng</div>
                    <div className="text-xs text-slate-500">
                      {audioSettings.muted ? 'Đang tắt toàn bộ âm thanh' : 'Đang bật nhạc nền & hiệu ứng'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeAudio({ muted: !audioSettings.muted })}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    audioSettings.muted
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  }`}
                >
                  {audioSettings.muted ? 'Bật lại' : 'Tắt tất cả'}
                </button>
              </div>

              {/* Background Music Volume */}
              <div className="p-4 rounded-2xl bg-white border border-[#e5dec9] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-sky-600" />
                    <span className="text-sm font-bold text-slate-900">Nhạc nền nông trại</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-num text-xs font-bold text-sky-700 w-10 text-right">
                      {Math.round(audioSettings.musicVolume * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeAudio({ musicEnabled: !audioSettings.musicEnabled })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        audioSettings.musicEnabled
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {audioSettings.musicEnabled ? 'Đang bật' : 'Đang tắt'}
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(audioSettings.musicVolume * 100)}
                  onChange={(e) => onChangeAudio({ musicVolume: Number(e.target.value) / 100, musicEnabled: true })}
                  className="w-full accent-sky-600 cursor-pointer"
                  aria-label="Âm lượng nhạc nền"
                />
              </div>

              {/* SFX Volume */}
              <div className="p-4 rounded-2xl bg-white border border-[#e5dec9] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-slate-900">Hiệu ứng (Bước chân, Toán, Thú)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-num text-xs font-bold text-amber-700 w-10 text-right">
                      {Math.round(audioSettings.sfxVolume * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeAudio({ sfxEnabled: !audioSettings.sfxEnabled })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                        audioSettings.sfxEnabled
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {audioSettings.sfxEnabled ? 'Đang bật' : 'Đang tắt'}
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(audioSettings.sfxVolume * 100)}
                  onChange={(e) => onChangeAudio({ sfxVolume: Number(e.target.value) / 100, sfxEnabled: true })}
                  className="w-full accent-amber-500 cursor-pointer"
                  aria-label="Âm lượng hiệu ứng"
                />
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.unlock();
                      soundEngine.playCelebrate();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold cursor-pointer"
                  >
                    Nghe thử hiệu ứng
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'system' && (
            <div className="max-w-sm mx-auto space-y-3 py-1 text-center">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2.5">
                <UserCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-bold text-slate-900">{profile.name}</div>
                  <div className="text-xs font-mono-num text-emerald-800">
                    {profile.username ? `@${profile.username}` : 'Tài khoản đã lưu trên máy chủ'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Tiếp Tục Chơi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onRefreshOrbs();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Làm Mới Quả Cầu Toán Học</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onResetCamera();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Đặt Lại Góc Nhìn Camera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onBackToTitle();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Về Màn Hình Chính</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng Xuất / Đổi Tài Khoản</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
