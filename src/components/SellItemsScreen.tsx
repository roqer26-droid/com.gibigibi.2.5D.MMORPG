import { ArrowLeft, Check, Coins } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { getSet } from '../data/sets';
import { RARITY_META } from '../data/skills';
import { isSellable } from '../state/saveActions';
import type { EquipmentItem, GameSaveState, Rarity } from '../types/game';
import { ItemArtSvg } from './ItemCard';
import { SetIcon } from './SetUi';

interface SellItemsScreenProps {
  save: GameSaveState;
  onClose: () => void;
  /** Seçili eşyaları sat (altın ve çanta tek kayıt güncellemesinde) */
  onSell: (itemIds: string[]) => void;
}

const RARITIES = (Object.keys(RARITY_META) as Rarity[]).sort((a, b) => RARITY_META[a].rank - RARITY_META[b].rank);
const fmt = (n: number) => n.toLocaleString('tr-TR');

export function SellItemsScreen({ save, onClose, onSell }: SellItemsScreenProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [selling, setSelling] = useState(false);
  const busy = useRef(false);

  // Satılabilir eşyalar: çantadakiler (kuşanılmış ve kilitli olanlar hariç); nadirliğe, sonra seviyeye göre
  const items = useMemo(
    () =>
      save.inventory
        .filter((i) => isSellable(save, i))
        .sort((a, b) => RARITY_META[a.rarity].rank - RARITY_META[b.rarity].rank || a.levelReq - b.levelReq),
    [save]
  );
  const byRarity = useMemo(() => {
    const m = {} as Record<Rarity, EquipmentItem[]>;
    for (const r of RARITIES) m[r] = items.filter((i) => i.rarity === r);
    return m;
  }, [items]);

  // Satış sonrası çantadan çıkan eşyalar seçimden de düşer
  const chosen = items.filter((i) => selected.has(i.id));
  const total = chosen.reduce((sum, i) => sum + i.sellValue, 0);

  const toggleItem = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Renge dokunma: tamamı seçiliyse o renkteki seçimleri kaldırır; değilse (hiç/kısmen) o renkteki tümünü ekler. */
  const toggleRarity = (r: Rarity) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const ids = byRarity[r].map((i) => i.id);
      const all = ids.length > 0 && ids.every((id) => next.has(id));
      for (const id of ids) {
        if (all) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const confirmSell = () => {
    if (busy.current || chosen.length === 0) return; // hızlı çift dokunuş: ikinci çağrı yok sayılır
    busy.current = true;
    setSelling(true);
    onSell(chosen.map((i) => i.id));
    setSelected(new Set());
    // Onay penceresi kısa süre açık kalır: ikinci dokunuş arkadaki listeye düşüp yanlışlıkla seçim yapmaz
    window.setTimeout(() => {
      setConfirming(false);
      setSelling(false);
      busy.current = false;
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#070b17]" data-testid="sell-screen" role="dialog" aria-label="İtemleri Sat">
      <header className="flex shrink-0 items-center gap-3 border-b border-amber-500/40 bg-[#050810] px-4 py-3">
        <button type="button" onClick={onClose} aria-label="Geri" className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-600 bg-slate-900 text-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-[22px] font-bold text-amber-300">İtemleri Sat</h1>
      </header>

      {/* Nadirlik renkleri: dokununca o nadirlikteki tüm satılabilir itemler seçilir */}
      <div className="shrink-0 border-b border-slate-800 bg-[#080d1c] px-3 py-2.5">
        <div className="grid grid-cols-3 gap-2">
          {RARITIES.map((r) => {
            const meta = RARITY_META[r];
            const total = byRarity[r].length;
            const n = byRarity[r].filter((i) => selected.has(i.id)).length;
            const state = n === 0 ? 'none' : n === total ? 'all' : 'partial';
            return (
              <button
                key={r}
                type="button"
                disabled={total === 0}
                onClick={() => toggleRarity(r)}
                aria-pressed={state === 'all'}
                data-testid={`rarity-${r}`}
                data-state={state}
                className="flex min-h-[54px] flex-col items-center justify-center rounded-xl border-2 px-1 py-1 text-center disabled:opacity-35"
                style={{
                  borderColor: state === 'none' ? `${meta.color}55` : meta.color,
                  background: state === 'none' ? '#0b1020' : `${meta.color}${state === 'all' ? '38' : '1f'}`,
                }}
              >
                <span className="text-[13px] font-extrabold leading-tight" style={{ color: meta.color }}>
                  {meta.label}
                </span>
                <span className="text-[11px] font-semibold text-slate-300" data-testid={`rarity-count-${r}`}>
                  {state === 'none' ? `${total} item` : `${n}/${total} seçili`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste: altta sabit çubuğun üstünde kaydırılır */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2" data-testid="sell-list">
        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-400">Satılabilir item yok.</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => {
              const meta = RARITY_META[item.rarity];
              const on = selected.has(item.id);
              const set = item.setId ? getSet(item.setId) : null;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    aria-pressed={on}
                    data-testid={`sell-item-${item.id}`}
                    data-on={on ? '1' : '0'}
                    className="flex min-h-[60px] w-full items-center gap-3 rounded-xl border-2 p-2 text-left"
                    style={{ borderColor: on ? meta.color : '#1e293b', background: on ? `${meta.color}22` : '#0b1020' }}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2"
                      style={{ borderColor: on ? meta.color : '#475569', background: on ? meta.color : 'transparent' }}
                    >
                      {on && <Check className="h-4 w-4 text-slate-950" strokeWidth={3} />}
                    </span>
                    <ItemArtSvg item={item} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-bold" style={{ color: meta.color }}>
                          {item.name}
                        </span>
                        {set && (
                          <span title={set.name} data-testid="set-mark" className="shrink-0">
                            <SetIcon set={set} size={16} />
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {meta.label} · Sv.{item.levelReq}
                        {item.upgradeLevel > 0 ? ` · +${item.upgradeLevel}` : ''}
                        {set ? ` · ${set.shortName}` : ''}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-amber-300">
                      <Coins className="h-3.5 w-3.5" />
                      {fmt(item.sellValue)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Sabit alt çubuk */}
      <div className="shrink-0 border-t border-amber-500/30 bg-[#050810] px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}>
        <div className="mb-2 flex items-center justify-between text-[14px] font-bold">
          <span className="text-slate-200" data-testid="sell-count">
            {chosen.length} item seçili
          </span>
          <span className="flex items-center gap-1 text-amber-300" data-testid="sell-total">
            <Coins className="h-4 w-4" /> +{fmt(total)} altın
          </span>
        </div>
        <button
          type="button"
          disabled={chosen.length === 0}
          onClick={() => setConfirming(true)}
          data-testid="sell-submit"
          className="gold-btn flex min-h-[52px] w-full items-center justify-center rounded-xl text-base font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Seçilenleri Sat
        </button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="alertdialog" aria-modal="true" data-testid="sell-confirm">
          <div className="fantasy-panel w-full max-w-sm rounded-2xl border border-amber-500/50 p-5 text-center">
            <h2 className="font-display text-xl font-black text-amber-300">Satışı onayla</h2>
            <p className="mt-2 text-[16px] font-bold text-white" data-testid="sell-confirm-text">
              {chosen.length} item satılacak · +{fmt(total)} altın
            </p>
            <div className="mt-4 flex gap-2.5">
              <button type="button" disabled={selling} onClick={() => setConfirming(false)} data-testid="sell-cancel" className="min-h-[48px] flex-1 rounded-xl border border-slate-700 bg-slate-900 text-sm font-bold text-slate-100">
                Vazgeç
              </button>
              <button type="button" disabled={selling} onClick={confirmSell} data-testid="sell-confirm-ok" className="gold-btn min-h-[48px] flex-1 rounded-xl text-sm font-extrabold text-slate-950 disabled:opacity-60">
                {selling ? 'Satıldı ✓' : 'Sat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
