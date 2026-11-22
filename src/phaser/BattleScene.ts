import Phaser from 'phaser';
import { HERO_CLASSES } from '../data/classes';
import { ACTIVE_SKILLS, CLASS_SKILLS, GEM_INFO, getSkillLoadout } from '../data/skills';
import { freshRelicFlags, relicStartShield, resolveRelicMatch, type RelicBattleFlags } from '../data/dungeons';
import { freshSetFlags, getSet, resolveSetFirstMatch, type SetTurnFlags } from '../data/sets';
import { SoundEngine } from '../audio/SoundEngine';
import {
  ActiveSkillDef,
  BattleCombatSnapshot,
  BoardTile,
  EnemyDef,
  GameSettings,
  GemType,
  HeroProgress,
  SpecialGemKind,
  StageDef,
} from '../types/game';
import { ComputedHeroBuild } from '../utils/rpgLogic';
import { computeEnchantAura, HERO_TEX_SIZE, heroAuraGeometry } from './HeroRenderer';
import { createEnemyGlowTexture, createEnemyPhaserTexture, createHeroPhaserTexture } from './CharacterRenderer';
import { createGemTextures } from './GemTextures';
import { capGemShield, enemyHitDamage } from '../data/difficulty';
import type { ObjectiveDef } from '../data/mastery';
import { HERO_ART_LAYOUT, HERO_BREATH, hasHeroArt, heroImage, heroImageReady } from '../data/heroArt';
import { ENEMY_ART_GROUND, ENEMY_ART_LAYOUT, ENEMY_BREATH_DEFAULT, ENEMY_FLOATING_ARCHETYPES, clampBreathSec, enemyArtAttack, enemyArtKey, enemyImage, enemyImageReady } from '../data/enemyArt';
import { ATTACK_TIMING, enemyAttackProfile, heroAttackProfile, shouldPlayAttackAnim, skillAttackProfile, type AttackProfile } from '../game/attackAnimation';
import { IMAGE_HERO_TUNING } from '../data/imageHeroes';
import {
  bigfootSkillShield,
  bigfootStartShield,
  bigfootUltShield,
  bloodBond,
  clawStrike,
  delayEnemyAction,
  huntChargeOnSquares,
  nightEcho,
  vampireSlashHeal,
  vampireUltHeal,
  werewolfUltBonus,
} from '../game/heroKits';
import type { CompanionId } from '../types/game';
import {
  emberTrigger,
  foxArm,
  foxDisarm,
  foxResolve,
  sproutTrigger,
  type CompanionState,
} from '../game/companionEffects';
import {
  createMasteryState,
  onEnemyAction,
  onFrozenCleared,
  onResolve,
  progressOf,
  setMoveKind,
  startTurn,
  type MasteryState,
} from '../game/masteryTracker';
import { resolveHuntFireRule, type HuntDef } from '../data/hunts';
import { describeIntent, phaseNoticeText, planEnemyAction, type EnemyAction } from '../game/enemyIntent';
import {
  createStartingBoard,
  findMatches,
  findPossibleMoves,
  type MatchGrid,
  type MatchResult,
  type Move,
  type Square,
} from '../game/match3';

/** Yukarıdaki `checkBossPhaseTransitions` içinde kendi faz mantığı olan bosslar */
const BESPOKE_PHASE_BOSSES = new Set([
  'forest_guardian',
  'frost_queen',
  'infernal_dragon',
  'crystal_titan',
  'abyssal_king',
]);

const GRID_SIZE = 8;
const BASE_GEMS: GemType[] = ['fire', 'frost', 'nature', 'lightning', 'arcane'];

const GEM_COLOR_NUM: Record<GemType, number> = {
  fire: 0xef4444,
  frost: 0x38bdf8,
  nature: 0x22c55e,
  lightning: 0xfacc15,
  arcane: 0xa855f7,
  golden: 0xf59e0b,
};

interface TileVisual {
  tile: BoardTile;
  container: Phaser.GameObjects.Container;
  gemSprite: Phaser.GameObjects.Image;
  specialSprite?: Phaser.GameObjects.Image;
  frozenSprite?: Phaser.GameObjects.Image;
}

export interface BattleSceneInitData {
  hero: HeroProgress;
  build: ComputedHeroBuild;
  stage: StageDef;
  settings: GameSettings;
  onCombatUpdate: (snapshot: BattleCombatSnapshot) => void;
  onMatchStats: (gemsMatched: Partial<Record<GemType, number>>, combo: number, skillUsed: boolean) => void;
  /** `turns`: savaşın bittiği andaki tur numarası (av rekoru için); `heroHp`: kahramanın kalan canı (zindan can taşıma) */
  onBattleEnd: (victory: boolean, turns: number, heroHp: number) => void;
  /** Zindan savaşı: kahramanın savaşa başladığı can (varsayılan tam can) */
  startHeroHp?: number;
  /** Başlangıç savaş hızı (varsayılan 1×) */
  speed?: 1 | 2;
  /** Aktif yoldaş (yoksa tanımsız) */
  companion?: CompanionId;
  /** Hikâye aşaması ustalık hedefleri (hikâye dışı savaşlarda yok) */
  mastery?: [ObjectiveDef, ObjectiveDef];
  /** Boss Avı modu: özel kural ve arena görseli */
  hunt?: HuntDef;
  arenaImage?: string;
}

export class BattleScene extends Phaser.Scene {
  private initData!: BattleSceneInitData;

  private grid: (TileVisual | null)[][] = [];
  private nextTileId = 1;

  // Layout geometry
  private boardX = 0;
  private boardY = 0;
  private boardPixelSize = 320;
  private cellSize = 40;
  private stageArea = { x: 0, y: 0, w: 400, h: 250 };

  // Visual layers
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private boardFrameGraphics!: Phaser.GameObjects.Graphics;
  private boardContainer!: Phaser.GameObjects.Container;
  private vfxContainer!: Phaser.GameObjects.Container;
  private selectRing!: Phaser.GameObjects.Graphics;
  private hintGraphics!: Phaser.GameObjects.Graphics;
  private ambientParticles: { x: number; y: number; vx: number; vy: number; r: number; col: number; alpha: number }[] = [];
  private ambientGraphics!: Phaser.GameObjects.Graphics;

  // Hero & Enemy stage sprites
  private heroContainer!: Phaser.GameObjects.Container;
  private heroSprite!: Phaser.GameObjects.Image;
  private heroIdleKey = '';
  private heroAttackKey = '';
  private enemyContainer!: Phaser.GameObjects.Container;
  private enemySprite!: Phaser.GameObjects.Image;
  private bossAuraGraphics!: Phaser.GameObjects.Graphics;

  // Pointer drag/tap state
  private selectedCell: { row: number; col: number } | null = null;
  private dragStartCell: { row: number; col: number } | null = null;
  private dragStartPos: { x: number; y: number } | null = null;
  private inputLocked = false;

  // Idle hint timer
  private idleTimer = 0;
  private hintShown = false;
  private heroHome = { x: 0, y: 0 };
  private enemyHome = { x: 0, y: 0 };
  // Ortak saldırı animasyonları: eylem kimliği (aynı eylemin ikinci hasar kaydı görseli tekrar oynatmaz) ve kilitler
  private attackActionSeq = 0;
  /** Bir sonraki dealHeroAttackToEnemy çağrısının ait olduğu eylem (çağıran ayarlar, çağrı tüketir) */
  private attackActionId = 0;
  /** Geçerli taş eşleşmesi adımının (kaskad) eylem kimliği */
  private stepActionId = 0;
  private lastAttackActionId = 0;
  private heroAnimBusy = false;
  /** Yetenek kendi pozunu/efektini oynuyor: taş eşleşmesi saldırı animasyonu bastırılır */
  private heroSkillLock = false;
  /** Doğrulama/teşhis için son oynatılan saldırı animasyonları */
  public attackAnimLog: { side: 'hero' | 'enemy'; type: string; style?: string; trail?: string; action: number; skill: boolean; at: number }[] = [];
  private heroBaseScale = 1;
  private summonLabel = 'İSKELET ORDUSU';

  // Combat state
  private heroHp = 500;
  private heroMaxHp = 500;
  private heroShield = 0;
  private heroMana = 30;
  private heroMaxMana = 100;
  private heroUlti = 0;
  private heroMaxUlti = 100;
  private heroRageStacks = 0;

  private enemy!: EnemyDef;
  private enemyHp = 500;
  private enemyMaxHp = 500;
  private enemyShield = 0;
  private enemyTurnCounter = 2;
  /** Düşmanın bir sonraki eylemi: bir kez seçilir, eylem gerçekleşene ya da faz değişene kadar sabit kalır */
  private plannedAction: EnemyAction = { kind: 'attack', power: 1 };
  private phaseNotice?: { seq: number; text: string };
  private phaseNoticeSeq = 0;
  private enemyFrozenTurns = 0;
  private enemyBurnTurns = 0;
  private enemyPhase = 1;
  private enemyEnraged = false;
  private enemyWeakness: GemType = 'fire';
  private enemyPoisonTurns = 0;
  private enemyStaggerTurns = 0;
  private enemyBleedTurns = 0;
  private heroCritBuffTurns = 0;
  private heroDodgeBuffTurns = 0;
  private summonTurns = 0;
  private dragonFormTurns = 0;

  /** Ekipman + seviyesinden gelen canlı büyü aurası */
  private heroAuraGraphics!: Phaser.GameObjects.Graphics;
  /** Çizimli kahramanlarda aura'nın çizimin ÖNÜNDE kalan katmanı (ön yarı zerreler, ön rune yayı, ışıma) */
  private heroAuraFrontGraphics!: Phaser.GameObjects.Graphics;
  private heroAura = { tier: 0, color: 0xfde047, intensity: 0, motes: 0 };

  private comboCount = 0;
  private turnPhase: BattleCombatSnapshot['turnPhase'] = 'player';
  private skillCooldowns: Record<string, number> = {};
  private turnNumber = 1;
  /** Av kuralı bu oyuncu turunda tetiklendi mi (zincirde tekrar etmez) */
  private huntRuleUsed = false;
  /** Set "turun ilk eşleşmesi" bonuslarının bu oyuncu turundaki kullanım bilgisi */
  private setFlags: SetTurnFlags = freshSetFlags();
  /** Buzul bonusunun şu an oluşturduğu birikmiş kalkan (üst sınır için) */
  private setShieldPool = 0;
  /** Zindan geçici güçleri: tur eşleşmesi (her tur) ve ilk kare (savaş boyunca) kullanım bilgisi */
  private relicFlags: RelicBattleFlags = freshRelicFlags();
  /** Ustalık sayaçları: gerçek savaş olaylarından beslenir */
  private mastery: MasteryState = createMasteryState();
  /** Savaş mantığının rastgeleliği (görsel efektler Math.random kullanır). Testlerde tohumlu bir üreteçle değiştirilebilir. */
  public rng: () => number = Math.random;
  /** Savaş kararlarının (kritik, sıyrılma, düşman planı) ayrı rastgelelik akışı: animasyon zamanlaması tahta akışını etkilemez. */
  public combatRng: () => number = Math.random;
  /** Savaş hızı: uygulanan ve (animasyon sürerken) bekleyen hız */
  private speed: 1 | 2 = 1;
  private pendingSpeed: 1 | 2 = 1;
  /** Görsel kahramanlar: ayak çizgisine sabitlenmiş nefes döngüsü, sınıf renkli parlama ve Ejder Formu dokuları */
  private heroBreath: Phaser.Tweens.Tween | null = null;
  private breathResume: Phaser.Time.TimerEvent | null = null;
  private heroGlowGraphics!: Phaser.GameObjects.Graphics;
  /** Düşmana özel çizim: zemine sabit nefes ve kristal parlaması */
  private enemyGlowSprite: Phaser.GameObjects.Image | null = null;
  private enemyBreath: Phaser.Tweens.Tween | null = null;
  private enemyArtActive = false;
  private enemyBob: Phaser.Tweens.Tween | null = null;
  private artIdleKey = '';
  private artAttackKey = '';
  /** Kurt Adam: Av yükü ve bu tur 2×2 kare yükü verildi mi */
  private huntCharges = 0;
  private huntSquareGiven = false;
  /** Vampir: Kan Bağı bu tur kullanıldı mı; son verilen doğrudan hasar */
  private bloodBondUsed = false;
  private lastDealt = 0;
  /** Gecenin Çığırtkanı: Gece Yankısı kullanıldı mı; eylem başına verilen gecikme */
  private echoUsed = false;
  private delaysByPlan = new WeakMap<EnemyAction, number>();
  /** Yoldaş: savaş başına tek destek hakkı */
  private companionState: CompanionState = 'ready';
  private companionBurn = { turns: 0, perTurn: 0 };
  private arenaSprite?: Phaser.GameObjects.Image;

  constructor(initialData?: BattleSceneInitData) {
    super({ key: 'BattleScene' });
    if (initialData) {
      this.initData = initialData;
    }
  }

  public init(data?: BattleSceneInitData) {
    const resolved = data && data.stage ? data : this.initData;
    if (!resolved) return;
    this.initData = resolved;
    this.enemy = { ...resolved.stage.enemy };
    this.heroMaxHp = resolved.build.stats.health;
    this.heroHp = Math.max(1, Math.min(this.heroMaxHp, Math.round(resolved.startHeroHp ?? this.heroMaxHp)));
    this.heroShield =
      resolved.build.passives.startShield +
      (resolved.build.relicEffects ? relicStartShield(resolved.build.relicEffects, this.heroMaxHp) : 0);
    // Kocaayak — Sağlam Duruş: savaş başında maksimum canın %8'i kadar kalkan
    if (this.initData.hero.classId === 'bigfoot') this.heroShield += bigfootStartShield(this.heroMaxHp);
    this.relicFlags = freshRelicFlags();
    this.mastery = createMasteryState();
    this.huntCharges = 0;
    this.huntSquareGiven = false;
    this.bloodBondUsed = false;
    this.echoUsed = false;
    this.delaysByPlan = new WeakMap();
    this.companionState = 'ready';
    this.companionBurn = { turns: 0, perTurn: 0 };
    this.heroMaxMana = resolved.build.stats.mana;
    this.heroMana = Math.round(this.heroMaxMana * 0.25);
    this.heroUlti = 0;
    this.heroRageStacks = 0;

    this.enemyMaxHp = this.enemy.maxHp;
    this.enemyHp = this.enemyMaxHp;
    this.enemyShield = 0;
    this.enemyTurnCounter = this.enemy.attackInterval;
    this.plannedAction = planEnemyAction(this.enemy, this.combatRng);
    this.setFlags = freshSetFlags();
    this.setShieldPool = 0;
    this.phaseNotice = undefined;
    this.enemyFrozenTurns = 0;
    this.enemyBurnTurns = 0;
    this.enemyPhase = 1;
    this.enemyEnraged = false;
    this.enemyWeakness = this.enemy.weakness;

    this.comboCount = 0;
    this.turnPhase = 'player';
    this.skillCooldowns = {};
    this.turnNumber = 1;
    this.inputLocked = false;
    this.selectedCell = null;
    this.enemyPoisonTurns = 0;
    this.enemyStaggerTurns = 0;
    this.enemyBleedTurns = 0;
    this.heroCritBuffTurns = 0;
    this.heroDodgeBuffTurns = 0;
    this.summonTurns = 0;
    this.dragonFormTurns = 0;

    // Ekipman yükseltmelerinden gelen büyü aurası
    const auraInfo = computeEnchantAura(resolved.hero);
    this.heroAura = {
      tier: auraInfo.tier,
      color: auraInfo.colorNum,
      intensity: auraInfo.intensity,
      motes: auraInfo.motes,
    };

    // Yetenek Ağacı: savaşa ekstra Mana ve Ulti enerjisiyle başla
    const p = resolved.build.passives;
    if (p.startManaPct > 0) {
      this.heroMana = Math.min(
        this.heroMaxMana,
        this.heroMana + Math.round((this.heroMaxMana * p.startManaPct) / 100)
      );
    }
    if (p.startUltiPct > 0) {
      this.heroUlti = Math.min(
        this.heroMaxUlti,
        Math.round((this.heroMaxUlti * p.startUltiPct) / 100)
      );
    }
  }

  public updateSettings(settings: GameSettings) {
    if (this.initData) {
      this.initData.settings = settings;
    }
  }

  public preload() {
    if (this.initData?.arenaImage) {
      this.load.image('hunt_arena', this.initData.arenaImage);
    }
  }

  public create() {
    // Başlangıç hızı (kilitliyse ya da belirtilmemişse 1×)
    this.speed = this.pendingSpeed = this.initData.speed === 2 ? 2 : 1;
    this.time.timeScale = this.speed;
    this.tweens.timeScale = this.speed;
    this.anims.globalTimeScale = this.speed;
    createGemTextures(this);
    this.heroIdleKey = createHeroPhaserTexture(this, this.initData.hero, 'idle');
    this.heroAttackKey = createHeroPhaserTexture(this, this.initData.hero, 'attack');
    const enemyKey = createEnemyPhaserTexture(this, this.enemy);

    this.bgGraphics = this.add.graphics();
    if (this.initData.arenaImage && this.textures.exists('hunt_arena')) {
      this.arenaSprite = this.add.image(0, 0, 'hunt_arena').setOrigin(0, 0);
    }
    this.ambientGraphics = this.add.graphics();
    this.bossAuraGraphics = this.add.graphics();
    this.heroGlowGraphics = this.add.graphics();
    this.heroAuraGraphics = this.add.graphics();
    this.boardFrameGraphics = this.add.graphics();

    // Stage entities
    this.heroContainer = this.add.container(0, 0);
    this.heroSprite = this.add.image(0, 0, this.heroIdleKey);
    this.heroContainer.add(this.heroSprite);
    this.heroAuraFrontGraphics = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    // Görsel tabanlı kahramanlar: görsel henüz yüklenmediyse hazır olunca dokular yenilenir
    const artHero = hasHeroArt(this.initData.hero.classId);
    if (artHero) {
      // Ayaklar sabit kalsın: çizim ortak zemin çizgisinden (y = 0,58 + 74 birim) döndürülür/ölçeklenir
      const footY = (HERO_TEX_SIZE * 0.58 + 74) / HERO_TEX_SIZE;
      this.heroSprite.setOrigin(0.5, footY);
      this.heroSprite.y = (footY - 0.5) * HERO_TEX_SIZE;
      this.artIdleKey = this.heroIdleKey;
      this.artAttackKey = this.heroAttackKey;
    }
    if (artHero && !heroImage(this.initData.hero.classId)) {
      void heroImageReady(this.initData.hero.classId).then(() => {
        if (!this.heroSprite || !this.heroSprite.active) return;
        this.heroIdleKey = this.artIdleKey = createHeroPhaserTexture(this, this.initData.hero, 'idle');
        this.heroAttackKey = this.artAttackKey = createHeroPhaserTexture(this, this.initData.hero, 'attack');
        this.heroSprite.setTexture(this.heroIdleKey);
      });
    }

    this.enemyContainer = this.add.container(0, 0);
    this.enemySprite = this.add.image(0, 0, enemyKey);
    this.enemyContainer.add(this.enemySprite);

    // Idle breathing animations
    // Nefes alma: eski kahramanlarda hafif yükselme + göğüs genişlemesi; görsel kahramanlarda ayaklar sabit, ~3 sn'lik %1,5 esneme
    if (artHero) {
      this.startHeroBreath();
      // Havada duran kahramanlar (Peri, Anka, Cin, Serafim, Gecenin Çığırtkanı): hafif süzülme; ayaklı kahramanlarda bob = 0
      const bob = HERO_ART_LAYOUT[this.initData.hero.classId]?.bob ?? 0;
      if (bob > 0) {
        const baseY = this.heroSprite.y;
        this.tweens.add({
          targets: this.heroSprite,
          y: { from: baseY + bob, to: baseY - bob },
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    } else {
      this.tweens.add({
        targets: this.heroSprite,
        y: -5,
        scaleY: 1.03,
        scaleX: 0.99,
        duration: 1450,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    // Ortak düşman bekleme nefesi: çizimli ve eski vektör çizimli tüm düşmanlar için tek yol (ayak/kök noktası sabit)
    const eKey = enemyArtKey(this.enemy.id);
    if (eKey && enemyImage(eKey)) {
      this.applyEnemyArt();
    } else {
      // Düşmana özel çizim yüklenene kadar (ya da hiç yoksa) mevcut çizim + ortak nefes
      this.setupFallbackEnemyIdle();
      if (eKey) {
        void enemyImageReady(eKey).then(() => {
          if (!this.enemySprite || !this.enemySprite.active || !enemyImage(eKey) || this.turnPhase === 'victory') return;
          this.stopEnemyIdle();
          this.enemySprite.setTexture(createEnemyPhaserTexture(this, this.enemy));
          this.applyEnemyArt();
        });
      }
    }

    // Board & VFX containers
    this.boardContainer = this.add.container(0, 0);
    this.selectRing = this.add.graphics();
    this.hintGraphics = this.add.graphics();
    this.vfxContainer = this.add.container(0, 0);

    this.initAmbientParticles();
    this.computeLayout();
    this.drawBackgroundAndFrame();
    this.buildInitialBoard();

    // Setup input listeners
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

    // Boss dramatic entrance!
    if (this.enemy.isBoss) {
      this.playBossEntrance();
    }

    this.emitSnapshot();
  }

  public shutdown() {
    this.stopEnemyIdle();
    this.scale.off('resize', this.handleResize, this);
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerup', this.handlePointerUp, this);
  }

  private initAmbientParticles() {
    this.ambientParticles = [];
    const region = this.enemy.regionId;
    const col =
      region === 'forest'
        ? 0x4ade80
        : region === 'mountains'
          ? 0xbae6fd
          : region === 'volcano'
            ? 0xfb923c
            : region === 'ruins'
              ? 0xc084fc
              : 0xf43f5e;
    const count = this.initData.settings.highParticles ? 30 : 12;
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push({
        x: Math.random() * this.scale.width,
        y: Math.random() * this.scale.height,
        vx: (Math.random() - 0.5) * 18,
        vy: region === 'mountains' ? 18 + Math.random() * 22 : -(10 + Math.random() * 20),
        r: 1.5 + Math.random() * 2.5,
        col,
        alpha: 0.2 + Math.random() * 0.5,
      });
    }
  }

  /** Niyet göstergesini etkileyen durumların imzası: değişince anında yeni snapshot gönderilir. */
  private intentSignature(): string {
    return [
      this.plannedAction.kind,
      this.enemyTurnCounter,
      this.enemyFrozenTurns,
      this.enemyStaggerTurns,
      this.enemyPhase,
      this.enemyEnraged ? 1 : 0,
    ].join('|');
  }
  private lastIntentSignature = '';

  public update(_time: number, delta: number) {
    this.applyPendingSpeed();
    // Yetenek/dondurma/sersemletme gibi hangi yoldan olursa olsun niyet değiştiğinde gösterge hemen güncellenir
    if (this.turnPhase !== 'victory' && this.turnPhase !== 'defeat') {
      const sig = this.intentSignature();
      if (sig !== this.lastIntentSignature) this.emitSnapshot();
    }
    const dt = delta / 1000;
    // Ambient fantasy particles
    if (this.ambientGraphics) {
      this.ambientGraphics.clear();
      for (const p of this.ambientParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y < -10) p.y = this.scale.height + 10;
        if (p.y > this.scale.height + 10) p.y = -10;
        if (p.x < -10) p.x = this.scale.width + 10;
        if (p.x > this.scale.width + 10) p.x = -10;
        this.ambientGraphics.fillStyle(p.col, p.alpha);
        this.ambientGraphics.fillCircle(p.x, p.y, p.r);
      }
    }

    // Boss pulsing dark aura
    // (çizimli düşmanlarda dairesel boss aurası yerine silüet ışıması kullanılır)
    if (this.enemy.isBoss && this.bossAuraGraphics && !this.enemyArtActive) {
      this.bossAuraGraphics.clear();
      const pulse = 0.25 + 0.15 * Math.sin(_time * 0.004);
      const auraCol = this.enemyEnraged ? 0xef4444 : GEM_COLOR_NUM[this.enemyWeakness];
      this.bossAuraGraphics.fillStyle(auraCol, pulse);
      this.bossAuraGraphics.fillCircle(
        this.enemyContainer.x,
        this.enemyContainer.y + 10,
        this.enemyContainer.scaleX * 95
      );
    }

    // Düşmana özel çizim: silüeti izleyen hafif ışıma (boss'ta zayıflık rengi, öfkede kırmızı); düşman yenilince kapanır
    if (this.enemyGlowSprite && this.enemyGlowSprite.active) {
      const ek = enemyArtKey(this.enemy.id);
      if (ek && this.enemyHp > 0) {
        const pulse = 0.5 + 0.5 * Math.sin((_time / 1000) * Math.PI * 2 / 4.4);
        const col = this.enemy.isBoss
          ? this.enemyEnraged
            ? 0xef4444
            : GEM_COLOR_NUM[this.enemyWeakness]
          : parseInt(ENEMY_ART_LAYOUT[ek].glow.slice(1), 16);
        this.enemyGlowSprite.setTint(col);
        this.enemyGlowSprite.setAlpha(0.3 + 0.22 * pulse + (this.enemyEnraged ? 0.12 : 0));
      } else {
        this.enemyGlowSprite.setAlpha(0);
      }
    }

    // Görsel kahramanlar: sınıf renginde düşük yoğunluklu, nefes alan parlama (arayüzün altında kalır)
    if (this.heroGlowGraphics) {
      const gg = this.heroGlowGraphics;
      gg.clear();
      const gid = this.initData.hero.classId;
      const GL = HERO_ART_LAYOUT[gid];
      if (GL && hasHeroArt(gid) && this.turnPhase !== 'victory') {
        const gt = _time / 1000;
        const gp = 0.5 + 0.5 * Math.sin((gt * Math.PI * 2) / 4);
        const gs = this.heroContainer.scaleX;
        const col = parseInt(HERO_CLASSES[gid].themeColor.slice(1), 16);
        const cy = this.heroContainer.y + gs * (98 - GL.float - GL.above / 2);
        const R = gs * GL.above * 0.62;
        for (let i = 6; i >= 1; i--) {
          gg.fillStyle(col, (0.012 + 0.008 * gp) * (1 - i / 8));
          gg.fillCircle(this.heroContainer.x, cy, (R * i) / 6);
        }
      }
    }

    // Kahramanın canlı büyü aurası — ekipman + seviyesi arttıkça kat kat güçlenir
    if (this.heroAuraFrontGraphics) this.heroAuraFrontGraphics.clear();
    const auraGeo = heroAuraGeometry(this.initData.hero.classId);
    const inDragonForm = this.dragonFormTurns > 0 && this.initData.hero.classId === 'dragonheart';
    if (this.heroAuraGraphics && this.heroAura.tier > 0 && auraGeo && !inDragonForm) {
      this.drawArtAura(auraGeo, _time / 1000);
    } else if (this.heroAuraGraphics && this.heroAura.tier > 0) {
      const g = this.heroAuraGraphics;
      g.clear();
      const t = this.heroAura.tier;
      const time = _time / 1000;
      const pulse = 0.72 + 0.28 * Math.sin(time * 2.1);
      const hx = this.heroContainer.x;
      const hy = this.heroContainer.y;
      const s = this.heroContainer.scaleX;
      const col = this.heroAura.color;

      // Yumuşak radyal ışık (iç içe halkalar)
      const rings = 7;
      const maxR = s * (66 + t * 15);
      for (let i = rings; i >= 1; i--) {
        const rr = (maxR * i) / rings;
        g.fillStyle(col, (0.03 + 0.018 * t) * pulse * (1 - i / (rings + 2)));
        g.fillCircle(hx, hy - s * 8, rr);
      }

      // Dönen yer rune halkası (kademe 2+)
      if (t >= 2) {
        g.lineStyle(2, col, 0.3 + 0.25 * pulse);
        const rr = s * (50 + t * 5);
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) {
          const a0 = a + time * 0.55;
          g.beginPath();
          g.arc(hx, hy + s * 72, rr, a0, a0 + Math.PI / 14);
          g.strokePath();
        }
      }

      // (savaşta dikdörtgen ışık sütunu çizilmez: yalnızca dairesel parlama)

      // Dönen büyü zerreleri (kademe 4+)
      if (this.heroAura.motes > 0) {
        for (let i = 0; i < this.heroAura.motes; i++) {
          const a = time * 1.35 + (i / this.heroAura.motes) * Math.PI * 2;
          const mx = hx + Math.cos(a) * s * (54 + t * 6);
          const my = hy - s * 8 + Math.sin(a) * s * (26 + t * 3);
          g.fillStyle(col, 0.5 + 0.4 * Math.abs(Math.sin(a)));
          g.fillCircle(mx, my, s * (2 + Math.sin(time * 3 + i) * 0.8));
        }
      }

      // Altın hale (kademe 5 — Efsanevi Nüve)
      if (t >= 5) {
        g.lineStyle(3, 0xfde047, 0.65 + 0.3 * pulse);
        g.strokeEllipse(hx, hy - s * 104, s * 58, s * 17);
      }
    }

    // Idle hint pulse after 5.5s
    if (this.turnPhase === 'player' && !this.inputLocked) {
      this.idleTimer += dt;
      if (this.idleTimer > 5.5 && !this.hintShown) {
        this.hintShown = true;
        this.showHintMove();
      }
    } else {
      this.idleTimer = 0;
      if (this.hintShown) {
        this.hintShown = false;
        this.hintGraphics.clear();
      }
    }
  }

  private handleResize() {
    if (!this.scene || !this.scene.isActive()) return;
    this.computeLayout();
    this.drawBackgroundAndFrame();
    this.repositionGridSprites();
  }

  private computeLayout() {
    const w = this.scale.width;
    const h = this.scale.height;
    const isPortrait = w < h * 1.04;

    if (isPortrait) {
      const stageH = Math.max(135, Math.min(h * 0.34, 240));
      this.stageArea = { x: 0, y: 0, w, h: stageH };
      const availH = h - stageH - 16;
      const availW = w - 20;
      this.boardPixelSize = Math.floor(Math.min(availW, availH, 460));
      this.cellSize = Math.floor(this.boardPixelSize / GRID_SIZE);
      this.boardPixelSize = this.cellSize * GRID_SIZE;
      this.boardX = Math.floor((w - this.boardPixelSize) / 2);
      this.boardY = Math.floor(stageH + (h - stageH - this.boardPixelSize) / 2);
    } else {
      const stageW = Math.floor(w * 0.45);
      this.stageArea = { x: 0, y: 0, w: stageW, h };
      const availW = w - stageW - 28;
      const availH = h - 28;
      this.boardPixelSize = Math.floor(Math.min(availW, availH, 540));
      this.cellSize = Math.floor(this.boardPixelSize / GRID_SIZE);
      this.boardPixelSize = this.cellSize * GRID_SIZE;
      this.boardX = Math.floor(stageW + (w - stageW - this.boardPixelSize) / 2);
      this.boardY = Math.floor((h - this.boardPixelSize) / 2);
    }

    // Position hero and enemy cleanly inside stageArea
    // Kahraman dokusu 300px (aura payı dahil) olduğundan 0.8 ile dengelenir
    const heroScale =
      0.8 *
      (isPortrait
        ? Math.min(0.68, this.stageArea.h / 245)
        : Math.min(0.95, this.stageArea.w / 390));
    const enemyScale =
      (this.enemy.isBoss ? 1.08 : 0.9) *
      (isPortrait ? Math.min(0.66, this.stageArea.h / 250) : Math.min(0.95, this.stageArea.w / 390));

    this.heroContainer.setPosition(
      this.stageArea.x + this.stageArea.w * 0.27,
      this.stageArea.y + this.stageArea.h * (isPortrait ? 0.57 : 0.62)
    );
    this.heroContainer.setScale(heroScale);
    this.heroBaseScale = heroScale;
    this.heroHome = { x: this.heroContainer.x, y: this.heroContainer.y };

    this.enemyContainer.setPosition(
      this.stageArea.x + this.stageArea.w * 0.74,
      this.stageArea.y + this.stageArea.h * (isPortrait ? 0.54 : 0.56)
    );
    this.enemyContainer.setScale(enemyScale);
    this.enemyHome = { x: this.enemyContainer.x, y: this.enemyContainer.y };
    this.layoutArena();
  }

  /** Arena görselini sahne alanını kaplayacak (cover) şekilde yerleştirir; savaşçıların arkasında kalır. */
  private layoutArena() {
    const img = this.arenaSprite;
    if (!img) return;
    const { x, y, w, h } = this.stageArea;
    const scale = Math.max(w / img.width, h / img.height);
    const visW = w / scale;
    const visH = h / scale;
    img.setScale(scale);
    img.setPosition(x - ((img.width - visW) / 2) * scale, y - ((img.height - visH) / 2) * scale);
    img.setCrop((img.width - visW) / 2, (img.height - visH) / 2, visW, visH);
  }

  private drawBackgroundAndFrame() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.bgGraphics.clear();

    const regionColors: Record<string, [number, number]> = {
      forest: [0x062e24, 0x09111f],
      mountains: [0x0a2540, 0x090f1f],
      volcano: [0x3b0f0c, 0x11090c],
      ruins: [0x221042, 0x0b0b1a],
      abyss: [0x2d081e, 0x05050a],
    };
    const [topCol, botCol] = regionColors[this.enemy.regionId] ?? [0x111827, 0x090b15];
    this.bgGraphics.fillGradientStyle(topCol, topCol, botCol, botCol, 1);
    this.bgGraphics.fillRect(0, 0, w, h);

    // Stage horizon floor
    const floorY = this.stageArea.y + this.stageArea.h * 0.84;
    this.bgGraphics.fillStyle(0x000000, 0.28);
    this.bgGraphics.fillRect(this.stageArea.x + 12, floorY - 12, this.stageArea.w - 24, 34);

    // Ornate Board Frame
    this.boardFrameGraphics.clear();
    const pad = 8;
    // Outer shadow & dark obsidian board backing
    this.boardFrameGraphics.fillStyle(0x090d1a, 0.92);
    this.boardFrameGraphics.fillRoundedRect(
      this.boardX - pad,
      this.boardY - pad,
      this.boardPixelSize + pad * 2,
      this.boardPixelSize + pad * 2,
      14
    );

    // Subtle checkerboard slots
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const dark = (r + c) % 2 === 0;
        this.boardFrameGraphics.fillStyle(dark ? 0x141b33 : 0x10162b, 0.95);
        this.boardFrameGraphics.fillRoundedRect(
          this.boardX + c * this.cellSize + 1,
          this.boardY + r * this.cellSize + 1,
          this.cellSize - 2,
          this.cellSize - 2,
          6
        );
      }
    }

    // Gold gilded frame border
    this.boardFrameGraphics.lineStyle(2.5, 0xd4af37, 0.72);
    this.boardFrameGraphics.strokeRoundedRect(
      this.boardX - pad,
      this.boardY - pad,
      this.boardPixelSize + pad * 2,
      this.boardPixelSize + pad * 2,
      14
    );
  }

  private cellToWorld(row: number, col: number): { x: number; y: number } {
    return {
      x: this.boardX + col * this.cellSize + this.cellSize / 2,
      y: this.boardY + row * this.cellSize + this.cellSize / 2,
    };
  }

  private worldToCell(x: number, y: number): { row: number; col: number } | null {
    const col = Math.floor((x - this.boardX) / this.cellSize);
    const row = Math.floor((y - this.boardY) / this.cellSize);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }

  private randomGemType(): GemType {
    // Altın Taş şansı — "Altın Şans" yeteneği ile artar
    const goldenChance =
      0.045 * (1 + (this.initData?.build.passives.goldenLuckPct ?? 0) / 100);
    if (this.rng() < goldenChance) return 'golden';
    return BASE_GEMS[Math.floor(this.rng() * BASE_GEMS.length)];
  }

  private buildInitialBoard() {
    this.boardContainer.removeAll(true);
    this.grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

    // Hazır 3'lü çizgi ya da 2×2 kare içermeyen, en az bir hamlesi olan başlangıç tahtası
    const types = createStartingBoard(GRID_SIZE, () => this.randomGemType(), BASE_GEMS);

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tv = this.createTileVisual(r, c, types[r][c], 'none');
        this.grid[r][c] = tv;
        // Intro drop pop
        tv.container.setScale(0.1);
        this.tweens.add({
          targets: tv.container,
          scale: 1,
          duration: 280,
          delay: (r + c) * 18,
          ease: 'Back.easeOut',
        });
      }
    }

    if (this.findPossibleMoves().length === 0) {
      this.reshuffleBoard(false);
    }
  }

  private createTileVisual(
    row: number,
    col: number,
    type: GemType,
    special: SpecialGemKind,
    frozen = 0
  ): TileVisual {
    const pos = this.cellToWorld(row, col);
    const container = this.add.container(pos.x, pos.y);
    const scale = (this.cellSize * 0.88) / 128;

    const gemSprite = this.add.image(0, 0, `gem_${type}`).setScale(scale);
    container.add(gemSprite);

    const tile: BoardTile = {
      row,
      col,
      type,
      special,
      frozen,
      id: this.nextTileId++,
    };

    const tv: TileVisual = { tile, container, gemSprite };
    this.syncTileOverlay(tv);
    this.boardContainer.add(container);
    return tv;
  }

  private syncTileOverlay(tv: TileVisual) {
    const scale = (this.cellSize * 0.88) / 128;
    if (tv.specialSprite) {
      tv.specialSprite.destroy();
      tv.specialSprite = undefined;
    }
    if (tv.tile.special !== 'none') {
      tv.specialSprite = this.add.image(0, 0, `special_${tv.tile.special}`).setScale(scale * 1.04);
      tv.container.add(tv.specialSprite);
      if (tv.tile.special === 'prismatic') {
        this.tweens.add({
          targets: tv.specialSprite,
          angle: 360,
          duration: 3600,
          repeat: -1,
        });
      }
    }
    if (tv.frozenSprite) {
      tv.frozenSprite.destroy();
      tv.frozenSprite = undefined;
    }
    if (tv.tile.frozen > 0) {
      tv.frozenSprite = this.add.image(0, 0, 'gem_frozen').setScale(scale * 1.08);
      tv.container.add(tv.frozenSprite);
    }
  }

  private repositionGridSprites() {
    const scale = (this.cellSize * 0.88) / 128;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tv = this.grid[r]?.[c];
        if (!tv) continue;
        const pos = this.cellToWorld(r, c);
        tv.container.setPosition(pos.x, pos.y);
        tv.gemSprite.setScale(scale);
        if (tv.specialSprite) tv.specialSprite.setScale(scale * 1.04);
        if (tv.frozenSprite) tv.frozenSprite.setScale(scale * 1.08);
      }
    }
    this.drawSelectionRing();
  }

  private drawSelectionRing() {
    this.selectRing.clear();
    if (!this.selectedCell) return;
    const pos = this.cellToWorld(this.selectedCell.row, this.selectedCell.col);
    this.selectRing.lineStyle(3, 0xfde047, 0.95);
    this.selectRing.strokeRoundedRect(
      pos.x - this.cellSize * 0.48,
      pos.y - this.cellSize * 0.48,
      this.cellSize * 0.96,
      this.cellSize * 0.96,
      8
    );
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    SoundEngine.unlock();
    if (this.inputLocked || this.turnPhase !== 'player') return;
    const cell = this.worldToCell(pointer.x, pointer.y);
    if (!cell) {
      this.selectedCell = null;
      this.drawSelectionRing();
      return;
    }

    const tv = this.grid[cell.row][cell.col];
    if (!tv) return;

    this.idleTimer = 0;
    this.hintGraphics.clear();
    this.dragStartCell = cell;
    this.dragStartPos = { x: pointer.x, y: pointer.y };

    if (this.selectedCell) {
      const dr = Math.abs(this.selectedCell.row - cell.row);
      const dc = Math.abs(this.selectedCell.col - cell.col);
      if (dr + dc === 1) {
        const prev = this.selectedCell;
        this.selectedCell = null;
        this.dragStartCell = null;
        this.drawSelectionRing();
        this.attemptSwap(prev, cell);
        return;
      }
    }

    this.selectedCell = cell;
    this.drawSelectionRing();
    SoundEngine.playGemSelect();
    this.tweens.add({
      targets: tv.container,
      scale: 1.12,
      duration: 90,
      yoyo: true,
    });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!pointer.isDown || !this.dragStartCell || !this.dragStartPos) return;
    if (this.inputLocked || this.turnPhase !== 'player') return;

    const dx = pointer.x - this.dragStartPos.x;
    const dy = pointer.y - this.dragStartPos.y;
    const threshold = Math.max(18, this.cellSize * 0.34);

    if (Math.hypot(dx, dy) >= threshold) {
      let targetRow = this.dragStartCell.row;
      let targetCol = this.dragStartCell.col;
      if (Math.abs(dx) > Math.abs(dy)) {
        targetCol += dx > 0 ? 1 : -1;
      } else {
        targetRow += dy > 0 ? 1 : -1;
      }

      const start = this.dragStartCell;
      this.dragStartCell = null;
      this.dragStartPos = null;
      this.selectedCell = null;
      this.drawSelectionRing();

      if (targetRow >= 0 && targetRow < GRID_SIZE && targetCol >= 0 && targetCol < GRID_SIZE) {
        this.attemptSwap(start, { row: targetRow, col: targetCol });
      }
    }
  }

  private handlePointerUp() {
    this.dragStartCell = null;
    this.dragStartPos = null;
  }

  private async attemptSwap(a: { row: number; col: number }, b: { row: number; col: number }) {
    const tvA = this.grid[a.row][a.col];
    const tvB = this.grid[b.row][b.col];
    if (!tvA || !tvB) return;

    // Frozen check
    if (tvA.tile.frozen > 0 || tvB.tile.frozen > 0) {
      SoundEngine.playInvalidSwap();
      this.spawnFloatingText(
        this.cellToWorld(a.row, a.col).x,
        this.cellToWorld(a.row, a.col).y,
        'DONMUŞ!',
        '#7dd3fc'
      );
      return;
    }

    this.inputLocked = true;
    this.turnPhase = 'resolving';
    this.mastery = setMoveKind(this.mastery, true);
    this.emitSnapshot();

    SoundEngine.playGemSwap();
    await this.animateSwap(a, b);

    // Check Special + Special or Prismatic swap!
    const spA = tvA.tile.special;
    const spB = tvB.tile.special;
    if (spA === 'prismatic' || spB === 'prismatic' || (spA !== 'none' && spB !== 'none')) {
      this.comboCount = 1;
      await this.resolveSpecialComboSwap(a, b);
      await this.cascadeAndResolve();
      this.endPlayerTurn();
      return;
    }

    const matchInfo = this.findMatches();
    if (matchInfo.matchedSet.size === 0) {
      // Revert swap
      SoundEngine.playInvalidSwap();
      await this.animateSwap(a, b);
      this.inputLocked = false;
      this.turnPhase = 'player';
      this.emitSnapshot();
      return;
    }

    this.comboCount = 0;
    await this.cascadeAndResolve(a, b);
    this.endPlayerTurn();
  }

  private animateSwap(a: { row: number; col: number }, b: { row: number; col: number }): Promise<void> {
    return new Promise((resolve) => {
      const tvA = this.grid[a.row][a.col];
      const tvB = this.grid[b.row][b.col];
      if (!tvA || !tvB) {
        resolve();
        return;
      }
      this.grid[a.row][a.col] = tvB;
      this.grid[b.row][b.col] = tvA;
      tvA.tile.row = b.row;
      tvA.tile.col = b.col;
      tvB.tile.row = a.row;
      tvB.tile.col = a.col;

      const posA = this.cellToWorld(a.row, a.col);
      const posB = this.cellToWorld(b.row, b.col);

      this.tweens.add({
        targets: tvA.container,
        x: posB.x,
        y: posB.y,
        duration: 155,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: tvB.container,
        x: posA.x,
        y: posA.y,
        duration: 155,
        ease: 'Cubic.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  private async resolveSpecialComboSwap(
    a: { row: number; col: number },
    b: { row: number; col: number }
  ) {
    const tvA = this.grid[a.row][a.col];
    const tvB = this.grid[b.row][b.col];
    if (!tvA || !tvB) return;

    const spA = tvA.tile.special;
    const spB = tvB.tile.special;
    const toDestroy = new Set<string>();
    const keyOf = (r: number, c: number) => `${r},${c}`;

    if (spA === 'prismatic' && spB === 'prismatic') {
      // Clear entire 8x8 board!
      this.spawnBannerText('KOZMİK PATLAMA!', '#fde047');
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) toDestroy.add(keyOf(r, c));
      }
    } else if (spA === 'prismatic' || spB === 'prismatic') {
      const targetTile = spA === 'prismatic' ? tvB : tvA;
      const prisTile = spA === 'prismatic' ? tvA : tvB;
      const targetColor = targetTile.tile.type;
      toDestroy.add(keyOf(prisTile.tile.row, prisTile.tile.col));

      const pPos = this.cellToWorld(prisTile.tile.row, prisTile.tile.col);
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const cell = this.grid[r][c];
          if (cell && cell.tile.type === targetColor) {
            if (targetTile.tile.special !== 'none' && targetTile.tile.special !== 'prismatic') {
              cell.tile.special = targetTile.tile.special;
            }
            toDestroy.add(keyOf(r, c));
            const cPos = this.cellToWorld(r, c);
            this.drawLightningArc(pPos.x, pPos.y, cPos.x, cPos.y, GEM_COLOR_NUM[targetColor]);
          }
        }
      }
      this.spawnBannerText('PRİZMATİK ZİNCİR!', '#d8b4fe');
    } else if (spA === 'nova' && spB === 'nova') {
      this.spawnBannerText('DEV NOVA PATLAMASI!', '#fb923c');
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = b.row + dr;
          const nc = b.col + dc;
          if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) toDestroy.add(keyOf(nr, nc));
        }
      }
    } else if (
      (spA === 'nova' && (spB === 'line_h' || spB === 'line_v')) ||
      (spB === 'nova' && (spA === 'line_h' || spA === 'line_v'))
    ) {
      this.spawnBannerText('MEGA ÇAPRAZ IŞIN!', '#fde047');
      for (let d = -1; d <= 1; d++) {
        const rr = b.row + d;
        const cc = b.col + d;
        for (let i = 0; i < GRID_SIZE; i++) {
          if (rr >= 0 && rr < GRID_SIZE) toDestroy.add(keyOf(rr, i));
          if (cc >= 0 && cc < GRID_SIZE) toDestroy.add(keyOf(i, cc));
        }
      }
    } else {
      // Cross laser
      this.spawnBannerText('ÇAPRAZ LAZER!', '#7dd3fc');
      for (let i = 0; i < GRID_SIZE; i++) {
        toDestroy.add(keyOf(b.row, i));
        toDestroy.add(keyOf(i, b.col));
      }
    }

    await this.destroyAndApplyEffect(toDestroy, new Map());
    await this.applyGravityAndRefill();
  }

  private applyRelicEffects(counts: Record<GemType, number>, squareCount: number) {
    const effects = this.initData.build.relicEffects;
    if (!effects || (effects.firstMatchUlti <= 0 && effects.squareShieldPct <= 0)) return;
    const res = resolveRelicMatch({ effects, flags: this.relicFlags, counts, squareCount, heroMaxHp: this.heroMaxHp });
    this.relicFlags = res.flags;
    if (res.ulti > 0) {
      this.heroUlti = Math.min(this.heroMaxUlti, this.heroUlti + res.ulti);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 152, `+${res.ulti} Ulti (Kıvılcım)`, '#fde047', 15);
    }
    if (res.shield > 0) {
      this.heroShield += res.shield;
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 168, `+${res.shield} Kalkan (Siper)`, '#86efac', 15);
    }
    this.emitSnapshot();
  }

  /** Kuşanılmış setlerin 4 parça bonusları: her biri oyuncu turunda yalnızca bir kez tetiklenir. */
  private applySetFirstMatchEffects(counts: Record<GemType, number>, squareCount: number) {
    const effects = this.initData.build.setEffects;
    if (
      effects.firstFireUlti <= 0 &&
      effects.squareShieldPct <= 0 &&
      effects.natureCooldownReduce <= 0
    ) {
      return;
    }
    const hero = this.initData.hero;
    const res = resolveSetFirstMatch({
      effects,
      flags: this.setFlags,
      counts,
      squareCount,
      heroMaxHp: this.heroMaxHp,
      heroShield: this.heroShield,
      shieldPool: this.setShieldPool,
      cooldowns: this.skillCooldowns,
      skillOrder: getSkillLoadout(hero.classId, hero.level).map((sk) => sk.id),
    });
    this.setFlags = res.flags;
    this.setShieldPool = res.shieldPool;

    if (res.ulti > 0) {
      this.heroUlti = Math.min(this.heroMaxUlti, this.heroUlti + res.ulti);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 104, `+${res.ulti} Ulti (${getSet('ember').shortName})`, '#fb923c', 15);
    }
    if (res.shield > 0) {
      this.heroShield += res.shield;
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 120, `+${res.shield} Kalkan (${getSet('glacier').shortName})`, '#7dd3fc', 15);
    }
    if (res.cooldownTarget) {
      const id = res.cooldownTarget;
      this.skillCooldowns[id] = Math.max(0, (this.skillCooldowns[id] ?? 0) - res.cooldownReduce);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 136, `Bekleme -${res.cooldownReduce} (${getSet('life').shortName})`, '#86efac', 15);
    }
    this.emitSnapshot();
  }

  private applyHuntFireRule(counts: Record<GemType, number>) {
    const hunt = this.initData.hunt;
    if (!hunt) return;
    const frozenTiles: TileVisual[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tv = this.grid[r][c];
        if (tv && tv.tile.frozen > 0) frozenTiles.push(tv);
      }
    }
    const effect = resolveHuntFireRule(hunt, { usedThisTurn: this.huntRuleUsed }, counts, frozenTiles.length);
    this.huntRuleUsed = effect.usedThisTurn;

    if (effect.thaw > 0) {
      this.shuffle(frozenTiles);
      for (const tv of frozenTiles.slice(0, effect.thaw)) {
        tv.tile.frozen = 0;
        this.syncTileOverlay(tv);
        const pos = this.cellToWorld(tv.tile.row, tv.tile.col);
        this.spawnGemBurst(pos.x, pos.y, 'frost');
        this.spawnFloatingText(pos.x, pos.y - 18, 'BUZ ÇÖZÜLDÜ', '#7dd3fc', 14);
      }
    }
    if (effect.ulti > 0) {
      this.heroUlti = Math.min(this.heroMaxUlti, this.heroUlti + effect.ulti);
      this.spawnFloatingText(
        this.heroContainer.x,
        this.heroContainer.y - 88,
        `+${effect.ulti} Ulti (Av)`,
        '#fdba74',
        15
      );
    }
  }

  private tileGrid(): MatchGrid {
    return this.grid.map((row) => row.map((tv) => (tv ? tv.tile : null)));
  }

  private findMatches(): MatchResult {
    return findMatches(this.tileGrid());
  }

  private async cascadeAndResolve(
    swapA?: { row: number; col: number },
    swapB?: { row: number; col: number }
  ) {
    let firstPass = true;
    while (true) {
      const { matchedSet, spawns, squares } = this.findMatches();
      if (matchedSet.size === 0) break;

      // Her kaskad adımı tek bir saldırı eylemidir: aynı adımdaki tüm taş türleri/hasar kayıtları saldırı görselini bir kez oynatır
      this.stepActionId = ++this.attackActionSeq;
      this.heroSkillLock = false;
      this.comboCount += 1;
      SoundEngine.setIntensity(this.comboCount);
      if (this.comboCount >= 2) {
        this.triggerComboMilestone(this.comboCount);
      }

      // Prefer placing spawned special on swapped tile if inside match
      if (firstPass && swapA && swapB) {
        const adjustedSpawns = new Map<string, { type: GemType; special: SpecialGemKind }>();
        for (const [k, val] of spawns.entries()) {
          const kA = `${swapA.row},${swapA.col}`;
          const kB = `${swapB.row},${swapB.col}`;
          if (matchedSet.has(kB) && this.grid[swapB.row][swapB.col]?.tile.type === val.type) {
            adjustedSpawns.set(kB, val);
          } else if (matchedSet.has(kA) && this.grid[swapA.row][swapA.col]?.tile.type === val.type) {
            adjustedSpawns.set(kA, val);
          } else {
            adjustedSpawns.set(k, val);
          }
        }
        await this.destroyAndApplyEffect(matchedSet, adjustedSpawns, squares);
      } else {
        await this.destroyAndApplyEffect(matchedSet, spawns, squares);
      }
      firstPass = false;

      if (this.enemyHp <= 0) break;

      await this.applyGravityAndRefill();
      await this.waitMs(110);
    }

    // Reshuffle if no moves left and enemy alive
    if (this.enemyHp > 0 && this.findPossibleMoves().length === 0) {
      await this.reshuffleBoard(true);
    }
  }

  private triggerComboMilestone(combo: number) {
    if (combo === 2) {
      this.spawnBannerText('KOMBO x2! (+%35 Hasar)', '#facc15');
    } else if (combo === 3) {
      this.spawnBannerText('KOMBO x3! EKSTRA SALDIRI!', '#fb923c');
      this.attackActionId = this.stepActionId;
      this.dealHeroAttackToEnemy(Math.round(this.initData.build.stats.attack * 1.35), 'fire', true);
    } else if (combo === 5) {
      this.spawnBannerText('KOMBO x5! GÜÇ PATLAMASI!', '#e879f9');
      this.attackActionId = this.stepActionId;
      this.dealHeroAttackToEnemy(Math.round(this.initData.build.stats.attack * 2.4), 'arcane', true);
      this.heroMana = Math.min(this.heroMaxMana, this.heroMana + 20);
    } else if (combo >= 8) {
      this.spawnBannerText('EFSANEVİ KOMBO x8! TAM ULTİ!', '#f43f5e');
      this.heroUlti = this.heroMaxUlti;
      this.attackActionId = this.stepActionId;
      this.dealHeroAttackToEnemy(Math.round(this.initData.build.stats.attack * 3.5), 'golden', true);
    } else {
      this.spawnBannerText(`KOMBO x${combo}!`, '#fde047');
    }
  }

  private expandSpecialTriggers(initialSet: Set<string>): Set<string> {
    const finalSet = new Set<string>(initialSet);
    const queue = Array.from(initialSet);
    const visitedSpecials = new Set<string>();

    while (queue.length > 0) {
      const k = queue.shift()!;
      if (visitedSpecials.has(k)) continue;
      const [r, c] = k.split(',').map(Number);
      const tv = this.grid[r]?.[c];
      if (!tv || tv.tile.special === 'none') continue;

      visitedSpecials.add(k);
      const sp = tv.tile.special;
      const pos = this.cellToWorld(r, c);

      if (sp === 'line_h') {
        this.drawBeamEffect(this.boardX, pos.y, this.boardX + this.boardPixelSize, pos.y, GEM_COLOR_NUM[tv.tile.type]);
        for (let cc = 0; cc < GRID_SIZE; cc++) {
          const nk = `${r},${cc}`;
          if (!finalSet.has(nk)) {
            finalSet.add(nk);
            queue.push(nk);
          }
        }
      } else if (sp === 'line_v') {
        this.drawBeamEffect(pos.x, this.boardY, pos.x, this.boardY + this.boardPixelSize, GEM_COLOR_NUM[tv.tile.type]);
        for (let rr = 0; rr < GRID_SIZE; rr++) {
          const nk = `${rr},${c}`;
          if (!finalSet.has(nk)) {
            finalSet.add(nk);
            queue.push(nk);
          }
        }
      } else if (sp === 'nova') {
        this.drawShockwave(pos.x, pos.y, 0xfb923c, this.cellSize * 1.8);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              const nk = `${nr},${nc}`;
              if (!finalSet.has(nk)) {
                finalSet.add(nk);
                queue.push(nk);
              }
            }
          }
        }
      } else if (sp === 'prismatic') {
        const targetType = tv.tile.type;
        for (let rr = 0; rr < GRID_SIZE; rr++) {
          for (let cc = 0; cc < GRID_SIZE; cc++) {
            if (this.grid[rr][cc]?.tile.type === targetType) {
              const nk = `${rr},${cc}`;
              if (!finalSet.has(nk)) {
                finalSet.add(nk);
                queue.push(nk);
              }
            }
          }
        }
      }
    }
    return finalSet;
  }

  /** Kare eşleşmesinin dört taşını çevreleyen, tür renginde kısa ışık çerçevesi. */
  private async playSquareHighlight(squares: Square[]) {
    const size = this.cellSize * 2;
    for (const sq of squares) {
      const tl = this.cellToWorld(sq.row, sq.col);
      const cx = tl.x + this.cellSize / 2;
      const cy = tl.y + this.cellSize / 2;
      const color = GEM_COLOR_NUM[sq.type];
      const half = size / 2 + 3;
      const g = this.add.graphics();
      g.setPosition(cx, cy);
      g.fillStyle(color, 0.2);
      g.fillRoundedRect(-half, -half, half * 2, half * 2, 12);
      g.lineStyle(5, color, 0.95);
      g.strokeRoundedRect(-half, -half, half * 2, half * 2, 12);
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeRoundedRect(-half + 3, -half + 3, half * 2 - 6, half * 2 - 6, 9);
      this.vfxContainer.add(g);
      this.tweens.add({
        targets: g,
        alpha: 0,
        scale: 1.14,
        duration: 380,
        ease: 'Quad.easeIn',
        onComplete: () => g.destroy(),
      });
      this.spawnFloatingText(cx, cy - half - 8, 'KARE!', '#fde68a', 14);
    }
    SoundEngine.playGemSelect();
    await this.waitMs(150);
  }

  private async destroyAndApplyEffect(
    rawMatched: Set<string>,
    spawns: Map<string, { type: GemType; special: SpecialGemKind }>,
    squares: Square[] = []
  ) {
    // 2×2 kare: dört taş kısa bir ışık çerçevesiyle vurgulanır, sonra patlar
    if (squares.length > 0) await this.playSquareHighlight(squares);
    const allDestroyed = this.expandSpecialTriggers(rawMatched);
    // Ustalık: yok edilen donmuş taşlar (ateş çözülmesinden önce sayılır)
    let frozenCleared = 0;
    for (const k of allDestroyed) {
      const [fr, fc] = k.split(',').map(Number);
      if ((this.grid[fr]?.[fc]?.tile.frozen ?? 0) > 0) frozenCleared += 1;
    }
    const counts: Record<GemType, number> = {
      fire: 0,
      frost: 0,
      nature: 0,
      lightning: 0,
      arcane: 0,
      golden: 0,
    };

    const centers: Record<GemType, { x: number; y: number }[]> = {
      fire: [],
      frost: [],
      nature: [],
      lightning: [],
      arcane: [],
      golden: [],
    };

    for (const k of allDestroyed) {
      const [r, c] = k.split(',').map(Number);
      const tv = this.grid[r]?.[c];
      if (!tv) continue;
      const gType = tv.tile.type;
      counts[gType] += 1;
      const pos = this.cellToWorld(r, c);
      centers[gType].push(pos);

      // Thaw adjacent frozen tiles if fire gem matched!
      if (gType === 'fire') {
        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const adj = this.grid[r + dr]?.[c + dc];
          if (adj && adj.tile.frozen > 0) {
            adj.tile.frozen = 0;
            frozenCleared += 1;
            this.syncTileOverlay(adj);
          }
        }
      }

      if (spawns.has(k)) {
        // Transform into Special Gem instead of removing!
        const spInfo = spawns.get(k)!;
        tv.tile.type = spInfo.type;
        tv.tile.special = spInfo.special;
        tv.tile.frozen = 0;
        tv.gemSprite.setTexture(`gem_${spInfo.type}`);
        this.syncTileOverlay(tv);
        this.tweens.add({
          targets: tv.container,
          scale: 1.35,
          duration: 160,
          yoyo: true,
        });
      } else {
        this.spawnGemBurst(pos.x, pos.y, gType);
        tv.container.destroy();
        this.grid[r][c] = null;
      }
    }

    this.mastery = onFrozenCleared(onResolve(this.mastery, counts, squares.length), frozenCleared);
    this.applyCompanionOnMatch(counts, squares.length);
    this.applyHeroPassiveOnMatch(squares.length);

    // Boss Avı kuralı: turun ilk ateş eşleşmesi (zincirlerde tekrar etmez)
    this.applyHuntFireRule(counts);
    // Ekipman seti bonusları: turun ilk ateş / kare / doğa eşleşmesi
    this.applySetFirstMatchEffects(counts, squares.length);
    // Zindan geçici güçleri: turun ilk eşleşmesi ulti, savaşın ilk karesi kalkan
    this.applyRelicEffects(counts, squares.length);

    // Play match audio based on dominant gem
    const dominant = (Object.keys(counts) as GemType[]).sort((a, b) => counts[b] - counts[a])[0];
    if (counts[dominant] > 0) {
      SoundEngine.playGemMatch(this.comboCount, dominant);
    }

    //Lightning connecting visual between matched yellow gems!
    if (centers.lightning.length >= 2) {
      for (let i = 0; i < centers.lightning.length - 1; i++) {
        this.drawLightningArc(
          centers.lightning[i].x,
          centers.lightning[i].y,
          centers.lightning[i + 1].x,
          centers.lightning[i + 1].y,
          0xfacc15
        );
      }
    }

    // Launch glowing orbs to Hero or Enemy & apply combat effects!
    this.initData.onMatchStats(counts, this.comboCount, false);
    this.applyGemCombatEffects(counts, centers);

    this.emitSnapshot();
    await this.waitMs(185);
  }

  private applyGemCombatEffects(
    counts: Record<GemType, number>,
    centers: Record<GemType, { x: number; y: number }[]>
  ) {
    const build = this.initData.build;
    const classId = this.initData.hero.classId;
    const actionId = this.stepActionId;
    // Fırtına Çağıran: kombo 3+ iken yıldırımlar aşırı yüklenir
    const stormBonus =
      classId === 'stormcaller' && this.comboCount >= 3
        ? 1 + build.passives.stormOverloadPct / 100
        : 1;
    // Ejder Formu: tüm hasar +%60 (yetenek ağacıyla artar)
    const formBonus =
      this.dragonFormTurns > 0 ? 1.6 + build.passives.dragonScalePct / 100 : 1;
    const comboMult =
      (1 + (this.comboCount - 1) * (0.28 + build.passives.comboBoostPct / 100)) *
      stormBonus *
      formBonus;
    const atk = build.stats.attack * (1 + this.heroRageStacks * 0.08);
    const elemBoost = 1 + build.stats.elementalDamage / 100;

    // 1. RED FLAME GEM -> Physical/Fire damage + Rage stacks
    if (counts.fire > 0) {
      const bonus =
        1 +
        (build.passives.fireDmgPct +
          build.passives.gemBonuses.fire +
          (classId === 'dragonheart' ? 40 : 0)) /
          100;
      const dmg = Math.round(atk * (0.34 * counts.fire) * comboMult * bonus);
      const critFire = this.rollCrit('fire');
      if (classId === 'warrior' || classId === 'dragonheart') {
        this.heroRageStacks = Math.min(12, this.heroRageStacks + 1);
      }
      // Ejder Kalbi: alev taşları ejder pullarını besler, küçük can yeniler
      if (classId === 'dragonheart' && build.passives.dragonScalePct > 0) {
        const scaleHeal = Math.round(this.heroMaxHp * 0.008 * counts.fire);
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + scaleHeal);
      }
      this.launchOrbs(centers.fire, this.enemyContainer.x, this.enemyContainer.y, 0xef4444, () => {
        this.attackActionId = actionId;
        this.dealHeroAttackToEnemy(dmg, 'fire', critFire);
      });
    }

    // 2. BLUE FROST GEM -> Mana + Frost chill (slows enemy!)
    if (counts.frost > 0) {
      const bonus =
        1 +
        (build.passives.frostManaPct +
          build.passives.gemBonuses.frost +
          (classId === 'mage' || classId === 'stormcaller' ? 35 : 0)) /
          100;
      const manaGain = Math.round(counts.frost * 5.2 * comboMult * bonus);
      const dmg = Math.round(atk * 0.16 * counts.frost * elemBoost * comboMult);
      const critFrost = this.rollCrit('frost');
      this.launchOrbs(centers.frost, this.heroContainer.x, this.heroContainer.y, 0x38bdf8, () => {
        this.heroMana = Math.min(this.heroMaxMana, this.heroMana + manaGain);
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 46, `+${manaGain} Mana`, '#38bdf8');
        if (counts.frost >= 4 && this.enemyFrozenTurns === 0) {
          this.enemyFrozenTurns = 1;
          this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 60, 'YAVAŞLADI!', '#7dd3fc');
        }
        this.attackActionId = actionId;
        this.dealHeroAttackToEnemy(dmg, 'frost', critFrost);
      });
    }

    // 3. GREEN NATURE GEM -> Healing + Shield
    if (counts.nature > 0) {
      const bonus =
        1 +
        (build.passives.natureHealPct +
          build.passives.gemBonuses.nature +
          (classId === 'paladin' ? 30 : 0)) /
          100;
      // Yaşam seti 2 parça: yalnızca iyileştirmeyi artırır (kalkan etkilenmez)
      const healAmt = Math.round(
        this.heroMaxHp * 0.025 * counts.nature * comboMult * bonus * (1 + build.passives.natureHealOnlyPct / 100)
      );
      const shieldAmt = Math.round((16 + build.stats.defense * 0.9) * counts.nature * 0.55 * bonus);
      // Kök Filizi: eşik, eşleşmenin iyileştirmesi uygulanmadan önce kontrol edilir
      let sproutHeal = 0;
      if (this.initData.companion === 'root_sprout') {
        const sp = sproutTrigger(this.companionState, this.heroHp, this.heroMaxHp, counts.nature);
        this.companionState = sp.state;
        sproutHeal = sp.heal;
      }
      this.launchOrbs(centers.nature, this.heroContainer.x, this.heroContainer.y, 0x22c55e, () => {
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + healAmt + sproutHeal);
        if (sproutHeal > 0) this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 90, `KÖK FİLİZİ +${sproutHeal} Can`, '#86efac', 15);
        this.heroShield = Math.max(this.heroShield, capGemShield(this.heroShield + shieldAmt, this.heroMaxHp));
        this.spawnFloatingText(
          this.heroContainer.x - 16,
          this.heroContainer.y - 38,
          `+${healAmt} Can`,
          '#4ade80'
        );
        this.spawnFloatingText(
          this.heroContainer.x + 22,
          this.heroContainer.y - 54,
          `+${shieldAmt} Kalkan`,
          '#86efac'
        );
      });
    }

    // 4. YELLOW LIGHTNING GEM -> Rapid high-crit damage + Ulti/Combo energy
    if (counts.lightning > 0) {
      const bonus =
        1 +
        (build.passives.lightningCritPct +
          build.passives.gemBonuses.lightning +
          (classId === 'stormcaller' || classId === 'assassin' ? 40 : 0)) /
          100;
      const dmg = Math.round(atk * 0.31 * counts.lightning * elemBoost * comboMult * bonus);
      const critLightning = counts.lightning < 4 && this.rollCrit('lightning');
      this.launchOrbs(centers.lightning, this.enemyContainer.x, this.enemyContainer.y, 0xfacc15, () => {
        this.attackActionId = actionId;
        this.dealHeroAttackToEnemy(dmg, 'lightning', counts.lightning >= 4 || critLightning);
      });
    }

    // 5. PURPLE ARCANE GEM -> Charges Ultimate + Piercing Magic Damage
    if (counts.arcane > 0) {
      const bonus =
        1 +
        (build.passives.arcaneUltiPct +
          build.passives.gemBonuses.arcane +
          (classId === 'mage' ? 35 : 0) +
          (classId === 'necromancer' ? 40 : 0)) /
          100;
      const ultiGain = Math.round(counts.arcane * 6.8 * bonus);
      const dmg = Math.round(atk * 0.28 * counts.arcane * elemBoost * comboMult);
      const critArcane = this.rollCrit('arcane');
      this.launchOrbs(centers.arcane, this.heroContainer.x, this.heroContainer.y, 0xa855f7, () => {
        this.heroUlti = Math.min(this.heroMaxUlti, this.heroUlti + ultiGain);
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 65, `+${ultiGain} Ulti`, '#d8b4fe');
        this.attackActionId = actionId;
        this.dealHeroAttackToEnemy(dmg, 'arcane', critArcane, true);
      });
    }

    // 6. GOLDEN SPECIAL GEM -> Omni-Bonus!
    if (counts.golden > 0) {
      const bonus = 1 + build.passives.gemBonuses.golden / 100;
      const dmg = Math.round(atk * 0.55 * counts.golden * comboMult * bonus);
      const manaGain = 15 * counts.golden;
      const healAmt = Math.round(this.heroMaxHp * 0.05 * counts.golden);
      const ultiGain = 14 * counts.golden;
      this.launchOrbs(centers.golden, this.enemyContainer.x, this.enemyContainer.y, 0xfde047, () => {
        this.heroMana = Math.min(this.heroMaxMana, this.heroMana + manaGain);
        this.heroUlti = Math.min(this.heroMaxUlti, this.heroUlti + ultiGain);
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + healAmt);
        this.heroShield = Math.max(this.heroShield, capGemShield(this.heroShield + 35 * counts.golden, this.heroMaxHp));
        this.attackActionId = actionId;
        this.dealHeroAttackToEnemy(dmg, 'golden', true, true);
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 78, 'ALTIN BEREKET!', '#fde047');
      });
    }
  }

  /** Kritik kararı: rastgelelik akışından tam bir çekiliş (kritik güçlendirmesi varsa çekilmez). */
  private rollCrit(element: GemType): boolean {
    return (
      this.heroCritBuffTurns > 0 ||
      this.combatRng() * 100 < this.initData.build.stats.critChance + (element === 'lightning' ? 12 : 0)
    );
  }

  private dealHeroAttackToEnemy(
    rawDmg: number,
    element: GemType,
    forceCrit = false,
    pierceDefense = false
  ) {
    const actionId = this.attackActionId;
    this.attackActionId = 0;
    if (this.enemyHp <= 0) return;

    const build = this.initData.build;
    // Kritik kararı, zamanlamaya bağlı olmaması için taş efektlerinde saldırı planlanırken önceden verilir (forceCrit)
    const isCrit = forceCrit || this.rollCrit(element);

    // Suikastçı pasifi: her kritik vuruş kanama biriktirir
    if (isCrit && this.initData.hero.classId === 'assassin') {
      this.enemyBleedTurns = Math.max(this.enemyBleedTurns, 1);
    }

    let dmg = rawDmg;
    if (isCrit) {
      dmg = Math.round(dmg * (build.stats.critDamage / 100));
    }

    // Weakness & Resistance & Boss bonus
    const isWeak = element === this.enemyWeakness || element === 'golden';
    const isRes = this.enemy.resistance === element;
    if (isWeak) dmg = Math.round(dmg * (1.45 + build.passives.weaknessBonusPct / 100));
    if (isRes) dmg = Math.round(dmg * 0.72);
    if (this.enemy.isBoss && build.passives.bossDmgPct > 0) {
      dmg = Math.round(dmg * (1 + build.passives.bossDmgPct / 100));
    }

    if (!pierceDefense) {
      dmg = Math.max(8, Math.round(dmg - this.enemy.defense * 0.45));
    }

    // Lifesteal passive
    if (build.passives.lifestealPct > 0) {
      const stolen = Math.max(1, Math.round((dmg * build.passives.lifestealPct) / 100));
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + stolen);
    }

    // Apply to enemy shield first
    let hpDamage = dmg;
    if (this.enemyShield > 0) {
      const absorbed = Math.min(this.enemyShield, hpDamage);
      this.enemyShield -= absorbed;
      hpDamage -= absorbed;
    }

    this.enemyHp = Math.max(0, this.enemyHp - hpDamage);
    this.heroUlti = Math.min(this.heroMaxUlti, this.heroUlti + 4);
    this.lastDealt = dmg;
    // Vampir — Kan Bağı: her oyuncu turunda verilen ilk doğrudan hasar için bir kez can yeniler
    if (this.initData.hero.classId === 'vampire') {
      const bb = bloodBond(dmg, this.heroMaxHp, this.bloodBondUsed);
      this.bloodBondUsed = bb.used;
      if (bb.heal > 0) {
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + bb.heal);
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 100, `KAN BAĞI +${bb.heal} Can`, '#fb7185', 15);
      }
    }

    // Saldırı animasyonu: eylem başına bir kez (aynı adımın diğer hasar kayıtları ve yetenekler tekrar oynatmaz)
    let contactMs = 0;
    if (shouldPlayAttackAnim({ lastActionId: this.lastAttackActionId, busy: this.heroAnimBusy, skillLock: this.heroSkillLock }, actionId)) {
      if (actionId > 0) this.lastAttackActionId = actionId;
      const profile = heroAttackProfile(this.initData.hero.classId, this.initData.hero.equipped.weapon?.category);
      contactMs = this.playAttackAnim('hero', profile, { color: GEM_COLOR_NUM[element], crit: isCrit, action: actionId });
    }

    // Düşman hasar tepkisi temas anında gösterilir (hasar hesabı ve durum değişimi anında yapılmıştır)
    this.holdEnemyIdle(380);
    const showHit = () => {
      if (!this.enemySprite || !this.enemySprite.active) return;
      SoundEngine.playWeaponHit(isCrit);
      this.enemySprite.setTintFill(0xffffff);
      this.time.delayedCall(95, () => {
        if (this.enemySprite && this.enemySprite.active) this.enemySprite.clearTint();
      });
      // Geri tepme her zaman başlangıç konumuna göre yapılır (art arda vuruşlarda konum kaymaz)
      this.tweens.add({
        targets: this.enemyContainer,
        x: this.enemyHome.x + (isCrit ? 16 : 8),
        duration: 75,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (this.enemyContainer?.active) this.tweens.add({ targets: this.enemyContainer, x: this.enemyHome.x, duration: 75, ease: 'Quad.easeIn' });
        },
      });
      if (isCrit && this.initData.settings.screenShake) {
        this.cameras.main.shake(this.d(140), 0.009);
      }
      this.spawnFloatingText(
        this.enemyContainer.x + (Math.random() - 0.5) * 32,
        this.enemyContainer.y - 40,
        label,
        col,
        isCrit ? 22 : 17
      );
    };

    const label = isCrit
      ? `KRİTİK! -${dmg}`
      : isWeak
        ? `ZAYIFLIK! -${dmg}`
        : `-${dmg}`;
    const col = isCrit ? '#fde047' : isWeak ? '#fb923c' : '#ffffff';
    if (contactMs > 0 && this.enemyHp > 0) this.time.delayedCall(contactMs, showHit);
    else showHit();

    this.handlePhaseChange();

    if (this.enemyHp <= 0) {
      this.handleVictory();
    } else {
      this.emitSnapshot();
    }
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Ortak saldırı animasyonları (kahraman ve düşman). Tek parça PNG'lerde hareket küçük konum/dönüş değişimidir; silah izi ve
  // temas/atış efektleri ayrı grafiklerdir. Süreler 1× hızdadır: sahne zamanlayıcıları hız çarpanıyla ölçeklenir (2×'te yarı süre).
  // ---------------------------------------------------------------------------------------------------------------

  /** Düşmanın saldırı efekt rengi: çizimin parıltı rengi, yoksa kırmızımsı. */
  private enemyAttackColor(): number {
    const k = enemyArtKey(this.enemy.id);
    const glow = k ? ENEMY_ART_LAYOUT[k]?.glow : undefined;
    return glow ? parseInt(glow.slice(1), 16) : 0xf87171;
  }

  /**
   * Bir saldırı animasyonunu oynatır ve temas anına kadar geçen süreyi (1× ms) döndürür; çağıran hasar tepkisini bu süreye hizalar.
   * `ownVfx`: yetenek kendi efektini çiziyor; yalnızca poz verilir (hamle yok, iz/temas/atış yok) ve çift oynatma olmaz.
   */
  private playAttackAnim(
    side: 'hero' | 'enemy',
    profile: AttackProfile,
    opts: { color: number; crit?: boolean; ownVfx?: boolean; action?: number; holdMs?: number }
  ): number {
    const hero = side === 'hero';
    const cont = hero ? this.heroContainer : this.enemyContainer;
    const sprite = hero ? this.heroSprite : this.enemySprite;
    const foe = hero ? this.enemyContainer : this.heroContainer;
    if (!cont || !sprite || !sprite.active || !foe) return 0;
    const dir = hero ? 1 : -1;
    const T = ATTACK_TIMING[profile.type];
    const own = !!opts.ownVfx;
    const crit = !!opts.crit;
    const homeOf = () => (hero ? this.heroHome : this.enemyHome); // yerleşim yenilenirse güncel konum kullanılır
    const flip = Math.sign(cont.scaleX) || 1;
    const col = opts.color;

    this.attackAnimLog.push({ side, type: profile.type, style: profile.style, trail: profile.trail, action: opts.action ?? 0, skill: own, at: this.time.now });
    if (this.attackAnimLog.length > 80) this.attackAnimLog.shift();

    const hold = opts.holdMs ?? T.total + 140;
    if (hero) {
      this.holdHeroBreath(hold);
      this.heroAnimBusy = true;
    } else {
      this.holdEnemyIdle(hold);
    }
    const swapTexture = hero && !own;
    if (swapTexture) this.heroSprite.setTexture(this.heroAttackKey);

    // --- Gövde hareketi: küçük konum + dönüş (yakın dövüşte hedefe hamle, menzilli saldırıda geri çekilme, büyüde yerinde duruş) ---
    const dist = Math.abs(foe.x - cont.x);
    const lunge = profile.type === 'melee_weapon' ? 26 : profile.type === 'melee_unarmed' ? 20 : 0;
    const recoil = profile.type === 'ranged' ? -9 : 0;
    const home = homeOf();
    const dx = own ? 0 : dir * Math.min(lunge * (crit ? 1.3 : 1), dist * 0.2) + dir * recoil;
    const tiltDeg = ({ melee_weapon: 6, melee_unarmed: 5, spell: 3, ranged: -3 } as const)[profile.type] * dir * flip;
    const fwdMs = Math.max(40, T.contact * 0.8);
    const backMs = Math.max(60, T.total - fwdMs);
    const finish = () => {
      if (cont.active && !own) cont.x = homeOf().x;
      if (sprite.active) sprite.angle = 0;
      if (hero) {
        this.heroAnimBusy = false;
        if (swapTexture && this.heroSprite?.active) this.heroSprite.setTexture(this.heroIdleKey);
      }
    };
    this.tweens.add({ targets: sprite, angle: tiltDeg, duration: fwdMs, ease: 'Cubic.easeOut' });
    if (!own && dx !== 0) this.tweens.add({ targets: cont, x: home.x + dx, duration: fwdMs, ease: 'Cubic.easeOut' });
    this.time.delayedCall(fwdMs, () => {
      if (!sprite.active) return finish();
      this.tweens.add({ targets: sprite, angle: 0, duration: backMs, ease: 'Sine.easeInOut' });
      if (!own && cont.active) this.tweens.add({ targets: cont, x: homeOf().x, duration: backMs, ease: 'Sine.easeInOut', onComplete: finish });
      else this.time.delayedCall(backMs, finish);
    });

    // --- Efektler (yetenek kendi efektini çiziyorsa yalnızca büyü ışığı) ---
    const sc = Math.abs(cont.scaleX) || 1;
    const hx = cont.x + dir * 58 * sc;
    const hy = cont.y - 8 * sc;
    const tx = foe.x - dir * 14;
    const ty = foe.y - 20;
    const at = (ms: number, fn: () => void) => this.time.delayedCall(ms, () => cont.active && fn());

    if (profile.type === 'melee_weapon') {
      if (!own) at(T.contact * 0.35, () => this.drawSweepTrail(tx - dir * 6, ty + 4, dir, profile.trail ?? 'thin', col, crit, T.contact * 0.65));
    } else if (profile.type === 'melee_unarmed') {
      if (!own) at(T.contact * 0.8, () => this.drawContactBurst(profile.style ?? 'fist', tx, ty, dir, col));
    } else if (profile.type === 'spell') {
      const glowMs = T.contact * 0.5;
      this.drawSpellGlow(hx, hy, col, glowMs, T.total - 40);
      if (!own) at(glowMs, () => this.launchSmallBolt(hx, hy, tx, ty, col, T.contact - glowMs));
    } else if (!own) {
      at(T.contact * 0.45, () => this.launchArrow(hx, hy, tx, ty, col, T.contact * 0.55));
    }
    return T.contact;
  }

  /** Kavisli savurma izi: kuyruktan başa doğru incelen/kalınlaşan, açılarak çizilen yay. `thin` kılıç, `wide` balta/çekiç. */
  private drawSweepTrail(cx: number, cy: number, dir: number, kind: 'thin' | 'wide', color: number, crit: boolean, sweepMs: number) {
    const g = this.add.graphics();
    this.vfxContainer.add(g);
    const wide = kind === 'wide';
    const r = (wide ? 60 : 48) * (crit ? 1.12 : 1);
    const w0 = (wide ? 9 : 3.6) * (crit ? 1.2 : 1);
    const a0 = (-150 * Math.PI) / 180;
    const a1 = (22 * Math.PI) / 180;
    const pt = (t: number) => {
      const th = a0 + (a1 - a0) * t;
      return { x: cx + dir * r * Math.cos(th), y: cy + r * 0.9 * Math.sin(th) };
    };
    const draw = (p: number) => {
      g.clear();
      const n = 12;
      for (let i = 0; i < n; i++) {
        const t0 = (p * i) / n;
        const t1 = (p * (i + 1)) / n;
        const k = (i + 1) / n;
        const q0 = pt(t0);
        const q1 = pt(t1);
        g.lineStyle(w0 * (0.25 + 0.75 * k) + (wide ? 5 : 3), color, 0.18 + 0.3 * k);
        g.lineBetween(q0.x, q0.y, q1.x, q1.y);
        g.lineStyle(w0 * (0.25 + 0.75 * k), 0xf8fafc, 0.35 + 0.6 * k);
        g.lineBetween(q0.x, q0.y, q1.x, q1.y);
      }
    };
    const st = { p: 0.02 };
    draw(st.p);
    this.tweens.add({
      targets: st,
      p: 1,
      duration: Math.max(40, sweepMs),
      ease: 'Cubic.easeOut',
      onUpdate: () => draw(st.p),
      onComplete: () =>
        this.tweens.add({ targets: g, alpha: 0, duration: 110, onComplete: () => g.destroy() }),
    });
  }

  /** Silahsız temas efekti: yumruk halkası, pençe izi, ısırık dişleri veya kıskaç yayları. */
  private drawContactBurst(style: 'fist' | 'claw' | 'bite' | 'pincer', x: number, y: number, dir: number, color: number) {
    const g = this.add.graphics();
    this.vfxContainer.add(g);
    const draw = (p: number) => {
      g.clear();
      const a = 1 - p * 0.75;
      if (style === 'fist') {
        g.lineStyle(3.2, 0xf8fafc, a);
        g.strokeCircle(x, y, 6 + 16 * p);
        g.lineStyle(2.2, color, a);
        for (let i = 0; i < 6; i++) {
          const th = (i / 6) * Math.PI * 2 + 0.3;
          g.lineBetween(x + Math.cos(th) * (9 + 9 * p), y + Math.sin(th) * (9 + 9 * p), x + Math.cos(th) * (15 + 15 * p), y + Math.sin(th) * (15 + 15 * p));
        }
      } else if (style === 'claw') {
        for (let k = -1; k <= 1; k++) {
          const x0 = x - dir * 15 + k * 9 * dir;
          const y0 = y - 20 + k * 2;
          g.lineStyle(3, color, a * 0.5);
          g.lineBetween(x0, y0, x0 + dir * 22 * p, y0 + 40 * p);
          g.lineStyle(1.6, 0xf8fafc, a);
          g.lineBetween(x0, y0, x0 + dir * 22 * p, y0 + 40 * p);
        }
      } else if (style === 'bite') {
        const gap = 20 * (1 - p) + 3;
        g.fillStyle(0xf8fafc, a);
        g.fillTriangle(x - 9, y - gap - 13, x + 9, y - gap - 13, x, y - gap + 3);
        g.fillTriangle(x - 9, y + gap + 13, x + 9, y + gap + 13, x, y + gap - 3);
        g.lineStyle(2, color, a * 0.7);
        g.strokeTriangle(x - 9, y - gap - 13, x + 9, y - gap - 13, x, y - gap + 3);
        g.strokeTriangle(x - 9, y + gap + 13, x + 9, y + gap + 13, x, y + gap - 3);
      } else {
        const gx = 22 * (1 - p) + 5;
        g.lineStyle(4, color, a * 0.7);
        g.beginPath();
        g.arc(x - gx - 10, y, 14, -1.1, 1.1);
        g.strokePath();
        g.beginPath();
        g.arc(x + gx + 10, y, 14, Math.PI - 1.1, Math.PI + 1.1);
        g.strokePath();
        g.lineStyle(2, 0xf8fafc, a);
        g.beginPath();
        g.arc(x - gx - 10, y, 14, -1.1, 1.1);
        g.strokePath();
        g.beginPath();
        g.arc(x + gx + 10, y, 14, Math.PI - 1.1, Math.PI + 1.1);
        g.strokePath();
      }
    };
    const st = { p: 0 };
    draw(0);
    this.tweens.add({
      targets: st,
      p: 1,
      duration: 130,
      ease: 'Quad.easeOut',
      onUpdate: () => draw(st.p),
      onComplete: () => g.destroy(),
    });
  }

  /** El/asa hizasında kısa büyü ışığı: büyür, sonra solar. */
  private drawSpellGlow(x: number, y: number, color: number, growMs: number, lifeMs: number) {
    const core = this.add.circle(x, y, 5, 0xf8fafc, 0.95);
    const halo = this.add.circle(x, y, 9, color, 0.55);
    this.vfxContainer.add(halo);
    this.vfxContainer.add(core);
    this.tweens.add({ targets: [halo, core], scale: 1.8, duration: Math.max(40, growMs), ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: [halo, core],
      alpha: 0,
      delay: Math.max(40, growMs),
      duration: Math.max(60, lifeMs - growMs),
      onComplete: () => {
        halo.destroy();
        core.destroy();
      },
    });
  }

  /** Hedefe giden küçük büyü atışı (mevcut büyük yetenek mermisinden ayrı, hafif). */
  private launchSmallBolt(sx: number, sy: number, tx: number, ty: number, color: number, flightMs: number) {
    const halo = this.add.circle(sx, sy, 8, color, 0.4);
    const core = this.add.circle(sx, sy, 4.5, 0xf8fafc, 0.95);
    this.vfxContainer.add(halo);
    this.vfxContainer.add(core);
    this.tweens.add({
      targets: [halo, core],
      x: tx,
      y: ty,
      duration: Math.max(40, flightMs),
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.drawShockwave(tx, ty, color, 38);
        halo.destroy();
        core.destroy();
      },
    });
  }

  /** Menzilli atış izi: hedefe dönük ince ok (gövde + uç). */
  private launchArrow(sx: number, sy: number, tx: number, ty: number, color: number, flightMs: number) {
    const g = this.add.graphics();
    g.lineStyle(2.4, 0xe2e8f0, 1);
    g.lineBetween(-13, 0, 11, 0);
    g.lineStyle(1.6, color, 0.9);
    g.lineBetween(-13, -2.5, -9, 0);
    g.lineBetween(-13, 2.5, -9, 0);
    g.fillStyle(0xf8fafc, 1);
    g.fillTriangle(11, 0, 5, -3.5, 5, 3.5);
    g.setPosition(sx, sy);
    g.setRotation(Math.atan2(ty - sy, tx - sx));
    this.vfxContainer.add(g);
    this.tweens.add({
      targets: g,
      x: tx,
      y: ty,
      duration: Math.max(40, flightMs),
      ease: 'Linear',
      onComplete: () => {
        this.drawShockwave(tx, ty, color, 30);
        g.destroy();
      },
    });
  }

  /** Yetenek başlarken: yeteneğin tipine göre yalnızca poz (kendi efektleri zaten çiziliyor, taş eşleşmesi animasyonu bastırılır). */
  private beginSkillAnim(skill: ActiveSkillDef) {
    const base = heroAttackProfile(this.initData.hero.classId, this.initData.hero.equipped.weapon?.category);
    const profile = skillAttackProfile(skill, base);
    this.heroSkillLock = true;
    const color = skill.fx?.color ?? (skill.element in GEM_COLOR_NUM ? GEM_COLOR_NUM[skill.element as GemType] : 0xfde047);
    this.playAttackAnim('hero', profile, { color, ownVfx: true, action: -1, holdMs: 900 });
  }

  /**
   * Boss fazı/öfke durumunu günceller. Faz ya da öfke değişirse: saldırı sayacı güncel hıza iner,
   * eylem planı yeni faza göre yeniden yapılır ve kısa bir bildirim gösterilir.
   */
  private handlePhaseChange() {
    const phaseBefore = this.enemyPhase;
    const enragedBefore = this.enemyEnraged;
    this.checkBossPhaseTransitions();
    if (this.enemyEnraged) {
      this.enemyTurnCounter = Math.min(this.enemyTurnCounter, this.effectiveAttackInterval());
    }
    const phaseChanged = this.enemyPhase !== phaseBefore;
    const enragedNow = this.enemyEnraged && !enragedBefore;
    if (!phaseChanged && !enragedNow) return;
    this.holdEnemyIdle(850);
    this.plannedAction = planEnemyAction(this.enemy, this.combatRng);
    if (this.plannedAction.kind === 'attack') this.companionState = foxDisarm(this.companionState); // plan normal saldırıya döndü
    this.phaseNotice = {
      seq: ++this.phaseNoticeSeq,
      text: phaseNoticeText({
        bossId: this.enemy.bossId,
        phase: this.enemyPhase,
        enragedOnly: !phaseChanged && enragedNow,
        newWeaknessName: GEM_INFO[this.enemyWeakness].name.split(' ')[0],
      }),
    };
  }

  private checkBossPhaseTransitions() {
    if (!this.enemy.isBoss || this.enemyHp <= 0) return;
    const pct = this.enemyHp / this.enemyMaxHp;

    if (this.enemy.bossId === 'forest_guardian' && this.enemyPhase === 1 && pct <= 0.5) {
      this.enemyPhase = 2;
      this.enemyShield += Math.round(this.enemyMaxHp * 0.18);
      this.spawnBannerText('KÖK KALKANI AKTİF!', '#4ade80');
      SoundEngine.playBossRoar();
    } else if (this.enemy.bossId === 'forest_guardian' && !this.enemyEnraged && pct <= 0.25) {
      this.enemyEnraged = true;
      this.spawnBannerText('ORMAN MUHAFIZI ÖFKELENDİ!', '#ef4444');
    } else if (this.enemy.bossId === 'frost_queen' && this.enemyPhase === 1 && pct <= 0.55) {
      this.enemyPhase = 2;
      this.enemyShield += Math.round(this.enemyMaxHp * 0.2);
      this.freezeRandomTiles(3);
      this.spawnBannerText('BUZ BARİYERİ & TAŞ DONDURMA!', '#38bdf8');
      SoundEngine.playBossRoar();
    } else if (this.enemy.bossId === 'infernal_dragon' && this.enemyPhase === 1 && pct <= 0.45) {
      this.enemyPhase = 2;
      this.enemyEnraged = true;
      this.enemyShield += Math.round(this.enemyMaxHp * 0.16);
      this.spawnBannerText('EJDERHA KANATLI ÖFKE FAZI!', '#f97316');
      SoundEngine.playBossRoar();
    } else if (this.enemy.bossId === 'crystal_titan' && this.enemyPhase === 1 && pct <= 0.6) {
      this.enemyPhase = 2;
      this.enemyShield += Math.round(this.enemyMaxHp * 0.25);
      this.spawnBannerText('KRİSTAL ZIRH FAZI!', '#e879f9');
      SoundEngine.playBossRoar();
    } else if (this.enemy.bossId === 'abyssal_king') {
      if (this.enemyPhase === 1 && pct <= 0.66) {
        this.enemyPhase = 2;
        this.enemyWeakness = 'lightning';
        this.enemyShield += Math.round(this.enemyMaxHp * 0.18);
        this.spawnBannerText('FAZ 2: ZAYIFLIK YILDIRIMA DÖNDÜ!', '#facc15');
        SoundEngine.playBossRoar();
      } else if (this.enemyPhase === 2 && pct <= 0.33) {
        this.enemyPhase = 3;
        this.enemyWeakness = 'fire';
        this.enemyEnraged = true;
        this.enemyShield += Math.round(this.enemyMaxHp * 0.22);
        this.spawnBannerText('FAZ 3: KIYAMET ÖFKESİ! ZAYIFLIK: ATEŞ!', '#f43f5e');
        SoundEngine.playBossRoar();
      }
    } else if (!BESPOKE_PHASE_BOSSES.has(this.enemy.bossId ?? '')) {
      // Yeni nesil Lord & Bölge Bossları: çok fazlı, zayıflığı değişen mekanik.
      // Kendi faz kuralı olan bosslar (yukarıdakiler) buraya düşmez; aksi halde eşiklerine
      // ulaşmadan genel faz tetiklenip zayıflıkları değişir ve kendi fazları hiç çalışmazdı.
      const maxPhase = this.enemy.bossId === 'chaos_emperor' ? 4 : 3;
      const weaknessCycle: GemType[] = ['fire', 'frost', 'nature', 'lightning', 'arcane'];
      for (let ph = 1; ph < maxPhase; ph++) {
        const threshold = 1 - ph / maxPhase;
        if (this.enemyPhase === ph && pct <= threshold) {
          this.enemyPhase = ph + 1;
          this.enemyShield += Math.round(this.enemyMaxHp * (0.14 + ph * 0.03));
          const baseIdx = weaknessCycle.indexOf(this.enemy.weakness);
          this.enemyWeakness = weaknessCycle[(baseIdx + ph) % weaknessCycle.length];
          if (ph >= 2) this.enemyEnraged = true;
          const weakLabel = GEM_INFO[this.enemyWeakness].name.split(' ')[0];
          this.spawnBannerText(
            `FAZ ${this.enemyPhase}! YENİ ZAYIFLIK: ${weakLabel.toUpperCase()} TAŞI!`,
            '#f43f5e'
          );
          SoundEngine.playBossRoar();
          if (this.initData.settings.screenShake) this.cameras.main.shake(this.d(260), 0.012);
          break;
        }
      }
    }
  }

  private freezeRandomTiles(count: number) {
    const candidates: TileVisual[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tv = this.grid[r][c];
        if (tv && tv.tile.frozen === 0) candidates.push(tv);
      }
    }
    this.shuffle(candidates);
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      candidates[i].tile.frozen = 2;
      this.syncTileOverlay(candidates[i]);
    }
  }

  private async applyGravityAndRefill() {
    const tweens: Promise<void>[] = [];

    for (let c = 0; c < GRID_SIZE; c++) {
      let writeRow = GRID_SIZE - 1;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        const tv = this.grid[r][c];
        if (tv) {
          if (r !== writeRow) {
            this.grid[writeRow][c] = tv;
            this.grid[r][c] = null;
            tv.tile.row = writeRow;
            const dest = this.cellToWorld(writeRow, c);
            tweens.push(
              new Promise((res) => {
                this.tweens.add({
                  targets: tv.container,
                  y: dest.y,
                  duration: 210,
                  ease: 'Bounce.easeOut',
                  onComplete: () => res(),
                });
              })
            );
          }
          writeRow--;
        }
      }

      // Spawn new tiles above board
      let spawnOffset = 1;
      for (let r = writeRow; r >= 0; r--) {
        const tv = this.createTileVisual(r, c, this.randomGemType(), 'none');
        this.grid[r][c] = tv;
        const dest = this.cellToWorld(r, c);
        tv.container.y = this.boardY - spawnOffset * this.cellSize;
        spawnOffset++;
        tweens.push(
          new Promise((res) => {
            this.tweens.add({
              targets: tv.container,
              y: dest.y,
              duration: 250 + spawnOffset * 20,
              ease: 'Back.easeOut',
              onComplete: () => res(),
            });
          })
        );
      }
    }

    await Promise.all(tweens);
  }

  private async endPlayerTurn() {
    this.heroSkillLock = false;
    if (this.enemyHp <= 0) return;

    // Tick down frozen tiles naturally
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tv = this.grid[r][c];
        if (tv && tv.tile.frozen > 0) {
          tv.tile.frozen -= 1;
          this.syncTileOverlay(tv);
        }
      }
    }

    // Burn DoT on enemy
    if (this.enemyBurnTurns > 0) {
      this.enemyBurnTurns -= 1;
      const burnDmg = Math.round(this.initData.build.stats.attack * 0.75);
      this.enemyHp = Math.max(0, this.enemyHp - burnDmg);
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 25, `YANMA -${burnDmg}`, '#fb923c');
      if (this.enemyHp <= 0) {
        this.handleVictory();
        return;
      }
    }

    // Köz Ejderciği yanması
    if (this.companionBurn.turns > 0) {
      this.companionBurn.turns -= 1;
      const cb = this.companionBurn.perTurn;
      this.enemyHp = Math.max(0, this.enemyHp - cb);
      this.spawnFloatingText(this.enemyContainer.x - 22, this.enemyContainer.y - 40, `KÖZ -${cb}`, '#fdba74');
      if (this.enemyHp <= 0) {
        this.handleVictory();
        return;
      }
    }

    // Poison DoT (Zehir Çiçeği yeteneği)
    if (this.enemyPoisonTurns > 0) {
      this.enemyPoisonTurns -= 1;
      const poisonDmg = Math.round(this.initData.build.stats.attack * 0.8);
      this.enemyHp = Math.max(0, this.enemyHp - poisonDmg);
      this.spawnFloatingText(this.enemyContainer.x + 22, this.enemyContainer.y - 12, `ZEHİR -${poisonDmg}`, '#a3e635');
      if (this.enemyHp <= 0) {
        this.handleVictory();
        return;
      }
    }

    // Kanama DoT (Suikastçı)
    if (this.enemyBleedTurns > 0) {
      this.enemyBleedTurns -= 1;
      const bleedDmg = Math.round(
        this.initData.build.stats.attack *
          (1.1 + this.initData.build.passives.bleedPowerPct / 100)
      );
      this.enemyHp = Math.max(0, this.enemyHp - bleedDmg);
      this.spawnFloatingText(
        this.enemyContainer.x - 24,
        this.enemyContainer.y - 14,
        `KANAMA -${bleedDmg}`,
        '#fb7185'
      );
      if (this.enemyHp <= 0) {
        this.handleVictory();
        return;
      }
    }

    // İskelet Ordusu her tur saldırır (Nekromant)
    if (this.summonTurns > 0) {
      this.summonTurns -= 1;
      const sumDmg = Math.round(
        this.initData.build.stats.attack *
          (0.9 * (1 + this.initData.build.passives.summonPowerPct / 100))
      );
      for (let i = 0; i < 3; i++) {
        this.spawnGemBurst(
          this.enemyContainer.x - 50 + i * 46,
          this.enemyContainer.y + 52,
          'nature'
        );
      }
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y + 40, 0x4ade80, 95);
      this.enemyHp = Math.max(0, this.enemyHp - sumDmg);
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + Math.round(sumDmg * 0.2));
      this.spawnFloatingText(
        this.enemyContainer.x,
        this.enemyContainer.y + 30,
        `${this.summonLabel} -${sumDmg}`,
        '#86efac'
      );
      if (this.enemyHp <= 0) {
        this.handleVictory();
        return;
      }
    }

    // Ejder Formu süresi bittiğinde görselleri geri al
    if (this.dragonFormTurns > 0) {
      this.dragonFormTurns -= 1;
      if (this.dragonFormTurns === 0 && this.heroSprite && this.heroSprite.active) {
        this.heroSprite.clearTint();
        this.setDragonFormVisual(false);
        this.tweens.add({
          targets: this.heroContainer,
          scaleX: this.heroBaseScale,
          scaleY: this.heroBaseScale,
          duration: 280,
        });
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 70, 'DÖNÜŞÜM BİTTİ', '#fdba74');
      }
    }

    // Kritik / sıyrılma güçlendirmelerinin süresi azalır
    if (this.heroCritBuffTurns > 0) this.heroCritBuffTurns -= 1;
    if (this.heroDodgeBuffTurns > 0) this.heroDodgeBuffTurns -= 1;

    // Reduce skill cooldowns
    Object.keys(this.skillCooldowns).forEach((k) => {
      if (this.skillCooldowns[k] > 0) this.skillCooldowns[k] -= 1;
    });

    this.turnPhase = 'enemy';
    this.emitSnapshot();
    await this.waitMs(240);

    // Enemy turn check
    if (this.enemyFrozenTurns > 0) {
      this.enemyFrozenTurns -= 1;
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 50, 'DONMUŞ (TUR GEÇTİ)', '#7dd3fc');
    } else if (this.enemyStaggerTurns > 0) {
      this.enemyStaggerTurns -= 1;
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 50, 'SERSEM (TUR KAÇIRDI)', '#cbd5e1');
    } else {
      this.enemyTurnCounter -= 1;
      if (this.enemyTurnCounter <= 0) {
        await this.executeEnemyAttack();
        this.enemyTurnCounter = this.effectiveAttackInterval();
        this.plannedAction = planEnemyAction(this.enemy, this.combatRng);
      }
    }

    if (this.enemyHp <= 0) return;
    if (this.heroHp <= 0) {
      this.handleDefeat();
      return;
    }

    this.turnNumber += 1;
    this.comboCount = 0;
    this.huntRuleUsed = false;
    this.setFlags = freshSetFlags();
    this.relicFlags = { ...this.relicFlags, turnMatchUsed: false };
    this.mastery = startTurn(this.mastery);
    this.huntSquareGiven = false;
    this.bloodBondUsed = false;
    SoundEngine.setIntensity(1);
    this.turnPhase = 'player';
    this.inputLocked = false;
    this.emitSnapshot();
  }

  private async executeEnemyAttack() {
    this.holdEnemyIdle(620);
    // Düşman saldırı animasyonu: tip eylemden/çizimden seçilir; hasar temas anında uygulanır (yakın dövüşte ≈90–110 ms, büyü/menzilli ≈200–240 ms)
    const enemyProfile = enemyAttackProfile(
      { name: this.enemy.name, visualArchetype: this.enemy.visualArchetype, isBoss: this.enemy.isBoss },
      this.plannedAction.kind,
      enemyArtAttack(this.enemy.id)
    );
    const contactMs = this.playAttackAnim('enemy', enemyProfile, { color: this.enemyAttackColor(), action: 0, holdMs: 620 });

    await this.waitMs(contactMs);

    // Kahraman sıyrılma kontrolü (Duman Bombası buffı +%45 ekler)
    const dodgeChance =
      this.initData.build.stats.dodge + (this.heroDodgeBuffTurns > 0 ? 45 : 0);
    if (this.combatRng() * 100 < dodgeChance) {
      this.spawnFloatingText(
        this.heroContainer.x,
        this.heroContainer.y - 45,
        this.heroDodgeBuffTurns > 0 ? 'GÖLGE SIYRILMASI!' : 'SIYRILDI!',
        this.heroDodgeBuffTurns > 0 ? '#f0abfc' : '#38bdf8',
        19
      );
      this.companionState = foxDisarm(this.companionState); // ağır saldırı gerçekleşmedi: Tilki hakkı harcanmaz
      // Ustalık: ağır saldırı sıyrılmayla gerçekten iptal edildi
      this.mastery = onEnemyAction(this.mastery, this.plannedAction, { cancelled: true, hpDamage: 0 });
      // Karşı Saldırı pasifi: sıyrılınca hasar yansıt
      if (this.initData.build.passives.dodgeCounterPct > 0) {
        const counter = Math.max(
          1,
          Math.round(
            (this.enemy.attack * this.initData.build.passives.dodgeCounterPct) / 100
          )
        );
        this.enemyHp = Math.max(0, this.enemyHp - counter);
        this.drawLightningArc(
          this.heroContainer.x,
          this.heroContainer.y - 10,
          this.enemyContainer.x,
          this.enemyContainer.y,
          0xf0abfc
        );
        this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 34, `KARŞI SALDIRI -${counter}`, '#f0abfc');
        if (this.enemyHp <= 0) {
          this.handleVictory();
          return;
        }
      }
      this.emitSnapshot();
      return;
    }

    // Gerçekleşen eylem, ekranda gösterilen plandır (rastgelelik planlama anında bir kez çözülür)
    const action = this.plannedAction;
    let rawAtk = this.enemy.attack * (this.enemyEnraged ? 1.32 : 1.0) * action.power;
    if (action.kind === 'freeze_tiles') {
      this.freezeRandomTiles(2);
    } else if (action.kind === 'drain') {
      const heal = Math.round(rawAtk * 0.45);
      this.enemyHp = Math.min(this.enemyMaxHp, this.enemyHp + heal);
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 60, `+${heal} Can Çaldı`, '#c084fc');
    } else if (action.kind === 'breath') {
      this.spawnBannerText('EJDERHA NEFESİ!', '#f97316');
    }

    let dmg = enemyHitDamage({
      rawAtk,
      enemyAttack: this.enemy.attack,
      defense: this.initData.build.stats.defense,
      enemyLevel: this.enemy.level,
      isBoss: this.enemy.isBoss,
      heroMaxHp: this.heroMaxHp,
    });
    if (this.initData.companion === 'ice_fox') {
      const fx = foxResolve(this.companionState, action.kind, dmg);
      this.companionState = fx.state;
      dmg = fx.dmg;
      if (fx.absorbed > 0) {
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 80, `BUZ TİLKİSİ -${fx.absorbed}`, '#7dd3fc', 16);
      }
    }

    SoundEngine.playWeaponHit(this.enemy.isBoss);
    if (this.initData.settings.screenShake) {
      this.cameras.main.shake(this.d(170), this.enemy.isBoss ? 0.012 : 0.007);
    }

    // Shield absorbs first
    if (this.heroShield > 0) {
      const abs = Math.min(this.heroShield, dmg);
      this.heroShield -= abs;
      this.setShieldPool = Math.min(this.setShieldPool, this.heroShield);
      dmg -= abs;
      if (abs > 0) {
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 62, `Kalkan -${abs}`, '#86efac');
      }
    }

    // Ustalık: kalkan ağır saldırının hasarını tamamen karşıladıysa engellenmiş sayılır
    this.mastery = onEnemyAction(this.mastery, action, { cancelled: false, hpDamage: dmg });

    if (dmg > 0) {
      this.heroHp = Math.max(0, this.heroHp - dmg);
      this.heroUlti = Math.min(this.heroMaxUlti, this.heroUlti + 8);
      this.holdHeroBreath(360);
      this.heroSprite.setTintFill(0xef4444);
      this.time.delayedCall(120, () => {
        if (this.heroSprite && this.heroSprite.active) this.heroSprite.clearTint();
      });
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 34, `-${dmg}`, '#f87171', 20);

      // Dikenli Zırh pasifi: hasarın bir kısmını geri yansıt
      if (this.initData.build.passives.thornsPct > 0) {
        const reflect = Math.max(
          1,
          Math.round((rawAtk * this.initData.build.passives.thornsPct) / 100)
        );
        this.enemyHp = Math.max(0, this.enemyHp - reflect);
        this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 30, `DİKEN -${reflect}`, '#f0abfc', 15);
        if (this.enemyHp <= 0) {
          this.handleVictory();
          return;
        }
      }
    }

    this.emitSnapshot();
    await this.waitMs(220);
  }

  // Savaş HUD'undan çağrılır — 24 farklı yetenek efekti
  public async castSkill(skillId: string) {
    if (this.inputLocked || this.turnPhase !== 'player' || this.enemyHp <= 0) return;

    const classId = this.initData.hero.classId;
    const classUlti = HERO_CLASSES[classId].ultimateSkill;
    const isUlti = skillId === classUlti.id || skillId === 'ultimate';
    const skillPool = [...(CLASS_SKILLS[classId] ?? []), ...ACTIVE_SKILLS];
    const skill: ActiveSkillDef | undefined = isUlti
      ? classUlti
      : skillPool.find((s) => s.id === skillId);

    if (!skill) return;
    if (isUlti && this.heroUlti < this.heroMaxUlti) return;
    if (!isUlti) {
      if ((this.skillCooldowns[skill.id] ?? 0) > 0) return;
      if (this.heroMana < skill.manaCost) return;
    }

    this.inputLocked = true;
    this.holdHeroBreath(isUlti ? 2600 : 900);
    this.beginSkillAnim(skill);
    this.mastery = setMoveKind(this.mastery, false);
    this.initData.onMatchStats({}, 0, true);
    // Yetenekle patlatılan taşlar da en az x1 kombo çarpanından faydalanır
    this.comboCount = Math.max(1, this.comboCount);

    if (isUlti) {
      this.heroUlti = 0;
    } else {
      this.heroMana -= skill.manaCost;
      this.skillCooldowns[skill.id] = skill.cooldown;
    }

    // Şövalye pasifi: her yetenek kullanımında küçük iyileşme
    if (classId === 'paladin') {
      const pHeal = Math.round(this.heroMaxHp * 0.05);
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + pHeal);
    }

    SoundEngine.playSkillCast(
      skill.effectType === 'creature' ? skill.fx?.sound ?? 'arcane_explosion' : skill.effectType
    );
    // Yetenek hasarı = Saldırı × (1 + Elemental) × (1 + Yetenek Gücü) × Ejder Formu
    const atk =
      this.initData.build.stats.attack *
      (1 + this.initData.build.stats.elementalDamage / 100) *
      (1 + this.initData.build.passives.skillPowerPct / 100) *
      (this.dragonFormTurns > 0
        ? 1.6 + this.initData.build.passives.dragonScalePct / 100
        : 1);

    if (skill.effectType === 'ultimate') {
      // CINEMATIC CAMERA ZOOM + DRAMATIC VIGNETTE!
      this.spawnBannerText(`ULTİ: ${skill.name.toUpperCase()}!`, '#fde047');
      const dim = this.add
        .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width * 2, this.scale.height * 2, 0x000000, 0.55)
        .setDepth(5);
      this.cameras.main.zoomTo(1.14, this.d(340), 'Cubic.easeOut');
      await this.waitMs(380);

      let dmg = Math.round(atk * skill.powerMultiplier);
      if (this.initData.hero.classId === 'werewolf') {
        // Dolunay Hücumu: tüm Av yükleri harcanır, yük başına ek hasar
        const wu = werewolfUltBonus(this.huntCharges, atk);
        dmg += wu.bonus;
        this.huntCharges = wu.charges;
      }
      const hpBeforeUlt = this.enemyHp;
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y, 0xfde047, 170);
      this.spawnGemBurst(this.enemyContainer.x, this.enemyContainer.y, 'golden');
      this.dealHeroAttackToEnemy(dmg, 'golden', true, true);

      if (this.initData.hero.classId === 'warrior') this.enemyBurnTurns = 2;
      if (this.initData.hero.classId === 'mage') this.enemyFrozenTurns += 1;
      if (this.initData.hero.classId === 'necromancer') {
        // Ruh Ordusu: verilen hasarın yarısını çal + iskelet ordusu bırak
        const soulHeal = Math.max(1, Math.round((hpBeforeUlt - this.enemyHp) * 0.5));
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + soulHeal);
        this.summonTurns = 3 + Math.floor(this.initData.build.passives.summonPowerPct / 60);
        this.spawnFloatingText(
          this.heroContainer.x,
          this.heroContainer.y - 66,
          `+${soulHeal} Ruh • İskelet Ordusu ${this.summonTurns} tur`,
          '#86efac'
        );
        for (let i = 0; i < 4; i++) {
          this.spawnGemBurst(
            this.heroContainer.x - 60 + i * 38,
            this.heroContainer.y + 46,
            'nature'
          );
        }
      }
      if (this.initData.hero.classId === 'assassin') {
        // Bin Kesik: çoklu vuruş hissi + kanama + garanti kritik
        this.enemyBleedTurns = 3;
        this.heroCritBuffTurns = 1;
        for (let i = 0; i < 5; i++) {
          this.drawLightningArc(
            this.enemyContainer.x + (Math.random() - 0.5) * 90,
            this.enemyContainer.y - 60,
            this.enemyContainer.x + (Math.random() - 0.5) * 90,
            this.enemyContainer.y + 40,
            0xf0abfc
          );
        }
        this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 70, 'KANAMA (3 tur)', '#fb7185');
      }
      if (this.initData.hero.classId === 'stormcaller') {
        // Göklerin Gazabı: sersemletme + tahtayı yıldırıma boğ
        this.enemyStaggerTurns += 2;
        this.enemyFrozenTurns += 1;
        this.convertTiles(6, ['lightning']);
        this.screenFlash(0x67e8f9, 0.5);
      }
      if (this.initData.hero.classId === 'dragonheart') {
        // Ejderha Dönüşümü: 4 tur ejder formu + kalkan + yakma
        // Form zaten aktifse temel ölçeği yeniden yazma (büyüme birikmesin)
        if (this.dragonFormTurns <= 0) this.heroBaseScale = this.heroContainer.scaleX;
        this.dragonFormTurns = 4 + Math.floor(this.initData.build.passives.dragonScalePct / 40);
        this.tweens.add({
          targets: this.heroContainer,
          scaleX: this.heroBaseScale * 1.28,
          scaleY: this.heroBaseScale * 1.28,
          duration: 380,
          ease: 'Back.easeOut',
        });
        this.heroSprite.setTint(0xffb37a);
        this.setDragonFormVisual(true);
        this.heroShield += Math.round(this.heroMaxHp * 0.3);
        this.enemyBurnTurns = 2;
        this.screenFlash(0xf97316, 0.5);
        this.spawnFloatingText(
          this.heroContainer.x,
          this.heroContainer.y - 88,
          `EJDERHA DÖNÜŞÜMÜ! (${this.dragonFormTurns} tur +%60 Hasar)`,
          '#fb923c'
        );
      }
      if (this.initData.hero.classId === 'vampire') {
        const h = vampireUltHeal(this.lastDealt, this.heroMaxHp);
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + h);
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 52, `+${h} Can`, '#fb7185');
      }
      if (this.initData.hero.classId === 'bigfoot') {
        const sh = bigfootUltShield(this.heroMaxHp);
        this.heroShield += sh;
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 52, `+${sh} Kalkan`, '#86efac');
      }
      if (this.initData.hero.classId === 'night_screecher') this.delayEnemyAction();
      if (this.initData.hero.classId === 'paladin') {
        const heal = Math.round(this.heroMaxHp * 0.35);
        this.heroHp = Math.min(this.heroMaxHp, this.heroHp + heal);
        this.heroShield += Math.round(this.heroMaxHp * 0.25);
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 52, `+${heal} Can & Kalkan`, '#4ade80');
      }

      // Yaratık sınıflarının Ulti ek etkileri (kanama, dönüşüm, çağırma, taş çevirme...)
      if (skill.fx) {
        await this.runSkillFx(skill, atk, false, Math.max(0, hpBeforeUlt - this.enemyHp));
      }

      if (this.initData.settings.screenShake) {
        this.cameras.main.shake(this.d(320), 0.016);
      }
      await this.waitMs(350);
      this.cameras.main.zoomTo(1.0, this.d(320), 'Cubic.easeInOut');
      dim.destroy();
    } else if (skill.effectType === 'claw_strike') {
      this.spawnBannerText('PENÇE DARBESİ!', '#fde047');
      const cs = clawStrike(this.huntCharges);
      this.huntCharges = cs.charges;
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y, 0xfde047, 110);
      this.dealHeroAttackToEnemy(Math.round(atk * cs.mult), 'fire', false);
      if (cs.charged) this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 100, 'AV YÜKÜ HARCANDI', '#fde047', 15);
    } else if (skill.effectType === 'ruby_slash') {
      this.spawnBannerText('YAKUT KESİK!', '#fb7185');
      this.drawBeamEffect(this.heroContainer.x, this.heroContainer.y, this.enemyContainer.x, this.enemyContainer.y, 0xfb7185);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'arcane', false);
      const rh = vampireSlashHeal(this.lastDealt, this.heroMaxHp);
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + rh);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 46, `+${rh} Can`, '#fb7185');
    } else if (skill.effectType === 'rock_bulwark') {
      this.spawnBannerText('KAYA SİPERİ!', '#86efac');
      const rb = bigfootSkillShield(this.heroMaxHp);
      this.heroShield += rb;
      this.drawShockwave(this.heroContainer.x, this.heroContainer.y, 0x22c55e, 120);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 46, `+${rb} Kalkan`, '#86efac');
    } else if (skill.effectType === 'echo_wave') {
      this.spawnBannerText('YANKI DALGASI!', '#c4b5fd');
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y, 0xa78bfa, 130);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'arcane', false);
      this.delayEnemyAction();
    } else if (skill.effectType === 'fireball') {
      this.spawnBannerText('ATEŞ TOPU!', '#fb923c');
      await this.launchProjectile(this.heroContainer.x, this.heroContainer.y, this.enemyContainer.x, this.enemyContainer.y, 0xef4444, 18);
      this.enemyBurnTurns = 2;
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'fire', false);
    } else if (skill.effectType === 'ice_storm') {
      this.spawnBannerText('BUZ FIRTINASI!', '#7dd3fc');
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y, 0x38bdf8, 120);
      this.enemyFrozenTurns += 2;
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'frost', false);
    } else if (skill.effectType === 'lightning_strike') {
      this.spawnBannerText('YILDIRIM DARBESİ!', '#facc15');
      this.drawLightningArc(this.enemyContainer.x, 0, this.enemyContainer.x, this.enemyContainer.y, 0xfacc15);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'lightning', true);
      // Destroy 4 random tiles on board!
      const blast = new Set<string>();
      for (let i = 0; i < 4; i++) {
        const rr = Math.floor(this.rng() * GRID_SIZE);
        const cc = Math.floor(this.rng() * GRID_SIZE);
        blast.add(`${rr},${cc}`);
      }
      await this.destroyAndApplyEffect(blast, new Map());
      await this.applyGravityAndRefill();
    } else if (skill.effectType === 'natures_blessing') {
      this.spawnBannerText('DOĞANIN LÜTFU!', '#4ade80');
      const heal = Math.round(this.heroMaxHp * skill.powerMultiplier);
      const shield = Math.round(this.heroMaxHp * 0.22);
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + heal);
      this.heroShield += shield;
      this.drawShockwave(this.heroContainer.x, this.heroContainer.y, 0x22c55e, 110);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 45, `+${heal} Can +${shield} Kalkan`, '#4ade80');
    } else if (skill.effectType === 'arcane_explosion') {
      this.spawnBannerText('ARKAN PATLAMA!', '#d8b4fe');
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y, 0xa855f7, 140);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'arcane', false, true);
      this.convertTiles(3, ['golden', 'arcane', 'arcane']);
    } else if (skill.effectType === 'flame_rain') {
      this.spawnBannerText('ALEV YAĞMURU!', '#fb923c');
      this.screenFlash(0xf97316, 0.3);
      for (let i = 0; i < 5; i++) {
        if (this.enemyHp <= 0) break;
        const sx = this.enemyContainer.x + (i - 2) * 36;
        await this.launchProjectile(sx, this.stageArea.y - 30, sx * 0.85 + this.enemyContainer.x * 0.15, this.enemyContainer.y, 0xef4444, 14);
        this.dealHeroAttackToEnemy(
          Math.round((atk * skill.powerMultiplier) / 5 * 1.2),
          'fire',
          i === 4
        );
      }
      this.enemyBurnTurns = Math.max(this.enemyBurnTurns, 3);
    } else if (skill.effectType === 'frost_lance') {
      this.spawnBannerText('BUZ MIZRAĞI!', '#7dd3fc');
      this.drawBeamEffect(this.heroContainer.x, this.heroContainer.y, this.enemyContainer.x, this.enemyContainer.y, 0x7dd3fc);
      await this.launchProjectile(this.heroContainer.x, this.heroContainer.y, this.enemyContainer.x, this.enemyContainer.y, 0x38bdf8, 13);
      this.enemyFrozenTurns += 1;
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'frost', false, true);
    } else if (skill.effectType === 'stone_bulwark') {
      this.spawnBannerText('TAŞ SİPERİ!', '#86efac');
      const stoneShield = Math.round(this.heroMaxHp * skill.powerMultiplier);
      this.heroShield += stoneShield;
      this.drawShockwave(this.heroContainer.x, this.heroContainer.y, 0x22c55e, 120);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 46, `+${stoneShield} Kalkan`, '#86efac');
      this.convertTiles(3, ['nature']);
    } else if (skill.effectType === 'thunder_chain') {
      this.spawnBannerText('ZİNCİR YILDIRIM!', '#fde047');
      this.screenFlash(0xfacc15, 0.35);
      for (let i = 0; i < 3; i++) {
        this.drawLightningArc(
          this.enemyContainer.x + (Math.random() - 0.5) * 160,
          this.stageArea.y - 10,
          this.enemyContainer.x,
          this.enemyContainer.y,
          0xfacc15
        );
        await this.waitMs(95);
      }
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'lightning', true);
      await this.destroyRowAndColumn();
    } else if (skill.effectType === 'venom_bloom') {
      this.spawnBannerText('ZEHİR ÇİÇEĞİ!', '#a3e635');
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y, 0x84cc16, 120);
      this.enemyPoisonTurns = Math.max(this.enemyPoisonTurns, 4);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'nature', false);
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 62, 'ZEHİRLENDİ (4 tur)', '#a3e635');
    } else if (skill.effectType === 'holy_judgement') {
      this.spawnBannerText('KUTSAL YARGI!', '#fde68a');
      this.screenFlash(0xfef3c7, 0.5);
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y, 0xfbbf24, 150);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'golden', true, true);
      const holyHeal = Math.round(this.heroMaxHp * 0.1);
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + holyHeal);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 46, `+${holyHeal} Can`, '#4ade80');
    } else if (skill.effectType === 'shadow_step') {
      this.spawnBannerText('GÖLGE ADIMI!', '#c4b5fd');
      this.screenFlash(0x6d28d9, 0.3);
      this.heroContainer.setAlpha(0);
      await this.waitMs(130);
      this.heroContainer.setPosition(this.enemyContainer.x - 95, this.enemyContainer.y + 8);
      this.heroContainer.setAlpha(1);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'arcane', true);
      await this.waitMs(230);
      this.heroContainer.setPosition(this.heroHome.x, this.heroHome.y);
    } else if (skill.effectType === 'golden_dragon') {
      this.spawnBannerText('ALTIN EJDERHA ÇAĞRILDI!', '#fde047');
      this.screenFlash(0xf59e0b, 0.4);
      this.cameras.main.zoomTo(1.08, this.d(260), 'Cubic.easeOut');
      await this.launchProjectile(this.stageArea.x + 30, this.stageArea.y + 26, this.enemyContainer.x, this.enemyContainer.y, 0xfbbf24, 26);
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y, 0xfde047, 165);
      this.spawnGemBurst(this.enemyContainer.x, this.enemyContainer.y, 'golden');
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'golden', true);
      this.heroMana = Math.min(this.heroMaxMana, this.heroMana + 30);
      const goldShield = Math.round(this.heroMaxHp * 0.2);
      this.heroShield += goldShield;
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 56, `+30 Mana +${goldShield} Kalkan`, '#fde047');
      this.cameras.main.zoomTo(1, this.d(280), 'Cubic.easeInOut');
    } else if (skill.effectType === 'chrono_shift') {
      this.spawnBannerText('ZAMAN KAYMASI!', '#d8b4fe');
      this.screenFlash(0xa855f7, 0.45);
      this.enemyFrozenTurns += 2;
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 62, 'ZAMAN DURDU (2 tur)', '#d8b4fe');
      await this.destroyRandomTiles(6);
    } else if (skill.effectType === 'war_cry') {
      this.spawnBannerText('SAVAŞ NARASI!', '#f87171');
      this.screenFlash(0xef4444, 0.35);
      Object.keys(this.skillCooldowns).forEach((k) => {
        if (k !== skill.id) this.skillCooldowns[k] = 0;
      });
      this.heroRageStacks = Math.min(12, this.heroRageStacks + 5);
      this.heroMana = Math.min(this.heroMaxMana, this.heroMana + 25);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'fire', true);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 62, 'TÜM BEKLEMELER SIFIRLANDI!', '#fde047');
    } else if (skill.effectType === 'chaos_rift') {
      this.spawnBannerText('KAOS YIRTIĞI!', '#f43f5e');
      this.cameras.main.zoomTo(1.16, this.d(300), 'Cubic.easeOut');
      this.screenFlash(0xf43f5e, 0.5);
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y, 0xa855f7, 190);
      this.spawnGemBurst(this.enemyContainer.x, this.enemyContainer.y, 'arcane');
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'arcane', true, true);
      this.convertTiles(6, ['golden', 'arcane']);
      if (this.initData.settings.screenShake) this.cameras.main.shake(this.d(300), 0.015);
      await this.waitMs(320);
      this.cameras.main.zoomTo(1, this.d(320), 'Cubic.easeInOut');
    } else if (skill.effectType === 'shield_bash') {
      this.spawnBannerText('KALKAN ÇARPMASI!', '#cbd5e1');
      await this.launchProjectile(this.heroContainer.x, this.heroContainer.y, this.enemyContainer.x, this.enemyContainer.y, 0xcbd5e1, 22);
      this.enemyStaggerTurns += 1;
      this.enemyTurnCounter += 1;
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'fire', false);
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 62, 'SERSEMLETTİ! (saldırı gecikti)', '#cbd5e1');
    } else if (skill.effectType === 'berserk') {
      this.spawnBannerText('ÇILGINLIK!', '#ef4444');
      this.screenFlash(0xdc2626, 0.42);
      this.heroRageStacks = Math.min(12, this.heroRageStacks + 4);
      const selfDmg = Math.round(this.heroMaxHp * 0.08);
      this.heroHp = Math.max(1, this.heroHp - selfDmg);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 42, `-${selfDmg} Öfke Bedeli`, '#f87171');
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'fire', true);
    } else if (skill.effectType === 'mana_surge') {
      this.spawnBannerText('MANA AKIŞI!', '#7dd3fc');
      const manaGain = Math.round(this.heroMaxMana * 0.6);
      this.heroMana = Math.min(this.heroMaxMana, this.heroMana + manaGain);
      this.drawShockwave(this.heroContainer.x, this.heroContainer.y, 0x38bdf8, 115);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 48, `+${manaGain} Mana`, '#7dd3fc');
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'frost', false);
    } else if (skill.effectType === 'frost_prison') {
      this.spawnBannerText('BUZ ZİNDANI!', '#bae6fd');
      this.screenFlash(0x38bdf8, 0.4);
      this.enemyFrozenTurns += 3;
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y, 0x7dd3fc, 145);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'frost', false);
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 62, 'BUZ ZİNDANI (3 tur)', '#bae6fd');
      this.convertTiles(5, ['frost']);
    } else if (skill.effectType === 'multi_shot') {
      this.spawnBannerText('ÇOKLU ATIŞ!', '#fde047');
      for (let i = 0; i < 3; i++) {
        if (this.enemyHp <= 0) break;
        await this.launchProjectile(
          this.heroContainer.x,
          this.heroContainer.y - 12 + i * 14,
          this.enemyContainer.x,
          this.enemyContainer.y - 16 + i * 16,
          0xfacc15,
          9
        );
        this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'lightning', this.combatRng() < 0.5);
      }
    } else if (skill.effectType === 'sniper_mark') {
      this.spawnBannerText('NİŞANCI İZİ!', '#fef08a');
      this.heroCritBuffTurns = 2;
      this.drawLightningArc(this.heroContainer.x, this.heroContainer.y, this.enemyContainer.x, this.enemyContainer.y - 34, 0xfde047);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'lightning', true);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 62, '2 TUR GARANTİ KRİTİK!', '#fef08a');
    } else if (skill.effectType === 'holy_shield') {
      this.spawnBannerText('KUTSAL KALKAN!', '#fde68a');
      const hsShield = Math.round(this.heroMaxHp * skill.powerMultiplier);
      const hsHeal = Math.round(this.heroMaxHp * 0.12);
      this.heroShield += hsShield;
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + hsHeal);
      this.drawShockwave(this.heroContainer.x, this.heroContainer.y, 0xfbbf24, 125);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 50, `+${hsShield} Kalkan +${hsHeal} Can`, '#fde68a');
    } else if (skill.effectType === 'divine_heal') {
      this.spawnBannerText('İLAHİ ŞİFA!', '#fcd34d');
      this.screenFlash(0xfef3c7, 0.5);
      const dhHeal = Math.round(this.heroMaxHp * skill.powerMultiplier);
      const dhShield = Math.round(this.heroMaxHp * 0.3);
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + dhHeal);
      this.heroShield += dhShield;
      this.heroUlti = Math.min(this.heroMaxUlti, this.heroUlti + 25);
      this.drawShockwave(this.heroContainer.x, this.heroContainer.y, 0xfde68a, 155);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 58, `+${dhHeal} Can +${dhShield} Kalkan +25 Ulti`, '#fcd34d');
    } else if (skill.effectType === 'soul_drain') {
      this.spawnBannerText('RUH EMİŞİ!', '#86efac');
      this.drawLightningArc(
        this.enemyContainer.x,
        this.enemyContainer.y,
        this.heroContainer.x,
        this.heroContainer.y - 10,
        0x4ade80
      );
      const hpBefore = this.enemyHp;
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'arcane', false, true);
      const drained = Math.max(1, Math.round((hpBefore - this.enemyHp) * 0.6));
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + drained);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 48, `+${drained} Ruh Emdi`, '#86efac');
    } else if (skill.effectType === 'raise_dead') {
      this.spawnBannerText('ÖLÜLERİ KALDIR!', '#a3e635');
      this.summonTurns =
        3 + Math.floor(this.initData.build.passives.summonPowerPct / 60);
      this.drawShockwave(this.heroContainer.x, this.heroContainer.y + 40, 0x4ade80, 125);
      this.spawnGemBurst(this.heroContainer.x - 40, this.heroContainer.y + 40, 'nature');
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'arcane', false);
      this.convertTiles(3, ['arcane']);
      this.spawnFloatingText(
        this.heroContainer.x,
        this.heroContainer.y - 74,
        `İSKELET ORDUSU (${this.summonTurns} tur)`,
        '#86efac'
      );
    } else if (skill.effectType === 'backstab') {
      this.spawnBannerText('SIRT BIÇAKLAMASI!', '#f0abfc');
      this.heroContainer.setAlpha(0.12);
      await this.waitMs(150);
      this.heroContainer.setPosition(this.enemyContainer.x - 86, this.enemyContainer.y + 10);
      this.heroContainer.setAlpha(1);
      this.enemyBleedTurns = Math.max(this.enemyBleedTurns, 2);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'lightning', true);
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 64, 'KANAMA (2 tur)', '#fb7185');
      await this.waitMs(220);
      this.heroContainer.setPosition(this.heroHome.x, this.heroHome.y);
    } else if (skill.effectType === 'smoke_bomb') {
      this.spawnBannerText('DUMAN BOMBASI!', '#d946ef');
      this.screenFlash(0x312e81, 0.55);
      this.heroDodgeBuffTurns = 2;
      this.heroContainer.setAlpha(0.3);
      this.time.delayedCall(950, () => {
        if (this.heroContainer && this.heroContainer.active) this.heroContainer.setAlpha(1);
      });
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'arcane', true);
      this.convertTiles(3, ['lightning']);
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 70, '+%45 SIYRILMA (2 tur)', '#f0abfc');
    } else if (skill.effectType === 'overcharge') {
      this.spawnBannerText('AŞIRI YÜK!', '#67e8f9');
      const extra = Math.round(this.heroMana * 0.4 * (this.initData.build.stats.attack / 60));
      this.screenFlash(0x22d3ee, 0.42);
      for (let i = 0; i < 5; i++) {
        this.drawLightningArc(
          this.heroContainer.x,
          this.heroContainer.y - 24,
          this.enemyContainer.x + (Math.random() - 0.5) * 70,
          this.enemyContainer.y + (Math.random() - 0.5) * 50,
          0x67e8f9
        );
      }
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier) + extra, 'lightning', true);
      this.convertTiles(3, ['lightning']);
    } else if (skill.effectType === 'static_field') {
      this.spawnBannerText('STATİK ALAN!', '#fde047');
      this.enemyStaggerTurns += 1;
      this.drawShockwave(this.enemyContainer.x, this.enemyContainer.y, 0xfde047, 135);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'lightning', false);
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 64, 'SERSEMLDİ (1 tur)', '#fde047');
      await this.destroyRandomRow();
    } else if (skill.effectType === 'dragon_breath') {
      this.spawnBannerText('EJDERHA NEFESİ!', '#fb923c');
      this.screenFlash(0xf97316, 0.4);
      const cone = this.add.triangle(
        this.heroContainer.x + 26,
        this.heroContainer.y - 8,
        0,
        0,
        160,
        -58,
        160,
        58,
        0xef4444,
        0.55
      );
      this.vfxContainer.add(cone);
      this.tweens.add({
        targets: cone,
        alpha: 0,
        scaleX: 1.35,
        duration: 330,
        onComplete: () => cone.destroy(),
      });
      this.enemyBurnTurns = Math.max(this.enemyBurnTurns, 3);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'fire', false);
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 62, 'YANIYOR (3 tur)', '#fb923c');
    } else if (skill.effectType === 'dragon_form') {
      this.spawnBannerText('EJDER FORMU!', '#f97316');
      this.screenFlash(0xf97316, 0.5);
      const wasInForm = this.dragonFormTurns > 0;
      this.dragonFormTurns =
        3 + Math.floor(this.initData.build.passives.dragonScalePct / 40);
      const dShield = Math.round(this.heroMaxHp * 0.25);
      this.heroShield += dShield;
      // Form zaten aktifse temel ölçeği yeniden yazma (büyüme birikmesin)
      if (!wasInForm) this.heroBaseScale = this.heroContainer.scaleX;
      this.cameras.main.zoomTo(1.08, this.d(280), 'Cubic.easeOut');
      this.tweens.add({
        targets: this.heroContainer,
        scaleX: this.heroBaseScale * 1.22,
        scaleY: this.heroBaseScale * 1.22,
        duration: 320,
        ease: 'Back.easeOut',
      });
      this.heroSprite.setTint(0xffb37a);
      this.dealHeroAttackToEnemy(Math.round(atk * skill.powerMultiplier), 'fire', true);
      this.convertTiles(3, ['fire']);
      this.spawnFloatingText(
        this.heroContainer.x,
        this.heroContainer.y - 84,
        `EJDER FORMU (${this.dragonFormTurns} tur) +${dShield} Kalkan`,
        '#fb923c'
      );
      await this.waitMs(330);
      this.cameras.main.zoomTo(1, this.d(300), 'Cubic.easeInOut');
    }

    // Fantastik yaratık sınıflarının veri güdümlü yetenekleri
    if (skill.effectType === 'creature' && skill.fx) {
      await this.runSkillFx(skill, atk, true);
    }

    // Savaş sonlandıysa tur akışını durdur
    if (this.enemyHp <= 0 || this.heroHp <= 0) {
      this.emitSnapshot();
      return;
    }

    // Bazı yetenekler TUR HARCAMAZ — ekstra tur verir!
    if (skill.grantsExtraTurn) {
      this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 86, 'EKSTRA TUR!', '#fde047', 19);
      this.heroSkillLock = false;
      this.inputLocked = false;
      this.emitSnapshot();
      return;
    }

    await this.endPlayerTurn();
  }

  /**
   * Veri güdümlü yetenek efekti — 12 yaratık sınıfının tüm yetenekleri ve Ulti ekleri.
   * withDamage=false ise yalnızca ek etkiler uygulanır (Ulti hasarı zaten verilmiştir).
   */
  private async runSkillFx(
    skill: ActiveSkillDef,
    atk: number,
    withDamage: boolean,
    priorDealt = 0
  ) {
    const fx = skill.fx;
    if (!fx) return;
    const ex = this.enemyContainer.x;
    const ey = this.enemyContainer.y;
    const hx = this.heroContainer.x;
    const hy = this.heroContainer.y;
    // Tur harcayan yeteneklerde güçlendirme, atıldığı turun sonunda 1 azalır; telafi et
    const pad = skill.grantsExtraTurn ? 0 : 1;
    const heroNotes: string[] = [];
    const enemyNotes: string[] = [];
    let dealt = priorDealt;

    if (withDamage) {
      this.spawnBannerText(`${skill.name.toLocaleUpperCase('tr-TR')}!`, fx.hex);
      if (fx.flash) this.screenFlash(fx.color, 0.4);
      if (skill.powerMultiplier > 0) {
        const hits = fx.hits ?? 1;
        const hpBefore = this.enemyHp;
        for (let i = 0; i < hits; i++) {
          if (this.enemyHp <= 0) break;
          if (fx.visual === 'projectile') {
            await this.launchProjectile(hx, hy - 14 + i * 7, ex, ey - 10 + i * 6, fx.color, hits > 1 ? 10 : 18);
          } else if (fx.visual === 'beam') {
            this.drawBeamEffect(hx, hy - 10, ex, ey, fx.color);
            await this.waitMs(110);
          } else if (fx.visual === 'bolts') {
            this.drawLightningArc(ex + (Math.random() - 0.5) * 150, this.stageArea.y - 10, ex, ey, fx.color);
            await this.waitMs(90);
          } else {
            this.drawShockwave(ex, ey, fx.color, 135);
            if (hits > 1) await this.waitMs(110);
          }
          this.dealHeroAttackToEnemy(
            Math.round((atk * skill.powerMultiplier) / hits),
            fx.element,
            !!fx.crit,
            !!fx.pierce
          );
        }
        dealt = Math.max(0, hpBefore - this.enemyHp);
      } else {
        this.drawShockwave(hx, hy, fx.color, 125);
      }
    }

    // --- Düşman üzerindeki durumlar ---
    if (fx.burn) {
      this.enemyBurnTurns = Math.max(this.enemyBurnTurns, fx.burn);
      enemyNotes.push(`Yanma ${fx.burn}`);
    }
    if (fx.poison) {
      this.enemyPoisonTurns = Math.max(this.enemyPoisonTurns, fx.poison);
      enemyNotes.push(`Zehir ${fx.poison}`);
    }
    if (fx.bleed) {
      this.enemyBleedTurns = Math.max(this.enemyBleedTurns, fx.bleed);
      enemyNotes.push(`Kanama ${fx.bleed}`);
    }
    if (fx.freeze) {
      this.enemyFrozenTurns += fx.freeze;
      enemyNotes.push(`Donma ${fx.freeze}`);
    }
    if (fx.stagger) {
      this.enemyStaggerTurns += fx.stagger;
      enemyNotes.push(`Sersem ${fx.stagger}`);
    }

    // --- Kahraman kazanımları ---
    let healed = 0;
    if (fx.drainPct && dealt > 0) healed += Math.round(dealt * fx.drainPct);
    if (fx.healPct) healed += Math.round(this.heroMaxHp * fx.healPct);
    if (healed > 0) {
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + healed);
      heroNotes.push(`+${healed} Can`);
    }
    if (fx.shieldPct) {
      const sh = Math.round(this.heroMaxHp * fx.shieldPct);
      this.heroShield += sh;
      heroNotes.push(`+${sh} Kalkan`);
    }
    if (fx.manaPct) {
      const mg = Math.round(this.heroMaxMana * fx.manaPct);
      this.heroMana = Math.min(this.heroMaxMana, this.heroMana + mg);
      heroNotes.push(`+${mg} Mana`);
    }
    if (fx.ultiGain) {
      this.heroUlti = Math.min(this.heroMaxUlti, this.heroUlti + fx.ultiGain);
      heroNotes.push(`+${fx.ultiGain} Ulti`);
    }
    if (fx.rage) {
      this.heroRageStacks = Math.min(12, this.heroRageStacks + fx.rage);
      heroNotes.push(`+${fx.rage} Öfke`);
    }
    if (fx.critBuff) {
      this.heroCritBuffTurns = Math.max(this.heroCritBuffTurns, fx.critBuff + pad);
      heroNotes.push('Garanti Kritik');
    }
    if (fx.dodgeBuff) {
      this.heroDodgeBuffTurns = Math.max(this.heroDodgeBuffTurns, fx.dodgeBuff + pad);
      heroNotes.push('+%45 Sıyrılma');
    }
    if (fx.summon) {
      this.summonTurns =
        fx.summon + Math.floor(this.initData.build.passives.summonPowerPct / 60);
      this.summonLabel = fx.summonName ?? 'ÇAĞRILAN ORDU';
      heroNotes.push(`${this.summonLabel} ${this.summonTurns} tur`);
    }
    if (fx.form) {
      if (this.dragonFormTurns <= 0) this.heroBaseScale = this.heroContainer.scaleX;
      this.dragonFormTurns = Math.max(this.dragonFormTurns, fx.form + pad);
      this.tweens.add({
        targets: this.heroContainer,
        scaleX: this.heroBaseScale * 1.22,
        scaleY: this.heroBaseScale * 1.22,
        duration: 320,
        ease: 'Back.easeOut',
      });
      this.heroSprite.setTint(0xffd2b0);
      heroNotes.push(`DÖNÜŞÜM ${fx.form} tur`);
    }
    if (fx.selfDmgPct) {
      const cost = Math.round(this.heroMaxHp * fx.selfDmgPct);
      this.heroHp = Math.max(1, this.heroHp - cost);
      heroNotes.push(`-${cost} Can bedeli`);
    }
    if (fx.convert) this.convertTiles(fx.convert.count, fx.convert.types);

    if (heroNotes.length > 0) {
      this.spawnFloatingText(Math.max(hx, 112), hy - 80, heroNotes.join(' • '), fx.hex, 13);
    }
    if (enemyNotes.length > 0 && this.enemyHp > 0) {
      this.spawnFloatingText(ex, ey - 66, enemyNotes.join(' • '), fx.hex, 13);
    }
    this.emitSnapshot();

    if (fx.destroy && this.enemyHp > 0) {
      await this.destroyRandomTiles(fx.destroy);
    }
  }

  /** Rastgele taşları dönüştür (Altın/Arkan/Buz/Doğa...) */
  private convertTiles(count: number, types: GemType[]) {
    const cells: TileVisual[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tv = this.grid[r][c];
        if (tv) cells.push(tv);
      }
    }
    this.shuffle(cells);
    for (let i = 0; i < Math.min(count, cells.length); i++) {
      const t = types[i % types.length];
      cells[i].tile.type = t;
      cells[i].gemSprite.setTexture(`gem_${t}`);
      this.tweens.add({ targets: cells[i].container, scale: 1.3, duration: 150, yoyo: true });
      const p = this.cellToWorld(cells[i].tile.row, cells[i].tile.col);
      this.spawnGemBurst(p.x, p.y, t);
    }
  }

  /** Rastgele N taşı patlat (şelale tetikler) */
  private async destroyRandomTiles(count: number) {
    const blast = new Set<string>();
    let guard = 0;
    while (blast.size < count && guard < 220) {
      blast.add(
        `${Math.floor(this.rng() * GRID_SIZE)},${Math.floor(this.rng() * GRID_SIZE)}`
      );
      guard++;
    }
    if (blast.size === 0) return;
    await this.destroyAndApplyEffect(blast, new Map());
    await this.applyGravityAndRefill();
  }

  /** Rastgele tek bir satırı yok eden yıldırım hattı */
  private async destroyRandomRow() {
    const row = Math.floor(this.rng() * GRID_SIZE);
    const blast = new Set<string>();
    for (let c = 0; c < GRID_SIZE; c++) blast.add(`${row},${c}`);
    const y = this.cellToWorld(row, 0).y;
    this.drawBeamEffect(this.boardX, y, this.boardX + this.boardPixelSize, y, 0xfde047);
    await this.destroyAndApplyEffect(blast, new Map());
    await this.applyGravityAndRefill();
  }

  /** Rastgele bir satır + bir sütunu yok eden çapraz lazer */
  private async destroyRowAndColumn() {
    const row = Math.floor(this.rng() * GRID_SIZE);
    const col = Math.floor(this.rng() * GRID_SIZE);
    const blast = new Set<string>();
    for (let i = 0; i < GRID_SIZE; i++) {
      blast.add(`${row},${i}`);
      blast.add(`${i},${col}`);
    }
    const rowY = this.cellToWorld(row, 0).y;
    const colX = this.cellToWorld(0, col).x;
    this.drawBeamEffect(this.boardX, rowY, this.boardX + this.boardPixelSize, rowY, 0xfde047);
    this.drawBeamEffect(colX, this.boardY, colX, this.boardY + this.boardPixelSize, 0xfde047);
    await this.destroyAndApplyEffect(blast, new Map());
    await this.applyGravityAndRefill();
  }

  /** Tüm ekranı kaplayan renk flaşı */
  private screenFlash(color: number, alpha = 0.4, duration = 260) {
    const rect = this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2,
        this.scale.width * 2,
        this.scale.height * 2,
        color,
        alpha
      )
      .setDepth(24);
    this.tweens.add({
      targets: rect,
      alpha: 0,
      duration,
      onComplete: () => rect.destroy(),
    });
  }

  private playBossEntrance() {
    SoundEngine.playBossRoar();
    this.enemyContainer.setScale(this.enemyContainer.scaleX * 1.4);
    this.enemyContainer.setAlpha(0);
    this.tweens.add({
      targets: this.enemyContainer,
      scaleX: this.enemyContainer.scaleX / 1.4,
      scaleY: this.enemyContainer.scaleY / 1.4,
      alpha: 1,
      duration: 650,
      ease: 'Back.easeOut',
    });
    if (this.initData.settings.screenShake) {
      this.cameras.main.shake(this.d(380), 0.012);
    }
    this.spawnBannerText(`BOSS: ${this.enemy.name.toUpperCase()}!`, '#f43f5e');
  }

  private handleVictory() {
    if (this.turnPhase === 'victory' || this.turnPhase === 'defeat') return;
    this.turnPhase = 'victory';
    this.inputLocked = true;
    this.stopEnemyIdle();
    SoundEngine.playVictory();
    this.tweens.add({
      targets: this.enemyContainer,
      alpha: 0,
      y: this.enemyContainer.y + 30,
      scale: 0.4,
      duration: 500,
    });
    this.emitSnapshot();
    this.time.delayedCall(750, () => {
      this.initData.onBattleEnd(true, this.turnNumber, Math.max(1, Math.round(this.heroHp)));
    });
  }

  private handleDefeat() {
    if (this.turnPhase === 'victory' || this.turnPhase === 'defeat') return;
    this.turnPhase = 'defeat';
    this.inputLocked = true;
    SoundEngine.playDefeat();
    this.tweens.add({
      targets: this.heroContainer,
      alpha: 0.35,
      angle: -20,
      duration: 450,
    });
    this.emitSnapshot();
    this.time.delayedCall(700, () => {
      this.initData.onBattleEnd(false, this.turnNumber, 0);
    });
  }

  private findPossibleMoves(): Move[] {
    return findPossibleMoves(this.tileGrid());
  }

  private async reshuffleBoard(announce: boolean) {
    if (announce) {
      this.spawnBannerText('HAMLE KALMADI — TAHTA KARIŞTIRILIYOR!', '#38bdf8');
      await this.waitMs(450);
    }
    let attempts = 0;
    do {
      const flat: TileVisual[] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const tv = this.grid[r][c];
          if (tv) flat.push(tv);
        }
      }
      this.shuffle(flat);
      let idx = 0;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const tv = flat[idx++];
          tv.tile.row = r;
          tv.tile.col = c;
          this.grid[r][c] = tv;
        }
      }
      attempts++;
    } while (
      attempts < 30 &&
      (this.findMatches().matchedSet.size > 0 || this.findPossibleMoves().length === 0)
    );

    // Guarantee at least one match if random shuffles missed
    if (this.findPossibleMoves().length === 0) {
      const t = 'fire';
      for (const [r, c] of [
        [3, 2],
        [3, 3],
        [4, 4],
      ]) {
        const tv = this.grid[r][c];
        if (tv) {
          tv.tile.type = t;
          tv.gemSprite.setTexture(`gem_${t}`);
        }
      }
    }

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tv = this.grid[r][c];
        if (tv) {
          const dest = this.cellToWorld(r, c);
          this.tweens.add({
            targets: tv.container,
            x: dest.x,
            y: dest.y,
            duration: 320,
            ease: 'Back.easeOut',
          });
        }
      }
    }
    await this.waitMs(350);
  }

  private showHintMove() {
    const moves = this.findPossibleMoves();
    if (moves.length === 0) return;
    const m = moves[0];
    const p1 = this.cellToWorld(m.a.row, m.a.col);
    const p2 = this.cellToWorld(m.b.row, m.b.col);
    this.hintGraphics.clear();
    this.hintGraphics.lineStyle(3, 0x38bdf8, 0.9);
    this.hintGraphics.strokeCircle(p1.x, p1.y, this.cellSize * 0.44);
    this.hintGraphics.strokeCircle(p2.x, p2.y, this.cellSize * 0.44);
  }

  // VFX helpers
  private spawnGemBurst(x: number, y: number, type: GemType) {
    const count = this.initData.settings.highParticles ? 10 : 5;
    const color = GEM_COLOR_NUM[type];
    const particles = this.add.particles(x, y, 'particle_star', {
      speed: { min: 55, max: 190 },
      scale: { start: 0.65, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      lifespan: 380,
      blendMode: 'ADD',
      emitting: false,
    });
    particles.timeScale = this.speed;
    particles.explode(count);
    this.time.delayedCall(450, () => particles.destroy());
  }

  private launchOrbs(
    sources: { x: number; y: number }[],
    destX: number,
    destY: number,
    color: number,
    onArrive: () => void
  ) {
    const sample = sources.slice(0, 4);
    if (sample.length === 0) {
      onArrive();
      return;
    }
    let completed = false;
    sample.forEach((src, idx) => {
      const orb = this.add.image(src.x, src.y, 'particle_orb').setTint(color).setScale(1.15).setBlendMode('ADD');
      this.vfxContainer.add(orb);
      this.tweens.add({
        targets: orb,
        x: destX,
        y: destY,
        scale: 0.5,
        duration: 270 + idx * 35,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          orb.destroy();
          if (!completed) {
            completed = true;
            onArrive();
          }
        },
      });
    });
  }

  private launchProjectile(sx: number, sy: number, tx: number, ty: number, color: number, radius: number): Promise<void> {
    return new Promise((resolve) => {
      const proj = this.add.circle(sx, sy, radius, color, 0.95);
      this.vfxContainer.add(proj);
      this.tweens.add({
        targets: proj,
        x: tx,
        y: ty,
        scale: 1.5,
        duration: 280,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.drawShockwave(tx, ty, color, 95);
          proj.destroy();
          resolve();
        },
      });
    });
  }

  private drawLightningArc(x1: number, y1: number, x2: number, y2: number, color: number) {
    const g = this.add.graphics();
    g.lineStyle(3, color, 0.95);
    g.beginPath();
    g.moveTo(x1, y1);
    const steps = 6;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const jx = Phaser.Math.Linear(x1, x2, t) + (Math.random() - 0.5) * 26;
      const jy = Phaser.Math.Linear(y1, y2, t) + (Math.random() - 0.5) * 26;
      g.lineTo(jx, jy);
    }
    g.lineTo(x2, y2);
    g.strokePath();
    this.vfxContainer.add(g);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 210,
      onComplete: () => g.destroy(),
    });
  }

  private drawBeamEffect(x1: number, y1: number, x2: number, y2: number, color: number) {
    const g = this.add.graphics();
    g.lineStyle(12, color, 0.85);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
    this.vfxContainer.add(g);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 260,
      onComplete: () => g.destroy(),
    });
  }

  private drawShockwave(x: number, y: number, color: number, maxRadius: number) {
    const ring = this.add.circle(x, y, 14, color, 0).setStrokeStyle(5, color, 0.9);
    this.vfxContainer.add(ring);
    this.tweens.add({
      targets: ring,
      radius: maxRadius,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private spawnFloatingText(x: number, y: number, text: string, color = '#ffffff', size = 16) {
    const txt = this.add
      .text(x, y, text, {
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.tweens.add({
      targets: txt,
      y: y - 44,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  private spawnBannerText(text: string, color = '#fde047') {
    const cx = this.scale.width / 2;
    const cy = Math.max(70, this.stageArea.y + this.stageArea.h * 0.42);
    const txt = this.add
      .text(cx, cy, text, {
        fontFamily: 'Cinzel, serif',
        fontSize: this.scale.width < 520 ? '18px' : '24px',
        fontStyle: 'bold',
        color,
        stroke: '#05070e',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setScale(0.6);

    this.tweens.add({
      targets: txt,
      scale: 1.05,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: txt,
          y: cy - 34,
          alpha: 0,
          delay: 520,
          duration: 350,
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  /** Düşmana özel çizim: pivot ayak/kök çizgisinde, bu yüzden nefes alırken zemine basan nokta kaymaz. */
  private applyEnemyArt() {
    const key = enemyArtKey(this.enemy.id);
    if (!key) return;
    const size = this.enemy.isBoss ? 300 : 240;
    this.enemyArtActive = true;
    this.bossAuraGraphics?.clear();
    this.enemySprite.setOrigin(0.5, ENEMY_ART_GROUND);
    this.enemySprite.y = (ENEMY_ART_GROUND - 0.5) * size;
    this.enemySprite.setScale(1);
    // Silüet ışıması: çizimin arkasında, çizimle aynı pivotta ve aynı nefes/süzülme hareketinde
    this.enemyGlowSprite?.destroy();
    this.enemyGlowSprite = null;
    const glowKey = createEnemyGlowTexture(this, this.enemy);
    if (glowKey) {
      this.enemyGlowSprite = this.add.image(0, this.enemySprite.y, glowKey).setOrigin(0.5, ENEMY_ART_GROUND).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      this.enemyContainer.addAt(this.enemyGlowSprite, 0);
    }
    const motionTargets = this.enemyGlowSprite ? [this.enemySprite, this.enemyGlowSprite] : [this.enemySprite];
    this.setupEnemyIdle(ENEMY_ART_GROUND, ENEMY_ART_LAYOUT[key].breathSec, (ENEMY_ART_LAYOUT[key].bob ?? 0) * size, motionTargets);
  }

  /** Eski vektör çizimli düşman: aynı ortak nefes; zemin çizgisi vektör çiziminin gölge hizasıdır, havada duran türlere hafif süzülme eşlik eder. */
  private setupFallbackEnemyIdle() {
    const size = this.enemy.isBoss ? 300 : 240;
    const k = (this.enemy.isBoss ? 1.15 : 0.92) * (size / 240);
    const ground = (0.56 * size + 76 * k) / size;
    this.enemySprite.setOrigin(0.5, ground);
    this.enemySprite.y = (ground - 0.5) * size;
    this.enemySprite.setScale(1);
    const sec = this.enemy.isBoss ? ENEMY_BREATH_DEFAULT.bossSec : ENEMY_BREATH_DEFAULT.normalSec;
    const bobPx = ENEMY_FLOATING_ARCHETYPES.has(this.enemy.visualArchetype) ? size * 0.012 : 0;
    this.setupEnemyIdle(ground, sec, bobPx, [this.enemySprite]);
  }

  private enemyIdleCfg: { baseY: number; sec: number; bobPx: number; targets: Phaser.GameObjects.Image[] } | null = null;
  private enemyIdleResume: Phaser.Time.TimerEvent | null = null;

  private setupEnemyIdle(ground: number, sec: number, bobPx: number, targets: Phaser.GameObjects.Image[]) {
    const size = this.enemy.isBoss ? 300 : 240;
    this.enemyIdleCfg = { baseY: (ground - 0.5) * size, sec: clampBreathSec(sec), bobPx, targets };
    this.startEnemyIdle();
  }

  /** Tek döngü: önce mevcut tween ve zamanlayıcılar durdurulur, böylece aynı düşmanda ikinci bir nefes başlamaz. */
  private startEnemyIdle() {
    const cfg = this.enemyIdleCfg;
    this.enemyBreath?.stop();
    this.enemyBob?.stop();
    this.enemyBreath = null;
    this.enemyBob = null;
    if (!cfg || this.enemyHp <= 0 || this.turnPhase === 'victory') return;
    this.enemyBreath = this.tweens.add({
      targets: cfg.targets,
      scaleY: 1 + ENEMY_BREATH_DEFAULT.stretch,
      scaleX: 1 + ENEMY_BREATH_DEFAULT.stretch * 0.4,
      duration: (cfg.sec / 2) * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    if (cfg.bobPx > 0) {
      this.enemyBob = this.tweens.add({
        targets: cfg.targets,
        y: { from: cfg.baseY, to: cfg.baseY - cfg.bobPx * 2 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Saldırı, hasar alma ve faz geçişi bekleme hareketinden önceliklidir: nefes durur, `ms` sonra düşman hayattaysa yumuşakça yeniden başlar. */
  private holdEnemyIdle(ms: number) {
    const cfg = this.enemyIdleCfg;
    if (!cfg || !this.enemySprite?.active) return;
    this.enemyBreath?.stop();
    this.enemyBob?.stop();
    this.enemyBreath = null;
    this.enemyBob = null;
    this.tweens.add({ targets: cfg.targets, scaleX: 1, scaleY: 1, y: cfg.baseY, duration: 120, ease: 'Sine.easeOut' });
    this.enemyIdleResume?.remove(false);
    this.enemyIdleResume = this.time.delayedCall(ms, () => {
      this.enemyIdleResume = null;
      this.startEnemyIdle();
    });
  }

  /** Karşılaşma bittiğinde (zafer/kapanış) bekleme animasyonunu temizler. */
  private stopEnemyIdle() {
    this.enemyBreath?.stop();
    this.enemyBob?.stop();
    this.enemyBreath = null;
    this.enemyBob = null;
    this.enemyIdleResume?.remove(false);
    this.enemyIdleResume = null;
  }

  /**
   * Çizimli kahramanların canlı ekipman aurası: merkez gövdenin ortası, ölçek çizimin boyuna bağlı (HeroRenderer'daki doku sürümüyle aynı oranlar).
   * Arka katman çizimin arkasında, ön katman (ön yarı zerreler, ön rune yayı, hafif ışıma) çizimin önünde çizilir.
   */
  private drawArtAura(geo: NonNullable<ReturnType<typeof heroAuraGeometry>>, time: number) {
    const g = this.heroAuraGraphics;
    const f = this.heroAuraFrontGraphics;
    g.clear();
    const t = this.heroAura.tier;
    const col = this.heroAura.color;
    const s = this.heroContainer.scaleX;
    const pulse = 0.72 + 0.28 * Math.sin(time * 2.1);
    const hx = this.heroContainer.x;
    // Çizim başlangıcı doku merkezinin 24 birim altındadır; yer çizgisi +74 daha aşağıda
    const ground = this.heroContainer.y + s * (24 + 74 - geo.float);
    const cy = ground - s * geo.h * 0.5;
    const rx = s * (Math.max(geo.w * 0.5 + 10, 60) + t * 7);
    const ry = s * (geo.h * 0.5 + 8 + t * 5);

    // Radyal ışık
    const R = Math.max(rx, ry) * 1.1;
    for (let i = 8; i >= 1; i--) g.fillStyle(col, (0.03 + 0.02 * t) * pulse * (1 - i / 10)), g.fillCircle(hx, cy, (R * i) / 8);

    const ellipsePath = (gr: Phaser.GameObjects.Graphics, ex: number, ey: number, erx: number, ery: number, a0: number, a1: number) => {
      gr.beginPath();
      const n = 20;
      for (let i = 0; i <= n; i++) {
        const a = a0 + ((a1 - a0) * i) / n;
        const px = ex + Math.cos(a) * erx;
        const py = ey + Math.sin(a) * ery;
        if (i === 0) gr.moveTo(px, py);
        else gr.lineTo(px, py);
      }
      gr.strokePath();
    };

    // Yer rune halkası (kademe 2+): arka yarı arkada, ön yarı çizimin önünde; kesikli çizgi döner
    if (t >= 2) {
      const rrx = s * Math.min(Math.max(geo.w * 0.5, 52) + t * 6, 138);
      const rry = rrx * 0.29;
      const dash = (gr: Phaser.GameObjects.Graphics, base: number, alpha: number, k: number, front: boolean) => {
        gr.lineStyle(2, col, alpha);
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 9) {
          const a0 = a + time * 0.55;
          const mid = Math.sin(a0 + Math.PI / 28);
          if ((mid > 0) !== front) continue;
          ellipsePath(gr, hx, base, rrx * k, rry * k, a0, a0 + Math.PI / 14);
        }
      };
      dash(g, ground + s * 2, 0.3 + 0.25 * pulse, 1, false);
      dash(f, ground + s * 2, 0.5 + 0.3 * pulse, 1, true);
      dash(g, ground + s * 2, 0.3 + 0.2 * pulse, 0.72, false);
      dash(f, ground + s * 2, 0.45 + 0.25 * pulse, 0.72, true);
    }

    // +10 ilerlemesi: +10'a ulaşan her ekipman (en çok 10) dairesel parlamayı güçlendirir; 10/10 olunca altın-beyaz "tam güç" parlaması
    const maxed = Object.values(this.initData.hero.equipped).filter((it) => it && it.upgradeLevel >= 10).length;
    if (maxed > 0) {
      const boost = maxed / 10;
      for (let i = 6; i >= 1; i--) g.fillStyle(col, (0.012 + 0.03 * boost) * pulse * (1 - i / 8)), g.fillCircle(hx, cy, (R * 1.12 * i) / 6);
      // Her +10 ekipman için dairenin çevresinde bir ışık parçacığı
      for (let i = 0; i < maxed; i++) {
        const a = time * 0.9 + (i / maxed) * Math.PI * 2;
        const px = hx + Math.cos(a) * R * 0.78;
        const py = cy + Math.sin(a) * R * 0.78;
        g.fillStyle(0xfff7d6, 0.5 + 0.35 * Math.abs(Math.sin(time * 2 + i)));
        g.fillCircle(px, py, s * 2.6);
      }
    }
    if (maxed >= 10) {
      // Tam set +10: dönen altın-beyaz halka çifti ve sıcak merkez ışıması
      for (let i = 8; i >= 1; i--) g.fillStyle(0xfde68a, 0.05 * pulse * (1 - i / 10)), g.fillCircle(hx, cy, (R * 0.9 * i) / 8);
      for (let k = 0; k < 2; k++) {
        const rr = R * (0.62 + 0.2 * k);
        g.lineStyle(2.4 - k * 0.6, k === 0 ? 0xfff2b3 : 0xfde047, 0.5 + 0.35 * pulse);
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          const a0 = a + time * (k === 0 ? 0.7 : -0.5);
          g.beginPath();
          g.arc(hx, cy, rr, a0, a0 + Math.PI / 9);
          g.strokePath();
        }
      }
    }

    // Dönen zerreler (kademe 4+): ön yarı çizimin önünde
    if (this.heroAura.motes > 0) {
      for (let i = 0; i < this.heroAura.motes; i++) {
        const a = time * 1.35 + (i / this.heroAura.motes) * Math.PI * 2;
        const front = Math.sin(a) > 0;
        const gr = front ? f : g;
        const mx = hx + Math.cos(a) * Math.min(rx, s * 140);
        const my = cy + Math.sin(a) * Math.min(ry * 0.38, s * 56);
        gr.fillStyle(col, 0.55 + 0.4 * Math.abs(Math.sin(a)));
        gr.fillCircle(mx, my, s * (2.4 + Math.sin(time * 3 + i) * 0.9));
      }
    }

    // Çizimin üstünde hafif ışıma
    f.fillStyle(col, 0.025 * t * pulse);
    f.fillCircle(hx, cy, Math.min(Math.max(rx, ry) * 0.7, s * 120));

    // Altın hale (kademe 5)
    if (t >= 5) {
      g.lineStyle(3, 0xfde047, 0.65 + 0.3 * pulse);
      g.strokeEllipse(hx, ground - s * (geo.h + 12), s * Math.min(30 * geo.k * 0.9, 44) * 2, s * 20);
    }
  }

  /** Görsel kahramanın bekleme nefesi: pivot ayak çizgisinde, bu yüzden ayaklar kaymaz. */
  private startHeroBreath() {
    if (!this.heroSprite || !this.heroSprite.active) return;
    this.heroBreath?.stop();
    this.heroBreath = this.tweens.add({
      targets: this.heroSprite,
      scaleY: 1 + HERO_BREATH.stretch,
      scaleX: 1 + HERO_BREATH.stretch * 0.4,
      duration: (HERO_BREATH.periodSec / 2) * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Saldırı, hasar alma ve ulti animasyonları bekleme hareketine önceliklidir: nefes durur, çizim yumuşakça normal ölçüye döner,
   * `ms` sonra nefes döngüsü kaldığı yerden değil, normal ölçüden yumuşakça yeniden başlar.
   */
  private holdHeroBreath(ms: number) {
    if (!this.heroBreath) return;
    this.heroBreath.stop();
    this.heroBreath = null;
    this.tweens.add({ targets: this.heroSprite, scaleX: 1, scaleY: 1, duration: 120, ease: 'Sine.easeOut' });
    this.breathResume?.remove(false);
    this.breathResume = this.time.delayedCall(ms, () => {
      this.breathResume = null;
      this.startHeroBreath();
    });
  }

  /** Rhogar: Ejder Formu süresince eski vektör çizim (kanatlı), bitince yeni çizim. */
  private setDragonFormVisual(on: boolean) {
    if (this.initData.hero.classId !== 'dragonheart' || !hasHeroArt('dragonheart')) return;
    if (on) {
      this.heroIdleKey = createHeroPhaserTexture(this, this.initData.hero, 'idle', true);
      this.heroAttackKey = createHeroPhaserTexture(this, this.initData.hero, 'attack', true);
    } else {
      this.heroIdleKey = this.artIdleKey;
      this.heroAttackKey = this.artAttackKey;
    }
    this.heroSprite.setTexture(this.heroIdleKey);
    // Vektör çizimin pivotu orta noktadır: ayak çizgisi pivotu yalnızca yeni çizimde geçerli
    this.heroSprite.setOrigin(0.5, on ? 0.5 : (HERO_TEX_SIZE * 0.58 + 74) / HERO_TEX_SIZE);
    this.heroSprite.y = on ? 0 : ((HERO_TEX_SIZE * 0.58 + 74) / HERO_TEX_SIZE - 0.5) * HERO_TEX_SIZE;
    if (on) {
      this.heroBreath?.stop();
      this.heroBreath = null;
    }
    this.startHeroBreathIfArt();
  }

  private startHeroBreathIfArt() {
    if (hasHeroArt(this.initData.hero.classId)) {
      this.heroSprite.setScale(1);
      this.startHeroBreath();
    }
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Kamera efektleri sahne zaman ölçeğinden etkilenmez; süreleri hıza göre kısaltılır. */
  private d(ms: number): number {
    return Math.max(1, Math.round(ms / this.speed));
  }

  /**
   * Savaş hızını ister. Hamle çözümlenirken (taşlar hareket ediyor, saldırı/efekt sürüyor) değişiklik, çözümleme bitip
   * oyuncu sırası açılınca uygulanır; böylece yarım kalan animasyonun hızı bir anda değişmez.
   */
  public requestSpeed(speed: 1 | 2) {
    this.pendingSpeed = speed;
    this.applyPendingSpeed();
  }

  private applyPendingSpeed() {
    if (this.pendingSpeed === this.speed) return;
    if (!this.time || !this.tweens || !this.anims) return; // sahne henüz kurulmadı: başlangıç hızı create()'te uygulanır
    if (this.inputLocked || this.turnPhase !== 'player') return;
    this.speed = this.pendingSpeed;
    // Zaman ölçeği: bekleme (delayedCall), tween ve animasyonlar aynı oranda hızlanır
    this.time.timeScale = this.speed;
    this.tweens.timeScale = this.speed;
    this.anims.globalTimeScale = this.speed;
    this.emitSnapshot();
  }

  private waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  /** Öfkeli düşman bir tur daha hızlı saldırır; sayaç bu değeri gösterir. */
  private effectiveAttackInterval(): number {
    return this.enemyEnraged
      ? Math.max(1, this.enemy.attackInterval - 1)
      : this.enemy.attackInterval;
  }

  /** "DoT'lar • Zayıflık" biçiminde ek durum bilgisi; eylem bilgisi `enemyIntent`te taşınır. */
  private getEnemyWarningText(): string {
    const weakName = GEM_INFO[this.enemyWeakness].name.split(' ')[0];
    const dots: string[] = [];
    if (this.enemyBurnTurns > 0) dots.push(`Yanma ${this.enemyBurnTurns}`);
    if (this.enemyPoisonTurns > 0) dots.push(`Zehir ${this.enemyPoisonTurns}`);
    if (this.enemyBleedTurns > 0) dots.push(`Kanama ${this.enemyBleedTurns}`);
    if (this.summonTurns > 0) dots.push(`İskelet ${this.summonTurns}`);
    return [...dots, `Zayıflık: ${weakName}`].join(' • ');
  }

  /** Kurt Adam: Av İçgüdüsü (ilk kare → Av yükü) ve Gecenin Çığırtkanı: Gece Yankısı (ilk 3 adımlık zincir → ulti). */
  private applyHeroPassiveOnMatch(squareCount: number) {
    const id = this.initData.hero.classId;
    if (id === 'werewolf') {
      const r = huntChargeOnSquares(this.huntCharges, squareCount, this.huntSquareGiven);
      this.huntCharges = r.charges;
      this.huntSquareGiven = r.turnFlag;
      if (r.given) this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 120, `AV YÜKÜ ${this.huntCharges}/${IMAGE_HERO_TUNING.werewolf.maxCharges}`, '#fde047', 15);
    } else if (id === 'night_screecher') {
      const r = nightEcho(this.mastery.stepsThisMove, this.mastery.swapMove, this.echoUsed);
      if (r.ulti > 0) {
        this.echoUsed = r.used;
        this.heroUlti = Math.min(this.heroMaxUlti, this.heroUlti + r.ulti);
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 120, `GECE YANKISI +${r.ulti} Ulti`, '#c4b5fd', 15);
      }
    }
  }

  /** Sıradaki düşman eylemini geciktirir (aynı eylem toplamda en fazla 1 tur); niyet göstergesi hemen yenilenir. */
  private delayEnemyAction() {
    const r = delayEnemyAction(this.plannedAction, this.delaysByPlan, this.enemyTurnCounter);
    if (r.delayed > 0) {
      this.enemyTurnCounter = r.counter;
      this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 80, `EYLEM +${r.delayed} TUR GECİKTİ`, '#c4b5fd', 15);
    }
    this.emitSnapshot();
  }

  /** Yoldaş: Köz Ejderciği (ilk kare → yanma) ve Buz Tilkisi (ağır saldırı hazırlığında ilk buz eşleşmesi → hazırlan). */
  private applyCompanionOnMatch(counts: Record<GemType, number>, squareCount: number) {
    const id = this.initData.companion;
    if (!id) return;
    if (id === 'ember_whelp') {
      const r = emberTrigger(this.companionState, squareCount, this.initData.build.stats.attack);
      this.companionState = r.state;
      if (r.burn) {
        this.companionBurn = { turns: r.burn.turns, perTurn: r.burn.perTurn };
        this.spawnFloatingText(this.enemyContainer.x, this.enemyContainer.y - 70, 'KÖZ EJDERCİĞİ: YANMA!', '#fb923c', 15);
      }
    } else if (id === 'ice_fox') {
      const next = foxArm(this.companionState, this.plannedAction.kind, counts.frost);
      if (next !== this.companionState) {
        this.spawnFloatingText(this.heroContainer.x, this.heroContainer.y - 110, 'BUZ TİLKİSİ HAZIR!', '#7dd3fc', 15);
      }
      this.companionState = next;
    }
  }

  /** Savaşta tamamlanan iki ustalık hedefi (zafer anında okunur). */
  public getMasteryDone(): [boolean, boolean] {
    const o = this.initData.mastery;
    if (!o) return [false, false];
    return [progressOf(this.mastery, o[0]).done, progressOf(this.mastery, o[1]).done];
  }

  private emitSnapshot() {
    this.lastIntentSignature = this.intentSignature();
    this.initData.onCombatUpdate({
      mastery: this.initData.mastery ? this.initData.mastery.map((o) => progressOf(this.mastery, o)) : undefined,
      speed: this.speed,
      kit: this.initData.hero.classId === 'werewolf' ? { label: 'Av yükü', value: this.huntCharges, max: IMAGE_HERO_TUNING.werewolf.maxCharges } : undefined,
      companion: this.initData.companion ? { id: this.initData.companion, state: this.companionState } : undefined,
      heroHp: this.heroHp,
      heroMaxHp: this.heroMaxHp,
      heroShield: this.heroShield,
      heroMana: this.heroMana,
      heroMaxMana: this.heroMaxMana,
      heroUlti: this.heroUlti,
      heroMaxUlti: this.heroMaxUlti,
      heroRageStacks: this.heroRageStacks,
      enemyHp: this.enemyHp,
      enemyMaxHp: this.enemyMaxHp,
      enemyShield: this.enemyShield,
      enemyTurnCounter: this.enemyTurnCounter,
      enemyMaxTurnInterval: this.effectiveAttackInterval(),
      enemyFrozenTurns: this.enemyFrozenTurns,
      enemyBurnTurns: this.enemyBurnTurns,
      enemyPoisonTurns: this.enemyPoisonTurns,
      enemyStaggerTurns: this.enemyStaggerTurns,
      enemyBleedTurns: this.enemyBleedTurns,
      heroCritBuffTurns: this.heroCritBuffTurns,
      heroDodgeBuffTurns: this.heroDodgeBuffTurns,
      summonTurns: this.summonTurns,
      dragonFormTurns: this.dragonFormTurns,
      enemyPhase: this.enemyPhase,
      enemyEnraged: this.enemyEnraged,
      enemyWeakness: this.enemyWeakness,
      enemyNextWarning: this.getEnemyWarningText(),
      enemyIntent: describeIntent({
        action: this.plannedAction,
        turnsLeft: this.enemyTurnCounter,
        frozenTurns: this.enemyFrozenTurns,
        staggerTurns: this.enemyStaggerTurns,
      }),
      phaseNotice: this.phaseNotice,
      comboCount: this.comboCount,
      turnPhase: this.turnPhase,
      skillCooldowns: { ...this.skillCooldowns },
      turnNumber: this.turnNumber,
    });
  }
}
