import React from 'react';
import { ArrowLeft, Flame, Shield, Sparkles, RotateCcw, Lock, Plus } from 'lucide-react';
import { HERO_CLASSES } from '../data/classes';
import { getFullSkillCodex } from '../data/skills';
import { Crown, Lock as LockIcon } from 'lucide-react';
import { GameSaveState, SkillTreeNode } from '../types/game';
import { computeHeroBuild } from '../utils/rpgLogic';

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

  const branches: {
    id: SkillTreeNode['branch'];
    title: string;
    subtitle: string;
    color: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'offense',
      title: 'Saldırı Yolu',
      subtitle: 'Ham Hasar & Kritik Güç',
      color: 'border-rose-500/40 bg-rose-950/20',
      icon: <Flame className="h-4 w-4 text-rose-400" />,
    },
    {
      id: 'magic',
      title: 'Büyü & Taş Yolu',
      subtitle: 'Kombo, Mana & Ulti Enerjisi',
      color: 'border-purple-500/40 bg-purple-950/20',
      icon: <Sparkles className="h-4 w-4 text-purple-400" />,
    },
    {
      id: 'defense',
      title: 'Savunma Yolu',
      subtitle: 'Can, Kalkan & Hayatta Kalma',
      color: 'border-emerald-500/40 bg-emerald-950/20',
      icon: <Shield className="h-4 w-4 text-emerald-400" />,
    },
  ];

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
          {/* Skill Tree 3 Branches */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {branches.map((br) => {
              const nodes = cls.skillTree
                .filter((n) => n.branch === br.id)
                .sort((a, b) => a.tier - b.tier);

              return (
                <div
                  key={br.id}
                  className={`fantasy-panel flex flex-col rounded-2xl border p-4 ${br.color}`}
                >
                  <div className="mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                    <div className="rounded-lg bg-slate-900 p-2">{br.icon}</div>
                    <div>
                      <h2 className="font-display text-base font-bold text-white">{br.title}</h2>
                      <p className="text-[11px] text-slate-400">{br.subtitle}</p>
                    </div>
                  </div>

                  <div className="relative flex flex-col gap-4">
                    {nodes.map((node, idx) => {
                      const rank = hero.skillRanks[node.id] ?? 0;
                      const reqMet = !node.requires || (hero.skillRanks[node.requires] ?? 0) >= 1;
                      const isMax = rank >= node.maxRank;
                      const canUpgrade = reqMet && !isMax && hero.skillPoints > 0;
                      const reqNode = node.requires
                        ? cls.skillTree.find((n) => n.id === node.requires)
                        : null;

                      return (
                        <div key={node.id} className="relative">
                          {idx > 0 && (
                            <div className="mx-auto -mt-4 mb-1 h-4 w-0.5 bg-gradient-to-b from-amber-500/60 to-slate-700" />
                          )}
                          <div
                            className={`rounded-xl border-2 p-3.5 transition ${
                              rank > 0
                                ? 'border-amber-400/70 bg-slate-900/90 shadow-[0_0_16px_rgba(245,158,11,0.16)]'
                                : reqMet
                                  ? 'border-slate-700 bg-slate-900/70'
                                  : 'border-slate-800/80 bg-slate-950/60 opacity-65'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                                    Kademe {node.tier}
                                  </span>
                                  <h3 className="text-sm font-bold text-white">{node.name}</h3>
                                </div>
                                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                                  {node.description}
                                </p>
                                {!reqMet && reqNode && (
                                  <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                                    <Lock className="h-3 w-3" />
                                    Önce "{reqNode.name}" açılmalı
                                  </p>
                                )}
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
                                    isMax
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-slate-800 text-amber-300'
                                  }`}
                                >
                                  {rank}/{node.maxRank}
                                </span>
                                <button
                                  type="button"
                                  disabled={!canUpgrade}
                                  onClick={() => onUpgradeSkillNode(node.id)}
                                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                                    canUpgrade
                                      ? 'gold-btn text-slate-950'
                                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                  }`}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  {isMax ? 'Tamam' : 'Geliştir'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
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
