export type GemType = 'fire' | 'frost' | 'nature' | 'lightning' | 'arcane' | 'golden';

export type SpecialGemKind = 'none' | 'line_h' | 'line_v' | 'nova' | 'prismatic';

export interface BoardTile {
  row: number;
  col: number;
  type: GemType;
  special: SpecialGemKind;
  frozen: number; // turns frozen (e.g. by Frost Queen boss!)
  id: number;
}

export type CoreHeroClassId =
  | 'warrior'
  | 'mage'
  | 'ranger'
  | 'paladin'
  | 'necromancer'
  | 'assassin'
  | 'stormcaller'
  | 'dragonheart';

/** Fantastik yaratık kahramanlar — hepsi kilitli başlar */
export type CreatureClassId =
  | 'vampire'
  | 'werewolf'
  | 'fairy'
  | 'kitsune'
  | 'naga'
  | 'siren'
  | 'minotaur'
  | 'golem'
  | 'phoenix'
  | 'djinn'
  | 'demon'
  | 'seraph';

export type HeroClassId = CoreHeroClassId | CreatureClassId;

export type ElementType = 'fire' | 'frost' | 'nature' | 'lightning' | 'arcane' | 'holy' | 'physical';

export type EquipmentSlot =
  | 'helmet'
  | 'chest'
  | 'gloves'
  | 'pants'
  | 'boots'
  | 'weapon'
  | 'offhand'
  | 'necklace'
  | 'ring1'
  | 'ring2';

export type ItemCategory =
  | 'sword'
  | 'axe'
  | 'staff'
  | 'bow'
  | 'dagger'
  | 'scythe'
  | 'spear'
  | 'shield'
  | 'tome'
  | 'quiver'
  | 'skull'
  | 'cloak'
  | 'heavy_armor'
  | 'light_armor'
  | 'magic_armor'
  | 'accessory';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface StatBlock {
  health: number;
  attack: number;
  defense: number;
  critChance: number; // percentage 0 - 100
  critDamage: number; // percentage e.g. 150 = 1.5x
  mana: number;
  dodge: number; // percentage 0 - 100
  elementalDamage: number; // percentage bonus
}

export interface EquipmentVisual {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  variant: 'iron' | 'oak' | 'frost' | 'flame' | 'arcane' | 'shadow' | 'royal' | 'mythic';
}

/** Ekipman seti kimliği (bir eşya en fazla bir setin parçasıdır) */
export type EquipmentSetId = 'ember' | 'glacier' | 'life';

export interface EquipmentItem {
  id: string;
  name: string;
  description: string;
  slot: EquipmentSlot;
  category: ItemCategory;
  rarity: Rarity;
  levelReq: number;
  upgradeLevel: number;
  /** Set parçasıysa seti; eski eşyalarda yoktur (normal ekipman) */
  setId?: EquipmentSetId;
  element: ElementType;
  stats: Partial<StatBlock>;
  specialBonus?: string;
  specialEffect?: {
    type: 'gem_bonus' | 'lifesteal' | 'mana_regen' | 'shield_power' | 'combo_dmg' | 'boss_slayer';
    gem?: GemType;
    value: number;
  };
  sellValue: number;
  visual: EquipmentVisual;
}

export interface SkillTreeNode {
  id: string;
  name: string;
  description: string;
  branch: 'offense' | 'magic' | 'defense';
  tier: 1 | 2 | 3 | 4;
  maxRank: number;
  requires?: string;
  statPerRank?: Partial<StatBlock>;
  passiveEffect?: {
    type:
      | 'fire_dmg'
      | 'frost_mana'
      | 'nature_heal'
      | 'lightning_crit'
      | 'arcane_ulti'
      | 'shield_start'
      | 'combo_boost'
      | 'lifesteal'
      | 'boss_dmg'
      | 'skill_power'
      | 'golden_luck'
      | 'start_mana'
      | 'start_ulti'
      | 'thorns'
      | 'weakness_exploit'
      | 'summon_power'
      | 'bleed_power'
      | 'dodge_counter'
      | 'storm_overload'
      | 'dragon_scale';
    valuePerRank: number;
  };
}

export type SkillEffectType =
  | 'fireball'
  | 'ice_storm'
  | 'lightning_strike'
  | 'natures_blessing'
  | 'arcane_explosion'
  | 'flame_rain'
  | 'frost_lance'
  | 'stone_bulwark'
  | 'thunder_chain'
  | 'venom_bloom'
  | 'holy_judgement'
  | 'shadow_step'
  | 'golden_dragon'
  | 'chrono_shift'
  | 'war_cry'
  | 'chaos_rift'
  | 'shield_bash'
  | 'berserk'
  | 'mana_surge'
  | 'frost_prison'
  | 'multi_shot'
  | 'sniper_mark'
  | 'holy_shield'
  | 'divine_heal'
  | 'soul_drain'
  | 'raise_dead'
  | 'backstab'
  | 'smoke_bomb'
  | 'overcharge'
  | 'static_field'
  | 'dragon_breath'
  | 'dragon_form'
  | 'creature'
  | 'ultimate';

/** Veri güdümlü yetenek efekti (yaratık sınıflarının yetenekleri ve Ulti ekleri) */
export interface SkillFx {
  element: GemType;
  color: number;
  hex: string;
  visual: 'projectile' | 'beam' | 'bolts' | 'shockwave' | 'self';
  sound?: 'fireball' | 'ice_storm' | 'lightning_strike' | 'natures_blessing' | 'arcane_explosion';
  hits?: number;
  crit?: boolean;
  pierce?: boolean;
  flash?: boolean;
  burn?: number;
  poison?: number;
  bleed?: number;
  freeze?: number;
  stagger?: number;
  healPct?: number;
  shieldPct?: number;
  drainPct?: number;
  manaPct?: number;
  ultiGain?: number;
  rage?: number;
  critBuff?: number;
  dodgeBuff?: number;
  summon?: number;
  summonName?: string;
  form?: number;
  convert?: { count: number; types: GemType[] };
  destroy?: number;
  selfDmgPct?: number;
}

export type SkillKind = 'elemental' | 'class' | 'ultimate';

export interface ActiveSkillDef {
  id: string;
  name: string;
  description: string;
  manaCost: number;
  ultiCost?: number;
  cooldown: number; // turns
  element: ElementType;
  iconKey: string;
  powerMultiplier: number;
  effectType: SkillEffectType;
  /** Kahraman seviyesi gereksinimi */
  levelReq?: number;
  /** Sadece belirli sınıflar kullanabilir (tanımsız = tüm sınıflar) */
  classes?: HeroClassId[];
  /** Kullanıldığında tur harcanmaz (ekstra tur) */
  grantsExtraTurn?: boolean;
  kind?: SkillKind;
  /** Veri güdümlü efekt tanımı */
  fx?: SkillFx;
}

export interface HeroClassDef {
  id: HeroClassId;
  name: string;
  title: string;
  roleDesc: string;
  passiveName: string;
  passiveDesc: string;
  preferredWeapons: ItemCategory[];
  preferredArmor: ItemCategory;
  baseStats: StatBlock;
  perLevelStats: Partial<StatBlock>;
  ultimateSkill: ActiveSkillDef;
  skillTree: SkillTreeNode[];
  themeColor: string;
  /** Kahramanı açmak için gereken kaynak (yok = baştan açık) */
  unlockCost?: { gold: number; crystals: number };
  /** Sınıfın görsel imzası (aura, efekt renkleri) */
  accentColor?: string;
  /** Fantastik yaratık sınıfı mı? */
  isCreature?: boolean;
  /** Doğuştan taş yakınlığı (% bonus) */
  gemAffinity?: Partial<Record<GemType, number>>;
  /** Doğuştan pasifler (ComputedHeroBuild.passives alan adlarıyla) */
  innatePassives?: Record<string, number>;
  /** Sınıfın imza ikinci el eşyası */
  offhandCategory?: ItemCategory;
  /** Başlangıç ekipman isimleri */
  starterGear?: {
    weapon: string;
    offhand: string;
    chest: string;
    helmet: string;
    element: ElementType;
  };
}

export type RegionId =
  | 'forest'
  | 'mountains'
  | 'volcano'
  | 'ruins'
  | 'abyss'
  | 'sky'
  | 'ocean'
  | 'desert'
  | 'swamp'
  | 'moonlit'
  | 'crystal_caves'
  | 'ashen'
  | 'astral'
  | 'spirit'
  | 'chaos'
  | 'star_gate'
  | 'time_rift'
  | 'blood_moon'
  | 'iron_inferno'
  | 'eternal_winter'
  | 'dreamscape'
  | 'light_shadow'
  | 'dragon_roost'
  | 'gods_court'
  | 'rebirth'
  | 'cosmic_storm'
  | 'immortality'
  | 'eternity';

export type StageType = 'normal' | 'elite' | 'treasure' | 'boss';

export type BossId =
  | 'forest_guardian'
  | 'frost_queen'
  | 'infernal_dragon'
  | 'crystal_titan'
  | 'shadow_demon'
  | 'abyssal_king'
  | 'forest_lord'
  | 'frost_giant_king'
  | 'magma_empress'
  | 'rune_emperor'
  | 'abyss_empress'
  | 'sky_tyrant'
  | 'sea_leviathan'
  | 'sand_pharaoh'
  | 'swamp_hydra'
  | 'moonlight_matron'
  | 'crystal_sovereign'
  | 'ashen_warlord'
  | 'astral_devourer'
  | 'spirit_reaper'
  | 'chaos_emperor'
  | 'star_matriarch'
  | 'time_warden'
  | 'blood_moon_queen'
  | 'iron_emperor'
  | 'winter_goddess'
  | 'dream_devourer'
  | 'balance_judge'
  | 'dragon_ancestor'
  | 'sky_judge'
  | 'phoenix_queen'
  | 'storm_god'
  | 'immortal_guardian'
  | 'eternity_emperor';

export interface EnemyDef {
  id: string;
  name: string;
  title?: string;
  isBoss: boolean;
  bossId?: BossId;
  regionId: RegionId;
  level: number;
  maxHp: number;
  attack: number;
  defense: number;
  attackInterval: number; // turns between enemy attacks
  weakness: GemType;
  resistance?: GemType;
  abilities: string[];
  visualArchetype:
    | 'goblin'
    | 'wolf'
    | 'treant'
    | 'yeti'
    | 'ice_golem'
    | 'salamander'
    | 'fire_elemental'
    | 'stone_sentinel'
    | 'void_stalker'
    | 'celestial'
    | 'leviathan'
    | 'pharaoh'
    | 'reaper'
    | 'warlord'
    | BossId;
}

export interface StageDef {
  id: string;
  regionId: RegionId;
  stageNumber: number;
  name: string;
  description: string;
  type: StageType;
  recommendedLevel: number;
  enemy: EnemyDef;
  rewards: {
    xp: number;
    gold: number;
    crystals: number;
    guaranteedRarity?: Rarity;
    dropChance: number;
  };
}

export interface RegionDef {
  id: RegionId;
  name: string;
  subtitle: string;
  description: string;
  levelRange: string;
  bgGradient: string;
  accentColor: string;
  stages: StageDef[];
}

export type QuestCategory = 'main' | 'side' | 'daily' | 'weekly' | 'league' | 'achievement';

export type QuestObjectiveType =
  | 'win_battles'
  | 'defeat_boss'
  | 'defeat_bosses'
  | 'stages_cleared'
  | 'match_gem'
  | 'reach_combo'
  | 'upgrade_item'
  | 'reach_level'
  | 'clear_stage'
  | 'use_skills'
  | 'collect_epic'
  | 'make_matches'
  | 'league_battles'
  | 'league_wins'
  | 'league_points'
  | 'league_streak'
  | 'unlock_heroes';

export interface QuestCounters {
  gems: Record<GemType, number>;
  matches: number;
  highestCombo: number;
  wins: number;
  bossWins: number;
  skillsCast: number;
  itemsUpgraded: number;
  leagueBattles: number;
  leagueWins: number;
}

export interface QuestPeriod {
  key: string;
  counters: QuestCounters;
  claimed: string[];
}

export interface LeagueMatchRecord {
  opponentId: string;
  opponentName: string;
  victory: boolean;
  forfeited: boolean;
  pointsChange: number;
  playedAt: number;
}

export interface PendingLeagueReward {
  id: string;
  title: string;
  description: string;
  gold: number;
  crystals: number;
}

export interface LeagueSave {
  seasonKey: string;
  points: number;
  peakPoints: number;
  seasonBattles: number;
  wins: number;
  losses: number;
  streak: number;
  totalBattles: number;
  totalWins: number;
  bestStreak: number;
  highestPoints: number;
  claimedTiers: string[];
  pendingRewards: PendingLeagueReward[];
  history: LeagueMatchRecord[];
}

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  objectiveType: QuestObjectiveType;
  targetGem?: GemType;
  targetBoss?: BossId;
  targetStage?: string;
  targetCount: number;
  rewards: {
    xp: number;
    gold: number;
    crystals: number;
    itemRarity?: Rarity;
  };
}

export interface GameSettings {
  musicVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  muted: boolean;
  screenShake: boolean;
  highParticles: boolean;
}

export interface HeroProgress {
  classId: HeroClassId;
  level: number;
  xp: number;
  skillPoints: number;
  skillRanks: Record<string, number>;
  equipped: Partial<Record<EquipmentSlot, EquipmentItem>>;
}

export type HuntId = 'frozen_throne' | 'ash_arena';

/** Boss Avı kaydı: boss başına en iyi tur sayısı, galibiyet sayısı ve ilk zafer ödülü bilgisi */
export interface HuntRecord {
  bestTurns: number | null;
  wins: number;
  firstRewardClaimed: boolean;
}

export type DungeonId = 'roots_vault';

export type RelicId =
  | 'healing_essence'
  | 'ulti_spark'
  | 'square_bulwark'
  | 'ember_echo'
  | 'frost_flow'
  | 'ready_guardian';

/** Aktif zindan denemesi: kapanıp açılınca buradan devam edilir (savaş ortasında kayıt yoktur). */
export interface DungeonRun {
  runId: string;
  /** Oynanacak (ya da oynanmakta olan) savaşın sırası, 0 tabanlı */
  battle: number;
  /** 'battle': savaş bekliyor/oynanıyor, 'choice': güç seçimi bekliyor */
  phase: 'battle' | 'choice';
  /** Sonraki savaşın BAŞLANGIÇ canı (savaş ortasında kapanırsa savaş bu canla yeniden başlar) */
  hp: number;
  /** Seçilmiş geçici güçler */
  relics: RelicId[];
  /** Seçim bekliyorsa teklif edilen iki güç (kapanıp açılınca aynısı) */
  offer: RelicId[] | null;
  /** Biten savaşların kaydı (zindan ilerlemesi) */
  results: { turns: number; hpAfter: number }[];
  /** Denemeyi başlatan kahraman ve seviyesi (v1.10.1+); eski denemelerde yoktur */
  heroClass?: HeroClassId;
  heroLevel?: number;
  /** Üç düşmanın deneme başında BİR KEZ hesaplanan can/saldırı değerleri; savaş ortasında kapanıp açılınca bunlar kullanılır */
  enemies: { hp: number; attack: number }[];
}

export interface DungeonResult {
  runId: string;
  relics: RelicId[];
  reward: { gold: number; crystals: number };
  results: { turns: number; hpAfter: number }[];
  completedAt: number;
}

export interface DungeonSave {
  active: DungeonRun | null;
  attempts: number;
  completions: number;
  /** Son tamamlanan deneme: sonuç ekranı tekrar açılsa da ödül ikinci kez verilmez */
  last: DungeonResult | null;
}

export interface GameSaveState {
  version: number;
  activeHeroClass: HeroClassId;
  heroes: Record<HeroClassId, HeroProgress>;
  /** Altın/Kristal ile açılan kahramanlar */
  heroUnlocks: HeroClassId[];
  inventory: EquipmentItem[];
  gold: number;
  crystals: number; // Upgrade/Enhancement Crystals
  completedStages: string[];
  bossVictories: BossId[];
  questProgress: Record<string, number>;
  claimedQuests: string[];
  questPeriods: { daily: QuestPeriod; weekly: QuestPeriod };
  league: LeagueSave;
  huntRecords: Record<HuntId, HuntRecord>;
  dungeons: Record<DungeonId, DungeonSave>;
  stats: {
    totalMatches: number;
    totalGemsMatched: Record<GemType, number>;
    highestCombo: number;
    enemiesDefeated: number;
    bossesDefeated: number;
    skillsCast: number;
    itemsUpgraded: number;
  };
  settings: GameSettings;
  lastSavedAt: number;
}

import type { IntentView } from '../game/enemyIntent';

export interface BattleCombatSnapshot {
  heroHp: number;
  heroMaxHp: number;
  heroShield: number;
  heroMana: number;
  heroMaxMana: number;
  heroUlti: number;
  heroMaxUlti: number;
  heroRageStacks: number;
  enemyHp: number;
  enemyMaxHp: number;
  enemyShield: number;
  enemyTurnCounter: number;
  enemyMaxTurnInterval: number;
  enemyFrozenTurns: number;
  enemyBurnTurns: number;
  enemyPoisonTurns: number;
  enemyStaggerTurns: number;
  enemyBleedTurns: number;
  heroCritBuffTurns: number;
  heroDodgeBuffTurns: number;
  summonTurns: number;
  dragonFormTurns: number;
  enemyPhase: number;
  enemyEnraged: boolean;
  enemyWeakness: GemType;
  enemyNextWarning: string;
  /** Düşmanın gerçek eylem planından üretilen niyet (simge + metin + kalan tur) */
  enemyIntent: IntentView;
  /** Boss fazı değişince kısa bildirim; `seq` her yeni bildirimde artar */
  phaseNotice?: { seq: number; text: string };
  comboCount: number;
  turnPhase: 'player' | 'resolving' | 'enemy' | 'victory' | 'defeat';
  skillCooldowns: Record<string, number>;
  turnNumber: number;
  boardHintText?: string;
}

export interface BattleRewardSummary {
  xpGained: number;
  goldGained: number;
  crystalsGained: number;
  droppedItem: EquipmentItem | null;
  leveledUp: boolean;
  newLevel: number;
  leaguePointsChange?: number;
  leaguePoints?: number;
}

export type ScreenRoute =
  | 'menu'
  | 'battle'
  | 'heroes'
  | 'equipment'
  | 'skills'
  | 'world'
  | 'quests'
  | 'league';
