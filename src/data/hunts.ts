import type { BossId, GameSaveState, GemType, HuntId, HuntRecord } from '../types/game';

/** Av özel kuralının türü. Kurallar her oyuncu turunun ilk ateş eşleşmesinde işler. */
export type HuntRuleKind = 'thaw_first_fire' | 'ulti_first_fire';

export interface HuntDef {
  id: HuntId;
  /** Hikâyedeki boss (`StageDef.enemy.bossId`) */
  bossId: BossId;
  /** Avın kullandığı hikâye aşaması (boss savaşı) */
  storyStageId: string;
  /** Arena adı (kart başlığı) */
  arenaName: string;
  bossName: string;
  /** Kart/detay vurgu rengi */
  accent: string;
  rule: { kind: HuntRuleKind; amount: number };
  /** Kilitli kartta gösterilen açılma şartı */
  unlockText: string;
  firstReward: { gold: number; crystals: number };
}

export const HUNTS: HuntDef[] = [
  {
    id: 'frozen_throne',
    bossId: 'frost_queen',
    storyStageId: 'mountains_5',
    arenaName: 'Donmuş Taht',
    bossName: 'Buz Kraliçesi',
    accent: '#38bdf8',
    rule: { kind: 'thaw_first_fire', amount: 1 },
    unlockText: 'Hikâyede Buz Kraliçesi’ni yen',
    firstReward: { gold: 800, crystals: 10 },
  },
  {
    id: 'ash_arena',
    bossId: 'infernal_dragon',
    storyStageId: 'volcano_5',
    arenaName: 'Kül Arenası',
    bossName: 'Cehennem Ejderhası',
    accent: '#fb923c',
    rule: { kind: 'ulti_first_fire', amount: 5 },
    unlockText: 'Hikâyede Cehennem Ejderhası’nı yen',
    firstReward: { gold: 1200, crystals: 15 },
  },
];

export const HUNT_IDS: HuntId[] = HUNTS.map((h) => h.id);

export function getHunt(id: HuntId): HuntDef {
  return HUNTS.find((h) => h.id === id)!;
}

export function emptyHuntRecord(): HuntRecord {
  return { bestTurns: null, wins: 0, firstRewardClaimed: false };
}

export function createHuntRecords(): Record<HuntId, HuntRecord> {
  return { frozen_throne: emptyHuntRecord(), ash_arena: emptyHuntRecord() };
}

/**
 * Av, ilgili boss hikâyede yenildiğinde açılır. Eski kayıtlarda `bossVictories` boşsa bile
 * boss aşamasının tamamlanmış olması yeterlidir.
 */
export function isHuntUnlocked(
  save: Pick<GameSaveState, 'bossVictories' | 'completedStages'>,
  hunt: HuntDef
): boolean {
  return save.bossVictories.includes(hunt.bossId) || save.completedStages.includes(hunt.storyStageId);
}

export interface HuntRuleLine {
  icon: 'flame' | 'snowflake' | 'wind';
  text: string;
  note?: string;
}

/** Detay ekranındaki kural satırları. `attackInterval`: boss'un saldırı aralığı (tur). */
export function getHuntRuleLines(hunt: HuntDef, attackInterval: number): HuntRuleLine[] {
  const note = 'Her turun ilk ateş eşleşmesi · zincirde tekrar etmez';
  if (hunt.rule.kind === 'thaw_first_fire') {
    return [
      { icon: 'flame', text: `Ateş eşleşmesi ${hunt.rule.amount} buzu çözer`, note },
      { icon: 'snowflake', text: 'Buz Bariyeri %55 canda' },
    ];
  }
  return [
    { icon: 'flame', text: `Ateş eşleşmesi +${hunt.rule.amount} ulti enerjisi`, note },
    { icon: 'wind', text: `Nefes saldırısı ${attackInterval} turda bir`, note: `İlk nefes ${attackInterval} tur sonra` },
  ];
}

export interface HuntRuleState {
  /** Bu oyuncu turunda kural zaten tetiklendi mi */
  usedThisTurn: boolean;
}

export interface HuntRuleEffect {
  usedThisTurn: boolean;
  /** Çözülecek donmuş taş sayısı (sahada yoksa 0) */
  thaw: number;
  /** Eklenecek ulti enerjisi */
  ulti: number;
}

/**
 * Bir eşleşme adımında av kuralını uygular. Yalnızca turun ilk ateş eşleşmesi tetikler;
 * sahada donmuş taş yoksa çözme etkisiz kalır ama kural o tur için harcanmış sayılır.
 */
export function resolveHuntFireRule(
  hunt: HuntDef | undefined,
  state: HuntRuleState,
  matched: Partial<Record<GemType, number>>,
  frozenOnBoard: number
): HuntRuleEffect {
  const none = { usedThisTurn: state.usedThisTurn, thaw: 0, ulti: 0 };
  if (!hunt || state.usedThisTurn || (matched.fire ?? 0) <= 0) return none;
  if (hunt.rule.kind === 'thaw_first_fire') {
    return { usedThisTurn: true, thaw: Math.min(hunt.rule.amount, Math.max(0, frozenOnBoard)), ulti: 0 };
  }
  return { usedThisTurn: true, thaw: 0, ulti: hunt.rule.amount };
}
