import {
  BossId,
  EnemyDef,
  GemType,
  RegionDef,
  RegionId,
  Rarity,
  StageDef,
  StageType,
} from '../types/game';
import { tuneStage } from './difficulty';
import { GEM_INFO } from './skills';
import expansion from './expansionRegions.json';

const CORE_REGIONS: RegionDef[] = [
  {
    id: 'forest',
    name: 'Büyülü Orman',
    subtitle: 'Işıldayan Yaprakların Diyarı',
    description: 'Antik ağaçların arasında gizlenen orman yaratıkları ve uyandırılan Kadim Muhafız seni bekliyor.',
    levelRange: 'Sv. 1 - 5',
    bgGradient: 'from-emerald-950 via-teal-950 to-slate-950',
    accentColor: '#22c55e',
    stages: [
      {
        id: 'forest_1',
        regionId: 'forest',
        stageNumber: 1,
        name: 'Orman Girişi',
        description: 'Yolunu kesen yaramaz bir Goblin Yağmacısı ile ilk sınavını ver.',
        type: 'normal',
        recommendedLevel: 1,
        enemy: {
          id: 'goblin_raider',
          name: 'Goblin Yağmacısı',
          isBoss: false,
          regionId: 'forest',
          level: 1,
          maxHp: 380,
          attack: 34,
          defense: 4,
          attackInterval: 2,
          weakness: 'fire',
          abilities: ['Hızlı Hançer'],
          visualArchetype: 'goblin',
        },
        rewards: { xp: 65, gold: 80, crystals: 4, dropChance: 0.65 },
      },
      {
        id: 'forest_2',
        regionId: 'forest',
        stageNumber: 2,
        name: 'Sisli Patika',
        description: 'Gecenin gölgesinden çıkan Gölge Kurdu hızlı saldırılar yapar.',
        type: 'normal',
        recommendedLevel: 2,
        enemy: {
          id: 'shadow_wolf',
          name: 'Gölge Kurdu',
          isBoss: false,
          regionId: 'forest',
          level: 2,
          maxHp: 560,
          attack: 44,
          defense: 7,
          attackInterval: 2,
          weakness: 'lightning',
          abilities: ['Vahşi Isırık'],
          visualArchetype: 'wolf',
        },
        rewards: { xp: 95, gold: 110, crystals: 6, dropChance: 0.7 },
      },
      {
        id: 'forest_3',
        regionId: 'forest',
        stageNumber: 3,
        name: 'Zümrüt Hazine Korusu',
        description: 'Altın ve ekipman dolu sandığı koruyan Hazine Golem’ini yen!',
        type: 'treasure',
        recommendedLevel: 3,
        enemy: {
          id: 'moss_sentinel',
          name: 'Yosun Hazine Muhafızı',
          isBoss: false,
          regionId: 'forest',
          level: 3,
          maxHp: 740,
          attack: 48,
          defense: 12,
          attackInterval: 3,
          weakness: 'fire',
          abilities: ['Hazine Kalkanı', 'Ağır Darbe'],
          visualArchetype: 'treant',
        },
        rewards: { xp: 130, gold: 240, crystals: 12, guaranteedRarity: 'rare', dropChance: 1.0 },
      },
      {
        id: 'forest_4',
        regionId: 'forest',
        stageNumber: 4,
        name: 'Elit: Dikenli Ağaç Ruhu',
        description: 'Ormanın derinliklerindeki elit ağaç devi yüksek savunmaya sahiptir.',
        type: 'elite',
        recommendedLevel: 4,
        enemy: {
          id: 'elder_treant',
          name: 'Elit Dikenli Ağaç',
          title: 'Orman Eliti',
          isBoss: false,
          regionId: 'forest',
          level: 4,
          maxHp: 1050,
          attack: 62,
          defense: 15,
          attackInterval: 2,
          weakness: 'fire',
          resistance: 'nature',
          abilities: ['Diken Yağmuru', 'Doğa Yenilenmesi'],
          visualArchetype: 'treant',
        },
        rewards: { xp: 185, gold: 220, crystals: 14, guaranteedRarity: 'rare', dropChance: 1.0 },
      },
      {
        id: 'forest_5',
        regionId: 'forest',
        stageNumber: 5,
        name: 'BOSS: Kadim Orman Muhafızı',
        description: 'Büyülü Orman’ın efsanevi koruyucusu! Kök kalkanını Ateş taşlarıyla kır!',
        type: 'boss',
        recommendedLevel: 5,
        enemy: {
          id: 'boss_forest_guardian',
          name: 'Kadim Orman Muhafızı',
          title: 'Bölge Bossu',
          isBoss: true,
          bossId: 'forest_guardian',
          regionId: 'forest',
          level: 5,
          maxHp: 1850,
          attack: 78,
          defense: 18,
          attackInterval: 2,
          weakness: 'fire',
          resistance: 'nature',
          abilities: ['Kök Kalkanı (%50 Can)', 'Orman Gazabı', 'Öfke Modu'],
          visualArchetype: 'forest_guardian',
        },
        rewards: { xp: 340, gold: 450, crystals: 28, guaranteedRarity: 'epic', dropChance: 1.0 },
      },
    ],
  },

  {
    id: 'mountains',
    name: 'Donmuş Dağlar',
    subtitle: 'Ebedi Buzulların Zirvesi',
    description: 'Dondurucu fırtınalar arasında Buz Kraliçesi’nin buzdan ordusuna meydan oku.',
    levelRange: 'Sv. 6 - 10',
    bgGradient: 'from-sky-950 via-blue-950 to-slate-950',
    accentColor: '#38bdf8',
    stages: [
      {
        id: 'mountains_1',
        regionId: 'mountains',
        stageNumber: 1,
        name: 'Karlı Geçit',
        description: 'Soğuğa alışık vahşi Buzul Kurdu yolunu kesiyor.',
        type: 'normal',
        recommendedLevel: 6,
        enemy: {
          id: 'frost_wolf',
          name: 'Buzul Kurdu',
          isBoss: false,
          regionId: 'mountains',
          level: 6,
          maxHp: 1450,
          attack: 88,
          defense: 18,
          attackInterval: 2,
          weakness: 'fire',
          abilities: ['Ayaz Pençesi'],
          visualArchetype: 'wolf',
        },
        rewards: { xp: 240, gold: 280, crystals: 16, dropChance: 0.75 },
      },
      {
        id: 'mountains_2',
        regionId: 'mountains',
        stageNumber: 2,
        name: 'Tipi Vadisi',
        description: 'Dev dağ Yetisi ezici yumruklarıyla saldırır.',
        type: 'normal',
        recommendedLevel: 7,
        enemy: {
          id: 'mountain_yeti',
          name: 'Dağ Yetisi',
          isBoss: false,
          regionId: 'mountains',
          level: 7,
          maxHp: 1850,
          attack: 102,
          defense: 22,
          attackInterval: 2,
          weakness: 'lightning',
          abilities: ['Çığ Yumruğu'],
          visualArchetype: 'yeti',
        },
        rewards: { xp: 290, gold: 330, crystals: 18, dropChance: 0.8 },
      },
      {
        id: 'mountains_3',
        regionId: 'mountains',
        stageNumber: 3,
        name: 'Buz Kristali Hazinesi',
        description: 'Buz mağarasındaki donmuş hazineyi koruyan Buz Golem’i alt et!',
        type: 'treasure',
        recommendedLevel: 8,
        enemy: {
          id: 'crystal_ice_golem',
          name: 'Buz Hazine Golemi',
          isBoss: false,
          regionId: 'mountains',
          level: 8,
          maxHp: 2150,
          attack: 106,
          defense: 28,
          attackInterval: 3,
          weakness: 'fire',
          abilities: ['Buz Zırhı'],
          visualArchetype: 'ice_golem',
        },
        rewards: { xp: 350, gold: 560, crystals: 26, guaranteedRarity: 'rare', dropChance: 1.0 },
      },
      {
        id: 'mountains_4',
        regionId: 'mountains',
        stageNumber: 4,
        name: 'Elit: Kadim Buz Golemi',
        description: 'Buz Kraliçesi’nin saray kapısını koruyan devasa elit muhafız.',
        type: 'elite',
        recommendedLevel: 9,
        enemy: {
          id: 'elite_ice_golem',
          name: 'Elit Kadim Buz Golemi',
          title: 'Buzul Eliti',
          isBoss: false,
          regionId: 'mountains',
          level: 9,
          maxHp: 2700,
          attack: 124,
          defense: 30,
          attackInterval: 2,
          weakness: 'fire',
          resistance: 'frost',
          abilities: ['Buzul Kalkanı', 'Dondurucu Darbe'],
          visualArchetype: 'ice_golem',
        },
        rewards: { xp: 430, gold: 480, crystals: 30, guaranteedRarity: 'epic', dropChance: 1.0 },
      },
      {
        id: 'mountains_5',
        regionId: 'mountains',
        stageNumber: 5,
        name: 'BOSS: Buz Kraliçesi',
        description: '%50 canda Buz Bariyeri açılır. Bariyeri kırmak için iki ayrı hamlede buz eşleştir.',
        type: 'boss',
        recommendedLevel: 10,
        enemy: {
          id: 'boss_frost_queen',
          name: 'Buz Kraliçesi',
          title: 'Bölge Bossu',
          isBoss: true,
          bossId: 'frost_queen',
          regionId: 'mountains',
          level: 10,
          maxHp: 4200,
          attack: 145,
          defense: 32,
          attackInterval: 2,
          weakness: 'fire',
          resistance: 'frost',
          abilities: ['Taş Dondurma', 'Buz Bariyeri', 'Mutlak Sıfır Çığı'],
          visualArchetype: 'frost_queen',
        },
        rewards: { xp: 680, gold: 900, crystals: 48, guaranteedRarity: 'legendary', dropChance: 1.0 },
      },
    ],
  },

  {
    id: 'volcano',
    name: 'Volkanik Topraklar',
    subtitle: 'Erimiş Lavların Cehennemi',
    description: 'Kızgın magmaların arasından yükselerek Cehennem Ejderhası ile yüzleş!',
    levelRange: 'Sv. 11 - 16',
    bgGradient: 'from-red-950 via-orange-950 to-stone-950',
    accentColor: '#f97316',
    stages: [
      {
        id: 'volcano_1',
        regionId: 'volcano',
        stageNumber: 1,
        name: 'Kül Ovasi',
        description: 'Lavların içinden fırlayan Ateş Semenderi saldırıya geçiyor.',
        type: 'normal',
        recommendedLevel: 11,
        enemy: {
          id: 'lava_salamander',
          name: 'Ateş Semenderi',
          isBoss: false,
          regionId: 'volcano',
          level: 11,
          maxHp: 3400,
          attack: 158,
          defense: 34,
          attackInterval: 2,
          weakness: 'frost',
          abilities: ['Lav Püskürtme'],
          visualArchetype: 'salamander',
        },
        rewards: { xp: 520, gold: 560, crystals: 30, dropChance: 0.8 },
      },
      {
        id: 'volcano_2',
        regionId: 'volcano',
        stageNumber: 2,
        name: 'Magma Köprüsü',
        description: 'Saf alevden oluşan Alev Elementali yüksek hasar verir.',
        type: 'normal',
        recommendedLevel: 12,
        enemy: {
          id: 'flame_elemental',
          name: 'Alev Elementali',
          isBoss: false,
          regionId: 'volcano',
          level: 12,
          maxHp: 4100,
          attack: 175,
          defense: 36,
          attackInterval: 2,
          weakness: 'frost',
          abilities: ['Kor Patlaması'],
          visualArchetype: 'fire_elemental',
        },
        rewards: { xp: 620, gold: 650, crystals: 35, dropChance: 0.85 },
      },
      {
        id: 'volcano_3',
        regionId: 'volcano',
        stageNumber: 3,
        name: 'Obsidyen Hazine Odası',
        description: 'Efsanevi madenlerle dolu odayı koruyan Alev Muhafızını yen!',
        type: 'treasure',
        recommendedLevel: 13,
        enemy: {
          id: 'obsidian_vault_guard',
          name: 'Obsidyen Hazine Ruhu',
          isBoss: false,
          regionId: 'volcano',
          level: 13,
          maxHp: 4700,
          attack: 180,
          defense: 42,
          attackInterval: 3,
          weakness: 'frost',
          abilities: ['Magma Kalkanı'],
          visualArchetype: 'fire_elemental',
        },
        rewards: { xp: 740, gold: 1200, crystals: 55, guaranteedRarity: 'epic', dropChance: 1.0 },
      },
      {
        id: 'volcano_4',
        regionId: 'volcano',
        stageNumber: 4,
        name: 'Elit: Magma Lordu',
        description: 'Volkanın derinliklerinden yükselen elit alev lordu!',
        type: 'elite',
        recommendedLevel: 15,
        enemy: {
          id: 'magma_lord',
          name: 'Elit Magma Lordu',
          title: 'Volkan Eliti',
          isBoss: false,
          regionId: 'volcano',
          level: 15,
          maxHp: 5900,
          attack: 205,
          defense: 46,
          attackInterval: 2,
          weakness: 'frost',
          resistance: 'fire',
          abilities: ['Lav Yağmuru', 'Kavurucu Öfke'],
          visualArchetype: 'fire_elemental',
        },
        rewards: { xp: 920, gold: 980, crystals: 60, guaranteedRarity: 'epic', dropChance: 1.0 },
      },
      {
        id: 'volcano_5',
        regionId: 'volcano',
        stageNumber: 5,
        name: 'BOSS: Cehennem Ejderhası',
        description: 'Kanatlı kıyamet! Ejderha Nefesi uyarısına karşı Buz ve Doğa kalkanlarını hazırla!',
        type: 'boss',
        recommendedLevel: 16,
        enemy: {
          id: 'boss_infernal_dragon',
          name: 'Cehennem Ejderhası',
          title: 'Kadim Ateş Bossu',
          isBoss: true,
          bossId: 'infernal_dragon',
          regionId: 'volcano',
          level: 16,
          maxHp: 9400,
          attack: 240,
          defense: 50,
          attackInterval: 2,
          weakness: 'frost',
          resistance: 'fire',
          abilities: ['Ejderha Nefesi', 'Lav Kalkanı', 'Kanatlı Öfke Fazı'],
          visualArchetype: 'infernal_dragon',
        },
        rewards: { xp: 1450, gold: 1850, crystals: 95, guaranteedRarity: 'legendary', dropChance: 1.0 },
      },
    ],
  },

  {
    id: 'ruins',
    name: 'Kadim Harabeler',
    subtitle: 'Unutulmuş Rünlerin Tapınağı',
    description: 'Binlerce yıllık büyü kristalleriyle korunan harabelerde Kristal Titan ve Gölge İblisi seni bekliyor.',
    levelRange: 'Sv. 17 - 22',
    bgGradient: 'from-violet-950 via-indigo-950 to-slate-950',
    accentColor: '#a855f7',
    stages: [
      {
        id: 'ruins_1',
        regionId: 'ruins',
        stageNumber: 1,
        name: 'Rünlü Avlu',
        description: 'Taştan oyulmuş Kadim Gözcü tapınağa girenleri durduruyor.',
        type: 'normal',
        recommendedLevel: 17,
        enemy: {
          id: 'stone_sentinel',
          name: 'Kadim Taş Gözcü',
          isBoss: false,
          regionId: 'ruins',
          level: 17,
          maxHp: 7600,
          attack: 255,
          defense: 56,
          attackInterval: 2,
          weakness: 'lightning',
          abilities: ['Rün Kalkanı'],
          visualArchetype: 'stone_sentinel',
        },
        rewards: { xp: 1150, gold: 1200, crystals: 65, dropChance: 0.85 },
      },
      {
        id: 'ruins_2',
        regionId: 'ruins',
        stageNumber: 2,
        name: 'Yıkık Kütüphane',
        description: 'Gölge boyutundan sızan Hiçlik İzleyicisi!',
        type: 'normal',
        recommendedLevel: 18,
        enemy: {
          id: 'void_stalker',
          name: 'Hiçlik İzleyicisi',
          isBoss: false,
          regionId: 'ruins',
          level: 18,
          maxHp: 8800,
          attack: 280,
          defense: 54,
          attackInterval: 2,
          weakness: 'arcane',
          abilities: ['Gölge Kesişi'],
          visualArchetype: 'void_stalker',
        },
        rewards: { xp: 1320, gold: 1400, crystals: 72, dropChance: 0.9 },
      },
      {
        id: 'ruins_3',
        regionId: 'ruins',
        stageNumber: 3,
        name: 'Prizma Mahzeni',
        description: 'Efsanevi tılsımların saklandığı kadim hazine odası!',
        type: 'treasure',
        recommendedLevel: 19,
        enemy: {
          id: 'prism_warden',
          name: 'Prizma Mahzen Bekçisi',
          isBoss: false,
          regionId: 'ruins',
          level: 19,
          maxHp: 9800,
          attack: 285,
          defense: 64,
          attackInterval: 3,
          weakness: 'arcane',
          abilities: ['Yansıtıcı Bariyer'],
          visualArchetype: 'stone_sentinel',
        },
        rewards: { xp: 1550, gold: 2300, crystals: 110, guaranteedRarity: 'legendary', dropChance: 1.0 },
      },
      {
        id: 'ruins_4',
        regionId: 'ruins',
        stageNumber: 4,
        name: 'BOSS: Kristal Titan',
        description: 'Devasa kristal zırhlı Titan! Yıldırım ve Arkan taşlarıyla zırhını parçala!',
        type: 'boss',
        recommendedLevel: 20,
        enemy: {
          id: 'boss_crystal_titan',
          name: 'Kristal Titan',
          title: 'Tapınak Bossu',
          isBoss: true,
          bossId: 'crystal_titan',
          regionId: 'ruins',
          level: 20,
          maxHp: 14800,
          attack: 320,
          defense: 68,
          attackInterval: 2,
          weakness: 'lightning',
          resistance: 'nature',
          abilities: ['Kristal Zırh Fazı', 'Deprem Sarsıntısı', 'Prizma Işını'],
          visualArchetype: 'crystal_titan',
        },
        rewards: { xp: 2200, gold: 2800, crystals: 140, guaranteedRarity: 'legendary', dropChance: 1.0 },
      },
      {
        id: 'ruins_5',
        regionId: 'ruins',
        stageNumber: 5,
        name: 'BOSS: Gölge İblisi',
        description: 'Harabelerin yasak mührünü kıran Gölge İblisi can çalarak güçlenir!',
        type: 'boss',
        recommendedLevel: 22,
        enemy: {
          id: 'boss_shadow_demon',
          name: 'Gölge İblisi',
          title: 'Karanlık Muhafız Bossu',
          isBoss: true,
          bossId: 'shadow_demon',
          regionId: 'ruins',
          level: 22,
          maxHp: 17500,
          attack: 355,
          defense: 66,
          attackInterval: 2,
          weakness: 'nature',
          abilities: ['Ruh Sömürüsü', 'Karanlık Klon Darbesi', 'İblis Öfkesi'],
          visualArchetype: 'shadow_demon',
        },
        rewards: { xp: 2700, gold: 3400, crystals: 175, guaranteedRarity: 'legendary', dropChance: 1.0 },
      },
    ],
  },

  {
    id: 'abyss',
    name: 'Karanlık Uçurum',
    subtitle: 'Kıyametin Başladığı Yer',
    description: 'Evrenin en karanlık köşesinde Uçurum Kralı ile son savaşa gir ve Mitik ganimetler kazan!',
    levelRange: 'Sv. 23 - 30',
    bgGradient: 'from-rose-950 via-purple-950 to-black',
    accentColor: '#f43f5e',
    stages: [
      {
        id: 'abyss_1',
        regionId: 'abyss',
        stageNumber: 1,
        name: 'Kabus Kapısı',
        description: 'Uçurumun eşiğindeki zırhlı Hiçlik Şövalyesi.',
        type: 'normal',
        recommendedLevel: 23,
        enemy: {
          id: 'abyss_stalker',
          name: 'Uçurum Akıncısı',
          isBoss: false,
          regionId: 'abyss',
          level: 23,
          maxHp: 16500,
          attack: 380,
          defense: 75,
          attackInterval: 2,
          weakness: 'arcane',
          abilities: ['Hiçlik Darbesi'],
          visualArchetype: 'void_stalker',
        },
        rewards: { xp: 2600, gold: 3000, crystals: 140, dropChance: 0.9 },
      },
      {
        id: 'abyss_2',
        regionId: 'abyss',
        stageNumber: 2,
        name: 'Ebedi Karanlık Köprüsü',
        description: 'Kaos enerjisiyle yüklenmiş devasa taş koruyucu.',
        type: 'elite',
        recommendedLevel: 25,
        enemy: {
          id: 'abyss_colossus',
          name: 'Elit Kaos Golemi',
          title: 'Uçurum Eliti',
          isBoss: false,
          regionId: 'abyss',
          level: 25,
          maxHp: 21000,
          attack: 420,
          defense: 85,
          attackInterval: 2,
          weakness: 'lightning',
          abilities: ['Kaos Kalkanı', 'Yıkıcı Ezme'],
          visualArchetype: 'stone_sentinel',
        },
        rewards: { xp: 3300, gold: 3800, crystals: 185, guaranteedRarity: 'legendary', dropChance: 1.0 },
      },
      {
        id: 'abyss_3',
        regionId: 'abyss',
        stageNumber: 3,
        name: 'Mitik Hazine Tapınağı',
        description: 'Uçurumun kalbindeki efsanevi hazine sandığını ele geçir!',
        type: 'treasure',
        recommendedLevel: 26,
        enemy: {
          id: 'mythic_vault_keeper',
          name: 'Kaos Hazine Bekçisi',
          isBoss: false,
          regionId: 'abyss',
          level: 26,
          maxHp: 23500,
          attack: 430,
          defense: 90,
          attackInterval: 3,
          weakness: 'fire',
          abilities: ['Altın Bariyer'],
          visualArchetype: 'void_stalker',
        },
        rewards: { xp: 3800, gold: 5600, crystals: 260, guaranteedRarity: 'legendary', dropChance: 1.0 },
      },
      {
        id: 'abyss_4',
        regionId: 'abyss',
        stageNumber: 4,
        name: 'Elit: Uçurum Generali',
        description: 'Kralın sağ kolu olan acımasız Karanlık General.',
        type: 'elite',
        recommendedLevel: 28,
        enemy: {
          id: 'abyss_general',
          name: 'Elit Uçurum Generali',
          title: 'Kraliyet Muhafızı',
          isBoss: false,
          regionId: 'abyss',
          level: 28,
          maxHp: 28000,
          attack: 470,
          defense: 95,
          attackInterval: 2,
          weakness: 'nature',
          abilities: ['Karanlık Fırtına', 'Öfke Patlaması'],
          visualArchetype: 'shadow_demon',
        },
        rewards: { xp: 4500, gold: 4900, crystals: 240, guaranteedRarity: 'legendary', dropChance: 1.0 },
      },
      {
        id: 'abyss_5',
        regionId: 'abyss',
        stageNumber: 5,
        name: 'SON BOSS: Uçurum Kralı',
        description: 'Üç fazlı nihai savaş! Zayıflığı sürekli değişir ve Kıyamet Sayacı ilerler. Mitik ödül seni bekliyor!',
        type: 'boss',
        recommendedLevel: 30,
        enemy: {
          id: 'boss_abyssal_king',
          name: 'Uçurum Kralı Malakor',
          title: 'Nihai Kıyamet Bossu',
          isBoss: true,
          bossId: 'abyssal_king',
          regionId: 'abyss',
          level: 30,
          maxHp: 42000,
          attack: 540,
          defense: 105,
          attackInterval: 2,
          weakness: 'arcane',
          abilities: ['3 Fazlı Kaos', 'Değişen Zayıflık', 'Kıyamet Hükmü', 'Karanlık Aegis'],
          visualArchetype: 'abyssal_king',
        },
        rewards: { xp: 7500, gold: 9500, crystals: 450, guaranteedRarity: 'mythic', dropChance: 1.0 },
      },
    ],
  },
];

/* ================================================================== */
/*  PROSEDÜREL DÜNYA GENİŞLETMESİ — 15 Bölge / 120 Aşama               */
/* ================================================================== */

type Arch = EnemyDef['visualArchetype'];

interface EnemyTemplate {
  name: string;
  arch: Arch;
  weakness: GemType;
  resistance?: GemType;
  abilities: string[];
}

interface BossTemplate extends EnemyTemplate {
  bossId: BossId;
  title: string;
}

/** Düşman istatistik eğrisi — kahraman gücüyle dengeli ilerler */
function scaleStats(level: number, type: StageType) {
  const L = Math.max(1, level - 1);
  const hpBase = 340 + 42 * Math.pow(L, 1.85);
  const atkBase = 30 + 6.5 * Math.pow(L, 1.15);
  const defBase = 4 + 0.5 * Math.pow(L, 1.1);
  const mult =
    type === 'boss'
      ? { hp: 2.6, atk: 1.35, def: 1.3 }
      : type === 'elite'
        ? { hp: 1.8, atk: 1.12, def: 1.18 }
        : type === 'treasure'
          ? { hp: 1.45, atk: 0.95, def: 1.25 }
          : { hp: 1, atk: 1, def: 1 };
  return {
    maxHp: Math.round(hpBase * mult.hp),
    attack: Math.round(atkBase * mult.atk),
    defense: Math.round(defBase * mult.def),
  };
}

function rewardsFor(level: number, type: StageType): StageDef['rewards'] {
  const L = Math.max(0, level - 1);
  const m = type === 'boss' ? 2.3 : type === 'elite' ? 1.5 : type === 'treasure' ? 1.35 : 1;
  const guaranteed: Rarity | undefined =
    type === 'boss'
      ? level >= 50
        ? 'mythic'
        : level >= 33
          ? 'legendary'
          : 'epic'
      : type === 'elite'
        ? level >= 40
          ? 'legendary'
          : 'epic'
        : type === 'treasure'
          ? level >= 44
            ? 'legendary'
            : 'rare'
          : undefined;
  return {
    xp: Math.round((110 + 34 * Math.pow(L, 1.5)) * m),
    gold: Math.round((85 + 22 * Math.pow(L, 1.42)) * m),
    crystals: Math.round((5 + 1.3 * Math.pow(L, 1.15)) * m),
    guaranteedRarity: guaranteed,
    dropChance: type === 'normal' ? 0.72 : 1,
  };
}

function stageDescription(
  type: StageType,
  regionName: string,
  enemyName: string,
  weakness: GemType,
  bossTitle?: string
): string {
  const weak = GEM_INFO[weakness].name.split(' ')[0];
  if (type === 'boss') {
    return `${bossTitle ?? 'Bölge Bossu'} ${enemyName} bu diyarı yönetiyor! Fazları, kalkanları ve özel saldırılarıyla destansı bir savaş. Zayıflık: ${weak} Taşı.`;
  }
  if (type === 'elite') {
    return `${regionName} içindeki elit düşman: ${enemyName}! Normalden çok daha güçlü ve dirençli. Zayıflık: ${weak} Taşı.`;
  }
  if (type === 'treasure') {
    return `${enemyName} tarafından korunan zengin bir hazine sandığı! Kazanırsan garanti Nadir+ ekipman düşer. Zayıflık: ${weak} Taşı.`;
  }
  return `${regionName} derinliklerinde ${enemyName} pusuya yatmış! Taşları eşleştir ve onu alt et. Zayıflık: ${weak} Taşı.`;
}

function makeStage(opts: {
  regionId: RegionId;
  regionName: string;
  stageNumber: number;
  type: StageType;
  level: number;
  name: string;
  enemy: EnemyTemplate;
  boss?: BossTemplate;
}): StageDef {
  const tpl = opts.boss ?? opts.enemy;
  const stats = scaleStats(opts.level, opts.type);
  const enemyName = opts.boss
    ? opts.boss.name
    : opts.type === 'elite'
      ? `Elit ${tpl.name}`
      : tpl.name;

  const enemyDef: EnemyDef = {
    id: `${opts.regionId}_${opts.stageNumber}_enemy`,
    name: enemyName,
    title: opts.boss
      ? opts.boss.title
      : opts.type === 'elite'
        ? 'Bölge Eliti'
        : opts.type === 'treasure'
          ? 'Hazine Muhafızı'
          : undefined,
    isBoss: opts.type === 'boss',
    bossId: opts.boss?.bossId,
    regionId: opts.regionId,
    level: opts.level,
    maxHp: stats.maxHp,
    attack: stats.attack,
    defense: stats.defense,
    attackInterval: opts.type === 'treasure' ? 3 : 2,
    weakness: tpl.weakness,
    resistance: tpl.resistance,
    abilities: tpl.abilities,
    visualArchetype: tpl.arch,
  };

  return {
    id: `${opts.regionId}_${opts.stageNumber}`,
    regionId: opts.regionId,
    stageNumber: opts.stageNumber,
    name: opts.name,
    description: stageDescription(
      opts.type,
      opts.regionName,
      enemyName,
      tpl.weakness,
      opts.boss?.title
    ),
    type: opts.type,
    recommendedLevel: opts.level,
    enemy: enemyDef,
    rewards: rewardsFor(opts.level, opts.type),
  };
}

/* --------- İlk 5 bölgeye eklenen "Lord Üçlüsü" (Elit + Hazine + Lord Boss) --------- */
interface TripletConfig {
  regionId: RegionId;
  levels: [number, number, number];
  elite: EnemyTemplate;
  treasure: EnemyTemplate;
  boss: BossTemplate;
  names: [string, string, string];
}

const CORE_TRIPLETS: TripletConfig[] = [
  {
    regionId: 'forest',
    levels: [6, 7, 8],
    elite: {
      name: 'Dikenli Yaban Domuzu',
      arch: 'wolf',
      weakness: 'fire',
      abilities: ['Zırh Kırıcı Tos', 'Dikenli Deri'],
    },
    treasure: {
      name: 'Kutsal Koru Bekçisi',
      arch: 'treant',
      weakness: 'fire',
      abilities: ['Hazine Kalkanı', 'Kök Yakalama'],
    },
    boss: {
      name: 'Yaban Kalbi Ordun',
      title: 'Orman Lordu',
      bossId: 'forest_lord',
      arch: 'warlord',
      weakness: 'fire',
      resistance: 'nature',
      abilities: ['Doğanın Gazabı', 'Kök Zindanı', 'Öfke Fazı'],
    },
    names: ['Dikenli Sırt', 'Kutsal Koru Hazinesi', 'BOSS: Orman Lordu'],
  },
  {
    regionId: 'mountains',
    levels: [11, 12, 13],
    elite: {
      name: 'Buzul Dev Avcısı',
      arch: 'yeti',
      weakness: 'fire',
      abilities: ['Çığ Yumruğu', 'Buzul Zırhı'],
    },
    treasure: {
      name: 'Donmuş Sandık Golemi',
      arch: 'ice_golem',
      weakness: 'fire',
      abilities: ['Hazine Kalkanı', 'Ayaz Darbesi'],
    },
    boss: {
      name: 'Buz Devi Kralı Skrymir',
      title: 'Dağların Kralı',
      bossId: 'frost_giant_king',
      arch: 'warlord',
      weakness: 'fire',
      resistance: 'frost',
      abilities: ['Buzul Kıyameti', 'Dev Yumruğu', 'Taş Dondurma', 'Kral Öfkesi'],
    },
    names: ['Buzul Sırtı', 'Donmuş Hazine Mağarası', 'BOSS: Buz Devi Kralı'],
  },
  {
    regionId: 'volcano',
    levels: [17, 18, 19],
    elite: {
      name: 'Magma Fenrisi',
      arch: 'salamander',
      weakness: 'frost',
      abilities: ['Kavurucu Isırık', 'Lav Sıçraması'],
    },
    treasure: {
      name: 'Obsidyen Kral Sandığı',
      arch: 'stone_sentinel',
      weakness: 'frost',
      abilities: ['Hazine Kalkanı', 'Obsidyen Parçaları'],
    },
    boss: {
      name: 'Magma İmparatoriçesi Vhara',
      title: 'Volkan İmparatoriçesi',
      bossId: 'magma_empress',
      arch: 'warlord',
      weakness: 'frost',
      resistance: 'fire',
      abilities: ['Lav Denizi', 'Kor Taht', 'Alev Kalkanı', 'İmparatoriçe Öfkesi'],
    },
    names: ['Magma Bacaları', 'Obsidyen Hazinesi', 'BOSS: Magma İmparatoriçesi'],
  },
  {
    regionId: 'ruins',
    levels: [23, 24, 25],
    elite: {
      name: 'Uyanmış Rün Heykeli',
      arch: 'stone_sentinel',
      weakness: 'lightning',
      abilities: ['Rün Zinciri', 'Taş Yumruğu'],
    },
    treasure: {
      name: 'Prizma Hazine Sandığı',
      arch: 'stone_sentinel',
      weakness: 'arcane',
      abilities: ['Hazine Kalkanı', 'Prizma Işını'],
    },
    boss: {
      name: 'Rün İmparatoru Kaelos',
      title: 'Harabelerin İmparatoru',
      bossId: 'rune_emperor',
      arch: 'pharaoh',
      weakness: 'lightning',
      resistance: 'arcane',
      abilities: ['Rün Kıyameti', 'Boyut Kesmesi', 'Zaman Yavaşlatma', 'İmparator Kalkanı'],
    },
    names: ['Rün Tapınağı', 'Prizma Hazinesi', 'BOSS: Rün İmparatoru'],
  },
  {
    regionId: 'abyss',
    levels: [31, 32, 33],
    elite: {
      name: 'Uçurum Celladı',
      arch: 'void_stalker',
      weakness: 'arcane',
      abilities: ['Hiçlik Bıçakları', 'Karanlık Sıçrayış'],
    },
    treasure: {
      name: 'Kaos Hazine Bekçisi',
      arch: 'void_stalker',
      weakness: 'nature',
      abilities: ['Hazine Kalkanı', 'Kaos Dokunuşu'],
    },
    boss: {
      name: 'Uçurum İmparatoriçesi Nirvaya',
      title: 'Karanlığın İmparatoriçesi',
      bossId: 'abyss_empress',
      arch: 'reaper',
      weakness: 'arcane',
      resistance: 'nature',
      abilities: ['Ruh Hasadı', 'Kaos Aegisi', '3 Fazlı Kıyamet'],
    },
    names: ['Uçurum Zindanı', 'Kaos Hazinesi', 'BOSS: Uçurum İmparatoriçesi'],
  },
];

CORE_REGIONS.forEach((region) => {
  const cfg = CORE_TRIPLETS.find((t) => t.regionId === region.id);
  if (!cfg) return;
  const types: StageType[] = ['elite', 'treasure', 'boss'];
  cfg.levels.forEach((level, i) => {
    const type = types[i];
    const tpl = type === 'boss' ? cfg.boss : type === 'treasure' ? cfg.treasure : cfg.elite;
    region.stages.push(
      makeStage({
        regionId: region.id,
        regionName: region.name,
        stageNumber: 6 + i,
        type,
        level,
        name: cfg.names[i],
        enemy: tpl,
        boss: type === 'boss' ? cfg.boss : undefined,
      })
    );
  });
});

/* ---------------------------- YENİ 10 BÖLGE ---------------------------- */
interface RegionTemplate {
  id: RegionId;
  name: string;
  subtitle: string;
  description: string;
  startLevel: number;
  bgGradient: string;
  accentColor: string;
  stageNames: string[];
  enemies: EnemyTemplate[];
  treasure: EnemyTemplate;
  boss: BossTemplate;
}

const NEW_REGION_TEMPLATES: RegionTemplate[] = [
  {
    id: 'sky',
    name: 'Gök Kalesi',
    subtitle: 'Bulutların Üstündeki Krallık',
    description:
      'Uçurum Kralı’nın yenilgisi gök kapılarını açtı! Fırtına şövalyeleri ve yıldırım kuleleri arasında yüksel.',
    startLevel: 33,
    bgGradient: 'from-sky-900 via-indigo-950 to-slate-950',
    accentColor: '#38bdf8',
    stageNames: [
      'Bulut Basamakları',
      'Fırtına Surları',
      'Gök Hazinesi',
      'Yıldırım Kuleleri',
      'Elit: Fırtına Şövalyesi',
      'Rüzgar Köprüsü',
      'Elit: Gök Muhafızı',
      'BOSS: Gök Tiranı Zephyros',
    ],
    enemies: [
      { name: 'Bulut Kartalı', arch: 'wolf', weakness: 'lightning', abilities: ['Pençe Dalışı'] },
      { name: 'Fırtına Şövalyesi', arch: 'stone_sentinel', weakness: 'frost', abilities: ['Gök Kılıcı'] },
      { name: 'Gök Okçusu', arch: 'goblin', weakness: 'nature', abilities: ['Yıldırım Oku'] },
      { name: 'Şimşek Ruhu', arch: 'fire_elemental', weakness: 'frost', abilities: ['Elektrik Patlaması'] },
    ],
    treasure: {
      name: 'Gök Hazine Kartalı',
      arch: 'celestial',
      weakness: 'lightning',
      abilities: ['Hazine Kalkanı', 'Bulut Gizlenişi'],
    },
    boss: {
      name: 'Gök Tiranı Zephyros',
      title: 'Göklerin Tiranı',
      bossId: 'sky_tyrant',
      arch: 'celestial',
      weakness: 'lightning',
      resistance: 'frost',
      abilities: ['Fırtına Kanatları', 'Gök Gürültüsü Zinciri', 'Rüzgar Kalkanı', 'Öfke Fazı'],
    },
  },
  {
    id: 'ocean',
    name: 'Kayıp Deniz Tapınağı',
    subtitle: 'Derinlerin Karanlık Sırrı',
    description:
      'Batık gemilerin ve mercan sarayların altında kadim Leviathan uyuyor. Basınç ve karanlıkla savaş!',
    startLevel: 35,
    bgGradient: 'from-cyan-950 via-blue-950 to-slate-950',
    accentColor: '#22d3ee',
    stageNames: [
      'Mercan Sığlıkları',
      'Batık Gemi Mezarlığı',
      'Deniz Hazinesi',
      'Derin Akıntı',
      'Elit: Mercan Golemi',
      'Basınç Tünelleri',
      'Elit: Derin Avcı',
      'BOSS: Leviathan',
    ],
    enemies: [
      { name: 'Deniz Yılanı', arch: 'leviathan', weakness: 'lightning', abilities: ['Zehirli Isırık'] },
      { name: 'Mercan Golemi', arch: 'ice_golem', weakness: 'fire', abilities: ['Mercan Zırhı'] },
      { name: 'Batık Gemi Hayaleti', arch: 'void_stalker', weakness: 'arcane', abilities: ['Ruh Çığlığı'] },
      { name: 'Zehirli Deniz Anası', arch: 'salamander', weakness: 'frost', abilities: ['Felç Edici Dokunuş'] },
    ],
    treasure: {
      name: 'İnci Sandığı Bekçisi',
      arch: 'leviathan',
      weakness: 'lightning',
      abilities: ['Hazine Kalkanı', 'İnci Yağmuru'],
    },
    boss: {
      name: 'Leviathan, Derinlerin Anası',
      title: 'Derinlerin Anası',
      bossId: 'sea_leviathan',
      arch: 'leviathan',
      weakness: 'lightning',
      resistance: 'frost',
      abilities: ['Gelgit Dalgası', 'Girdap Hapsi', 'Derin Basınç', 'Karanlık Fısıltı'],
    },
  },
  {
    id: 'desert',
    name: 'Kızıl Kum İmparatorluğu',
    subtitle: 'Sonsuz Çölün Altın Tahtı',
    description:
      'Kum fırtınalarının ardında binlerce yıllık bir firavun laneti yatıyor. Altın tabutunu açmaya cesaret et!',
    startLevel: 37,
    bgGradient: 'from-amber-950 via-orange-950 to-stone-950',
    accentColor: '#fbbf24',
    stageNames: [
      'Kervan Yolu',
      'Kum Fırtınası',
      'Firavun Hazinesi',
      'Vaha Kalıntıları',
      'Elit: Mumya Muhafız',
      'Serap Geçidi',
      'Elit: Çöl Akrebi Kralı',
      'BOSS: Kum Firavunu',
    ],
    enemies: [
      { name: 'Kum Solucanı', arch: 'salamander', weakness: 'frost', abilities: ['Kum Altı Saldırısı'] },
      { name: 'Çöl Akrebi', arch: 'goblin', weakness: 'nature', abilities: ['Zehirli İğne'] },
      { name: 'Mumya Muhafız', arch: 'pharaoh', weakness: 'fire', abilities: ['Sargı Boğması'] },
      { name: 'Serap Cini', arch: 'void_stalker', weakness: 'arcane', abilities: ['Yanılsama'] },
    ],
    treasure: {
      name: 'Altın Firavun Sandığı',
      arch: 'pharaoh',
      weakness: 'frost',
      abilities: ['Hazine Kalkanı', 'Altın Laneti'],
    },
    boss: {
      name: 'Kum Firavunu Ramsutek',
      title: 'Sonsuz Çölün Firavunu',
      bossId: 'sand_pharaoh',
      arch: 'pharaoh',
      weakness: 'frost',
      resistance: 'fire',
      abilities: ['Kum Fırtınası Çağrısı', 'Ölüm Laneti', 'Altın Tabut Kalkanı', 'Güneş Diski'],
    },
  },
  {
    id: 'swamp',
    name: 'Zehirli Bataklık',
    subtitle: 'Çürümenin ve Sislerin Diyarı',
    description:
      'Zehirli sporlar havayı dolduruyor. Çok başlı Hidra bataklığın kalbinde seni bekliyor!',
    startLevel: 39,
    bgGradient: 'from-lime-950 via-emerald-950 to-slate-950',
    accentColor: '#84cc16',
    stageNames: [
      'Sisli Sazlık',
      'Çürük Köprü',
      'Bataklık Hazinesi',
      'Zehir Havuzu',
      'Elit: Çürümüş Golem',
      'Kurbağa Yuvası',
      'Elit: Sis Cadısı',
      'BOSS: Bataklık Hidrası',
    ],
    enemies: [
      { name: 'Bataklık Kurbağası', arch: 'goblin', weakness: 'fire', abilities: ['Asit Tükürüğü'] },
      { name: 'Zehirli Yılan', arch: 'salamander', weakness: 'nature', abilities: ['Felç Zehri'] },
      { name: 'Çürümüş Golem', arch: 'stone_sentinel', weakness: 'frost', abilities: ['Çamur Yumruğu'] },
      { name: 'Sis Cadısı', arch: 'void_stalker', weakness: 'arcane', abilities: ['Lanet Sis'] },
    ],
    treasure: {
      name: 'Bataklık Hazine Ruhu',
      arch: 'treant',
      weakness: 'fire',
      abilities: ['Hazine Kalkanı', 'Zehirli Sarmaşık'],
    },
    boss: {
      name: 'Hidra, Bataklık Anası',
      title: 'Çok Başlı Bataklık Anası',
      bossId: 'swamp_hydra',
      arch: 'leviathan',
      weakness: 'fire',
      resistance: 'nature',
      abilities: ['Zehirli Nefes', 'Üç Başlı Isırık', 'Rejenerasyon', 'Bataklık Hapsi'],
    },
  },
  {
    id: 'moonlit',
    name: 'Ay Işığı Vadisi',
    subtitle: 'Gümüş Ormanın Sonsuz Gecesi',
    description:
      'Güneşin hiç doğmadığı gümüş ormanda periler ve rüya yiyiciler kol geziyor. Ay Matronu’na meydan oku!',
    startLevel: 41,
    bgGradient: 'from-slate-900 via-indigo-950 to-slate-950',
    accentColor: '#c4b5fd',
    stageNames: [
      'Gümüş Koru',
      'Ay Gölü',
      'Ay Hazinesi',
      'Peri Halkası',
      'Elit: Gece Avcısı',
      'Rüya Ormanı',
      'Elit: Rüya Yiyici',
      'BOSS: Ay Matronu Selene',
    ],
    enemies: [
      { name: 'Ay Kurdu', arch: 'wolf', weakness: 'arcane', abilities: ['Ay Uluması'] },
      { name: 'Gümüş Peri', arch: 'celestial', weakness: 'fire', abilities: ['Peri Tozu'] },
      { name: 'Gece Avcısı', arch: 'void_stalker', weakness: 'lightning', abilities: ['Gölge Bıçağı'] },
      { name: 'Kabus Yaratığı', arch: 'wolf', weakness: 'nature', abilities: ['Rüya Emişi'] },
    ],
    treasure: {
      name: 'Aytaşı Sandığı Bekçisi',
      arch: 'celestial',
      weakness: 'arcane',
      abilities: ['Hazine Kalkanı', 'Aytaşı Işını'],
    },
    boss: {
      name: 'Ay Matronu Selene',
      title: 'Sonsuz Gecenin Matronu',
      bossId: 'moonlight_matron',
      arch: 'celestial',
      weakness: 'arcane',
      resistance: 'lightning',
      abilities: ['Ay Işığı Huzmesi', 'Rüya Hapsi', 'Gümüş Kalkan', 'Dolunay Öfkesi'],
    },
  },
  {
    id: 'crystal_caves',
    name: 'Kristal Mağaralar',
    subtitle: 'Yerin Altındaki Prizma Labirenti',
    description:
      'Yansımalı koridorlar ve elmas golem orduları! Prizmanın kalbindeki hükümdarı parçala.',
    startLevel: 43,
    bgGradient: 'from-fuchsia-950 via-purple-950 to-slate-950',
    accentColor: '#e879f9',
    stageNames: [
      'Prizma Girişi',
      'Yansıma Koridorları',
      'Elmas Hazinesi',
      'Yeraltı Nehri',
      'Elit: Elmas Golem',
      'Kırık Aynalar Salonu',
      'Elit: Prizma Örümceği',
      'BOSS: Kristal Hükümdarı',
    ],
    enemies: [
      { name: 'Kristal Yarasası', arch: 'wolf', weakness: 'lightning', abilities: ['Ses Dalgası'] },
      { name: 'Prizma Örümceği', arch: 'goblin', weakness: 'fire', abilities: ['Işık Ağı'] },
      { name: 'Elmas Golem', arch: 'ice_golem', weakness: 'arcane', abilities: ['Elmas Deri'] },
      { name: 'Yansıma Kopyan', arch: 'void_stalker', weakness: 'nature', abilities: ['Ayna Kopyası'] },
    ],
    treasure: {
      name: 'Elmas Hazine Golemi',
      arch: 'ice_golem',
      weakness: 'lightning',
      abilities: ['Hazine Kalkanı', 'Elmas Yağmuru'],
    },
    boss: {
      name: 'Kristal Hükümdarı Prismox',
      title: 'Prizma Hükümdarı',
      bossId: 'crystal_sovereign',
      arch: 'warlord',
      weakness: 'lightning',
      resistance: 'arcane',
      abilities: ['Prizma Işını', 'Kristal Zindan', 'Yansımalı Kalkan', 'Faz Değişimi'],
    },
  },
  {
    id: 'ashen',
    name: 'Kül Diyarı',
    subtitle: 'Sönmüş Yanardağların Çorak Toprakları',
    description:
      'Bir zamanlar verimli olan bu topraklar küle döndü. Kül Savaş Lordu ordusuyla ilerliyor!',
    startLevel: 45,
    bgGradient: 'from-stone-900 via-red-950 to-slate-950',
    accentColor: '#f87171',
    stageNames: [
      'Kül Ovası',
      'Yanmış Orman',
      'Kül Hazinesi',
      'Kor Nehri Yatağı',
      'Elit: Yanmış Şövalye',
      'Ölü Baca Tünelleri',
      'Elit: Kül Fenrisi',
      'BOSS: Kül Savaş Lordu',
    ],
    enemies: [
      { name: 'Kül Zombisi', arch: 'goblin', weakness: 'nature', abilities: ['Kül Yumruğu'] },
      { name: 'Yanmış Şövalye', arch: 'stone_sentinel', weakness: 'frost', abilities: ['Kor Kılıcı'] },
      { name: 'Lav Akrebi', arch: 'salamander', weakness: 'frost', abilities: ['Kuyruk Kıvılcımı'] },
      { name: 'Kül Fenrisi', arch: 'wolf', weakness: 'frost', abilities: ['Kül Uluması'] },
    ],
    treasure: {
      name: 'Kül Altını Sandığı',
      arch: 'stone_sentinel',
      weakness: 'frost',
      abilities: ['Hazine Kalkanı', 'Kor Patlaması'],
    },
    boss: {
      name: 'Kül Savaş Lordu Magmor',
      title: 'Küllerin Savaş Lordu',
      bossId: 'ashen_warlord',
      arch: 'warlord',
      weakness: 'frost',
      resistance: 'fire',
      abilities: ['Kül Fırtınası', 'Cehennem Kılıcı', 'Kor Zırhı', 'Ölüm Yürüyüşü'],
    },
  },
  {
    id: 'astral',
    name: 'Meteor Krateri',
    subtitle: 'Gökyüzünden Düşen Kozmik Tehdit',
    description:
      'Gökyüzünden düşen yıldızlar gerçekliği büktü. Kozmik yutucu tüm enerjiyi emiyor!',
    startLevel: 47,
    bgGradient: 'from-violet-950 via-slate-950 to-black',
    accentColor: '#a78bfa',
    stageNames: [
      'Krater Ağzı',
      'Yıldız Tozu Ovası',
      'Kozmik Hazine',
      'Manyetik Alan',
      'Elit: Meteor Golemi',
      'Sıfır Noktası',
      'Elit: Kozmik Göz',
      'BOSS: Astral Yutucu',
    ],
    enemies: [
      { name: 'Yıldız Paraziti', arch: 'goblin', weakness: 'lightning', abilities: ['Enerji Emişi'] },
      { name: 'Kozmik Göz', arch: 'void_stalker', weakness: 'arcane', abilities: ['Boyut Bakışı'] },
      { name: 'Meteor Golemi', arch: 'stone_sentinel', weakness: 'frost', abilities: ['Göktaşı Yumruğu'] },
      { name: 'Uzay Avcısı', arch: 'wolf', weakness: 'nature', abilities: ['Yörünge Sıçrayışı'] },
    ],
    treasure: {
      name: 'Yıldız Çekirdeği Sandığı',
      arch: 'celestial',
      weakness: 'arcane',
      abilities: ['Hazine Kalkanı', 'Nova Patlaması'],
    },
    boss: {
      name: 'Astral Yutucu Nihiloth',
      title: 'Kozmik Yutucu',
      bossId: 'astral_devourer',
      arch: 'celestial',
      weakness: 'arcane',
      resistance: 'lightning',
      abilities: ['Kozmik Yutma', 'Yıldız Çöküşü', 'Kara Delik Kalkanı', 'Boyut Kayması'],
    },
  },
  {
    id: 'spirit',
    name: 'Ruhlar Geçidi',
    subtitle: 'Yaşam ve Ölüm Arasındaki Eşik',
    description:
      'Ölülerin huzur bulamadığı bu eşikte Ruh Biçici hüküm sürüyor. Yaşam taşlarına sarıl!',
    startLevel: 49,
    bgGradient: 'from-teal-950 via-slate-950 to-black',
    accentColor: '#5eead4',
    stageNames: [
      'Eşik Taşı',
      'Kemik Tarlaları',
      'Ruh Hazinesi',
      'Fısıltı Koridoru',
      'Elit: Kemik Lordu',
      'Mezar Bekçileri',
      'Elit: Ölüm Fısıltısı',
      'BOSS: Ruh Biçici Azrail',
    ],
    enemies: [
      { name: 'Kayıp Ruh', arch: 'void_stalker', weakness: 'nature', abilities: ['Ağıt Çığlığı'] },
      { name: 'Kemik Muhafız', arch: 'pharaoh', weakness: 'fire', abilities: ['Kemik Kılıcı'] },
      { name: 'Mezar Bekçisi', arch: 'stone_sentinel', weakness: 'arcane', abilities: ['Mezar Taşı Ezmesi'] },
      { name: 'Ölüm Fısıltısı', arch: 'void_stalker', weakness: 'lightning', abilities: ['Ruh Üşütmesi'] },
    ],
    treasure: {
      name: 'Ruh Sandığı Bekçisi',
      arch: 'pharaoh',
      weakness: 'nature',
      abilities: ['Hazine Kalkanı', 'Ruh Zinciri'],
    },
    boss: {
      name: 'Ruh Biçici Azrail',
      title: 'Ruhların Biçicisi',
      bossId: 'spirit_reaper',
      arch: 'reaper',
      weakness: 'nature',
      resistance: 'arcane',
      abilities: ['Tırpan Darbesi', 'Ruh Hasadı', 'Ölüm Peçesi', 'Sonsuz Karanlık'],
    },
  },
  {
    id: 'chaos',
    name: 'Ebedi Kaos Tapınağı',
    subtitle: 'Varoluşun Son ve En Karanlık Noktası',
    description:
      'Tüm diyarların kaderi burada belirleniyor. Kaos İmparatoru Vorakh dört fazlı kıyametiyle seni bekliyor!',
    startLevel: 51,
    bgGradient: 'from-rose-950 via-purple-950 to-black',
    accentColor: '#fb7185',
    stageNames: [
      'Kaos Eşiği',
      'Çarpık Merdivenler',
      'Mitik Hazine',
      'Hiçlik Salonu',
      'Elit: Kaos Şövalyesi',
      'Gerçeklik Yırtığı',
      'Elit: Hiçlik Ejderi',
      'FİNAL BOSS: Kaos İmparatoru',
    ],
    enemies: [
      { name: 'Kaos Parçacığı', arch: 'void_stalker', weakness: 'arcane', abilities: ['Gerçeklik Bozumu'] },
      { name: 'Çarpık Titan', arch: 'stone_sentinel', weakness: 'lightning', abilities: ['Kaos Ezmesi'] },
      { name: 'Hiçlik Ejderi', arch: 'leviathan', weakness: 'fire', abilities: ['Hiçlik Nefesi'] },
      { name: 'Kaos Şövalyesi', arch: 'warlord', weakness: 'nature', abilities: ['Kaos Kılıcı'] },
    ],
    treasure: {
      name: 'Mitik Kaos Sandığı',
      arch: 'warlord',
      weakness: 'arcane',
      abilities: ['Hazine Kalkanı', 'Mitik Patlama'],
    },
    boss: {
      name: 'Kaos İmparatoru Vorakh',
      title: 'Nihai Kaos İmparatoru',
      bossId: 'chaos_emperor',
      arch: 'reaper',
      weakness: 'arcane',
      resistance: 'fire',
      abilities: [
        '4 Fazlı Kaos',
        'Değişen Zayıflık',
        'Gerçeklik Silme',
        'Kıyamet Hükmü',
        'Kaos Aegisi',
      ],
    },
  },
];

const STAGE_PATTERN: StageType[] = [
  'normal',
  'normal',
  'treasure',
  'normal',
  'elite',
  'normal',
  'elite',
  'boss',
];
const LEVEL_OFFSETS = [0, 0, 1, 1, 1, 2, 2, 2];

function buildRegion(tpl: RegionTemplate): RegionDef {
  const stages: StageDef[] = STAGE_PATTERN.map((type, i) => {
    const isBoss = type === 'boss';
    const isTreasure = type === 'treasure';
    const enemyTpl = isBoss ? tpl.boss : isTreasure ? tpl.treasure : tpl.enemies[i % tpl.enemies.length];
    return makeStage({
      regionId: tpl.id,
      regionName: tpl.name,
      stageNumber: i + 1,
      type,
      level: tpl.startLevel + LEVEL_OFFSETS[i],
      name: tpl.stageNames[i],
      enemy: enemyTpl,
      boss: isBoss ? tpl.boss : undefined,
    });
  });

  const minLevel = tpl.startLevel;
  const maxLevel = tpl.startLevel + 2;

  return {
    id: tpl.id,
    name: tpl.name,
    subtitle: tpl.subtitle,
    description: tpl.description,
    levelRange: `Sv. ${minLevel} - ${maxLevel}`,
    bgGradient: tpl.bgGradient,
    accentColor: tpl.accentColor,
    stages,
  };
}

/* ================================================================== */
/*  SON DİYARLAR — 13 yeni bölge / 130 aşama (Toplam 250 aşama)         */
/*  Mevcut 120 aşama olduğu gibi kalır; bu bölüm yalnızca üzerine ekler. */
/* ================================================================== */

interface EndgameTemplate {
  id: RegionId;
  name: string;
  subtitle: string;
  description: string;
  startLevel: number;
  bgGradient: string;
  accentColor: string;
  stageNames: string[];
  enemies: EnemyTemplate[];
  treasure: EnemyTemplate;
  boss: BossTemplate;
}

const ENDGAME_PATTERN: StageType[] = [
  'normal',
  'normal',
  'treasure',
  'normal',
  'elite',
  'normal',
  'elite',
  'treasure',
  'elite',
  'boss',
];
const ENDGAME_LEVEL_OFFSETS = [0, 0, 1, 1, 1, 2, 2, 2, 2, 3];

/**
 * Son diyarların düşman gücü mevcut 53. seviye zirvesinin üzerinden
 * yumuşak bir eğriyle yükselir; böylece Sv. 54-81 arası 130 aşama
 * oynanabilir kalırken her bölgede gözle görülür bir zorluk artışı olur.
 */
function makeEndgameStage(opts: {
  regionId: RegionId;
  regionName: string;
  stageNumber: number;
  type: StageType;
  level: number;
  name: string;
  enemy: EnemyTemplate;
  boss?: BossTemplate;
}): StageDef {
  const stage = makeStage(opts);
  const t = Math.max(0, opts.level - 53);
  const base = scaleStats(53, opts.type);
  stage.enemy.level = opts.level;
  stage.enemy.maxHp = Math.round(base.maxHp * (1 + 0.017 * t + 0.00015 * t * t));
  stage.enemy.attack = Math.round(base.attack * (1 + 0.024 * t + 0.00015 * t * t));
  stage.enemy.defense = Math.round(base.defense * (1 + 0.018 * t));
  // Ödül eğrisi Sv. 78'de dengelenir: son diyarlar iyi ganimet verir ama taşma yapmaz.
  stage.rewards = rewardsFor(Math.min(opts.level, 78), opts.type);
  return stage;
}

function buildEndgameRegion(tpl: EndgameTemplate): RegionDef {
  const stages: StageDef[] = ENDGAME_PATTERN.map((type, i) => {
    const isBoss = type === 'boss';
    const isTreasure = type === 'treasure';
    const enemyTpl = isBoss ? tpl.boss : isTreasure ? tpl.treasure : tpl.enemies[i % tpl.enemies.length];
    return makeEndgameStage({
      regionId: tpl.id,
      regionName: tpl.name,
      stageNumber: i + 1,
      type,
      level: tpl.startLevel + ENDGAME_LEVEL_OFFSETS[i], // her bölge bir öncekinin bitişinden başlar
      name: tpl.stageNames[i],
      enemy: enemyTpl,
      boss: isBoss ? tpl.boss : undefined,
    });
  });

  return {
    id: tpl.id,
    name: tpl.name,
    subtitle: tpl.subtitle,
    description: tpl.description,
    levelRange: `Sv. ${tpl.startLevel} - ${tpl.startLevel + 3}`,
    bgGradient: tpl.bgGradient,
    accentColor: tpl.accentColor,
    stages,
  };
}

const ENDGAME_TEMPLATES: EndgameTemplate[] = [
  {
    id: 'star_gate',
    name: 'Yıldızlararası Geçit',
    subtitle: 'Işığın Ötesindeki Kapı',
    description:
      'Uçurum Kralı’nın ardından açılan gök kapısının ardında nebula rüzgârları ve yıldız yiyen yaratıklar seni bekliyor.',
    startLevel: 54,
    bgGradient: 'from-indigo-950 via-sky-950 to-slate-950',
    accentColor: '#818cf8',
    stageNames: [
      'Nebula Kapısı',
      'Kayan Yıldızlar',
      'Yıldız Tozu Hazinesi',
      'Meteor Tarlası',
      'Elit: Yıldız Yiyici',
      'Gök Cisimleri Koridoru',
      'Elit: Nebula Muhafızı',
      'Yıldız Kalesi',
      'Elit: Kozmik Gözcü',
      'BOSS: Yıldızların Anası',
    ],
    enemies: [
      { name: 'Yıldız Gezgini', arch: 'void_stalker', weakness: 'arcane', abilities: ['Yıldız Kesişi'] },
      { name: 'Nebula Yarasası', arch: 'wolf', weakness: 'lightning', abilities: ['Karanlık Kanat'] },
      { name: 'Meteor Golemi', arch: 'stone_sentinel', weakness: 'frost', abilities: ['Kaya Yağmuru'] },
      { name: 'Kozmik Gözcü', arch: 'celestial', weakness: 'nature', abilities: ['Yıldız Bakışı'] },
    ],
    treasure: {
      name: 'Yıldız Tozu Sandığı',
      arch: 'celestial',
      weakness: 'arcane',
      abilities: ['Hazine Kalkanı', 'Işık Patlaması'],
    },
    boss: {
      name: 'Yıldızların Anası Astraia',
      title: 'Yıldızlararası Geçidin Efendisi',
      bossId: 'star_matriarch',
      arch: 'celestial',
      weakness: 'arcane',
      resistance: 'lightning',
      abilities: ['Yıldız Yağmuru', 'Kozmik Kalkan', 'Faz Değişimi'],
    },
  },
  {
    id: 'time_rift',
    name: 'Kırık Zaman Kalesi',
    subtitle: 'Saatlerin Efendisi',
    description:
      'Tik-takları asırlar süren devasa mekanizmanın içinde zaman tersine akıyor. Dişli golemler ve geçmişin hayaletleri kol geziyor.',
    startLevel: 57,
    bgGradient: 'from-amber-950 via-stone-950 to-slate-950',
    accentColor: '#fbbf24',
    stageNames: [
      'Kırık Saat Kulesi',
      'Geriye Akan Nehir',
      'Ebedi Saat Hazinesi',
      'Dişli Koridorları',
      'Elit: Zaman Yiyici',
      'Yankı Salonu',
      'Elit: Kum Saati Muhafızı',
      'Saat Atölyesi',
      'Elit: Geçmişin Gölgesi',
      'BOSS: Ebedi Saatçi',
    ],
    enemies: [
      { name: 'Dişli Golem', arch: 'stone_sentinel', weakness: 'lightning', abilities: ['Saat Yumruğu'] },
      { name: 'Geçmiş Hayaleti', arch: 'void_stalker', weakness: 'nature', abilities: ['Yankı Çığlığı'] },
      { name: 'Zaman Kurdu', arch: 'wolf', weakness: 'fire', abilities: ['Hızlı Pençe'] },
      { name: 'Kum Saati Muhafızı', arch: 'pharaoh', weakness: 'frost', abilities: ['Zaman Kumu'] },
    ],
    treasure: {
      name: 'Ebedi Saatin Sandığı',
      arch: 'pharaoh',
      weakness: 'lightning',
      abilities: ['Hazine Kalkanı', 'Durmuş Zaman'],
    },
    boss: {
      name: 'Zaman Muhafızı Chronos',
      title: 'Ebedi Saatçi',
      bossId: 'time_warden',
      arch: 'pharaoh',
      weakness: 'lightning',
      resistance: 'arcane',
      abilities: ['Zaman Döngüsü', 'Kırık Saat Kalkanı', 'Faz Değişimi'],
    },
  },
  {
    id: 'blood_moon',
    name: 'Kanlı Ay Diyarı',
    subtitle: 'Vahşetin Uyanışı',
    description:
      'Gökyüzünde asılı duran kızıl ay, altındaki her yaratığı vahşileştiriyor. Kan nehirleri boyunca ilerle.',
    startLevel: 60,
    bgGradient: 'from-rose-950 via-red-950 to-slate-950',
    accentColor: '#fb7185',
    stageNames: [
      'Kızıl Ay Vadisi',
      'Kan Nehirleri',
      'Kızıl Ay Hazinesi',
      'Vahşet Ovası',
      'Elit: Ay Kurtları',
      'Karanlık Ritüel',
      'Elit: Kan Vampiri',
      'Ay Tapınağı',
      'Elit: Kızıl Rahip',
      'BOSS: Kanlı Ay Kraliçesi',
    ],
    enemies: [
      { name: 'Kan Kurtları', arch: 'wolf', weakness: 'fire', abilities: ['Sürü Saldırısı'] },
      { name: 'Kan Yarasası', arch: 'salamander', weakness: 'frost', abilities: ['Kan Emici'] },
      { name: 'Ay Işığı Vampiri', arch: 'void_stalker', weakness: 'nature', abilities: ['Vampir Bakışı'] },
      { name: 'Kızıl Ritüelci', arch: 'pharaoh', weakness: 'arcane', abilities: ['Kan Büyüsü'] },
    ],
    treasure: {
      name: 'Kızıl Ay Sandığı',
      arch: 'reaper',
      weakness: 'fire',
      abilities: ['Hazine Kalkanı', 'Kan Mührü'],
    },
    boss: {
      name: 'Kanlı Ay Kraliçesi Lilith',
      title: 'Kızıl Gecenin Efendisi',
      bossId: 'blood_moon_queen',
      arch: 'reaper',
      weakness: 'fire',
      resistance: 'nature',
      abilities: ['Kan Fırtınası', 'Ay Dönüşümü', 'Faz Değişimi'],
    },
  },
  {
    id: 'iron_inferno',
    name: 'Demir Cehennem',
    subtitle: 'Çarkların ve Korun Diyarı',
    description:
      'Sonsuza kadar dönen devasa çarkların, erimiş kanalların ve buharlı makinelerin diyarı. Havada metal kokusu var.',
    startLevel: 63,
    bgGradient: 'from-orange-950 via-stone-950 to-slate-950',
    accentColor: '#f97316',
    stageNames: [
      'Çark Kapısı',
      'Erimiş Kanallar',
      'Demir Hazinesi',
      'Buhar Tünelleri',
      'Elit: Demir Yengeç',
      'Kor Ocakları',
      'Elit: Buhar Golemi',
      'Makine Salonu',
      'Elit: Kızgın Çekiç',
      'BOSS: Demir İmparator',
    ],
    enemies: [
      { name: 'Buhar Golemi', arch: 'stone_sentinel', weakness: 'frost', abilities: ['Buhar Patlaması'] },
      { name: 'Demir Yengeç', arch: 'ice_golem', weakness: 'lightning', abilities: ['Demir Kıskaç'] },
      { name: 'Lav Dişlisi', arch: 'salamander', weakness: 'frost', abilities: ['Erimiş Diş'] },
      { name: 'Kızgın Çekiç', arch: 'goblin', weakness: 'nature', abilities: ['Çekiç Darbesi'] },
    ],
    treasure: {
      name: 'Demir Hazine Sandığı',
      arch: 'stone_sentinel',
      weakness: 'frost',
      abilities: ['Hazine Kalkanı', 'Kızgın Metal'],
    },
    boss: {
      name: 'Demir İmparator Malakar',
      title: 'Makine İmparatoru',
      bossId: 'iron_emperor',
      arch: 'warlord',
      weakness: 'frost',
      resistance: 'fire',
      abilities: ['Demir Fırtınası', 'Kor Kalkanı', 'Faz Değişimi'],
    },
  },
  {
    id: 'eternal_winter',
    name: 'Ebedi Kışın Kalbi',
    subtitle: 'Donmuş Sonsuzluk',
    description:
      'Buzulların altında uyuyan kadim güç uyandı. Tipi hiç dinmiyor ve her adımında ayak izlerin donuyor.',
    startLevel: 66,
    bgGradient: 'from-cyan-950 via-blue-950 to-slate-950',
    accentColor: '#67e8f9',
    stageNames: [
      'Buzul Kapı',
      'Sonsuz Tipi',
      'Buz Çekirdeği Hazinesi',
      'Kar Tünelleri',
      'Elit: Kutup Ayısı',
      'Donmuş Göl',
      'Elit: Buz Ejderi',
      'Kış Tapınağı',
      'Elit: Kar Ruhu',
      'BOSS: Kar Tanrıçası',
    ],
    enemies: [
      { name: 'Buz Ejderi Yavrusu', arch: 'leviathan', weakness: 'fire', abilities: ['Buz Nefesi'] },
      { name: 'Kar Fırtınası Ruhu', arch: 'ice_golem', weakness: 'lightning', abilities: ['Tipi Darbesi'] },
      { name: 'Donmuş Kurt', arch: 'wolf', weakness: 'fire', abilities: ['Ayaz Pençe'] },
      { name: 'Kutup Ayısı', arch: 'yeti', weakness: 'fire', abilities: ['Dev Yumruk'] },
    ],
    treasure: {
      name: 'Buz Çekirdeği Sandığı',
      arch: 'ice_golem',
      weakness: 'fire',
      abilities: ['Hazine Kalkanı', 'Donmuş Koruma'],
    },
    boss: {
      name: 'Kar Tanrıçası Skadi',
      title: 'Ebedi Kışın Anası',
      bossId: 'winter_goddess',
      arch: 'celestial',
      weakness: 'fire',
      resistance: 'frost',
      abilities: ['Kar Fırtınası', 'Buz Kalkanı', 'Faz Değişimi'],
    },
  },
  {
    id: 'dreamscape',
    name: 'Rüyalar Diyarı',
    subtitle: 'Bilinçaltının Kapısı',
    description:
      'Burada gördüğün her şey gerçek olabilir… ya da seni yiyebilir. Kabus perileri rüyalarını çalıyor.',
    startLevel: 69,
    bgGradient: 'from-fuchsia-950 via-purple-950 to-slate-950',
    accentColor: '#e879f9',
    stageNames: [
      'Rüya Kapısı',
      'Bulanık Vadiler',
      'Rüya Hazinesi',
      'Hatıra Koridorları',
      'Elit: Uyku Perisi',
      'Kabus Tünelleri',
      'Elit: Rüya Avcısı',
      'Rüya Tapınağı',
      'Elit: Kabus Perisi',
      'BOSS: Rüya Yiyici',
    ],
    enemies: [
      { name: 'Kabus Perisi', arch: 'void_stalker', weakness: 'arcane', abilities: ['Kabus Bakışı'] },
      { name: 'Rüya Avcısı', arch: 'wolf', weakness: 'lightning', abilities: ['Rüya Pençesi'] },
      { name: 'Bulanık Hatıra', arch: 'goblin', weakness: 'nature', abilities: ['Hatıra Emişi'] },
      { name: 'Uyku Perisi', arch: 'treant', weakness: 'fire', abilities: ['Uyku Tozu'] },
    ],
    treasure: {
      name: 'Rüya Sandığı',
      arch: 'celestial',
      weakness: 'arcane',
      abilities: ['Hazine Kalkanı', 'Rüya Kilidi'],
    },
    boss: {
      name: 'Rüya Yiyici Morpheus',
      title: 'Kabusların Efendisi',
      bossId: 'dream_devourer',
      arch: 'reaper',
      weakness: 'arcane',
      resistance: 'nature',
      abilities: ['Kabus Dalgası', 'Rüya Hapsi', 'Faz Değişimi'],
    },
  },
  {
    id: 'light_shadow',
    name: 'Işık ve Gölge Tapınağı',
    subtitle: 'Dengenin Sınavı',
    description:
      'İki kadim güç bin yıldır birbirine kilitli. Yargıç, dengenin hangi yöne kayacağına senin karar vereceğine inanıyor.',
    startLevel: 72,
    bgGradient: 'from-slate-900 via-indigo-950 to-slate-950',
    accentColor: '#fcd34d',
    stageNames: [
      'Işık Kapısı',
      'Gölge Koridorları',
      'Denge Hazinesi',
      'Yargı Salonu',
      'Elit: Karanlık Kılıç',
      'Işık Tünelleri',
      'Elit: Gölge Rahibi',
      'Denge Tapınağı',
      'Elit: Işık Muhafızı',
      'BOSS: Işık ve Gölge Yargıcı',
    ],
    enemies: [
      { name: 'Gölge Rahibi', arch: 'pharaoh', weakness: 'fire', abilities: ['Gölge Laneti'] },
      { name: 'Işık Muhafızı', arch: 'stone_sentinel', weakness: 'arcane', abilities: ['Işık Kalkanı'] },
      { name: 'Karanlık Kılıç', arch: 'void_stalker', weakness: 'nature', abilities: ['Karanlık Kesiş'] },
      { name: 'Denge Golemi', arch: 'ice_golem', weakness: 'lightning', abilities: ['Denge Darbesi'] },
    ],
    treasure: {
      name: 'Denge Sandığı',
      arch: 'celestial',
      weakness: 'arcane',
      abilities: ['Hazine Kalkanı', 'Işık Mührü'],
    },
    boss: {
      name: 'Işık ve Gölge Yargıcı Aion',
      title: 'Dengenin Muhafızı',
      bossId: 'balance_judge',
      arch: 'celestial',
      weakness: 'arcane',
      resistance: 'lightning',
      abilities: ['Işık ve Gölge', 'Denge Kalkanı', 'Faz Değişimi'],
    },
  },
  {
    id: 'dragon_roost',
    name: 'Ejderha Yuvası',
    subtitle: 'Ejderhaların Son Kalesi',
    description:
      'Dağların zirvesindeki bu devasa yuvada nesillerdir uyuyan ejderhalar var. Ataları Bahamut uyanmak üzere.',
    startLevel: 75,
    bgGradient: 'from-red-950 via-amber-950 to-stone-950',
    accentColor: '#fbbf24',
    stageNames: [
      'Yuva Kapısı',
      'Ejder Tünelleri',
      'Altın Hazine',
      'Alev Yuvaları',
      'Elit: Alev Kertenkelesi',
      'Kanat Geçidi',
      'Elit: Ejder Muhafızı',
      'Ejder Tahtı',
      'Elit: Yavru Ejderha',
      'BOSS: Ejderha Kralı',
    ],
    enemies: [
      { name: 'Yavru Ejderha', arch: 'salamander', weakness: 'frost', abilities: ['Alev Püskürtme'] },
      { name: 'Ejder Muhafızı', arch: 'warlord', weakness: 'lightning', abilities: ['Ejder Kılıcı'] },
      { name: 'Alev Kertenkelesi', arch: 'fire_elemental', weakness: 'frost', abilities: ['Kor Dili'] },
      { name: 'Altın Yılan', arch: 'leviathan', weakness: 'nature', abilities: ['Altın Zehir'] },
    ],
    treasure: {
      name: 'Ejder Hazinesi',
      arch: 'leviathan',
      weakness: 'frost',
      abilities: ['Hazine Kalkanı', 'Ejder Kalkanı'],
    },
    boss: {
      name: 'Kadim Ejderha Kralı Bahamut',
      title: 'Ejderhaların Atası',
      bossId: 'dragon_ancestor',
      arch: 'leviathan',
      weakness: 'frost',
      resistance: 'fire',
      abilities: ['Ejderha Nefesi', 'Altın Pullu Kalkan', 'Faz Değişimi'],
    },
  },
  {
    id: 'gods_court',
    name: 'Tanrıların Avlusu',
    subtitle: 'Ölümlülerin Yargısı',
    description:
      'Tanrılar burada ölümlü kahramanları sınar. Yargıya çıkmaya ve gücünü kanıtlamaya hazır mısın?',
    startLevel: 78,
    bgGradient: 'from-sky-900 via-amber-950 to-slate-950',
    accentColor: '#fde68a',
    stageNames: [
      'Işık Kapısı',
      'Kutsal Merdivenler',
      'Kutsal Hazine',
      'Yargı Avlusu',
      'Elit: Fırtına Kartalı',
      'Sütunlar Geçidi',
      'Elit: Kutsal Şövalye',
      'Tanrı Salonu',
      'Elit: Işık Golemi',
      'BOSS: Gök Tanrısı',
    ],
    enemies: [
      { name: 'Tanrı Elçisi', arch: 'celestial', weakness: 'arcane', abilities: ['Kutsal Işık'] },
      { name: 'Işık Golemi', arch: 'ice_golem', weakness: 'nature', abilities: ['Işık Yumruğu'] },
      { name: 'Kutsal Şövalye', arch: 'stone_sentinel', weakness: 'fire', abilities: ['Kutsal Kılıç'] },
      { name: 'Fırtına Kartalı', arch: 'wolf', weakness: 'lightning', abilities: ['Kanat Darbesi'] },
    ],
    treasure: {
      name: 'Kutsal Hazine',
      arch: 'celestial',
      weakness: 'arcane',
      abilities: ['Hazine Kalkanı', 'Kutsal Mühür'],
    },
    boss: {
      name: 'Gök Tanrısı Valorian',
      title: 'Göklerin Yargıcı',
      bossId: 'sky_judge',
      arch: 'warlord',
      weakness: 'arcane',
      resistance: 'lightning',
      abilities: ['Gök Yargısı', 'Işık Kalkanı', 'Faz Değişimi'],
    },
  },
  {
    id: 'rebirth',
    name: 'Yeniden Doğuş Kapısı',
    subtitle: 'Küllerin ve Umudun Diyarı',
    description:
      'Burada ölüm bir son değil. Kor ruhları küllerinden doğuyor ve her yenilgi onları daha güçlü yapıyor.',
    startLevel: 81,
    bgGradient: 'from-orange-950 via-rose-950 to-slate-950',
    accentColor: '#fdba74',
    stageNames: [
      'Küller Kapısı',
      'Yeniden Doğuş Vadisi',
      'Kor Hazinesi',
      'Alev Tünelleri',
      'Elit: Kül Golemi',
      'Yenilenme Bahçesi',
      'Elit: Kor Ruhu',
      'Anka Yuvası',
      'Elit: Alev Sırtlı',
      'BOSS: Anka Kraliçesi',
    ],
    enemies: [
      { name: 'Kor Ruhu', arch: 'fire_elemental', weakness: 'frost', abilities: ['Kor Patlaması'] },
      { name: 'Kül Golemi', arch: 'stone_sentinel', weakness: 'nature', abilities: ['Kül Yumruğu'] },
      { name: 'Yenilen Yaratık', arch: 'treant', weakness: 'fire', abilities: ['Yenilenme'] },
      { name: 'Alev Sırtlı', arch: 'salamander', weakness: 'frost', abilities: ['Alev Sırtı'] },
    ],
    treasure: {
      name: 'Yeniden Doğuş Sandığı',
      arch: 'celestial',
      weakness: 'frost',
      abilities: ['Hazine Kalkanı', 'Küllerden Doğuş'],
    },
    boss: {
      name: 'Anka Kraliçesi Pyria',
      title: 'Ölümsüzlüğün Sembolü',
      bossId: 'phoenix_queen',
      arch: 'celestial',
      weakness: 'frost',
      resistance: 'fire',
      abilities: ['Kor Fırtınası', 'Yeniden Doğuş', 'Faz Değişimi'],
    },
  },
  {
    id: 'cosmic_storm',
    name: 'Kozmik Fırtına',
    subtitle: 'Gök Gürültüsünün Efendisi',
    description:
      'Yıldırımların hiç dinmediği, bulutların denize dönüştüğü kozmik bir kasırganın tam kalbindesin.',
    startLevel: 84,
    bgGradient: 'from-indigo-950 via-cyan-950 to-slate-950',
    accentColor: '#67e8f9',
    stageNames: [
      'Fırtına Kapısı',
      'Gök Gürültüsü Vadisi',
      'Fırtına Hazinesi',
      'Yıldırım Tünelleri',
      'Elit: Elektrik Yılanı',
      'Bulut Koridorları',
      'Elit: Yıldırım Golemi',
      'Fırtına Kulesi',
      'Elit: Fırtına Kartalı',
      'BOSS: Fırtına Tanrısı',
    ],
    enemies: [
      { name: 'Yıldırım Golemi', arch: 'stone_sentinel', weakness: 'nature', abilities: ['Yıldırım Yumruğu'] },
      { name: 'Fırtına Kartalı', arch: 'wolf', weakness: 'frost', abilities: ['Fırtına Kanadı'] },
      { name: 'Bulut Yaratığı', arch: 'void_stalker', weakness: 'lightning', abilities: ['Bulut Gizlenişi'] },
      { name: 'Elektrik Yılanı', arch: 'leviathan', weakness: 'nature', abilities: ['Şok Isırığı'] },
    ],
    treasure: {
      name: 'Fırtına Sandığı',
      arch: 'ice_golem',
      weakness: 'nature',
      abilities: ['Hazine Kalkanı', 'Yıldırım Kalkanı'],
    },
    boss: {
      name: 'Fırtına Tanrısı Tempest',
      title: 'Kozmik Fırtınanın Kalbi',
      bossId: 'storm_god',
      arch: 'warlord',
      weakness: 'nature',
      resistance: 'lightning',
      abilities: ['Kozmik Fırtına', 'Yıldırım Kalkanı', 'Faz Değişimi'],
    },
  },
  {
    id: 'immortality',
    name: 'Ölümsüzlük Kuyusu',
    subtitle: 'Sonsuz Yaşamın Sırrı',
    description:
      'Kuyunun dibinde yaşam ve ölüm iç içe geçiyor. Ruh biçiciler burada sonsuz yaşamın bedelini soruyor.',
    startLevel: 87,
    bgGradient: 'from-teal-950 via-emerald-950 to-slate-950',
    accentColor: '#5eead4',
    stageNames: [
      'Kuyu Kapısı',
      'Yaşam ve Ölüm Vadisi',
      'Ölümsüzlük Hazinesi',
      'Ruh Koridorları',
      'Elit: Zaman Yiyici',
      'Ebedi Tüneller',
      'Elit: Ruh Biçici',
      'Ölümsüzlük Kuyusu',
      'Elit: Ebedi Golem',
      'BOSS: Ölümsüzlük Muhafızı',
    ],
    enemies: [
      { name: 'Ruh Biçici', arch: 'reaper', weakness: 'nature', abilities: ['Ruh Tırpanı'] },
      { name: 'Yaşam Ruhu', arch: 'treant', weakness: 'fire', abilities: ['Yaşam Öpücüğü'] },
      { name: 'Zaman Yiyici', arch: 'void_stalker', weakness: 'arcane', abilities: ['Zaman Emişi'] },
      { name: 'Ebedi Golem', arch: 'ice_golem', weakness: 'lightning', abilities: ['Ebedi Yumruk'] },
    ],
    treasure: {
      name: 'Ölümsüzlük Sandığı',
      arch: 'pharaoh',
      weakness: 'nature',
      abilities: ['Hazine Kalkanı', 'Yaşam Mührü'],
    },
    boss: {
      name: 'Ölümsüzlük Muhafızı Eternia',
      title: 'Yaşam ve Ölümün Efendisi',
      bossId: 'immortal_guardian',
      arch: 'reaper',
      weakness: 'nature',
      resistance: 'arcane',
      abilities: ['Yaşam ve Ölüm', 'Ebedi Kalkan', 'Faz Değişimi'],
    },
  },
  {
    id: 'eternity',
    name: 'Sonsuzluk Tahtı',
    subtitle: 'Nihai Sınav',
    description:
      'Bütün diyarların hakimi Sonsuzluk İmparatoru burada oturuyor. Onu yenen, efsanelerin arasına yazılır.',
    startLevel: 90,
    bgGradient: 'from-violet-950 via-rose-950 to-black',
    accentColor: '#f43f5e',
    stageNames: [
      'Sonsuzluk Kapısı',
      'Ebedi Koridorlar',
      'Sonsuzluk Hazinesi',
      'Kaos Salonları',
      'Elit: Kaos Lordu',
      'Yargı Salonu',
      'Elit: Ebedi Kılıç',
      'İmparatorluk Tahtı',
      'Elit: Sonsuzluk Muhafızı',
      'FİNAL BOSS: Sonsuzluk İmparatoru',
    ],
    enemies: [
      { name: 'Sonsuzluk Muhafızı', arch: 'warlord', weakness: 'arcane', abilities: ['Sonsuz Kılıç'] },
      { name: 'Kaos Lordu', arch: 'reaper', weakness: 'nature', abilities: ['Kaos Tırpanı'] },
      { name: 'Yargıç', arch: 'celestial', weakness: 'fire', abilities: ['Yargı Işığı'] },
      { name: 'Ebedi Kılıç', arch: 'void_stalker', weakness: 'lightning', abilities: ['Ebedi Kesiş'] },
    ],
    treasure: {
      name: 'Sonsuzluk Sandığı',
      arch: 'celestial',
      weakness: 'arcane',
      abilities: ['Hazine Kalkanı', 'Sonsuz Mühür'],
    },
    boss: {
      name: 'Sonsuzluk İmparatoru Valdris',
      title: 'Tüm Diyarların Hakimi',
      bossId: 'eternity_emperor',
      arch: 'pharaoh',
      weakness: 'arcane',
      resistance: 'nature',
      abilities: ['Sonsuzluk Hükmü', 'Kaos Kalkanı', 'Faz Değişimi'],
    },
  },
];


/* ================================================================== */
/*  SONSUZLUĞUN ÖTESİ — 25 yeni bölge / 250 aşama (Toplam 500 aşama)    */
/*  Kaynak: expansionRegions.json (bölge, aşama ve boss kimlikleri).     */
/*  Mevcut 250 aşama olduğu gibi kalır; rota Sonsuzluk Tahtı'ndan sonra  */
/*  başlar ve mevcut sıra/kilit kuralıyla açılır (önceki aşama tamam).   */
/* ================================================================== */

interface ExpansionStageJson {
  id: string;
  order: number;
  name: string;
  type: StageType;
  enemyName?: string;
  bossId?: string;
}
interface ExpansionRegionJson {
  id: string;
  name: string;
  accentColor: string;
  icon: string;
  arc: number;
  orderAfterEternity: number;
  stages: ExpansionStageJson[];
  enemyArchetypes: { normal: Arch; elite: Arch; boss: Arch };
  bossWeakness: GemType;
  bossResistance: GemType;
}
interface ExpansionJson {
  afterRegionId: string;
  stageCount: number;
  arcs: { order: number; name: string; suggestedEncounterFocus: string }[];
  regions: ExpansionRegionJson[];
}

/** Bölüm adının ilk kelimesi yetmeyen durumlar için kısa sıfatlar (normal düşman adı: "<sıfat> <tür>"). */
const EXPANSION_ADJ: Record<string, string> = {
  glass_forest: 'Cam', silent_shore: 'Sessiz', copper_mines: 'Bakır', mist_aqueduct: 'Sis', thorn_citadel: 'Diken',
  amber_dunes: 'Kehribar', sunken_archive: 'Batık', salt_bastion: 'Tuz', obsidian_harbor: 'Obsidyen', black_tide: 'Kara',
  echo_terrace: 'Yankı', mercury_foundry: 'Cıva', cinder_garden: 'Kor', prism_labyrinth: 'Prizma', iron_orbit: 'Demir',
  aurora_vault: 'Kutup', dream_marsh: 'Düş', mirror_court: 'Ayna', midnight_observatory: 'Gece', hollow_sun: 'Sönük',
  comet_bridge: 'Kuyruklu', rune_necropolis: 'Rün', shattered_sky: 'Kırık', zero_threshold: 'Sıfır', dawn_core: 'Şafak',
};
const ARCHETYPE_NOUN: Partial<Record<Arch, string>> = {
  treant: 'Ağaç Ruhu', goblin: 'Yağmacı', wolf: 'Kurt', yeti: 'Buz Devi', ice_golem: 'Buz Golemi', salamander: 'Semender',
  fire_elemental: 'Ateş Ruhu', stone_sentinel: 'Taş Nöbetçi', void_stalker: 'Boşluk Avcısı', celestial: 'Gök Varlığı',
  leviathan: 'Derin Canavar', pharaoh: 'Mumya Muhafız', reaper: 'Biçici', warlord: 'Savaş Beyi',
};
/** Tailwind sınıfları statik yazılmalı (JIT). Her yay kendi renk tonunu kullanır. */
const EXPANSION_ARC_STYLE = [
  { gradient: 'from-teal-950 via-slate-900 to-slate-950', ability: ['Kalkan', 'Ağır Saldırı'] },
  { gradient: 'from-blue-950 via-indigo-950 to-slate-950', ability: ['Can Çalma', 'Uzun Savaş'] },
  { gradient: 'from-orange-950 via-stone-900 to-slate-950', ability: ['Ağır Saldırı', 'Niyet Göstergesi'] },
  { gradient: 'from-violet-950 via-fuchsia-950 to-slate-950', ability: ['Donmuş Taşlar', 'Faz Geçişi'] },
  { gradient: 'from-amber-950 via-rose-950 to-slate-950', ability: ['Faz Geçişi', 'Çoklu Davranış'] },
];
const EXPANSION_GEMS: GemType[] = ['fire', 'frost', 'nature', 'lightning', 'arcane'];
const EXPANSION_START_LEVEL = 93;

/**
 * Eğri, Sonsuzluk Tahtı'nın (Sv. 93) değerlerinden aynı eğimle (≈%1,4/seviye) yumuşakça sürer; böylece Sv. 93-168 aralığı
 * son hikâye aşamalarından kopmadan yükselir. Ödül de Sv. 78 tavanından yavaşça (%1/seviye) artar.
 */
function expansionStage(
  tpl: { regionId: RegionId; regionName: string; stageNumber: number; type: StageType; level: number; name: string; enemy: EnemyTemplate; boss?: BossTemplate },
  enemyName: string,
  title: string | undefined
): StageDef {
  const stage = makeEndgameStage({ ...tpl, level: EXPANSION_START_LEVEL });
  const d = Math.max(0, tpl.level - EXPANSION_START_LEVEL);
  const hpMul = 1 + 0.014 * d + 0.00003 * d * d;
  const atkMul = 1 + 0.012 * d + 0.00003 * d * d;
  const defMul = 1 + 0.008 * d;
  const rwMul = 1 + 0.01 * d;
  const rw = stage.rewards;
  stage.enemy = {
    ...stage.enemy,
    name: enemyName,
    title: title ?? stage.enemy.title,
    level: tpl.level,
    maxHp: Math.round(stage.enemy.maxHp * hpMul),
    attack: Math.round(stage.enemy.attack * atkMul),
    defense: Math.round(stage.enemy.defense * defMul),
  };
  stage.recommendedLevel = tpl.level;
  stage.rewards = {
    ...rw,
    xp: Math.round(rw.xp * rwMul),
    gold: Math.round(rw.gold * rwMul),
    crystals: Math.round(rw.crystals * rwMul),
  };
  stage.description = stageDescription(tpl.type, tpl.regionName, enemyName, tpl.enemy.weakness, tpl.boss?.title);
  return stage;
}

function buildExpansionRegion(r: ExpansionRegionJson, k: number, arcs: ExpansionJson['arcs']): RegionDef {
  const style = EXPANSION_ARC_STYLE[r.arc - 1];
  const arc = arcs.find((a) => a.order === r.arc)!;
  const adj = EXPANSION_ADJ[r.id];
  const startLevel = EXPANSION_START_LEVEL + 3 * k;
  const stages = r.stages.map((st, i) => {
    const type = st.type;
    const weak = EXPANSION_GEMS[(k * 3 + st.order) % EXPANSION_GEMS.length];
    const arch = type === 'boss' ? r.enemyArchetypes.boss : type === 'elite' ? r.enemyArchetypes.elite : r.enemyArchetypes.normal;
    const normalName = `${adj} ${ARCHETYPE_NOUN[arch] ?? 'Muhafız'}`;
    const boss: BossTemplate | undefined =
      type === 'boss'
        ? {
            name: st.enemyName ?? st.name,
            arch,
            weakness: r.bossWeakness,
            resistance: r.bossResistance,
            abilities: [...style.ability, 'Faz Değişimi'],
            bossId: st.bossId as BossId,
            title: `${r.name} Bossu`,
          }
        : undefined;
    const enemy: EnemyTemplate =
      boss ?? { name: type === 'normal' ? normalName : st.name, arch, weakness: weak, abilities: [style.ability[i % 2]] };
    const enemyName = type === 'normal' ? normalName : type === 'boss' ? boss!.name : st.name;
    const title = type === 'elite' ? 'Bölge Eliti' : type === 'treasure' ? 'Hazine Muhafızı' : undefined;
    return expansionStage(
      { regionId: r.id as RegionId, regionName: r.name, stageNumber: st.order, type, level: startLevel + ENDGAME_LEVEL_OFFSETS[i], name: st.name, enemy, boss },
      enemyName,
      title
    );
  });
  return {
    id: r.id as RegionId,
    name: r.name,
    subtitle: arc.name,
    description: `${arc.name} yayının ${r.orderAfterEternity}. diyarı. Odak: ${arc.suggestedEncounterFocus}.`,
    levelRange: `Sv. ${startLevel} - ${startLevel + 3}`,
    bgGradient: style.gradient,
    accentColor: r.accentColor,
    stages,
  };
}

const EXPANSION_REGIONS: RegionDef[] = (expansion as unknown as ExpansionJson).regions
  .slice()
  .sort((a, b) => a.orderAfterEternity - b.orderAfterEternity)
  .map((r, k) => buildExpansionRegion(r, k, (expansion as unknown as ExpansionJson).arcs));

const RAW_REGIONS: RegionDef[] = [
  ...CORE_REGIONS,
  ...NEW_REGION_TEMPLATES.map(buildRegion),
  ...ENDGAME_TEMPLATES.map(buildEndgameRegion),
  ...EXPANSION_REGIONS,
];

/** Zorluk ayarı (difficulty.ts) uygulanmış nihai bölgeler. */
export const WORLD_REGIONS: RegionDef[] = RAW_REGIONS.map((region) => ({
  ...region,
  stages: region.stages.map(tuneStage),
}));

export const TOTAL_STAGES = WORLD_REGIONS.reduce((sum, r) => sum + r.stages.length, 0);
export const TOTAL_REGIONS = WORLD_REGIONS.length;

export function getStageIndex(stageId: string): number {
  let idx = 0;
  for (const reg of WORLD_REGIONS) {
    for (const st of reg.stages) {
      if (st.id === stageId) return idx;
      idx += 1;
    }
  }
  return -1;
}

export function getNextStageAfter(stageId: string): StageDef | null {
  const all = WORLD_REGIONS.flatMap((r) => r.stages);
  const idx = all.findIndex((s) => s.id === stageId);
  return idx >= 0 && idx + 1 < all.length ? all[idx + 1] : null;
}

export function findStageById(stageId: string) {
  for (const reg of WORLD_REGIONS) {
    const found = reg.stages.find((s) => s.id === stageId);
    if (found) return { region: reg, stage: found };
  }
  return null;
}
