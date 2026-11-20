/**
 * Düşman niyeti: savaş motorunun gerçek eylem planı (saf mantık, Phaser'dan bağımsız).
 * Plan, düşmanın bir sonraki eylemi için BİR KEZ rastgele seçilir; eylem gerçekleşene (ya da faz
 * değişip yeniden planlanana) kadar sabit kalır. Gösterge ve gerçek eylem aynı plandan beslenir.
 */

export type EnemyActionKind =
  | 'attack' // normal saldırı
  | 'heavy' // ağır saldırı (boss)
  | 'freeze_tiles' // Buz Kraliçesi: ağır saldırı + 2 taş dondurur
  | 'drain' // Gölge İblisi: ağır saldırı + can çalar
  | 'breath'; // Cehennem Ejderhası: ağır saldırı + nefes

export interface EnemyAction {
  kind: EnemyActionKind;
  /** Hasar çarpanı (normal 1, ağır saldırılar 1.25) */
  power: number;
}

/** Boss'ların ağır saldırı seçme olasılığı (savaş motorundaki mevcut değer). */
export const HEAVY_CHANCE = 0.45;
export const HEAVY_POWER = 1.25;

const HEAVY_KIND_BY_BOSS: Record<string, EnemyActionKind> = {
  frost_queen: 'freeze_tiles',
  shadow_demon: 'drain',
  infernal_dragon: 'breath',
};

/** Bir sonraki eylemi planlar. Boss'lar %45 ihtimalle ağır saldırı yapar; diğer düşmanlar hep normal saldırır. */
export function planEnemyAction(
  enemy: { isBoss: boolean; bossId?: string },
  rand: () => number = Math.random
): EnemyAction {
  if (enemy.isBoss && rand() < HEAVY_CHANCE) {
    return { kind: HEAVY_KIND_BY_BOSS[enemy.bossId ?? ''] ?? 'heavy', power: HEAVY_POWER };
  }
  return { kind: 'attack', power: 1 };
}

export const ACTION_LABELS: Record<EnemyActionKind, string> = {
  attack: 'Saldırı',
  heavy: 'Ağır saldırı',
  freeze_tiles: 'Taş dondurma',
  drain: 'Can çalma',
  breath: 'Ejderha nefesi',
};

export type IntentIcon = 'attack' | 'heavy' | 'freeze_tiles' | 'drain' | 'breath' | 'frozen' | 'stagger' | 'shield';

export interface IntentView {
  icon: IntentIcon;
  /** Ekranda görünen metin, ör. "Ağır saldırı · 2 tur sonra" */
  text: string;
  status: 'action' | 'frozen' | 'stagger';
  /** Eylem bu tur sonunda (ya da şimdi) gerçekleşiyor: vurgu animasyonu için */
  urgent: boolean;
  /** Eyleme (ya da durumun bitmesine) kalan tur */
  turns: number;
}

export interface IntentInput {
  action: EnemyAction;
  /** Saldırı sayacı: eylem bu kadar oyuncu turu sonra gerçekleşir (0 = şimdi) */
  turnsLeft: number;
  frozenTurns: number;
  staggerTurns: number;
}

/** Plan + durum etkilerinden ekranda gösterilecek niyeti üretir. Donmuş/sersem düşman eylem yapmaz. */
export function describeIntent(input: IntentInput): IntentView {
  if (input.frozenTurns > 0) {
    return { icon: 'frozen', text: `Donmuş · ${input.frozenTurns} tur`, status: 'frozen', urgent: false, turns: input.frozenTurns };
  }
  if (input.staggerTurns > 0) {
    return { icon: 'stagger', text: `Sersem · ${input.staggerTurns} tur`, status: 'stagger', urgent: false, turns: input.staggerTurns };
  }
  const label = ACTION_LABELS[input.action.kind];
  const turns = Math.max(0, input.turnsLeft);
  return {
    icon: input.action.kind,
    text: turns === 0 ? `${label} · Şimdi` : `${label} · ${turns} tur sonra`,
    status: 'action',
    urgent: turns <= 1,
    turns,
  };
}

const PHASE_NAMES: Record<string, Record<number, string>> = {
  forest_guardian: { 2: 'Kök Kalkanı' },
  frost_queen: { 2: 'Buz Bariyeri' },
  infernal_dragon: { 2: 'Kanatlı Öfke' },
  crystal_titan: { 2: 'Kristal Zırh' },
  abyssal_king: { 2: 'Yıldırım Zayıflığı', 3: 'Kıyamet Öfkesi' },
};

/** Boss fazı değişince gösterilen kısa bildirim metni. */
export function phaseNoticeText(opts: {
  bossId?: string;
  phase: number;
  enragedOnly?: boolean;
  newWeaknessName?: string;
}): string {
  if (opts.enragedOnly) return 'Öfke · Saldırı hızı arttı';
  const named = PHASE_NAMES[opts.bossId ?? '']?.[opts.phase];
  if (named) return `Faz ${opts.phase} · ${named}`;
  return opts.newWeaknessName
    ? `Faz ${opts.phase} · Yeni zayıflık: ${opts.newWeaknessName}`
    : `Faz ${opts.phase}`;
}
