import { ArrowLeft, ArrowRight, Check, Coins, Gem, Hammer, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSet } from '../data/sets';
import { RARITY_META, SLOT_LABELS } from '../data/skills';
import { MAX_UPGRADE_LEVEL } from '../state/saveActions';
import { DISPLAY_SLOT_ORDER } from '../game/equipPlanner';
import type { EquipmentItem, EquipmentSlot, GameSaveState, StatBlock } from '../types/game';
import { getEffectiveItemStats, getEnhanceCost, getItemPowerScore } from '../utils/rpgLogic';
import { ItemArtSvg } from './ItemCard';
import { SetIcon } from './SetUi';

/** Tek dokunuş = tek geliştirme: işlemden sonra düğme bu kadar süre kilitli kalır (hızlı çift dokunmayı engeller). */
export const ENHANCE_LOCK_MS = 450;

export interface UpgradeSelection {
  id: string;
  isEquipped: boolean;
  slot?: EquipmentSlot;
}

interface UpgradeScreenProps {
  save: GameSaveState;
  /** Açılışta seçili gelecek eşya (ör. eşya detayından) */
  initialItemId?: string | null;
  /** Geri: geldiği ekrana dönülür; o an seçili eşya bildirilir */
  onBack: (selected: UpgradeSelection | null) => void;
  /** Mevcut geliştirme işlemi (detay penceresi ve bu ekran aynısını kullanır) */
  onEnhance: (itemId: string, isEquipped: boolean, slot?: EquipmentSlot) => void;
}

const STAT_LABELS: { key: keyof StatBlock; label: string; suffix?: string }[] = [
  { key: 'attack', label: 'Saldırı' },
  { key: 'health', label: 'Can' },
  { key: 'defense', label: 'Savunma' },
  { key: 'mana', label: 'Mana' },
  { key: 'critChance', label: 'Kritik Şans', suffix: '%' },
  { key: 'critDamage', label: 'Kritik Hasar', suffix: '%' },
  { key: 'dodge', label: 'Sıyrılma', suffix: '%' },
  { key: 'elementalDamage', label: 'Elemental Hasar', suffix: '%' },
];

const slotIndex = (slot: EquipmentSlot) => DISPLAY_SLOT_ORDER.indexOf(slot);

interface Row {
  item: EquipmentItem;
  isEquipped: boolean;
  slot?: EquipmentSlot;
}

export function UpgradeScreen({ save, initialItemId = null, onBack, onEnhance }: UpgradeScreenProps) {
  const hero = save.heroes[save.activeHeroClass];

  const equippedRows: Row[] = useMemo(
    () =>
      DISPLAY_SLOT_ORDER.flatMap((slot) => {
        const item = hero.equipped[slot];
        return item ? [{ item, isEquipped: true, slot }] : [];
      }),
    [hero.equipped]
  );
  const bagRows: Row[] = useMemo(
    () =>
      [...save.inventory]
        .sort(
          (a, b) =>
            slotIndex(a.slot) - slotIndex(b.slot) ||
            RARITY_META[b.rarity].rank - RARITY_META[a.rarity].rank ||
            getItemPowerScore(b) - getItemPowerScore(a)
        )
        .map((item) => ({ item, isEquipped: false })),
    [save.inventory]
  );

  const initialInBag = initialItemId ? bagRows.some((r) => r.item.id === initialItemId) : false;
  const [tab, setTab] = useState<'equipped' | 'bag'>(initialInBag ? 'bag' : 'equipped');
  const [selectedId, setSelectedId] = useState<string | null>(initialItemId);

  const rows = tab === 'equipped' ? equippedRows : bagRows;
  const selected: Row | null = useMemo(
    () => [...equippedRows, ...bagRows].find((r) => r.item.id === selectedId) ?? null,
    [equippedRows, bagRows, selectedId]
  );

  // Seçili eşya listede görünür olsun
  const selectedRowRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [tab, selectedId]);

  // Tek dokunuş = tek işlem
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => () => void (busyRef.current = false), []);

  const handleEnhance = () => {
    if (!selected || busyRef.current) return;
    const item = selected.item;
    const cost = getEnhanceCost(item);
    if (item.upgradeLevel >= MAX_UPGRADE_LEVEL || save.gold < cost.gold || save.crystals < cost.crystals) return;
    busyRef.current = true;
    setBusy(true);
    onEnhance(item.id, selected.isEquipped, selected.slot);
    setFlash(`+${item.upgradeLevel + 1} ✓`);
    window.setTimeout(() => {
      busyRef.current = false;
      setBusy(false);
    }, ENHANCE_LOCK_MS);
    window.setTimeout(() => setFlash(null), 900);
  };

  const sheetOpen = !!selected;

  return (
    <div className="relative flex h-full flex-col bg-[#060912]" data-testid="upgrade-screen">
      <header className="flex shrink-0 items-center gap-3 border-b border-amber-500/40 bg-[#050810] px-3 py-2.5">
        <button
          type="button"
          onClick={() => onBack(selected ? { id: selected.item.id, isEquipped: selected.isEquipped, slot: selected.slot } : null)}
          aria-label="Geri"
          data-testid="upgrade-back"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-900 text-slate-100 hover:border-amber-400/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate font-display text-[22px] font-bold text-amber-300">Ekipman Geliştir</h1>
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-[13px] font-bold" data-testid="upgrade-resources">
          <span className="flex items-center gap-1 text-amber-300" data-testid="res-gold">
            <Coins className="h-3.5 w-3.5" />
            {save.gold.toLocaleString('tr-TR')}
          </span>
          <span className="flex items-center gap-1 text-sky-300" data-testid="res-crystals">
            <Gem className="h-3.5 w-3.5" />
            {save.crystals.toLocaleString('tr-TR')}
          </span>
        </div>
      </header>

      <div className="grid shrink-0 grid-cols-2 gap-2 px-3 pt-3" role="tablist">
        {(
          [
            ['equipped', `Kuşanılanlar (${equippedRows.length})`],
            ['bag', `Çantadakiler (${bagRows.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            data-testid={`tab-${id}`}
            onClick={() => setTab(id)}
            className={`min-h-[48px] rounded-xl border px-2 text-[15px] font-bold transition ${
              tab === id ? 'border-amber-400/70 bg-amber-400/15 text-amber-200' : 'border-slate-700 bg-slate-900/60 text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 pt-3"
        style={{ paddingBottom: sheetOpen ? 'min(62dvh, 430px)' : 16 }}
        data-testid="upgrade-list"
      >
        {rows.length === 0 ? (
          <p className="mt-10 text-center text-[15px] text-slate-500">
            {tab === 'equipped' ? 'Kuşanılmış ekipman yok.' : 'Çantada ekipman yok.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const meta = RARITY_META[r.item.rarity];
              const isSel = r.item.id === selectedId;
              return (
                <li key={r.item.id}>
                  <button
                    type="button"
                    ref={isSel ? selectedRowRef : undefined}
                    onClick={() => setSelectedId(r.item.id)}
                    data-testid={`upgrade-row-${r.item.id}`}
                    aria-pressed={isSel}
                    className={`flex min-h-[60px] w-full items-center gap-3 rounded-xl border-2 px-2.5 py-2 text-left transition ${
                      isSel ? 'border-amber-300 bg-amber-950/30 shadow-[0_0_14px_rgba(252,211,77,0.25)]' : 'border-slate-700 bg-slate-950/70 hover:border-slate-500'
                    }`}
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${meta.borderClass} ${meta.bgClass}`}>
                      <ItemArtSvg item={r.item} size={32} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`flex items-center gap-1.5 text-[15px] font-bold leading-tight ${meta.textClass}`}>
                        {r.item.setId && <SetIcon set={getSet(r.item.setId)} size={15} />}
                        <span className="truncate" data-testid="row-name">{r.item.name}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-[12px]">
                        <span className={`font-bold ${meta.textClass}`}>{meta.label}</span>
                        <span className="text-slate-500">· {SLOT_LABELS[r.item.slot]}</span>
                      </span>
                    </span>
                    <span
                      data-testid="row-level"
                      className={`shrink-0 rounded-lg px-2 py-1 text-[14px] font-extrabold ${
                        r.item.upgradeLevel > 0 ? 'bg-amber-500/90 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      +{r.item.upgradeLevel}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <UpgradeSheet
          row={selected}
          gold={save.gold}
          crystals={save.crystals}
          busy={busy}
          flash={flash}
          onEnhance={handleEnhance}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function UpgradeSheet({
  row,
  gold,
  crystals,
  busy,
  flash,
  onEnhance,
  onClose,
}: {
  row: Row;
  gold: number;
  crystals: number;
  busy: boolean;
  flash: string | null;
  onEnhance: () => void;
  onClose: () => void;
}) {
  const item = row.item;
  const meta = RARITY_META[item.rarity];
  const maxed = item.upgradeLevel >= MAX_UPGRADE_LEVEL;
  const cost = getEnhanceCost(item);
  const missingGold = Math.max(0, cost.gold - gold);
  const missingCrystals = Math.max(0, cost.crystals - crystals);
  const affordable = missingGold === 0 && missingCrystals === 0;

  const nextItem = { ...item, upgradeLevel: item.upgradeLevel + 1 };
  const now = getEffectiveItemStats(item);
  const next = maxed ? now : getEffectiveItemStats(nextItem);
  const changes = STAT_LABELS.filter((s) => (now[s.key] ?? 0) !== (next[s.key] ?? 0) || (now[s.key] ?? 0) > 0);

  const missingText = [missingGold > 0 ? `${missingGold.toLocaleString('tr-TR')} altın` : '', missingCrystals > 0 ? `${missingCrystals} kristal` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 mx-auto flex max-h-[62dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border-2 border-b-0 border-amber-400/35 bg-[#0b1226] shadow-[0_-10px_30px_rgba(0,0,0,0.55)]"
      data-testid="upgrade-sheet"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-3" data-testid="upgrade-sheet-scroll">
        <div className="flex items-center gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${meta.borderClass} ${meta.bgClass}`}>
            <ItemArtSvg item={item} size={36} />
          </span>
          <div className="min-w-0 flex-1">
            <div className={`flex items-center gap-1.5 text-[16px] font-bold leading-tight ${meta.textClass}`}>
              {item.setId && <SetIcon set={getSet(item.setId)} size={16} />}
              <span className="truncate" data-testid="sheet-name">{item.name}</span>
            </div>
            <div className="text-[12px] text-slate-400">
              <span className={meta.textClass}>{meta.label}</span> · {SLOT_LABELS[item.slot]} · Güç {getItemPowerScore(item)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Paneli kapat"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 py-2.5" data-testid="sheet-levels">
          <span className="text-[22px] font-extrabold text-slate-300" data-testid="level-now">+{item.upgradeLevel}</span>
          {maxed ? (
            <span className="text-[15px] font-bold text-amber-300">Maksimum seviye</span>
          ) : (
            <>
              <ArrowRight className="h-5 w-5 text-amber-300" />
              <span className="text-[22px] font-extrabold text-amber-300" data-testid="level-next">+{item.upgradeLevel + 1}</span>
            </>
          )}
          {flash && <span className="ml-1 flex items-center gap-1 text-[14px] font-extrabold text-emerald-300"><Check className="h-4 w-4" />{flash}</span>}
        </div>

        <div className="mt-2.5 space-y-1 rounded-xl border border-slate-700 bg-slate-950/60 p-3" data-testid="sheet-stats">
          {changes.map(({ key, label, suffix }) => {
            const a = now[key] ?? 0;
            const b = next[key] ?? 0;
            const diff = Number((b - a).toFixed(1));
            return (
              <div key={key} className="flex items-center justify-between text-[14px]" data-stat={key}>
                <span className="text-slate-300">{label}</span>
                <span className="flex items-center gap-2 font-semibold">
                  <span className="text-slate-300">{a}{suffix ?? ''}</span>
                  {!maxed && (
                    <>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                      <span className="text-white">{b}{suffix ?? ''}</span>
                      {diff !== 0 && <span className="min-w-[2.8rem] text-right text-[13px] font-bold text-emerald-400">+{diff}</span>}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {!maxed && (
          <div className="mt-2.5 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-[14px]" data-testid="sheet-cost">
            <div className="mb-1 text-[12px] font-bold uppercase tracking-wider text-slate-400">Maliyet</div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-300"><Coins className="h-4 w-4" />{cost.gold.toLocaleString('tr-TR')} altın</span>
              <span className={missingGold > 0 ? 'font-bold text-rose-400' : 'text-slate-400'}>Sende {gold.toLocaleString('tr-TR')}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sky-300"><Gem className="h-4 w-4" />{cost.crystals} kristal</span>
              <span className={missingCrystals > 0 ? 'font-bold text-rose-400' : 'text-slate-400'}>Sende {crystals.toLocaleString('tr-TR')}</span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 border-t border-slate-800 pt-2 text-[13px] font-semibold text-emerald-300" data-testid="sheet-odds">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Başarı ihtimali %100 · başarısızlık veya seviye kaybı yok
            </p>
          </div>
        )}
        {item.setId && (
          <p className="mt-2 text-[12px] text-slate-400">
            {getSet(item.setId).name} parçası: geliştirme set bonuslarını değiştirmez, parçanın temel özelliklerini artırır.
          </p>
        )}
      </div>

      <div
        className="shrink-0 border-t border-slate-700/70 bg-[#0a0f1e] px-4 pt-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
        data-testid="upgrade-actions"
      >
        <button
          type="button"
          onClick={onEnhance}
          disabled={maxed || !affordable || busy}
          data-testid="upgrade-btn"
          className="gold-btn flex min-h-[58px] w-full flex-col items-center justify-center rounded-2xl px-3 font-display text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {maxed ? (
            <span className="text-[18px] font-bold">Maksimum Seviye</span>
          ) : !affordable ? (
            <>
              <span className="flex items-center gap-1.5 text-[16px] font-bold"><Hammer className="h-4 w-4" />Geliştir</span>
              <span className="text-[13px] font-semibold" data-testid="missing-text">Eksik: {missingText}</span>
            </>
          ) : busy ? (
            <span className="text-[17px] font-bold">Geliştiriliyor…</span>
          ) : (
            <span className="flex items-center gap-2 text-[19px] font-bold">
              <Hammer className="h-5 w-5" />
              Geliştir +{item.upgradeLevel} → +{item.upgradeLevel + 1}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
