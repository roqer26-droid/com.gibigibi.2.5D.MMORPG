/**
 * İlk 5 Dünya Haritası aşamasının etkileşimli öğreticisi (saf veri + kurallar).
 * Adımlar gerçek savaşta uygulanır: rehberli hamlelerde savaş sahnesi hazırlanmış bir tahta kurar (yalnızca oyuncu sırası
 * başladığında) ve yalnızca işaretli takasa izin verir; böylece rastgele tahta öğreticiyi kilitleyemez.
 * Metinler oyunun gerçek savaş kurallarından (BattleScene) alınmıştır.
 */
import type { ActiveSkillDef, EnemyDef, GemType, SpecialGemKind } from '../types/game';

export const TUTORIAL_STAGES = ['forest_1', 'forest_2', 'forest_3', 'forest_4', 'forest_5'] as const;
export type TutorialStageId = (typeof TUTORIAL_STAGES)[number];

/** Aşama kimliğine göre öğretici numarası (1–5); öğretici aşaması değilse 0. */
export const tutorialNumber = (stageId: string): number => TUTORIAL_STAGES.indexOf(stageId as TutorialStageId) + 1;

// --- Kayıt --------------------------------------------------------------------

export interface TutorialSave {
  /** Tamamlanan ya da atlanan öğreticiler (1–5) */
  done: number[];
}

export const emptyTutorialSave = (): TutorialSave => ({ done: [] });

export function sanitizeTutorials(value: unknown): TutorialSave {
  const v = value && typeof value === 'object' ? (value as { done?: unknown }) : {};
  const done = Array.isArray(v.done) ? v.done.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 5) : [];
  return { done: Array.from(new Set(done)).sort((a, b) => a - b) };
}

/** Eski kayıtlar: daha önce geçilen aşamaların öğreticisi açılmaz (bir kez, kayıt geçişinde). */
export function tutorialsForExistingProgress(completedStages: readonly string[]): TutorialSave {
  return { done: TUTORIAL_STAGES.map((id, i) => (completedStages.includes(id) ? i + 1 : 0)).filter((n) => n > 0) };
}

export function shouldShowTutorial(save: { tutorials?: TutorialSave }, stageId: string): boolean {
  const n = tutorialNumber(stageId);
  return n > 0 && !(save.tutorials?.done ?? []).includes(n);
}

export const markTutorialDone = (t: TutorialSave | undefined, n: number): TutorialSave => sanitizeTutorials({ done: [...(t?.done ?? []), n] });

// --- Tahta ---------------------------------------------------------------------

export type Cell = [number, number];
export interface BoardCell {
  type: GemType;
  special: SpecialGemKind;
}
export interface TutorialMove {
  /** Hazır tahta (8×8) */
  board: BoardCell[][];
  /** Vurgulanan hücreler */
  cells: Cell[];
  from: Cell;
  to: Cell;
}

const LETTER: Record<string, GemType> = { F: 'fire', I: 'frost', N: 'nature', L: 'lightning', A: 'arcane', G: 'golden' };
const SPECIAL: Record<string, SpecialGemKind> = { h: 'line_h', v: 'line_v', n: 'nova', p: 'prismatic' };
const FILL = ['F', 'I', 'N', 'L', 'A'];

/** Eşleşmesiz dolgu deseni + belirtilen hücreler ("r,c": "F" ya da "Fv" = ateş + dikey çizgi taşı). */
export function makeBoard(over: Record<string, string>): BoardCell[][] {
  const out: BoardCell[][] = [];
  for (let r = 0; r < 8; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < 8; c++) {
      const code = over[`${r},${c}`] ?? FILL[(r * 2 + c) % 5];
      row.push({ type: LETTER[code[0]], special: code[1] ? SPECIAL[code[1]] : 'none' });
    }
    out.push(row);
  }
  return out;
}

const GEM_LETTER: Record<GemType, string> = { fire: 'F', frost: 'I', nature: 'N', lightning: 'L', arcane: 'A', golden: 'G' };

/** Yatay 3'lü: (r, c..c+2) türünde; c+2'deki taş bir üst satırdan aşağı kaydırılarak tamamlanır. */
function horizontalThree(gem: GemType, r = 6, c = 2): TutorialMove {
  const t = GEM_LETTER[gem];
  const over: Record<string, string> = { [`${r},${c}`]: t, [`${r},${c + 1}`]: t, [`${r - 1},${c + 2}`]: t };
  // hedef hücre ve çevresi farklı türde kalsın
  over[`${r},${c + 2}`] = differentFrom(t, 0);
  over[`${r - 1},${c + 1}`] = differentFrom(t, 1);
  over[`${r - 1},${c + 3}`] = differentFrom(t, 2);
  if (c > 0) over[`${r},${c - 1}`] = differentFrom(t, 3);
  return { board: makeBoard(over), cells: [[r, c], [r, c + 1], [r - 1, c + 2]], from: [r - 1, c + 2], to: [r, c + 2] };
}

/** Dikey 3'lü: (r..r+2, c) türünde; r+2'deki taş sağdan sola kaydırılarak tamamlanır. */
function verticalThree(gem: GemType, r = 3, c = 3): TutorialMove {
  const t = GEM_LETTER[gem];
  const over: Record<string, string> = { [`${r},${c}`]: t, [`${r + 1},${c}`]: t, [`${r + 2},${c + 1}`]: t };
  over[`${r + 2},${c}`] = differentFrom(t, 0);
  over[`${r + 1},${c + 1}`] = differentFrom(t, 1);
  over[`${r + 3},${c + 1}`] = differentFrom(t, 2);
  if (r > 0) over[`${r - 1},${c}`] = differentFrom(t, 3);
  return { board: makeBoard(over), cells: [[r, c], [r + 1, c], [r + 2, c + 1]], from: [r + 2, c + 1], to: [r + 2, c] };
}

function differentFrom(t: string, k: number): string {
  const opts = FILL.filter((x) => x !== t);
  return opts[k % opts.length];
}

// --- Adımlar ---------------------------------------------------------------------

/** Vurgulanacak arayüz öğesi (`data-tut` ya da `data-testid` seçicisi) */
export type TutorialTarget = string;

export type TutorialStep =
  | { kind: 'info'; title?: string; text: string; target?: TutorialTarget; gems?: GemType[] }
  | { kind: 'move'; text: string; move: TutorialMove; after?: string }
  /** Serbest hamle(ler): belirtilen olay gelene kadar oyuncu istediği gibi oynar */
  | { kind: 'wait'; text: string; until: 'enemyAction' }
  /** Yetenek için mana: mana yetene kadar rehberli buz eşleşmeleri */
  | { kind: 'mana'; text: string; cost: number; skillId: string }
  | { kind: 'skill'; text: string; skillId: string; target: TutorialTarget }
  /** Ulti dolunca (sessiz bekler) kullanım çağrısı */
  | { kind: 'ulti'; text: string; target: TutorialTarget }
  /** Zafer ekranında gösterilir */
  | { kind: 'victory'; text: string; target?: TutorialTarget };

export interface TutorialPlan {
  number: number;
  title: string;
  steps: TutorialStep[];
  /** Bu adıma gelindiğinde öğretici tamamlanmış sayılır (sonrası isteğe bağlı ipucu) */
  doneAt: number;
}

export interface TutorialContext {
  heroName: string;
  classId: string;
  loadout: readonly ActiveSkillDef[];
  ulti: Pick<ActiveSkillDef, 'id' | 'name' | 'description'>;
  enemy: Pick<EnemyDef, 'weakness' | 'resistance' | 'name'>;
}

export const GEM_TEXT: Record<GemType, { name: string; effect: string }> = {
  fire: { name: 'Ateş', effect: 'En yüksek taş hasarı; Savaşçı ve Ejder Kalbi öfke biriktirir' },
  frost: { name: 'Buz', effect: 'Mana kazandırır; 4+ buz düşmanı 1 tur dondurur' },
  nature: { name: 'Doğa', effect: 'Can yeniler ve kalkan verir' },
  lightning: { name: 'Yıldırım', effect: 'Hasar + yüksek kritik şansı' },
  arcane: { name: 'Arkan', effect: 'Savunmayı delen hasar, ulti doldurur' },
  golden: { name: 'Altın', effect: 'Hasar, mana, can ve ulti birden' },
};

const DEFENSIVE: Record<string, string> = {
  natures_blessing: 'iyileştirir ve kalkan verir',
  stone_bulwark: 'güçlü bir kalkan kurar',
  holy_shield: 'kalkan verir ve iyileştirir',
  divine_heal: 'iyileştirir ve kalkan verir',
  rock_bulwark: 'kalkan kurar',
  ice_storm: 'düşmanı dondurarak saldırısını geciktirir',
  frost_lance: 'düşmanı dondurarak saldırısını geciktirir',
  shield_bash: 'düşmanı sersemleterek saldırısını geciktirir',
};

const isGem = (e: string): e is GemType => e in GEM_TEXT;

export function buildTutorial(n: number, ctx: TutorialContext): TutorialPlan | null {
  const cheapest = [...ctx.loadout].sort((a, b) => a.manaCost - b.manaCost)[0];
  switch (n) {
    case 1:
      return {
        number: 1,
        title: 'Temel Savaş',
        doneAt: 5,
        steps: [
          { kind: 'info', title: `Hoş geldin, ${ctx.heroName}!`, text: 'Taşları eşleştirerek savaşırsın. Aynı türden en az 3 taşı yan yana ya da üst üste getir.' },
          { kind: 'move', text: 'Parlayan taşı okla gösterilen yöne kaydır: 3 ateş taşı yan yana gelir ve düşmana saldırırsın.', move: horizontalThree('fire') },
          { kind: 'info', text: 'Düşmanın canı azaldı! Can çubuğu sıfırlanınca zafer senin.', target: '[data-tut="enemy-hp"]' },
          { kind: 'info', text: 'Her hamlen bir turdur. Düşman, göstergedeki tur sayısı dolunca saldırır; sonra sıra yine sende.', target: '[data-testid="enemy-intent"]' },
          { kind: 'move', text: 'Eşleşme dikey de olur. İşaretli taşı kaydırıp 3 doğa taşını üst üste getir.', move: verticalThree('nature') },
          { kind: 'info', text: 'Harika! Savaşı şimdi kendi hamlelerinle tamamla.' },
        ],
      };
    case 2:
      return {
        number: 2,
        title: 'Taş Türleri',
        doneAt: 6,
        steps: [
          { kind: 'info', title: 'Taş türleri', text: 'Her taşın kendi etkisi var:', gems: ['fire', 'frost', 'nature'] },
          { kind: 'info', title: 'Taş türleri', text: 'Diğerleri:', gems: ['lightning', 'arcane', 'golden'] },
          { kind: 'move', text: 'Buz taşları mana kazandırır. Mana yeteneklerini kullanmak içindir: 3 buz taşını eşleştir.', move: horizontalThree('frost') },
          { kind: 'info', text: 'Mana çubuğun doldu. Yetenekler mana harcar; buz taşları onu yeniler.', target: '[data-tut="hero-mana"]' },
          { kind: 'wait', text: 'Düşman saldırısını gör: istediğin bir hamle yap.', until: 'enemyAction' },
          { kind: 'move', text: 'Hasar aldın! Doğa taşları can yeniler ve kalkan verir: 3 doğa taşını eşleştir.', move: horizontalThree('nature', 6, 3) },
          { kind: 'info', text: 'Strateji: hasar için ateş ve zayıflık taşı, yetenek için buz, zor anlarda doğa. Savaşı tamamla!' },
        ],
      };
    case 3:
      return {
        number: 3,
        title: 'Kombolar ve Özel Taşlar',
        doneAt: 7,
        steps: [
          { kind: 'move', text: '2×2 kare de eşleşmedir: işaretli taşı kaydırıp 4 yıldırım taşını kare yap.', move: squareMove() },
          { kind: 'move', text: '4 taşı yan yana getir: özel çizgi taşı oluşur.', move: fourInRow() },
          { kind: 'move', text: 'Özel taş eşleşmeye girince patlar ve bütün bir sırayı temizler. Çizgi taşını eşleştir!', move: triggerLine() },
          { kind: 'move', text: '5 taşı yan yana getir: Prizma taşı oluşur.', move: fiveInRow() },
          { kind: 'move', text: 'Prizma taşını bir taşla yer değiştir: o türdeki bütün taşlar patlar.', move: prismaticSwap() },
          { kind: 'move', text: 'Zincir: patlayan taşların yerine düşenler yeni eşleşme yapar. Kombo sayacı arttıkça hasar büyür.', move: cascadeMove() },
          { kind: 'info', text: 'Her zincir adımı hasarı %28 artırır. Büyük zincirler ve özel taşlarla savaşı bitir!' },
        ],
      };
    case 4: {
      const steps: TutorialStep[] = [
        {
          kind: 'info',
          title: 'Yetenekler',
          text: ctx.loadout.length
            ? `${ctx.heroName}: ${ctx.loadout.map((s) => `${s.name} (${s.manaCost} mana, ${s.cooldown} tur bekleme)`).join(' · ')}`
            : 'Yeteneklerin seviye atladıkça açılır.',
          target: '[data-tut="skill-bar"]',
        },
      ];
      if (cheapest) {
        steps.push({ kind: 'mana', text: `${cheapest.name} için ${cheapest.manaCost} mana gerekli: buz taşlarıyla mana topla.`, cost: cheapest.manaCost, skillId: cheapest.id });
        steps.push({ kind: 'skill', text: `Şimdi ${cheapest.name} yeteneğine dokun.`, skillId: cheapest.id, target: `[data-tut="skill-${cheapest.id}"]` });
        steps.push({ kind: 'info', text: `Kullanılan yetenek ${cheapest.cooldown} tur bekler; düğmedeki sayı kalan turu gösterir.`, target: `[data-tut="skill-${cheapest.id}"]` });
      }
      steps.push({ kind: 'info', title: 'Ulti', text: `Ulti göstergesi arkan taşlarıyla ve hasar aldıkça dolar. Dolunca ${ctx.ulti.name} hazır olur.`, target: '[data-tut="ulti"]' });
      const doneAt = steps.length;
      steps.push({ kind: 'ulti', text: `Ulti hazır! ${ctx.ulti.name} için ULTİ düğmesine dokun.`, target: '[data-tut="ulti"]' });
      return { number: 4, title: 'Yetenekler ve Ulti', doneAt, steps };
    }
    case 5: {
      const weak = ctx.enemy.weakness;
      const steps: TutorialStep[] = [
        { kind: 'info', title: 'Düşman niyeti', text: 'Gösterge düşmanın sıradaki eylemini ve kaç tur sonra yapacağını söyler. Ağır saldırılara hazırlan!', target: '[data-testid="enemy-intent"]' },
        {
          kind: 'info',
          title: 'Zayıflık ve direnç',
          text: `${ctx.enemy.name} ${isGem(weak) ? GEM_TEXT[weak].name.toLocaleLowerCase('tr-TR') : weak} taşlarına zayıf: %45 fazla hasar alır.${ctx.enemy.resistance ? ` Dirençli olduğu türe %28 az hasar verirsin.` : ''}`,
          target: '[data-testid="weakness-btn"]',
        },
      ];
      if (isGem(weak)) steps.push({ kind: 'move', text: 'Zayıflık taşını eşleştir ve farkı gör!', move: horizontalThree(weak) });
      const def = ctx.loadout.find((s) => DEFENSIVE[s.effectType]);
      if (def) {
        steps.push({ kind: 'mana', text: `${def.name} için ${def.manaCost} mana topla.`, cost: def.manaCost, skillId: def.id });
        steps.push({ kind: 'skill', text: `Saldırı yaklaşırken ${def.name} ${DEFENSIVE[def.effectType]}. Şimdi kullan!`, skillId: def.id, target: `[data-tut="skill-${def.id}"]` });
      } else {
        steps.push({ kind: 'move', text: 'Saldırı yaklaşırken doğa taşlarıyla kalkan kur: 3 doğa taşını eşleştir.', move: horizontalThree('nature', 6, 3) });
      }
      steps.push({ kind: 'info', text: 'Bossu yen! Zaferden sonra ustalık yıldızlarını göreceksin.' });
      const doneAt = steps.length;
      steps.push({ kind: 'victory', text: 'Her aşamada 3 yıldız var: zafer + 2 ustalık hedefi. Bölge yıldızları Dünya Haritası’ndaki sandıkları açar.', target: '[data-testid="victory-star-status"]' });
      return { number: 5, title: 'Strateji ve Savunma', doneAt, steps };
    }
    default:
      return null;
  }
}

// --- 3. aşama tahtaları ---------------------------------------------------------------

function squareMove(): TutorialMove {
  // (5,2)(5,3)(6,2) L + (6,4) L → (6,3)'e kaydır: 2×2 kare
  const over = { '5,2': 'L', '5,3': 'L', '6,2': 'L', '6,4': 'L', '6,3': 'F', '7,3': 'A', '5,4': 'N', '7,4': 'I' };
  return { board: makeBoard(over), cells: [[5, 2], [5, 3], [6, 2], [6, 4]], from: [6, 4], to: [6, 3] };
}

function fourInRow(): TutorialMove {
  // satır 6: F F _ F, (5,3) F aşağı
  const over = { '6,1': 'F', '6,2': 'F', '6,4': 'F', '5,3': 'F', '6,3': 'N', '6,5': 'I', '6,0': 'A', '5,2': 'L', '5,4': 'A', '7,3': 'L' };
  return { board: makeBoard(over), cells: [[6, 1], [6, 2], [6, 4], [5, 3]], from: [5, 3], to: [6, 3] };
}

function triggerLine(): TutorialMove {
  // satır 6: F F(dikey çizgi) _ ; (5,4) F aşağı
  const over = { '6,2': 'F', '6,3': 'Fv', '5,4': 'F', '6,4': 'N', '6,5': 'I', '6,1': 'A', '5,3': 'L', '5,5': 'A', '7,4': 'L' };
  return { board: makeBoard(over), cells: [[6, 2], [6, 3], [5, 4]], from: [5, 4], to: [6, 4] };
}

function fiveInRow(): TutorialMove {
  const over = { '6,1': 'A', '6,2': 'A', '6,4': 'A', '6,5': 'A', '5,3': 'A', '6,3': 'N', '6,0': 'F', '6,6': 'I', '5,2': 'L', '5,4': 'F', '7,3': 'L' };
  return { board: makeBoard(over), cells: [[6, 1], [6, 2], [6, 4], [6, 5], [5, 3]], from: [5, 3], to: [6, 3] };
}

function prismaticSwap(): TutorialMove {
  const over = { '6,3': 'Ap', '6,4': 'F' };
  return { board: makeBoard(over), cells: [[6, 3], [6, 4]], from: [6, 3], to: [6, 4] };
}

function cascadeMove(): TutorialMove {
  // 1. eşleşme: satır 7 sütun 2-4 doğa (6,4 → 7,4). Sütunlar 1 satır kayınca satır 7: (7,1)L + düşen (6,2)L (6,3)L → zincir
  const over = { '7,2': 'N', '7,3': 'N', '6,4': 'N', '7,4': 'F', '6,2': 'L', '6,3': 'L', '7,1': 'L', '7,0': 'A', '7,5': 'I', '6,5': 'A', '6,1': 'F', '5,4': 'I' };
  return { board: makeBoard(over), cells: [[7, 2], [7, 3], [6, 4]], from: [6, 4], to: [7, 4] };
}

/** Rehberli buz eşleşmesi (mana adımı). */
export const manaMove = (i: number): TutorialMove => horizontalThree('frost', 6 - (i % 2) * 2, 2 + (i % 3));
