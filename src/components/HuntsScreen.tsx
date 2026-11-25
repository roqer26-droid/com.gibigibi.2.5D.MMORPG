import { accountBonusOf } from '../data/titles';
import { ArrowLeft, Check, Coins, Flame, Gem, Heart, Lock, Snowflake, Swords, Trophy, Wind } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  HUNT_DIFFICULTIES,
  HUNT_DIFFICULTY_IDS,
  defaultDifficulty,
  huntBossStats,
  huntRewardPreview,
  isDifficultyUnlocked,
  type HuntDifficulty,
} from '../data/huntScaling';
import { RARITY_META } from '../data/skills';
import { HERO_CLASSES } from '../data/classes';
import { MaterialIcon } from './MaterialIcon';
import { HUNTS, getHunt, getHuntRuleLines, isHuntUnlocked, type HuntDef, type HuntRuleLine } from '../data/hunts';
import { findStageById } from '../data/world';
import type { GameSaveState, HuntId } from '../types/game';
import { BossPortrait } from './BossPortrait';

interface HuntsScreenProps {
  save: GameSaveState;
  /** Açık detay ekranı; null ise liste gösterilir */
  selectedId: HuntId | null;
  onSelect: (id: HuntId | null) => void;
  onBack: () => void;
  onStart: (hunt: HuntDef, difficulty: HuntDifficulty) => void;
}

const RULE_ICONS: Record<HuntRuleLine['icon'], typeof Flame> = {
  flame: Flame,
  snowflake: Snowflake,
  wind: Wind,
};

const RULE_ICON_COLORS: Record<HuntRuleLine['icon'], string> = {
  flame: 'text-orange-400',
  snowflake: 'text-sky-300',
  wind: 'text-slate-300',
};

function cardStyle(accent: string): React.CSSProperties {
  return {
    background: `linear-gradient(155deg, ${accent}2e 0%, #0b1020 72%)`,
    borderColor: `${accent}77`,
  };
}

export function HuntsScreen({ save, selectedId, onSelect, onBack, onStart }: HuntsScreenProps) {
  const detail = selectedId ? getHunt(selectedId) : null;
  const detailUnlocked = detail ? isHuntUnlocked(save, detail) : false;

  return (
    <div className="flex h-full flex-col bg-[#060912]">
      <header className="flex items-center gap-3 border-b border-amber-500/40 bg-[#050810] px-4 py-3">
        <button
          type="button"
          onClick={() => (detail ? onSelect(null) : onBack())}
          className="flex min-h-[48px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-[15px] font-bold text-slate-100 hover:border-amber-400/50"
        >
          <ArrowLeft className="h-4 w-4" /> Geri
        </button>
        <h1 className="font-display text-[24px] font-bold text-amber-300">Boss Avları</h1>
      </header>

      {detail && detailUnlocked ? (
        <HuntDetail hunt={detail} save={save} onStart={onStart} />
      ) : (
        <HuntList save={save} onSelect={onSelect} />
      )}
    </div>
  );
}

function bossOf(hunt: HuntDef) {
  return findStageById(hunt.storyStageId)!.stage;
}

function HuntList({ save, onSelect }: { save: GameSaveState; onSelect: (id: HuntId) => void }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
      <div className="mx-auto flex max-w-xl flex-col gap-3">
        <p className="text-[15px] leading-relaxed text-slate-400">
          Hikâyede yendiğin bosslara arenalarında yeniden meydan oku. Boss, ava giren kahramanın gücüne göre güçlenir; her zafer ödül verir. Normal → Zor → Kâbus kademelerini sırayla aç.
        </p>
        {HUNTS.map((hunt) => {
          const unlocked = isHuntUnlocked(save, hunt);
          const rec = save.huntRecords[hunt.id];
          const stage = bossOf(hunt);
          return (
            <button
              key={hunt.id}
              type="button"
              disabled={!unlocked}
              aria-label={unlocked ? `${hunt.arenaName}: ${hunt.bossName} avı` : `${hunt.arenaName} kilitli. ${hunt.unlockText}`}
              onClick={() => onSelect(hunt.id)}
              className="flex min-h-[144px] w-full items-center gap-3 rounded-3xl border-2 p-3 text-left transition enabled:active:scale-[0.99] disabled:cursor-not-allowed"
              style={unlocked ? cardStyle(hunt.accent) : { background: '#0b0f1a', borderColor: '#1e293b' }}
            >
              <div className="relative shrink-0">
                <BossPortrait enemy={stage.enemy} size={104} dimmed={!unlocked} />
                {!unlocked && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Lock className="h-8 w-8 text-slate-300" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[16px] font-bold" style={{ color: unlocked ? hunt.accent : '#64748b' }}>
                  {hunt.arenaName}
                </div>
                <div className={`font-display text-[21px] font-bold leading-tight ${unlocked ? 'text-[#fff3d0]' : 'text-slate-500'}`}>
                  {hunt.bossName}
                </div>
                {unlocked ? (
                  <div className="mt-2 space-y-0.5 text-[15px] text-slate-300">
                    <div className="flex flex-wrap items-center gap-1.5" data-testid={`hunt-cleared-${hunt.id}`}>
                      {HUNT_DIFFICULTY_IDS.map((d) => {
                        const done = (rec.cleared ?? []).includes(d);
                        return (
                          <span key={d} className="rounded-full border px-2 py-0.5 text-[11px] font-bold" style={{ borderColor: `${HUNT_DIFFICULTIES[d].color}${done ? 'cc' : '44'}`, color: done ? HUNT_DIFFICULTIES[d].color : '#64748b' }}>
                            {done ? '✓ ' : ''}{HUNT_DIFFICULTIES[d].name}
                          </span>
                        );
                      })}
                    </div>
                    <div className="text-[13px] text-slate-500">
                      {rec.firstRewardClaimed ? 'İlk zafer ödülü alındı' : `İlk zafer: ${hunt.firstReward.gold.toLocaleString('tr-TR')} altın · ${hunt.firstReward.crystals} kristal`}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5 text-[15px] text-slate-300">
                    <span className="font-bold text-slate-200">Kilitli · </span>
                    {hunt.unlockText}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HuntDetail({ hunt, save, onStart }: { hunt: HuntDef; save: GameSaveState; onStart: (h: HuntDef, d: HuntDifficulty) => void }) {
  const stage = useMemo(() => bossOf(hunt), [hunt]);
  const rec = save.huntRecords[hunt.id];
  const lines = getHuntRuleLines(hunt, stage.enemy.attackInterval);
  const [diff, setDiff] = useState<HuntDifficulty>(() => defaultDifficulty(save, hunt.id));
  const hero = save.heroes[save.activeHeroClass];
  const boss = useMemo(() => huntBossStats(hunt.id, diff, hero, accountBonusOf(save)), [hunt.id, diff, hero, save.titles]);
  const reward = huntRewardPreview(diff, hero.level);
  const D = HUNT_DIFFICULTIES[diff];
  const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2).replace('.', ',')} Mn` : n >= 1e4 ? `${Math.round(n / 1e3)} B` : n.toLocaleString('tr-TR'));

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          <section className="rounded-3xl border-2 p-4" style={cardStyle(hunt.accent)}>
            <div className="flex justify-center">
              <BossPortrait enemy={stage.enemy} size={232} />
            </div>
            <div className="mt-2 font-display text-[18px] font-bold" style={{ color: hunt.accent }}>
              {hunt.arenaName}
            </div>
            <h2 className="font-display text-[30px] font-bold leading-tight text-[#fff3d0]">{hunt.bossName}</h2>
          </section>

          <section className="rounded-3xl border-2 border-slate-700/80 bg-[#0c1222] p-3" data-testid="hunt-difficulty">
            <div className="grid grid-cols-3 gap-2">
              {HUNT_DIFFICULTY_IDS.map((d) => {
                const def = HUNT_DIFFICULTIES[d];
                const open = isDifficultyUnlocked(save, hunt.id, d);
                const sel = d === diff;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={!open}
                    onClick={() => setDiff(d)}
                    data-testid={`hunt-diff-${d}`}
                    aria-pressed={sel}
                    className="flex min-h-[52px] flex-col items-center justify-center rounded-xl border-2 px-1 text-[15px] font-black transition disabled:cursor-not-allowed disabled:opacity-45"
                    style={{ borderColor: sel ? def.color : `${def.color}44`, background: sel ? `${def.color}22` : 'transparent', color: open ? def.color : '#64748b' }}
                  >
                    <span className="flex items-center gap-1">{!open && <Lock className="h-3.5 w-3.5" />}{def.name}</span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {(rec.cleared ?? []).includes(d) ? `✓ ${rec.best?.[d] ?? '-'} tur` : open ? 'açık' : `${HUNT_DIFFICULTIES[def.requires!].name} zaferi`}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[12px] leading-snug text-slate-400">
              Boss, <strong className="text-slate-200">{HERO_CLASSES[hero.classId].name}</strong> kahramanının gücüne ({boss.power.toLocaleString('tr-TR')}) göre ayarlandı. Kahraman güçlendikçe boss da güçlenir.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[14px] font-bold" data-testid="hunt-boss-stats">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-rose-300"><Heart className="h-4 w-4" /> Can <span className="ml-auto text-slate-100" data-testid="hunt-boss-hp">{fmt(boss.maxHp)}</span></div>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-orange-300"><Swords className="h-4 w-4" /> Saldırı <span className="ml-auto text-slate-100" data-testid="hunt-boss-atk">{fmt(boss.attack)}</span></div>
            </div>
          </section>

          <section className="rounded-3xl border-2 border-slate-700/80 bg-[#0c1222] p-4">
            <h3 className="sr-only">Av kuralı</h3>
            <ul className="space-y-3">
              {lines.map((line) => {
                const Icon = RULE_ICONS[line.icon];
                return (
                  <li key={line.text} className="flex items-start gap-3">
                    <Icon className={`mt-0.5 h-7 w-7 shrink-0 ${RULE_ICON_COLORS[line.icon]}`} />
                    <div className="min-w-0">
                      <div className="text-[18px] font-bold leading-snug text-slate-50">{line.text}</div>
                      {line.note && <div className="text-[15px] text-slate-400">{line.note}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-3xl border-2 bg-[#0c1222] p-4" style={{ borderColor: `${D.color}55` }} data-testid="hunt-reward-preview">
            <div className="text-[15px] font-semibold text-slate-400">Her zafer ödülü · {D.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-display text-[22px] font-bold text-amber-300">
              <span className="inline-flex items-center gap-1.5"><Coins className="h-5 w-5" /> {reward.gold.toLocaleString('tr-TR')}</span>
              <span className="inline-flex items-center gap-1.5 text-sky-300"><Gem className="h-5 w-5" /> {reward.crystals}</span>
            </div>
            <div className="mt-1 text-[14px] text-slate-300">
              %{Math.round(reward.itemChance * 100)} şansla <span style={{ color: RARITY_META[reward.itemRarity].color }} className="font-bold">{RARITY_META[reward.itemRarity].label}</span> ekipman (Sv.{Math.min(50, hero.level)})
              {reward.essenceChance > 0 && (
                <span className="mt-0.5 flex items-center gap-1 font-bold text-amber-200"><MaterialIcon id="divineEssence" size={14} /> %{Math.round(reward.essenceChance * 100)} şansla İlahi Öz</span>
              )}
            </div>
          </section>

          <section className="rounded-3xl border-2 border-slate-700/80 bg-[#0c1222] p-4">
            <div className="text-[15px] font-semibold text-slate-400">İlk zafer ödülü (bir kez)</div>
            {rec.firstRewardClaimed ? (
              <div className="mt-1 flex items-center gap-2 text-[18px] font-bold text-emerald-300">
                <Check className="h-5 w-5" /> Ödül alındı
              </div>
            ) : (
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-display text-[24px] font-bold text-amber-300">
                <span className="inline-flex items-center gap-1.5"><Coins className="h-6 w-6" /> {hunt.firstReward.gold.toLocaleString('tr-TR')} Altın</span>
                <span className="inline-flex items-center gap-1.5 text-sky-300"><Gem className="h-6 w-6" /> {hunt.firstReward.crystals} Kristal</span>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 border-t border-slate-800 pt-3 text-[15px] text-slate-300">
              <Trophy className="h-4 w-4 text-amber-300" />
              {rec.best?.[diff] ? (
                <span>{D.name} rekoru: <strong className="text-amber-200">{rec.best[diff]} tur</strong> · toplam {rec.wins} zafer</span>
              ) : (
                <span className="text-slate-400">{D.name} kademesinde henüz rekor yok</span>
              )}
            </div>
          </section>
        </div>
      </div>

      <div
        className="border-t border-slate-800 bg-[#060912] px-4 pt-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          type="button"
          onClick={() => onStart(hunt, diff)}
          data-testid="hunt-start"
          className="gold-btn mx-auto flex min-h-[56px] w-full max-w-xl items-center justify-center rounded-2xl font-display text-[21px] font-bold text-slate-950"
        >
          Ava Başla · {D.name}
        </button>
      </div>
    </>
  );
}
