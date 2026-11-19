import { HERO_CLASSES } from '../data/classes';
import { RARITY_META } from '../data/skills';
import { periodQuestValue } from './questProgress';
import {
  EquipmentItem,
  GameSaveState,
  GemType,
  HeroProgress,
  QuestDef,
  StatBlock,
} from '../types/game';

export function xpRequiredForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.48));
}

export function getEffectiveItemStats(item: EquipmentItem): Partial<StatBlock> {
  const upgradeFactor = 1 + item.upgradeLevel * 0.14;
  const out: Partial<StatBlock> = {};
  (Object.keys(item.stats) as (keyof StatBlock)[]).forEach((k) => {
    const val = item.stats[k];
    if (typeof val === 'number') {
      if (k === 'critChance' || k === 'dodge') {
        out[k] = Number((val * (1 + item.upgradeLevel * 0.06)).toFixed(1));
      } else {
        out[k] = Math.round(val * upgradeFactor);
      }
    }
  });
  return out;
}

export function getItemPowerScore(item: EquipmentItem): number {
  const s = getEffectiveItemStats(item);
  return Math.round(
    (s.attack ?? 0) * 3.2 +
      (s.health ?? 0) * 0.45 +
      (s.defense ?? 0) * 2.5 +
      (s.mana ?? 0) * 1.4 +
      (s.critChance ?? 0) * 5 +
      (s.critDamage ?? 0) * 1.2 +
      (s.dodge ?? 0) * 4.5 +
      (s.elementalDamage ?? 0) * 2.4 +
      RARITY_META[item.rarity].rank * 25
  );
}

export interface ComputedHeroBuild {
  stats: StatBlock;
  passives: {
    fireDmgPct: number;
    frostManaPct: number;
    natureHealPct: number;
    lightningCritPct: number;
    arcaneUltiPct: number;
    startShield: number;
    comboBoostPct: number;
    lifestealPct: number;
    bossDmgPct: number;
    skillPowerPct: number;
    goldenLuckPct: number;
    startManaPct: number;
    startUltiPct: number;
    thornsPct: number;
    weaknessBonusPct: number;
    summonPowerPct: number;
    bleedPowerPct: number;
    dodgeCounterPct: number;
    stormOverloadPct: number;
    dragonScalePct: number;
    gemBonuses: Record<GemType, number>;
  };
  powerRating: number;
}

export function computeHeroBuild(hero: HeroProgress): ComputedHeroBuild {
  const cls = HERO_CLASSES[hero.classId];
  const lvlBonus = hero.level - 1;

  const stats: StatBlock = {
    health: Math.round(cls.baseStats.health + (cls.perLevelStats.health ?? 0) * lvlBonus),
    attack: Math.round(cls.baseStats.attack + (cls.perLevelStats.attack ?? 0) * lvlBonus),
    defense: Math.round(cls.baseStats.defense + (cls.perLevelStats.defense ?? 0) * lvlBonus),
    critChance: Number(
      (cls.baseStats.critChance + (cls.perLevelStats.critChance ?? 0) * lvlBonus).toFixed(1)
    ),
    critDamage: Math.round(cls.baseStats.critDamage + (cls.perLevelStats.critDamage ?? 0) * lvlBonus),
    mana: Math.round(cls.baseStats.mana + (cls.perLevelStats.mana ?? 0) * lvlBonus),
    dodge: Number((cls.baseStats.dodge + (cls.perLevelStats.dodge ?? 0) * lvlBonus).toFixed(1)),
    elementalDamage: Math.round(
      cls.baseStats.elementalDamage + (cls.perLevelStats.elementalDamage ?? 0) * lvlBonus
    ),
  };

  const passives = {
    fireDmgPct: 0,
    frostManaPct: 0,
    natureHealPct: 0,
    lightningCritPct: 0,
    arcaneUltiPct: 0,
    startShield: 0,
    comboBoostPct: 0,
    lifestealPct: 0,
    bossDmgPct: 0,
    skillPowerPct: 0,
    goldenLuckPct: 0,
    startManaPct: 0,
    startUltiPct: 0,
    thornsPct: 0,
    weaknessBonusPct: 0,
    summonPowerPct: 0,
    bleedPowerPct: 0,
    dodgeCounterPct: 0,
    stormOverloadPct: 0,
    dragonScalePct: 0,
    gemBonuses: {
      fire: 0,
      frost: 0,
      nature: 0,
      lightning: 0,
      arcane: 0,
      golden: 0,
    } as Record<GemType, number>,
  };

  // Yaratık sınıflarının doğuştan pasifleri ve taş yakınlıkları
  if (cls.gemAffinity) {
    (Object.keys(cls.gemAffinity) as GemType[]).forEach((g) => {
      passives.gemBonuses[g] += cls.gemAffinity?.[g] ?? 0;
    });
  }
  if (cls.innatePassives) {
    const numeric = passives as unknown as Record<string, number>;
    Object.entries(cls.innatePassives).forEach(([k, v]) => {
      if (typeof numeric[k] === 'number') numeric[k] += v;
    });
  }

  // Skill tree contributions
  for (const node of cls.skillTree) {
    const rank = hero.skillRanks[node.id] ?? 0;
    if (rank <= 0) continue;

    if (node.statPerRank) {
      stats.health += (node.statPerRank.health ?? 0) * rank;
      stats.attack += (node.statPerRank.attack ?? 0) * rank;
      stats.defense += (node.statPerRank.defense ?? 0) * rank;
      stats.critChance = Number(
        (stats.critChance + (node.statPerRank.critChance ?? 0) * rank).toFixed(1)
      );
      stats.critDamage += (node.statPerRank.critDamage ?? 0) * rank;
      stats.mana += (node.statPerRank.mana ?? 0) * rank;
      stats.dodge = Number((stats.dodge + (node.statPerRank.dodge ?? 0) * rank).toFixed(1));
      stats.elementalDamage += (node.statPerRank.elementalDamage ?? 0) * rank;
    }

    if (node.passiveEffect) {
      const val = node.passiveEffect.valuePerRank * rank;
      switch (node.passiveEffect.type) {
        case 'fire_dmg':
          passives.fireDmgPct += val;
          break;
        case 'frost_mana':
          passives.frostManaPct += val;
          break;
        case 'nature_heal':
          passives.natureHealPct += val;
          break;
        case 'lightning_crit':
          passives.lightningCritPct += val;
          break;
        case 'arcane_ulti':
          passives.arcaneUltiPct += val;
          break;
        case 'shield_start':
          passives.startShield += val;
          break;
        case 'combo_boost':
          passives.comboBoostPct += val;
          break;
        case 'lifesteal':
          passives.lifestealPct += val;
          break;
        case 'boss_dmg':
          passives.bossDmgPct += val;
          break;
        case 'skill_power':
          passives.skillPowerPct += val;
          break;
        case 'golden_luck':
          passives.goldenLuckPct += val;
          break;
        case 'start_mana':
          passives.startManaPct += val;
          break;
        case 'start_ulti':
          passives.startUltiPct += val;
          break;
        case 'thorns':
          passives.thornsPct += val;
          break;
        case 'weakness_exploit':
          passives.weaknessBonusPct += val;
          break;
        case 'summon_power':
          passives.summonPowerPct += val;
          break;
        case 'bleed_power':
          passives.bleedPowerPct += val;
          break;
        case 'dodge_counter':
          passives.dodgeCounterPct += val;
          break;
        case 'storm_overload':
          passives.stormOverloadPct += val;
          break;
        case 'dragon_scale':
          passives.dragonScalePct += val;
          break;
      }
    }
  }

  // Equipment contributions (all 10 slots)
  Object.values(hero.equipped).forEach((item) => {
    if (!item) return;
    const eff = getEffectiveItemStats(item);
    stats.health += eff.health ?? 0;
    stats.attack += eff.attack ?? 0;
    stats.defense += eff.defense ?? 0;
    stats.critChance = Number(Math.min(75, stats.critChance + (eff.critChance ?? 0)).toFixed(1));
    stats.critDamage += eff.critDamage ?? 0;
    stats.mana += eff.mana ?? 0;
    stats.dodge = Number(Math.min(55, stats.dodge + (eff.dodge ?? 0)).toFixed(1));
    stats.elementalDamage += eff.elementalDamage ?? 0;

    if (item.specialEffect) {
      if (item.specialEffect.type === 'gem_bonus' && item.specialEffect.gem) {
        passives.gemBonuses[item.specialEffect.gem] += item.specialEffect.value;
      } else if (item.specialEffect.type === 'combo_dmg') {
        passives.comboBoostPct += item.specialEffect.value;
      } else if (item.specialEffect.type === 'boss_slayer') {
        passives.bossDmgPct += item.specialEffect.value;
      }
    }
  });

  const powerRating = Math.round(
    stats.attack * 3.5 +
      stats.health * 0.4 +
      stats.defense * 2.6 +
      stats.elementalDamage * 2.5 +
      stats.critChance * 6 +
      stats.critDamage * 1.1 +
      stats.mana * 1.2 +
      passives.startShield * 1.2
  );

  return { stats, passives, powerRating };
}

export function getEnhanceCost(item: EquipmentItem): { gold: number; crystals: number } {
  const rank = RARITY_META[item.rarity].rank;
  const lvl = item.upgradeLevel + 1;
  return {
    gold: Math.round((35 + rank * 25) * lvl * (1 + item.levelReq * 0.12)),
    crystals: Math.max(2, Math.round((2 + rank * 2) * lvl)),
  };
}

export function getDismantleYield(item: EquipmentItem): { gold: number; crystals: number } {
  const rank = RARITY_META[item.rarity].rank;
  return {
    gold: Math.round(item.sellValue * 0.45),
    crystals: Math.max(2, Math.round(rank * 3 + item.upgradeLevel * 3 + item.levelReq * 0.6)),
  };
}

export function applyXpToHero(
  hero: HeroProgress,
  gainedXp: number
): { updatedHero: HeroProgress; leveledUp: boolean; levelsGained: number; newLevel: number } {
  let xp = hero.xp + gainedXp;
  let level = hero.level;
  let skillPoints = hero.skillPoints;
  let levelsGained = 0;

  while (xp >= xpRequiredForLevel(level) && level < 50) {
    xp -= xpRequiredForLevel(level);
    level += 1;
    skillPoints += 1;
    levelsGained += 1;
  }

  return {
    updatedHero: {
      ...hero,
      level,
      xp,
      skillPoints,
    },
    leveledUp: levelsGained > 0,
    levelsGained,
    newLevel: level,
  };
}

export function getQuestCurrentValue(quest: QuestDef, save: GameSaveState): number {
  const activeHero = save.heroes[save.activeHeroClass];
  if (quest.category === 'daily' || quest.category === 'weekly') {
    return periodQuestValue(quest, save.questPeriods[quest.category].counters);
  }
  switch (quest.objectiveType) {
    case 'clear_stage':
      return quest.targetStage && save.completedStages.includes(quest.targetStage) ? 1 : 0;
    case 'defeat_boss':
      return quest.targetBoss && save.bossVictories.includes(quest.targetBoss) ? 1 : 0;
    case 'match_gem':
      return quest.targetGem ? save.stats.totalGemsMatched[quest.targetGem] ?? 0 : 0;
    case 'reach_combo':
      return save.stats.highestCombo;
    case 'upgrade_item':
      return save.stats.itemsUpgraded;
    case 'reach_level':
      return activeHero.level;
    case 'win_battles':
      return save.stats.enemiesDefeated;
    case 'use_skills':
      return save.stats.skillsCast;
    case 'defeat_bosses':
      return save.stats.bossesDefeated;
    case 'stages_cleared':
      return save.completedStages.length;
    case 'collect_epic': {
      const owned = [
        ...save.inventory,
        ...Object.values(activeHero.equipped).filter(Boolean) as EquipmentItem[],
      ];
      return owned.filter((i) => RARITY_META[i.rarity].rank >= 4).length;
    }
    case 'make_matches':
      return save.stats.totalMatches;
    case 'league_battles':
      return save.league.totalBattles;
    case 'league_wins':
      return save.league.totalWins;
    case 'league_points':
      return save.league.highestPoints;
    case 'league_streak':
      return save.league.bestStreak;
    case 'unlock_heroes':
      return save.heroUnlocks.length;
    default:
      return save.questProgress[quest.id] ?? 0;
  }
}
