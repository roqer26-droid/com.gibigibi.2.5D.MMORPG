import { accountBonusOf } from '../data/titles';
import { ArrowLeft, Coins, Flame, Gem, Heart, Leaf, Lock, Shield, Snowflake, Sparkles, Square, Swords, Trophy, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  describeRelicEffect,
  dungeonBattleStage,
  dungeonStartHp,
  dungeonUnlockText,
  getDungeon,
  getRelic,
  isDungeonUnlocked,
  type RelicDef,
} from '../data/dungeons';
import type { DungeonId, GameSaveState, RelicId } from '../types/game';
import { HERO_CLASSES } from '../data/classes';
import { computeHeroBuild } from '../utils/rpgLogic';

interface DungeonScreenProps {
  save: GameSaveState;
  dungeonId: DungeonId;
  /** Az önce boss yenildi: sonuç paneli vurgulu gösterilir */
  justCompleted?: boolean;
  onBack: () => void;
  onStart: () => void;
  onEnterBattle: () => void;
  onChoose: (relic: RelicId) => void;
  onAbandon: () => void;
}

const RELIC_ICONS: Record<RelicDef['icon'], typeof Flame> = {
  leaf: Leaf,
  spark: Zap,
  square: Square,
  flame: Flame,
  snowflake: Snowflake,
  shield: Shield,
};

const RELIC_COLORS: Record<RelicDef['icon'], string> = {
  leaf: '#4ade80',
  spark: '#fde047',
  square: '#c4b5fd',
  flame: '#fb923c',
  snowflake: '#7dd3fc',
  shield: '#86efac',
};

const getEnemyName = (def: ReturnType<typeof getDungeon>, i: number) => dungeonBattleStage(def, i).enemy.name;

export function RelicCard({
  relicId,
  selected,
  onClick,
  compact,
}: {
  relicId: RelicId;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const relic = getRelic(relicId);
  const Icon = RELIC_ICONS[relic.icon];
  const color = RELIC_COLORS[relic.icon];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      data-testid={`relic-${relicId}`}
      aria-pressed={onClick ? !!selected : undefined}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 text-left transition ${compact ? 'p-2.5' : 'min-h-[88px] p-3.5'} ${
        selected ? 'scale-[1.01] shadow-[0_0_22px_rgba(251,191,36,0.35)]' : ''
      }`}
      style={{
        background: `linear-gradient(155deg, ${color}26 0%, #0b1020 78%)`,
        borderColor: selected ? '#fbbf24' : `${color}66`,
      }}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl ${compact ? 'h-10 w-10' : 'h-14 w-14'}`}
        style={{ background: `${color}22`, color }}
      >
        <Icon className={compact ? 'h-5 w-5' : 'h-8 w-8'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[17px] font-bold text-white">{relic.name}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-slate-300">{describeRelicEffect(relic.effect)}</span>
      </span>
      {selected && <span className="shrink-0 text-lg text-amber-300">✓</span>}
    </Tag>
  );
}

export function DungeonScreen({ save, dungeonId, justCompleted, onBack, onStart, onEnterBattle, onChoose, onAbandon }: DungeonScreenProps) {
  const def = getDungeon(dungeonId);
  const d = save.dungeons[dungeonId];
  const run = d.active;
  const unlocked = isDungeonUnlocked(save, def);
  const [picked, setPicked] = useState<RelicId | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const total = def.battles.length;
  const maxHp = computeHeroBuild(save.heroes[save.activeHeroClass], accountBonusOf(save)).stats.health;

  // Yeni teklif (veya yeniden açılış): seçim sıfırlanır
  const offerKey = run?.phase === 'choice' ? `${run.runId}:${run.battle}` : '';
  useEffect(() => setPicked(null), [offerKey]);

  const hp = run ? dungeonStartHp(save, run) : maxHp;
  const battleNo = run ? run.battle + 1 : 1;
  const last = d.last;
  const heroMismatch = !!run?.heroClass && run.heroClass !== save.activeHeroClass;
  const nextEnemy = run?.enemies?.[run.battle];

  return (
    <div className="flex h-full flex-col bg-[#060912]" data-testid="dungeon-screen">
      <header className="flex items-center gap-3 border-b border-amber-500/40 bg-[#050810] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[48px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-[15px] font-bold text-slate-100 hover:border-amber-400/50"
        >
          <ArrowLeft className="h-4 w-4" /> Geri
        </button>
        <h1 className="min-w-0 truncate font-display text-[22px] font-bold text-amber-300">{def.name}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {!unlocked ? (
          <div className="fantasy-panel rounded-2xl p-5 text-center" data-testid="dungeon-locked">
            <Lock className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-2 font-display text-xl font-bold text-white">{def.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{def.subtitle}</p>
            <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/25 px-3 py-2.5 text-sm font-bold text-amber-200">
              Kilidi açmak için: {dungeonUnlockText(save, def)}
            </p>
          </div>
        ) : run && run.phase === 'choice' && run.offer ? (
          <div data-testid="dungeon-choice">
            <div className="text-center">
              <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-[12px] font-extrabold text-emerald-300">
                Savaş {run.battle + 1}/{total} kazanıldı
              </span>
              <h2 className="mt-2 font-display text-2xl font-black text-white">Bir güç seç</h2>
              <p className="mt-1 text-[13px] text-slate-400">Seçtiğin güç hemen etkinleşir ve kalan savaşlarda geçerli olur.</p>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {run.offer.map((id) => (
                <RelicCard key={id} relicId={id} selected={picked === id} onClick={() => setPicked(id)} />
              ))}
            </div>
            <p className="mt-3 text-center text-[12px] text-slate-400">
              Can: <strong className="text-emerald-300">{hp}/{maxHp}</strong>
            </p>
            {heroMismatch && run.heroClass && (
              <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-950/30 px-2.5 py-2 text-[12px] font-bold text-amber-200" data-testid="dungeon-hero-lock">
                Bu deneme {HERO_CLASSES[run.heroClass].name} (Sv. {run.heroLevel}) ile başladı. O kahramanla devam et ya da zindanı bırak.
              </p>
            )}
          </div>
        ) : run ? (
          <div data-testid="dungeon-progress">
            <div className="fantasy-panel rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-black text-white">Savaş {battleNo}/{total}</span>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-300">
                  <Heart className="h-4 w-4" /> {hp}/{maxHp}
                </span>
              </div>
              <div className="mt-2 flex gap-1.5">
                {def.battles.map((_, i) => (
                  <span key={i} className={`h-2 flex-1 rounded-full ${i < run.battle ? 'bg-emerald-400' : i === run.battle ? 'bg-amber-400' : 'bg-slate-700'}`} />
                ))}
              </div>
              <p className="mt-3 text-sm text-slate-300">
                Sıradaki düşman: <strong className="text-amber-300">{getEnemyName(def, run.battle)}</strong>
              </p>
              {nextEnemy && (
                <p className="mt-1 text-[12px] text-slate-400" data-testid="dungeon-enemy-stats">
                  Can {nextEnemy.hp.toLocaleString('tr-TR')} · Saldırı {nextEnemy.attack.toLocaleString('tr-TR')}
                  {run.heroLevel ? ` · Sv. ${run.heroLevel} kahramana göre` : ''}
                </p>
              )}
              {run.battle >= total - 1 && <p className="mt-1 text-[12px] font-bold text-rose-300">Son savaş: boss!</p>}
              {heroMismatch && run.heroClass && (
                <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-950/30 px-2.5 py-2 text-[12px] font-bold text-amber-200" data-testid="dungeon-hero-lock">
                  Bu deneme {HERO_CLASSES[run.heroClass].name} (Sv. {run.heroLevel}) ile başladı. O kahramanla devam et ya da zindanı bırak.
                </p>
              )}
            </div>

            <h3 className="mb-2 mt-4 text-[13px] font-extrabold uppercase tracking-widest text-slate-400">Aktif güçler</h3>
            {run.relics.length === 0 ? (
              <p className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 text-[13px] text-slate-400">
                Henüz güç yok. İlk savaştan sonra iki karttan birini seçeceksin.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {run.relics.map((id) => (
                  <RelicCard key={id} relicId={id} compact />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div data-testid="dungeon-intro">
            {last && (
              <div
                className={`mb-3 rounded-2xl border-2 p-4 ${justCompleted ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'border-slate-700 bg-slate-900/60'}`}
                data-testid="dungeon-result"
              >
                <div className="flex items-center gap-2 font-display text-lg font-black text-amber-300">
                  <Trophy className="h-5 w-5" /> {justCompleted ? 'ZİNDAN TAMAMLANDI!' : 'Son tamamlanan deneme'}
                </div>
                <div className="mt-2 flex items-center gap-4 text-base font-bold">
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <Coins className="h-4 w-4" /> +{last.reward.gold.toLocaleString('tr-TR')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sky-300">
                    <Gem className="h-4 w-4" /> +{last.reward.crystals}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">{justCompleted ? 'ödül verildi' : 'ödül alındı'}</span>
                </div>
                <h3 className="mb-1.5 mt-3 text-[12px] font-extrabold uppercase tracking-widest text-slate-400">Seçtiğin güçler</h3>
                <div className="flex flex-col gap-2">
                  {last.relics.map((id) => (
                    <RelicCard key={id} relicId={id} compact />
                  ))}
                </div>
              </div>
            )}
            <div className="fantasy-panel rounded-2xl p-4">
              <p className="text-sm text-emerald-300">{def.subtitle}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{def.description}</p>
              <ul className="mt-3 space-y-1.5 text-[13px] text-slate-200">
                {def.battles.map((_, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Swords className="h-4 w-4 shrink-0 text-amber-300" />
                    <span>
                      Savaş {i + 1}: <strong>{getEnemyName(def, i)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-slate-400">
                Can savaşlar arasında taşınır; ilk iki zaferden sonra %{def.healPctOfMax} can yenilenir. Yenilirsen deneme biter.
              </p>
              <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-950/25 px-3 py-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80">Boss ödülü (her deneme)</div>
                <div className="mt-1 flex items-center gap-4 font-bold">
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <Coins className="h-4 w-4" /> {def.reward.gold.toLocaleString('tr-TR')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sky-300">
                    <Gem className="h-4 w-4" /> {def.reward.crystals}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Tamamlanma: {d.completions} · Deneme: {d.attempts}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sabit alt eylem alanı */}
      {unlocked && (
        <div className="flex flex-col gap-2 border-t border-slate-800 bg-[#050810] px-4 py-3">
          {run && run.phase === 'choice' ? (
            <button
              type="button"
              disabled={!picked || heroMismatch}
              onClick={() => picked && onChoose(picked)}
              data-testid="dungeon-confirm"
              className="gold-btn flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className="h-5 w-5" /> Devam Et
            </button>
          ) : run ? (
            <button
              type="button"
              onClick={onEnterBattle}
              disabled={heroMismatch}
              data-testid="dungeon-enter"
              className="gold-btn flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Swords className="h-5 w-5" /> {run.battle === 0 && run.relics.length === 0 ? 'Savaşa Gir' : 'Devam Et'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              data-testid="dungeon-start"
              className="gold-btn flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-black text-slate-950"
            >
              <Swords className="h-5 w-5" /> {d.attempts > 0 ? 'Yeniden Dene' : 'Zindana Gir'}
            </button>
          )}
          {run && (
            <button
              type="button"
              onClick={() => setConfirmAbandon(true)}
              data-testid="dungeon-abandon"
              className="min-h-[44px] rounded-xl border border-rose-500/40 bg-rose-950/30 text-sm font-bold text-rose-300"
            >
              Zindanı Bırak
            </button>
          )}
        </div>
      )}

      {confirmAbandon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
          <div className="fantasy-panel w-full max-w-sm rounded-2xl border border-rose-500/50 p-5 text-center">
            <h2 className="font-display text-xl font-black text-rose-300">Zindanı bırak?</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
              Bu denemenin ilerlemesi ve seçtiğin güçler kaybolur. Ödül verilmez.
            </p>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmAbandon(false)}
                data-testid="dungeon-abandon-cancel"
                className="min-h-[48px] flex-1 rounded-xl border border-slate-700 bg-slate-900 text-sm font-bold text-slate-100"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmAbandon(false);
                  onAbandon();
                }}
                data-testid="dungeon-abandon-confirm"
                className="min-h-[48px] flex-1 rounded-xl border border-rose-500/60 bg-rose-900/60 text-sm font-extrabold text-rose-100"
              >
                Evet, bırak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
