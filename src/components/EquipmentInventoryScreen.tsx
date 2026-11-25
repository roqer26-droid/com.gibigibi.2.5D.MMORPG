import { MaterialsPanel } from './MaterialsPanel';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Wand2,
  SlidersHorizontal,
  Coins,
  Gem,
} from 'lucide-react';
import { HERO_CLASSES } from '../data/classes';
import { getEquippedSetProgress } from '../data/sets';
import { planBestEquipment, type EquipPlan } from '../game/equipPlanner';
import { RARITY_META, SLOT_LABELS } from '../data/skills';
import { EquipmentItem, EquipmentSlot, GameSaveState } from '../types/game';
import { computeEnchantAura, ENCHANT_TIERS } from '../phaser/HeroRenderer';
import { computeHeroBuild, getItemPowerScore } from '../utils/rpgLogic';
import { HeroPaperdoll } from './HeroPaperdoll';
import { ItemArtSvg, ItemCard } from './ItemCard';
import { ItemTooltipPanel } from './ItemTooltipModal';
import { AutoEquipPreview } from './AutoEquipPreview';
import { SellItemsScreen } from './SellItemsScreen';
import { SetIcon, SetsModal } from './SetUi';

export interface EquipSelection {
  id: string;
  isEquipped: boolean;
  slot?: EquipmentSlot;
}

interface EquipmentInventoryScreenProps {
  save: GameSaveState;
  onBack: () => void;
  onEquipItem: (item: EquipmentItem, targetSlot?: EquipmentSlot) => void;
  onUnequipSlot: (slot: EquipmentSlot) => void;
  /** Geliştirme ekranını bu eşya seçili olarak açar */
  onOpenUpgrade: (sel: EquipSelection) => void;
  /** Ekran yeniden açıldığında (ör. geliştirmeden dönünce) geri yüklenecek seçim */
  initialSelection?: EquipSelection | null;
  onSelectionChange?: (sel: EquipSelection | null) => void;
  onDismantleItem: (itemId: string) => void;
  onSellItem: (itemId: string) => void;
  /** Önizlemede onaylanan ekipman planını tek kayıt güncellemesiyle uygular */
  onApplyEquipPlan: (plan: EquipPlan) => void;
  /** Toplu satış: seçili eşyaların kimlikleri (altın ve çanta tek güncellemede) */
  onSellItems: (itemIds: string[]) => void;
}

const LEFT_SLOTS: EquipmentSlot[] = ['helmet', 'chest', 'gloves', 'pants', 'boots'];
const RIGHT_SLOTS: EquipmentSlot[] = ['weapon', 'offhand', 'necklace', 'ring1', 'ring2'];

export const EquipmentInventoryScreen: React.FC<EquipmentInventoryScreenProps> = ({
  save,
  onBack,
  onEquipItem,
  onUnequipSlot,
  onOpenUpgrade,
  initialSelection = null,
  onSelectionChange,
  onDismantleItem,
  onSellItem,
  onApplyEquipPlan,
  onSellItems,
}) => {
  const hero = save.heroes[save.activeHeroClass];
  const cls = HERO_CLASSES[hero.classId];
  const build = useMemo(() => computeHeroBuild(hero), [hero]);
  const aura = useMemo(() => computeEnchantAura(hero), [hero]);
  const equippedSets = useMemo(() => getEquippedSetProgress(hero.equipped), [hero.equipped]);
  const [showSets, setShowSets] = useState(false);
  const [equipPlan, setEquipPlan] = useState<EquipPlan | null>(null);
  const [showSell, setShowSell] = useState(false);

  const [filterCat, setFilterCat] = useState<'all' | 'weapons' | 'armor' | 'accessories' | 'materials'>('all');
  const [sortBy, setSortBy] = useState<'rarity' | 'level' | 'power'>('rarity');
  const [selectedRef, setSelectedRef] = useState<EquipSelection | null>(initialSelection);
  useEffect(() => {
    onSelectionChange?.(selectedRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRef]);
  const [dragOverSlot, setDragOverSlot] = useState<EquipmentSlot | null>(null);

  const filteredInventory = useMemo(() => {
    const items = save.inventory.filter((it) => {
      if (filterCat === 'weapons') return it.slot === 'weapon' || it.slot === 'offhand';
      if (filterCat === 'armor')
        return ['helmet', 'chest', 'gloves', 'pants', 'boots'].includes(it.slot);
      if (filterCat === 'accessories')
        return ['necklace', 'ring1', 'ring2'].includes(it.slot);
      return true;
    });

    items.sort((a, b) => {
      if (sortBy === 'rarity') {
        const diff = RARITY_META[b.rarity].rank - RARITY_META[a.rarity].rank;
        return diff !== 0 ? diff : getItemPowerScore(b) - getItemPowerScore(a);
      }
      if (sortBy === 'level') {
        return b.levelReq - a.levelReq || getItemPowerScore(b) - getItemPowerScore(a);
      }
      return getItemPowerScore(b) - getItemPowerScore(a);
    });
    return items;
  }, [save.inventory, filterCat, sortBy]);

  const selectedItem: { item: EquipmentItem; isEquipped: boolean; slot?: EquipmentSlot } | null =
    useMemo(() => {
      if (!selectedRef) return null;
      if (selectedRef.isEquipped && selectedRef.slot) {
        const eq = hero.equipped[selectedRef.slot];
        return eq ? { item: eq, isEquipped: true, slot: selectedRef.slot } : null;
      }
      const inv = save.inventory.find((i) => i.id === selectedRef.id);
      return inv ? { item: inv, isEquipped: false } : null;
    }, [selectedRef, hero.equipped, save.inventory]);

  const handleDropOnSlot = (e: React.DragEvent, slot: EquipmentSlot) => {
    e.preventDefault();
    setDragOverSlot(null);
    const itemId = e.dataTransfer.getData('text/plain');
    if (!itemId) return;
    const invItem = save.inventory.find((i) => i.id === itemId);
    if (!invItem) return;
    const isRing =
      (invItem.slot === 'ring1' || invItem.slot === 'ring2') &&
      (slot === 'ring1' || slot === 'ring2');
    if (invItem.slot === slot || isRing) {
      onEquipItem(invItem, slot);
    }
  };

  const renderSlotBox = (slot: EquipmentSlot) => {
    const eq = hero.equipped[slot];
    const meta = eq ? RARITY_META[eq.rarity] : null;
    const isSelected = selectedItem?.isEquipped && selectedItem.slot === slot;
    const isDropTarget = dragOverSlot === slot;

    return (
      <button
        key={slot}
        type="button"
        onClick={() => {
          if (eq) setSelectedRef({ id: eq.id, isEquipped: true, slot });
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverSlot(slot);
        }}
        onDragLeave={() => setDragOverSlot(null)}
        onDrop={(e) => handleDropOnSlot(e, slot)}
        className={`relative flex h-16 w-16 sm:h-[72px] sm:w-[72px] flex-col items-center justify-center rounded-xl border-2 transition-all ${
          eq && meta
            ? `${meta.borderClass} ${meta.bgClass}`
            : 'border-dashed border-slate-700 bg-slate-900/60 hover:border-amber-500/40'
        } ${isSelected ? 'ring-2 ring-amber-300 scale-105' : ''} ${
          isDropTarget ? 'ring-2 ring-emerald-400 scale-105 bg-emerald-950/50' : ''
        }`}
        title={SLOT_LABELS[slot]}
      >
        {eq ? (
          <>
            <ItemArtSvg item={eq} size={38} />
            {eq.upgradeLevel > 0 && (
              <span className="absolute -right-1 -top-1 rounded bg-amber-500 px-1 text-[9px] font-extrabold text-slate-950">
                +{eq.upgradeLevel}
              </span>
            )}
            <span className="mt-0.5 max-w-full truncate px-1 text-[9px] font-medium text-slate-200">
              {SLOT_LABELS[slot]}
            </span>
          </>
        ) : (
          <span className="px-1 text-center text-[10px] font-semibold text-slate-500">
            {SLOT_LABELS[slot]}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[#080b14]">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 bg-slate-950/90 px-4 py-3">
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
              Ekipman ve Envanter
            </h1>
            <p className="text-[11px] text-slate-400">
              Sürükle-bırak veya dokunarak kuşan • Görünüm anında değişir
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/35 px-2.5 py-1 text-amber-300">
            <Coins className="h-3.5 w-3.5" />
            {save.gold.toLocaleString('tr-TR')} Altın
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-950/35 px-2.5 py-1 text-sky-300">
            <Gem className="h-3.5 w-3.5" />
            {save.crystals.toLocaleString('tr-TR')} Kristal
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left: Character Paperdoll + 10 Slots + Live Stats */}
          <div className="fantasy-panel flex flex-col rounded-2xl p-4 lg:col-span-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-white">
                  {cls.title} <span className="text-amber-400">Sv.{hero.level}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Savaş Gücü:{' '}
                  <strong className="text-amber-300">
                    {build.powerRating.toLocaleString('tr-TR')}
                  </strong>
                </p>
                {/* Büyü Aurası — ekipman + seviyesi arttıkça karakter parlar */}
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-extrabold"
                    style={{
                      color: aura.color,
                      borderColor: `${aura.color}77`,
                      background: `${aura.color}18`,
                      boxShadow: aura.tier >= 3 ? `0 0 10px ${aura.color}55` : 'none',
                    }}
                  >
                    ✦ {aura.tierName}
                  </span>
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(3, aura.intensity * 100)}%`,
                        background: `linear-gradient(90deg, #7dd3fc, ${aura.color})`,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    +{aura.total} geliştirme
                    {aura.tier < ENCHANT_TIERS.length - 1 ? (
                      <>
                        {' '}
                        • sonraki kademe:{' '}
                        <span className="font-bold text-slate-300">
                          +{ENCHANT_TIERS[aura.tier + 1].min}
                        </span>
                      </>
                    ) : (
                      <> • MAKSİMUM</>
                    )}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEquipPlan(planBestEquipment(hero, save.inventory))}
                data-testid="auto-equip-btn"
                className="flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
              >
                <Wand2 className="h-3.5 w-3.5" />
                En İyilerini Kuşan
              </button>
            </div>

            {/* Paperdoll Stage */}
            <div className="my-3 flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12),rgba(9,11,22,0.95))] px-2 py-4 sm:px-4">
              <div className="flex flex-col gap-2">{LEFT_SLOTS.map(renderSlotBox)}</div>

              <div className="flex flex-col items-center justify-center">
                <HeroPaperdoll hero={hero} size={185} />
                <span className="mt-1 rounded-full border border-amber-500/30 bg-slate-900/80 px-3 py-0.5 text-[10px] font-semibold text-amber-200">
                  {cls.name}
                </span>
              </div>

              <div className="flex flex-col gap-2">{RIGHT_SLOTS.map(renderSlotBox)}</div>
            </div>

            {/* Aktif setler: dokununca ayrıntılar açılır */}
            <button
              type="button"
              onClick={() => setShowSets(true)}
              className="mb-3 flex min-h-[48px] w-full items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-left transition hover:border-amber-400/50"
              data-testid="active-sets"
              aria-label="Aktif setler, ayrıntıları aç"
            >
              <span className="shrink-0 text-[12px] font-bold text-slate-300">Setler</span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {equippedSets.length === 0 ? (
                  <span className="text-[12px] text-slate-500">Aktif set yok</span>
                ) : (
                  equippedSets.map(({ def, count, twoActive, fourActive }) => (
                    <span
                      key={def.id}
                      data-set={def.id}
                      data-active={twoActive}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-extrabold ${
                        twoActive ? 'text-slate-50' : 'border-slate-700 text-slate-400'
                      }`}
                      style={twoActive ? { borderColor: `${def.glow}aa`, background: `${def.glow}22` } : undefined}
                    >
                      <SetIcon set={def} size={14} />
                      {def.shortName} {count}/4
                      {twoActive && <span className="text-[10px] font-bold text-emerald-300">{fourActive ? '2+4' : '2'}</span>}
                    </span>
                  ))
                )}
              </span>
              <span className="shrink-0 text-[12px] font-bold text-amber-300">Detay →</span>
            </button>

            {/* Live Attributes Grid */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <div>
                <span className="text-[10px] text-slate-400">Can</span>
                <p data-stat="health" className="font-bold text-emerald-400">{build.stats.health}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Saldırı</span>
                <p data-stat="attack" className="font-bold text-rose-400">{build.stats.attack}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Savunma</span>
                <p data-stat="defense" className="font-bold text-amber-300">{build.stats.defense}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Mana</span>
                <p data-stat="mana" className="font-bold text-sky-400">{build.stats.mana}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Kritik Şans</span>
                <p data-stat="critChance" className="font-bold text-yellow-300">%{build.stats.critChance}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Kritik Hasar</span>
                <p data-stat="critDamage" className="font-bold text-orange-300">%{build.stats.critDamage}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Sıyrılma</span>
                <p data-stat="dodge" className="font-bold text-cyan-300">%{build.stats.dodge}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Elemental</span>
                <p data-stat="elementalDamage" className="font-bold text-purple-300">+%{build.stats.elementalDamage}</p>
              </div>
            </div>
          </div>

          {/* Right: Inventory & Selected Item Inspector */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            {/* Filters & Sorting Bar */}
            <div className="fantasy-panel flex flex-wrap items-center justify-between gap-2 rounded-2xl p-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Tümü' },
                  { id: 'weapons', label: 'Silahlar' },
                  { id: 'armor', label: 'Zırhlar' },
                  { id: 'accessories', label: 'Aksesuarlar' },
                  { id: 'materials', label: 'Malzemeler' },
                ].map((f) => (
                  <button
                    key={f.id}
                    data-testid={`inv-filter-${f.id}`}
                    type="button"
                    onClick={() => setFilterCat(f.id as typeof filterCat)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      filterCat === f.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-200 focus:border-amber-400 focus:outline-none"
                >
                  <option value="rarity">Nadirliğe Göre</option>
                  <option value="power">Güce Göre</option>
                  <option value="level">Seviyeye Göre</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowSell(true)}
                  data-testid="open-sell"
                  className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-950/40 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-900/50"
                  title="Itemleri tek tek ya da nadirliğe göre seçip sat"
                >
                  <Coins className="h-3 w-3" />
                  İtemleri Sat
                </button>
              </div>
            </div>

            {filterCat === 'materials' ? (
              <MaterialsPanel materials={save.materials} />
            ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              {/* Inventory Grid */}
              <div className="fantasy-panel rounded-2xl p-3 xl:col-span-7">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Çanta ({filteredInventory.length} Eşya)</span>
                  <span className="text-[11px] text-amber-300/80">
                    Bilgisayar: Sürükle & Bırak • Mobil: Dokun & Kuşan
                  </span>
                </div>

                {filteredInventory.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    <Sparkles className="mb-2 h-6 w-6 text-slate-600" />
                    Bu kategoride eşya yok. Savaşlar kazanarak yeni ganimetler topla!
                  </div>
                ) : (
                  <div className="grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                    {filteredInventory.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        selected={selectedItem?.item.id === item.id && !selectedItem.isEquipped}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                        onClick={() => setSelectedRef({ id: item.id, isEquipped: false })}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Eşya detayı: dar ekranda alt çekmece (sabit eylem alanlı), geniş ekranda yan panel */}
              <div className="xl:col-span-5">
                {selectedItem ? (
                  <>
                    <div
                      className="fixed inset-0 z-30 bg-black/60 xl:hidden"
                      onClick={() => setSelectedRef(null)}
                      aria-hidden="true"
                    />
                    <div
                      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[82dvh] w-full max-w-xl flex-col xl:static xl:z-auto xl:max-h-[calc(100dvh-7rem)] xl:max-w-none"
                      data-testid="item-detail-sheet"
                    >
                  <ItemTooltipPanel
                    item={selectedItem.item}
                    equippedInSlot={hero.equipped[selectedItem.item.slot]}
                    heroEquipped={hero.equipped}
                    isEquipped={selectedItem.isEquipped}
                    heroLevel={hero.level}
                    onEquip={() => {
                      onEquipItem(selectedItem.item);
                    }}
                    onUnequip={
                      selectedItem.slot
                        ? () => {
                            onUnequipSlot(selectedItem.slot!);
                            setSelectedRef(null);
                          }
                        : undefined
                    }
                    onOpenUpgrade={() =>
                      onOpenUpgrade({
                        id: selectedItem.item.id,
                        isEquipped: selectedItem.isEquipped,
                        slot: selectedItem.slot,
                      })
                    }
                    onDismantle={
                      !selectedItem.isEquipped
                        ? () => {
                            onDismantleItem(selectedItem.item.id);
                            setSelectedRef(null);
                          }
                        : undefined
                    }
                    onSell={
                      !selectedItem.isEquipped
                        ? () => {
                            onSellItem(selectedItem.item.id);
                            setSelectedRef(null);
                          }
                        : undefined
                    }
                    onClose={() => setSelectedRef(null)}
                  />
                    </div>
                  </>
                ) : (
                  <div className="fantasy-panel flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl p-6 text-center text-xs text-slate-400">
                    <Sparkles className="mb-2 h-8 w-8 text-amber-400/60" />
                    <p className="font-semibold text-slate-200">Eşya İnceleme ve Karşılaştırma</p>
                    <p className="mt-1">
                      Özelliklerini görmek, kuşanılı eşyayla karşılaştırmak, geliştirmek (+1) veya
                      parçalamak için soldaki bir slota ya da çantadaki bir eşyaya tıkla.
                    </p>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
      {showSell && (
        <SellItemsScreen
          save={save}
          onClose={() => setShowSell(false)}
          onSell={(ids) => {
            onSellItems(ids);
          }}
        />
      )}
      {showSets && <SetsModal equipped={hero.equipped} onClose={() => setShowSets(false)} />}
      {equipPlan && (
        <AutoEquipPreview
          plan={equipPlan}
          onCancel={() => setEquipPlan(null)}
          onApply={() => {
            onApplyEquipPlan(equipPlan);
            setEquipPlan(null);
          }}
        />
      )}
    </div>
  );
};
