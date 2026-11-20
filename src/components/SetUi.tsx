import { Check, X } from 'lucide-react';
import { useEffect } from 'react';
import {
  EQUIPMENT_SETS,
  SET_SLOTS,
  describeEffect,
  getAllSetProgress,
  type EquipmentSetDef,
  type EquippedMap,
  type SetDiff,
} from '../data/sets';
import { SLOT_LABELS } from '../data/skills';

/** Küçük geometrik set simgesi: Köz = turuncu alev, Buzul = açık mavi kristal, Yaşam = yeşil yaprak. */
export function SetIcon({ set, size = 18 }: { set: EquipmentSetDef; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const };
  const glow = { filter: `drop-shadow(0 0 3px ${set.glow}aa)` };
  if (set.icon === 'flame') {
    return (
      <svg {...common} style={glow}>
        <path d="M12 2c1 3.6 6.2 6.2 6.2 11.2a6.2 6.2 0 0 1-12.4 0c0-2.1.9-3.7 2.3-5 .3 1.8 1.2 2.9 2.4 3.1C10.3 8.6 10.4 5.2 12 2z" fill={set.glow} stroke="#fff7ed" strokeWidth="1" strokeLinejoin="round" />
        <path d="M12 12.2c.4 1.3 2 2.2 2 3.7a2 2 0 0 1-4 0c0-1 .7-1.7 1.2-2.4.3.6.5.8.8.7z" fill="#fff7ed" opacity="0.9" />
      </svg>
    );
  }
  if (set.icon === 'crystal') {
    return (
      <svg {...common} style={glow}>
        <polygon points="12,2 18.5,9 12,22 5.5,9" fill={set.glow} stroke="#e0f2fe" strokeWidth="1" strokeLinejoin="round" />
        <polygon points="12,2 18.5,9 12,9" fill="#e0f2fe" opacity="0.75" />
        <polyline points="5.5,9 12,9 12,22" fill="none" stroke="#0369a1" strokeWidth="0.9" opacity="0.7" />
      </svg>
    );
  }
  return (
    <svg {...common} style={glow}>
      <path d="M20 3.5C10.5 3.5 4.8 8.6 4.8 15.2c0 1.9.7 3.6 1.9 4.9.9-3 3.4-6 7.7-8.1-3.4 2.9-5 5.6-5.5 8.5C16.2 19.3 20 14.7 20 3.5z" fill={set.glow} stroke="#f0fdf4" strokeWidth="1" strokeLinejoin="round" />
      <path d="M7 20.5c.5-2.7 2.2-5.4 5-7.6" fill="none" stroke="#14532d" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** 2 ve 4 parça bonusları: aktifler belirgin ("Aktif"), açılmayı bekleyenler soluk (gerekli parça sayısı yazılı). */
export function SetBonusList({ set, count, compact = false }: { set: EquipmentSetDef; count: number; compact?: boolean }) {
  return (
    <ul className={compact ? 'space-y-1' : 'space-y-1.5'} data-testid={`set-bonuses-${set.id}`}>
      {set.bonuses.map((b) => {
        const active = count >= b.pieces;
        return (
          <li
            key={b.pieces}
            data-active={active}
            className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 ${
              active ? 'text-slate-50' : 'border-slate-800 bg-slate-950/40 text-slate-500'
            }`}
            style={active ? { borderColor: `${set.glow}99`, background: `${set.glow}1f` } : undefined}
          >
            <span
              className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-extrabold"
              style={active ? { background: set.glow, color: '#04121c' } : { background: '#1e293b', color: '#94a3b8' }}
            >
              {b.pieces} parça
            </span>
            <span className={`min-w-0 flex-1 leading-snug ${compact ? 'text-[11px]' : 'text-[12px]'} ${active ? 'font-semibold' : ''}`}>
              {describeEffect(b.effect)}
            </span>
            <span
              className={`mt-0.5 flex shrink-0 items-center gap-0.5 text-[11px] font-extrabold ${active ? 'text-emerald-300' : 'text-slate-500'}`}
            >
              {active ? (
                <>
                  <Check className="h-3 w-3" /> Aktif
                </>
              ) : (
                <>Gerekli: {b.pieces}</>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Ekipman değişiminde kazanılacak / kaybedilecek set bonusları. */
export function SetDiffList({ diffs }: { diffs: SetDiff[] }) {
  if (diffs.length === 0) return null;
  return (
    <div className="mt-2 space-y-1 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-[11px]" data-testid="set-diff">
      <div className="font-bold text-slate-300">Kuşanırsan set değişimi</div>
      {diffs.map((d) => (
        <div key={d.def.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="inline-flex items-center gap-1 font-bold" style={{ color: d.def.glow }}>
            <SetIcon set={d.def} size={13} /> {d.def.shortName}
          </span>
          <span className="text-slate-300">
            {d.before} → {d.after} parça
          </span>
          {d.gained.map((p) => (
            <span key={`g${p}`} className="font-bold text-emerald-300">
              +{p} parça bonusu kazanılır
            </span>
          ))}
          {d.lost.map((p) => (
            <span key={`l${p}`} className="font-bold text-rose-300">
              −{p} parça bonusu kaybedilir
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Eşya detayındaki set bölümü: ad, kuşanılan parça sayısı ve 2/4 parça bonusları. */
export function ItemSetSection({
  set,
  equipped,
  isEquipped,
}: {
  set: EquipmentSetDef;
  equipped: EquippedMap;
  isEquipped: boolean;
}) {
  const count = getAllSetProgress(equipped).find((p) => p.def.id === set.id)?.count ?? 0;
  return (
    <div className="mt-2 rounded-xl border p-3" style={{ borderColor: `${set.glow}66`, background: `${set.color}33` }} data-testid="item-set">
      <div className="mb-2 flex items-center gap-2">
        <SetIcon set={set} size={20} />
        <span className="font-display text-[14px] font-bold" style={{ color: set.secondary }}>
          {set.name}
        </span>
        <span className="ml-auto rounded-full bg-slate-950/70 px-2 py-0.5 text-[12px] font-extrabold text-slate-100" data-testid="item-set-count">
          {count}/4 parça{!isEquipped && count < 4 ? ' kuşanılı' : ''}
        </span>
      </div>
      <SetBonusList set={set} count={count} compact />
    </div>
  );
}

/** Aktif setlerin ayrıntı penceresi. */
export function SetsModal({ equipped, onClose }: { equipped: EquippedMap; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const progress = getAllSetProgress(equipped);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-2 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Ekipman setleri"
      data-testid="sets-modal"
    >
      <div className="fantasy-panel flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-amber-400/30">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="font-display text-[19px] font-bold text-amber-200">Ekipman Setleri</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-3">
          {progress.map(({ def, count }) => (
            <section
              key={def.id}
              className="rounded-xl border p-3"
              style={{ borderColor: count > 0 ? `${def.glow}88` : '#1e293b', background: count > 0 ? `${def.color}2e` : 'rgba(15,23,42,0.55)' }}
              data-testid={`set-card-${def.id}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <SetIcon set={def} size={22} />
                <h3 className="font-display text-[16px] font-bold" style={{ color: def.secondary }}>
                  {def.name}
                </h3>
                <span className="ml-auto rounded-full bg-slate-950/70 px-2.5 py-0.5 text-[13px] font-extrabold text-slate-100">{count}/4</span>
              </div>
              <SetBonusList set={def} count={count} />
              <div className="mt-2 grid grid-cols-1 gap-1 text-[11px]">
                {SET_SLOTS.map((slot) => {
                  const worn = equipped[slot]?.setId === def.id;
                  return (
                    <div key={slot} className={`flex items-center gap-1 rounded-md px-2 py-1 ${worn ? 'bg-slate-950/70 font-bold text-slate-100' : 'bg-slate-950/30 text-slate-500'}`}>
                      {worn ? <Check className="h-3 w-3 text-emerald-300" /> : <span className="h-3 w-3 rounded-full border border-slate-600" />}
                      <span className="truncate">{def.pieceNames[slot]}</span>
                      <span className="ml-auto text-[10px] text-slate-500">{SLOT_LABELS[slot]}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Parçalar <strong className="text-slate-200">{def.regionName}</strong> bölgesinde düşer.
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export { EQUIPMENT_SETS };
