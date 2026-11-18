export type PetCategory = 'land' | 'insect' | 'water';

export type PetSkillId =
  | 'speed_boost'
  | 'bonus_exp'
  | 'item_magnet'
  | 'double_score'
  | 'time_bonus';

export interface PetSkillDef {
  id: PetSkillId;
  unlockLevel: number;
  name: string;
  description: string;
  badgeColor: string;
}

export interface PetCatalogItem {
  id: string;
  name: string;
  category: PetCategory;
  categoryLabel: string;
  unlockCost: number;
  description: string;
  primaryColor: string;
  accentColor: string;
}

export type DecoCategory = 'fence' | 'flora' | 'water' | 'special';
export type DecoTerrain = 'land' | 'water';

export interface DecoCatalogItem {
  id: string;
  name: string;
  category: DecoCategory;
  terrain: DecoTerrain;
  cost: number;
  rare?: boolean;
  description: string;
  previewColor: string;
}

export interface FoodCatalogItem {
  id: string;
  name: string;
  cost: number;
  expGain: number;
  description: string;
  rare?: boolean;
}

export interface PetInstanceState {
  petId: string;
  unlocked: boolean;
  level: number;
  exp: number;
  lastFedDate: string; // YYYY-MM-DD
}

export interface PlacedDecoration {
  instanceId: string;
  decoId: string;
  gridX: number;
  gridZ: number;
  rotation: number; // 0, 1, 2, 3 (x 90 deg)
}

export interface DailyChallengeDef {
  id: string;
  title: string;
  description: string;
  type: 'table_focus' | 'streak' | 'collect_total';
  targetTables?: number[];
  targetCount: number;
  rewardCoins: number;
  rewardTickets: number;
  rewardFoodId?: string;
  rewardDecoId?: string;
}

export interface DailyChallengeProgress {
  challengeId: string;
  progress: number;
  claimed: boolean;
}

export interface DailyGiftReward {
  day: number;
  title: string;
  coins: number;
  tickets: number;
  foodId?: string;
  foodCount?: number;
}

export type HairStyleId = 'short' | 'pigtails' | 'spiky' | 'bob';
export type HatStyleId = 'explorer' | 'crown' | 'bunny_ears' | 'wizard' | 'none';
export type GlassesStyleId = 'none' | 'round' | 'star_shades';
export type BackpackStyleId = 'adventure' | 'wings' | 'rocket' | 'none';

export interface AvatarCustomization {
  skinColor: string;
  outfitColor: string;
  hairStyle: HairStyleId;
  hairColor: string;
  hatStyle: HatStyleId;
  glassesStyle: GlassesStyleId;
  backpackStyle: BackpackStyleId;
}

export interface PlayerProfile {
  id: string;
  username?: string;
  name: string;
  avatarColor: string;
  avatarCustom?: AvatarCustomization;
  coins: number;
  gems: number;
  tickets: number;
  totalScore: number;
  bestStreak: number;
  totalSolved: number;
  activePetId: string;
  pets: Record<string, PetInstanceState>;
  decoInventory: Record<string, number>;
  foodInventory: Record<string, number>;
  placedDecorations: PlacedDecoration[];
  dailyGiftStreak: number;
  lastGiftDate: string;
  dailyDate: string;
  dailyChallenges: DailyChallengeProgress[];
  updatedAt: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatarColor: string;
  totalScore: number;
  bestStreak: number;
  totalSolved: number;
  activePetId: string;
  petLevel: number;
}

export interface MathQuestion {
  id: string;
  a: number;
  b: number;
  answer: number;
  choices: number[];
  isBonus?: boolean;
}

export interface WorldOrb {
  id: string;
  x: number;
  z: number;
  isBonus: boolean;
  tableHint?: number;
}

export interface BattlePlayerState {
  id: string;
  name: string;
  avatarColor: string;
  avatarCustom?: AvatarCustomization;
  petId: string;
  petLevel: number;
  x: number;
  z: number;
  rotY: number;
  score: number;
  combo: number;
  solvedCount: number;
  ready: boolean;
}

export interface BattleRoomState {
  code: string;
  hostId: string;
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  countdown: number;
  timeLeft: number;
  players: BattlePlayerState[];
  orbs: WorldOrb[];
}

export const DEFAULT_AVATAR_CUSTOMIZATION: AvatarCustomization = {
  skinColor: '#ffd5b4',
  outfitColor: '#f97316',
  hairStyle: 'short',
  hairColor: '#451a03',
  hatStyle: 'explorer',
  glassesStyle: 'none',
  backpackStyle: 'adventure',
};

export const AVATAR_SKIN_TONES = [
  { id: 'peach', color: '#ffd5b4', label: 'Sáng hồng' },
  { id: 'warm', color: '#f5c29b', label: 'Ấm áp' },
  { id: 'honey', color: '#e0a370', label: 'Mật ong' },
  { id: 'caramel', color: '#b97b4c', label: 'Nâu sáng' },
];

export const AVATAR_OUTFIT_COLORS = [
  { id: 'orange', color: '#F97316', label: 'Cam năng động' },
  { id: 'sky', color: '#0EA5E9', label: 'Xanh bầu trời' },
  { id: 'emerald', color: '#10B981', label: 'Xanh lá cây' },
  { id: 'rose', color: '#EC4899', label: 'Hồng dâu' },
  { id: 'violet', color: '#8B5CF6', label: 'Tím phép thuật' },
  { id: 'gold', color: '#EAB308', label: 'Vàng nắng' },
];

export const AVATAR_HAIR_COLORS = [
  { id: 'espresso', color: '#3b1d0a', label: 'Nâu đậm' },
  { id: 'black', color: '#1e293b', label: 'Đen tuyền' },
  { id: 'chestnut', color: '#9a3412', label: 'Hạt dẻ' },
  { id: 'blonde', color: '#facc15', label: 'Vàng óng' },
  { id: 'pink', color: '#f472b6', label: 'Hồng kẹo' },
  { id: 'aqua', color: '#06b6d4', label: 'Xanh ngọc' },
];

export const AVATAR_HAIR_STYLES: { id: HairStyleId; label: string }[] = [
  { id: 'short', label: 'Tóc gọn' },
  { id: 'spiky', label: 'Tóc nhím' },
  { id: 'pigtails', label: 'Buộc 2 chùm' },
  { id: 'bob', label: 'Tóc mái ngố' },
];

export const AVATAR_HAT_STYLES: { id: HatStyleId; label: string }[] = [
  { id: 'explorer', label: 'Mũ thám hiểm' },
  { id: 'crown', label: 'Vương miện' },
  { id: 'bunny_ears', label: 'Tai thỏ xinh' },
  { id: 'wizard', label: 'Mũ phù thủy' },
  { id: 'none', label: 'Không đội mũ' },
];

export const AVATAR_GLASSES_STYLES: { id: GlassesStyleId; label: string }[] = [
  { id: 'none', label: 'Không kính' },
  { id: 'round', label: 'Kính tròn' },
  { id: 'star_shades', label: 'Kính râm ngầu' },
];

export const AVATAR_BACKPACK_STYLES: { id: BackpackStyleId; label: string }[] = [
  { id: 'adventure', label: 'Ba lô du lịch' },
  { id: 'wings', label: 'Cánh tiên' },
  { id: 'rocket', label: 'Tên lửa mini' },
  { id: 'none', label: 'Không mang' },
];

export const PET_SKILLS: PetSkillDef[] = [
  {
    id: 'speed_boost',
    unlockLevel: 2,
    name: 'Bước Chân Thần Tốc',
    description: 'Tăng +25% tốc độ di chuyển khi chạy thu thập vật phẩm.',
    badgeColor: '#0EA5E9',
  },
  {
    id: 'bonus_exp',
    unlockLevel: 3,
    name: 'Trí Tuệ Cửu Chương',
    description: 'Nhận thêm +35% điểm kinh nghiệm (EXP) cho mỗi phép tính đúng.',
    badgeColor: '#8B5CF6',
  },
  {
    id: 'item_magnet',
    unlockLevel: 4,
    name: 'Nam Châm Phép Thuật',
    description: 'Tạo vòng hào quang tự động hút quả cầu phép tính ở gần.',
    badgeColor: '#EC4899',
  },
  {
    id: 'double_score',
    unlockLevel: 5,
    name: 'Nhân Đôi Điểm Thưởng',
    description: 'Nhân đôi (×2) Xu Sao và Điểm Xếp Hạng khi giữ chuỗi từ 2 câu đúng.',
    badgeColor: '#F59E0B',
  },
  {
    id: 'time_bonus',
    unlockLevel: 6,
    name: 'Hào Quang Thời Gian',
    description: 'Cộng thêm +5 giây thưởng và +15 điểm khi hoàn thành lượt.',
    badgeColor: '#10B981',
  },
];

export const PET_CATALOG: PetCatalogItem[] = [
  {
    id: 'rabbit',
    name: 'Thỏ Bông Tai Dài',
    category: 'land',
    categoryLabel: 'Thú cưng nông trại',
    unlockCost: 0,
    description: 'Chú thỏ trắng hiền lành luôn nhảy tung tăng bên cạnh bé.',
    primaryColor: '#FFFDF9',
    accentColor: '#FB7185',
  },
  {
    id: 'fox',
    name: 'Cáo Cam Tinh Anh',
    category: 'land',
    categoryLabel: 'Thú cưng nông trại',
    unlockCost: 120,
    description: 'Nhanh nhẹn và lanh lợi, rất giỏi săn sao phép nhân.',
    primaryColor: '#F97316',
    accentColor: '#FEF3C7',
  },
  {
    id: 'turtle',
    name: 'Rùa Ngọc Bích',
    category: 'land',
    categoryLabel: 'Thú cưng nông trại',
    unlockCost: 160,
    description: 'Mai ngọc vững chắc mang lại sự điềm tĩnh khi giải toán.',
    primaryColor: '#10B981',
    accentColor: '#FDE68A',
  },
  {
    id: 'rainbow_beetle',
    name: 'Bọ Cánh Cứng Cầu Vồng',
    category: 'insect',
    categoryLabel: 'Côn trùng độc lạ',
    unlockCost: 190,
    description: 'Loài bọ quý hiếm với lớp vỏ óng ánh bảy sắc cầu vồng.',
    primaryColor: '#6366F1',
    accentColor: '#F43F5E',
  },
  {
    id: 'moon_moth',
    name: 'Bướm Đêm Phát Sáng',
    category: 'insect',
    categoryLabel: 'Côn trùng độc lạ',
    unlockCost: 240,
    description: 'Đôi cánh ánh trăng phát sáng dịu nhẹ quanh nông trại.',
    primaryColor: '#38BDF8',
    accentColor: '#E0F2FE',
  },
  {
    id: 'crystal_dragonfly',
    name: 'Chuồn Chuồn Pha Lê',
    category: 'insect',
    categoryLabel: 'Côn trùng độc lạ',
    unlockCost: 280,
    description: 'Đôi cánh pha lê trong suốt bay lượn cực nhanh trên mặt suối.',
    primaryColor: '#14B8A6',
    accentColor: '#A7F3D0',
  },
  {
    id: 'koi_fish',
    name: 'Cá Koi Thần Kỳ',
    category: 'water',
    categoryLabel: 'Sinh vật ao suối',
    unlockCost: 210,
    description: 'Chú cá Koi may mắn bơi lội uyển chuyển trong dòng suối.',
    primaryColor: '#EF4444',
    accentColor: '#FFFFFF',
  },
  {
    id: 'jade_frog',
    name: 'Ếch Xanh Lá Sen',
    category: 'water',
    categoryLabel: 'Sinh vật ao suối',
    unlockCost: 150,
    description: 'Thích ca hát trên lá súng và cổ vũ bé giải bảng cửu chương.',
    primaryColor: '#22C55E',
    accentColor: '#FACC15',
  },
];

export const DECO_CATALOG: DecoCatalogItem[] = [
  {
    id: 'wooden_fence',
    name: 'Hàng Rào Gỗ Mộc',
    category: 'fence',
    terrain: 'land',
    cost: 40,
    description: 'Hàng rào gỗ thông ấm áp giúp khoanh vùng khu vườn.',
    previewColor: '#B45309',
  },
  {
    id: 'flower_fence',
    name: 'Hàng Rào Hoa Cúc',
    category: 'fence',
    terrain: 'land',
    cost: 75,
    description: 'Hàng rào trắng điểm xuyết những khóm hoa rực rỡ.',
    previewColor: '#F59E0B',
  },
  {
    id: 'apple_tree',
    name: 'Cây Táo Chín Đỏ',
    category: 'flora',
    terrain: 'land',
    cost: 90,
    description: 'Cây táo sum suê bóng mát với những quả táo đỏ mọng.',
    previewColor: '#16A34A',
  },
  {
    id: 'sakura_tree',
    name: 'Cây Hoa Anh Đào',
    category: 'flora',
    terrain: 'land',
    cost: 150,
    description: 'Tán hoa anh đào hồng phấn dịu dàng giữa nông trại.',
    previewColor: '#F472B6',
  },
  {
    id: 'sunflower_patch',
    name: 'Khóm Hướng Dương',
    category: 'flora',
    terrain: 'land',
    cost: 55,
    description: 'Những bông hoa mặt trời luôn hướng về phía ánh nắng.',
    previewColor: '#EAB308',
  },
  {
    id: 'glow_mushroom',
    name: 'Cụm Nấm Phát Sáng',
    category: 'flora',
    terrain: 'land',
    cost: 120,
    description: 'Nấm rừng kỳ thú tỏa ánh sáng lung linh huyền ảo.',
    previewColor: '#06B6D4',
  },
  {
    id: 'windmill_mini',
    name: 'Cối Xay Gió Tí Hon',
    category: 'flora',
    terrain: 'land',
    cost: 220,
    description: 'Cối xay gió gỗ xoay đều theo làn gió thung lũng.',
    previewColor: '#EA580C',
  },
  {
    id: 'wooden_bridge',
    name: 'Cầu Gỗ Bắc Suối',
    category: 'water',
    terrain: 'water',
    cost: 110,
    description: 'Cầu gỗ cong xinh xắn bắc ngang dòng suối trong veo.',
    previewColor: '#92400E',
  },
  {
    id: 'lotus_lantern',
    name: 'Đèn Lồng Hoa Sen',
    category: 'water',
    terrain: 'water',
    cost: 95,
    description: 'Đèn hoa sen hồng nổi trên mặt nước tỏa sáng ấm áp.',
    previewColor: '#FB7185',
  },
  {
    id: 'koi_fountain',
    name: 'Đài Phun Nước Cá Chép',
    category: 'water',
    terrain: 'water',
    cost: 200,
    description: 'Đài phun nước đá điêu khắc chú cá chép phun bọt trắng.',
    previewColor: '#38BDF8',
  },
  {
    id: 'lily_dock',
    name: 'Bến Lá Súng Xanh',
    category: 'water',
    terrain: 'water',
    cost: 80,
    description: 'Bến gỗ nhỏ cùng lá súng tròn làm chỗ nghỉ cho ếch xanh.',
    previewColor: '#22C55E',
  },
  {
    id: 'golden_dragon_statue',
    name: 'Tượng Rồng Nhỏ Vàng',
    category: 'special',
    terrain: 'land',
    cost: 0,
    rare: true,
    description: 'Vật phẩm hiếm chỉ nhận được từ Thử Thách Hàng Ngày.',
    previewColor: '#FBBF24',
  },
  {
    id: 'starlight_arch',
    name: 'Cổng Hoa Sao Lấp Lánh',
    category: 'special',
    terrain: 'land',
    cost: 0,
    rare: true,
    description: 'Cổng vòm phép thuật vinh danh nhà vô địch bảng cửu chương.',
    previewColor: '#A855F7',
  },
];

export const FOOD_CATALOG: FoodCatalogItem[] = [
  {
    id: 'golden_carrot',
    name: 'Cà Rốt Vàng',
    cost: 25,
    expGain: 35,
    description: 'Món khoái khẩu giúp thú cưng tăng +35 EXP ngay lập tức.',
  },
  {
    id: 'nectar_drop',
    name: 'Giọt Mật Hoa Rừng',
    cost: 40,
    expGain: 55,
    description: 'Mật ngọt thiên nhiên giúp thú & côn trùng tăng +55 EXP.',
  },
  {
    id: 'star_cake',
    name: 'Bánh Sao Thần Kỳ',
    cost: 0,
    expGain: 100,
    rare: true,
    description: 'Thức ăn siêu cấp (+100 EXP) nhận từ Quà hoặc Thử Thách Ngày.',
  },
];

export const DAILY_GIFTS: DailyGiftReward[] = [
  { day: 1, title: 'Khởi Đầu Rực Rỡ', coins: 60, tickets: 1, foodId: 'golden_carrot', foodCount: 1 },
  { day: 2, title: 'Bữa Ăn Ngon Lành', coins: 80, tickets: 1, foodId: 'nectar_drop', foodCount: 1 },
  { day: 3, title: 'Túi Xu May Mắn', coins: 120, tickets: 2 },
  { day: 4, title: 'Bánh Sao Thần Kỳ', coins: 100, tickets: 2, foodId: 'star_cake', foodCount: 1 },
  { day: 5, title: 'Vé Đấu Trường Vàng', coins: 150, tickets: 3 },
  { day: 6, title: 'Kho Báu Cửu Chương', coins: 200, tickets: 3, foodId: 'nectar_drop', foodCount: 2 },
  { day: 7, title: 'Quà Siêu Sao Cuối Tuần', coins: 350, tickets: 5, foodId: 'star_cake', foodCount: 2 },
];

export function getExpForNextLevel(level: number): number {
  return 60 + (level - 1) * 45;
}

export function getUnlockedSkills(level: number): PetSkillDef[] {
  return PET_SKILLS.filter((skill) => level >= skill.unlockLevel);
}

export function hasPetSkill(pet: PetInstanceState | undefined, skillId: PetSkillId): boolean {
  if (!pet) return false;
  const def = PET_SKILLS.find((s) => s.id === skillId);
  return def ? pet.level >= def.unlockLevel : false;
}

export function getTodayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyChallengesForDate(dateKey: string): DailyChallengeDef[] {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const tables = [2, 3, 4, 5, 6, 7, 8, 9];
  const t1 = tables[hash % tables.length];
  const t2 = tables[(hash + 3) % tables.length];
  const rareDeco = hash % 2 === 0 ? 'golden_dragon_statue' : 'starlight_arch';

  return [
    {
      id: `daily_table_${dateKey}`,
      title: `Chinh Phục Bảng ${t1} & ${t2}`,
      description: `Giải đúng 8 phép nhân thuộc bảng cửu chương ${t1} hoặc ${t2}.`,
      type: 'table_focus',
      targetTables: [t1, t2],
      targetCount: 8,
      rewardCoins: 140,
      rewardTickets: 2,
      rewardFoodId: 'star_cake',
    },
    {
      id: `daily_streak_${dateKey}`,
      title: 'Chuỗi Tính Nhẩm Siêu Tốc',
      description: 'Đạt chuỗi trả lời đúng 5 phép tính liên tiếp không sai.',
      type: 'streak',
      targetCount: 5,
      rewardCoins: 160,
      rewardTickets: 3,
      rewardFoodId: 'nectar_drop',
    },
    {
      id: `daily_collect_${dateKey}`,
      title: 'Nhà Thám Hiểm Thu Thập',
      description: 'Thu thập và giải đúng tổng cộng 12 quả cầu toán học.',
      type: 'collect_total',
      targetCount: 12,
      rewardCoins: 180,
      rewardTickets: 2,
      rewardDecoId: rareDeco,
    },
  ];
}

/**
 * Defines the winding stream and fish pond across the 28x28 farm grid (-14..14).
 * Used consistently by 3D terrain rendering, koi swimming paths, and drag-drop placement.
 */
export function streamCenterXAtZ(z: number): number {
  return 4.5 + Math.sin(z * 0.24) * 2.2;
}

export function isPondPoint(x: number, z: number): boolean {
  const dx = x - 6.2;
  const dz = z - 4.5;
  return (dx * dx) / 17.5 + (dz * dz) / 13.5 <= 1.0;
}

export function isWaterPoint(x: number, z: number): boolean {
  if (isPondPoint(x, z)) return true;
  const cx = streamCenterXAtZ(z);
  return Math.abs(x - cx) <= 1.65 && Math.abs(z) <= 16;
}

export function isWalkableLandPoint(x: number, z: number): boolean {
  return Math.abs(x) <= 13.2 && Math.abs(z) <= 13.2;
}

export function generateMathQuestion(preferredTables?: number[], isBonus = false): MathQuestion {
  const tables = preferredTables && preferredTables.length > 0 ? preferredTables : [2, 3, 4, 5, 6, 7, 8, 9];
  const a = tables[Math.floor(Math.random() * tables.length)];
  const b = 2 + Math.floor(Math.random() * 8); // 2..9
  const answer = a * b;

  const choiceSet = new Set<number>([answer]);
  while (choiceSet.size < 4) {
    const offsetChoices = [-a, a, -b, b, -2, 2, -1, 1, -10, 10];
    const delta = offsetChoices[Math.floor(Math.random() * offsetChoices.length)];
    const candidate = answer + delta;
    if (candidate > 1 && candidate <= 90 && candidate !== answer) {
      choiceSet.add(candidate);
    }
  }

  const choices = Array.from(choiceSet).sort(() => Math.random() - 0.5);

  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    a,
    b,
    answer,
    choices,
    isBonus,
  };
}
