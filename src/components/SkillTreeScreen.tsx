import React from 'react';
import { ArrowLeft, Flame, Shield, Sparkles, RotateCcw, Lock, Plus } from 'lucide-react';
import { HERO_CLASSES } from '../data/classes';
import { getFullSkillCodex } from '../data/skills';
import { Crown, Lock as LockIcon } from 'lucide-react';
import { GameSaveState } from '../types/game';
import { computeHeroBuild } from '../utils/rpgLogic';
import { CATEGORY_TITLE, nodeCategory, nodeProgressText, PASSIVE_MAX_RANK, PASSIVE_META, SKILL_POINTS_PER_LEVEL, type PassiveCategory } from '../data/passiveTree';

const CATEGORIES: { id: PassiveCategory; color: string; icon: React.ReactNode }[] = [
  { id: 'damage', color: 'border-rose-500/40 bg-rose-950/20', icon: <Flame className="h-4 w-4 text-rose-400" /> },
  { id: 'defense', color: 'border-emerald-500/40 bg-emerald-950/20', icon: <Shield className="h-4 w-4 text-emerald-400" /> },
  { id: 'resource', color: 'border-purple-500/40 bg-purple-950/20', icon: <Sparkles className="h-4 w-4 text-purple-400" /> },
];

interface SkillTreeScreenProps {
  save: GameSaveState;
  onBack: () => void;
  onUpgradeSkillNode: (nodeId: string) => void;
  onResetSkills: () => void;
}

export const SkillTreeScreen: React.FC<SkillTreeScreenProps> = ({
  save,
  onBack,
  onUpgradeSkillNode,
  onResetSkills,
}) => {
  const hero = save.heroes[save.activeHeroClass];
  const cls = HERO_CLASSES[hero.classId];
  const build = computeHeroBuild(hero);

  const totalSpent = Object.values(hero.skillRanks).reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-full flex-col bg-[#080b14]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 bg-slate-950/90 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-amber-400/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri
          </button>
          <div>
            <h1 className="font-display text-lg font-bold text-amber-300">
              {cls.name} Yetenek Ağacı
            </h1>
            <p className="text-[11px] text-slate-400">
              {cls.title} • Seviye {hero.level} • Savaş Gücü: {build.powerRating}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200">
            Yetenek Puanı: <span className="text-base text-amber-300">{hero.skillPoints}</span>
          </div>
          {totalSpent > 0 && (
            <button
              type="button"
              onClick={onResetSkills}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-rose-400/50 hover:text-rose-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Sıfırla
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Pasif yetenekler: tüm kahramanlarda aynı kurallar (en fazla 10 seviye, her yükseltme 1 puan); kahramanın kendi
              pasifleri + ortak Ustalık pasifleri, mobilde Hasar / Savunma / Kaynaklar başlıkları altında */}
          <p className="text-[12px] leading-snug text-slate-400" data-testid="passive-rules">
            Her pasif en fazla {PASSIVE_MAX_RANK} seviye; her yükseltme 1 yetenek puanı. Seviye başına {SKILL_POINTS_PER_LEVEL} puan kazanılır.
          </p>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const nodes = cls.skillTree.filter((n) => nodeCategory(n) === cat.id);
              return (
                <section key={cat.id} className={`fantasy-panel min-w-0 rounded-2xl border p-3 sm:p-4 ${cat.color}`} data-testid={`passive-cat-${cat.id}`}>
                  <div className="mb-3 flex items-center gap-2 border-b border-slate-800 pb-2.5">
                    <div className="rounded-lg bg-slate-900 p-2">{cat.icon}</div>
                    <h2 className="font-display text-base font-bold text-white">{CATEGORY_TITLE[cat.id]}</h2>
                    <span className="ml-auto text-[11px] text-slate-400">{nodes.length} pasif</span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {nodes.map((node) => {
                      const rank = Math.min(node.maxRank, hero.skillRanks[node.id] ?? 0);
                      const reqMet = !node.requires || (hero.skillRanks[node.requires] ?? 0) >= 1;
                      const isMax = rank >= node.maxRank;
                      const canUpgrade = reqMet && !isMax && hero.skillPoints > 0;
                      const reqNode = node.requires ? cls.skillTree.find((n) => n.id === node.requires) : null;
                      const prog = nodeProgressText(node, rank);
                      const isCommon = node.branch === 'common';
                      return (
                        <div
                          key={node.id}
                          data-testid={`passive-${node.id}`}
                          data-rank={rank}
                          className={`min-w-0 rounded-xl border-2 p-3 transition ${
                            rank > 0
                              ? 'border-amber-400/70 bg-slate-900/90'
                              : reqMet
                                ? 'border-slate-700 bg-slate-900/70'
                                : 'border-slate-800/80 bg-slate-950/60 opacity-70'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h3 className="text-sm font-bold text-white">{node.name}</h3>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${isCommon ? 'bg-sky-900/60 text-sky-200' : 'bg-slate-800 text-slate-300'}`}>
                                  {isCommon ? 'Ustalık' : cls.name}
                                </span>
                              </div>
                              <p className="mt-1 break-words text-[12px] font-bold text-amber-200" data-testid="passive-progress">
                                {prog.level} · {prog.current}
                                {prog.next ? ` · ${prog.next}` : ''}
                              </p>
                              <p className="mt-0.5 break-words text-[11px] leading-snug text-slate-400" data-testid="passive-total">
                                {node.passiveEffect && PASSIVE_META[node.passiveEffect.type].long ? `${PASSIVE_META[node.passiveEffect.type].long}. ` : ''}
                                {prog.total}
                              </p>
                              {!reqMet && reqNode && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                                  <Lock className="h-3 w-3" />
                                  Önce “{reqNode.name}” açılmalı
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              data-testid="passive-upgrade"
                              disabled={!canUpgrade}
                              aria-label={isMax ? `${node.name} maksimum` : `${node.name} yükselt`}
                              onClick={() => onUpgradeSkillNode(node.id)}
                              className={`flex h-11 min-w-[76px] shrink-0 items-center justify-center gap-1 rounded-lg px-2 text-xs font-bold transition ${
                                isMax
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : canUpgrade
                                    ? 'gold-btn text-slate-950'
                                    : 'cursor-not-allowed bg-slate-800 text-slate-500'
                              }`}
                            >
                              {isMax ? (
                                'Maksimum'
                              ) : (
                                <>
                                  <Plus className="h-3.5 w-3.5" />
                                  Yükselt
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Yetenek Kitabı — Ulti + 24 aktif yetenek */}
          <div className="fantasy-panel rounded-2xl p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-amber-300">
                  Savaş Yetenekleri Kitabı
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Seviye atladıkça yeni büyüler açılır. Mavi Buz taşlarından Mana, Mor Arkan
                  taşlarından Ulti enerjisi topla.
                </p>
              </div>
              <div className="text-xs font-bold text-slate-300">
                Açık:{' '}
                <span className="text-emerald-300">
                  {getFullSkillCodex(cls.id).filter((s) => (s.levelReq ?? 1) <= hero.level).length}
                </span>
                <span className="text-slate-500">
                  {' '}/ {getFullSkillCodex(cls.id).length + 1}
                </span>
              </div>
            </div>

            {/* Ulti */}
            <div className="mt-3 rounded-xl border-2 border-amber-400/60 bg-amber-950/30 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-black text-amber-300">
                  <Crown className="h-4 w-4" />
                  ULTİ: {cls.ultimateSkill.name}
                </span>
                <span className="rounded bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-amber-200">
                  100 Ulti Enerjisi
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                {cls.ultimateSkill.description}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {getFullSkillCodex(cls.id).map((sk) => {
                const unlocked = (sk.levelReq ?? 1) <= hero.level;
                const isClass = sk.kind === 'class';
                return (
                  <div
                    key={sk.id}
                    className={`rounded-xl border p-3 transition ${
                      unlocked
                        ? isClass
                          ? 'border-fuchsia-500/45 bg-fuchsia-950/25'
                          : 'border-slate-700 bg-slate-900/70'
                        : 'border-slate-800 bg-slate-950/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm font-bold ${unlocked ? 'text-white' : 'text-slate-400'}`}>
                        {sk.name}
                      </span>
                      {unlocked ? (
                        <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                          {sk.manaCost} M
                        </span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 rounded bg-rose-950/70 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          <LockIcon className="h-3 w-3" />
                          Sv.{sk.levelReq}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                      {isClass && (
                        <span className="rounded bg-fuchsia-500/25 px-1.5 py-0.5 text-fuchsia-200">
                          SINIF YETENEĞİ
                        </span>
                      )}
                      {sk.grantsExtraTurn && (
                        <span className="rounded bg-amber-400/90 px-1.5 py-0.5 text-slate-950">
                          TUR HARCAMAZ
                        </span>
                      )}
                      <span className="text-slate-500">{sk.cooldown} tur bekleme</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                      {sk.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
