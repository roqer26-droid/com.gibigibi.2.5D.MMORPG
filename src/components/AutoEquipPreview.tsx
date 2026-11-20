import { ArrowRight, Check, Wand2, X } from 'lucide-react';
import { useEffect } from 'react';
import { describeEffect } from '../data/sets';
import { getSet } from '../data/sets';
import { RARITY_META, SLOT_LABELS } from '../data/skills';
import type { EquipPlan } from '../game/equipPlanner';
import type { EquipmentItem, StatBlock } from '../types/game';
import { getItemPowerScore } from '../utils/rpgLogic';
import { ItemArtSvg } from './ItemCard';
import { SetIcon } from './SetUi';

const STAT_ROWS: { key: keyof StatBlock; label: string; suffix?: string }[] = [
  { key: 'attack', label: 'Saldırı' },
  { key: 'health', label: 'Can' },
  { key: 'defense', label: 'Savunma' },
  { key: 'mana', label: 'Mana' },
  { key: 'critChance', label: 'Kritik Şans', suffix: '%' },
  { key: 'critDamage', label: 'Kritik Hasar', suffix: '%' },
  { key: 'dodge', label: 'Sıyrılma', suffix: '%' },
  { key: 'elementalDamage', label: 'Elemental Hasar', suffix: '%' },
];

function ItemChip({ item }: { item?: EquipmentItem }) {
  if (!item) return <div className="flex min-w-0 flex-1 items-center text-[13px] text-slate-500">Boş</div>;
  const meta = RARITY_META[item.rarity];
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${meta.borderClass} ${meta.bgClass}`}>
        <ItemArtSvg item={item} size={26} />
      </span>
      <span className="min-w-0">
        <span className={`flex items-center gap-1 truncate text-[13px] font-bold leading-tight ${meta.textClass}`}>
          {item.setId && <SetIcon set={getSet(item.setId)} size={12} />}
          <span className="truncate">
            {item.name}
            {item.upgradeLevel > 0 ? ` +${item.upgradeLevel}` : ''}
          </span>
        </span>
        <span className="block text-[11px] text-amber-200/80">Güç {getItemPowerScore(item)}</span>
      </span>
    </div>
  );
}

interface AutoEquipPreviewProps {
  plan: EquipPlan;
  onApply: () => void;
  onCancel: () => void;
}

/** "En İyilerini Kuşan" önizlemesi: değişecek ekipman, özellik farkları ve set bonusu değişimleri. */
export function AutoEquipPreview({ plan, onApply, onCancel }: AutoEquipPreviewProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const statRows = STAT_ROWS.map((r) => ({ ...r, before: plan.statsBefore[r.key], after: plan.statsAfter[r.key] })).filter(
    (r) => r.before !== r.after
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Önerilen ekipman kombinasyonu"
      data-testid="equip-preview"
    >
      <div className="fantasy-panel flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border-2 border-amber-400/30 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="flex items-center gap-2 font-display text-[19px] font-bold text-amber-200">
            <Wand2 className="h-5 w-5" /> Önerilen Kombinasyon
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Kapat"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3" data-testid="equip-preview-body">
          {plan.unchanged ? (
            <div
              className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-center"
              data-testid="preview-unchanged"
            >
              <Check className="mx-auto h-8 w-8 text-emerald-300" />
              <p className="mt-2 font-display text-[17px] font-bold text-emerald-200">
                Mevcut ekipmanların önerilen kombinasyonda
              </p>
              <p className="mt-1 text-[13px] text-slate-400">
                Çantandaki hiçbir eşya, temel özellikler ve set bonusları birlikte değerlendirildiğinde mevcut ekipmanından daha yüksek puan vermiyor.
              </p>
            </div>
          ) : (
            <>
              <section>
                <h3 className="mb-1.5 text-[13px] font-bold uppercase tracking-wider text-slate-400">
                  Değişecek ekipmanlar ({plan.changes.length})
                </h3>
                <ul className="space-y-1.5">
                  {plan.changes.map((c) => (
                    <li
                      key={c.slot}
                      data-testid={`preview-change-${c.slot}`}
                      className="rounded-xl border border-slate-700 bg-slate-950/60 p-2"
                    >
                      <div className="mb-1 text-[12px] font-bold text-amber-300">{SLOT_LABELS[c.slot]}</div>
                      <div className="flex items-center gap-1.5">
                        <ItemChip item={c.from} />
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                        <ItemChip item={c.to} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-1.5 text-[13px] font-bold uppercase tracking-wider text-slate-400">Özellik farkı</h3>
                <div className="space-y-1 rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                  {statRows.map((r) => {
                    const diff = Number((r.after - r.before).toFixed(1));
                    return (
                      <div key={r.key} data-testid={`preview-stat-${r.key}`} data-before={r.before} data-after={r.after} className="flex items-center justify-between text-[14px]">
                        <span className="text-slate-300">{r.label}</span>
                        <span className="flex items-center gap-2 font-semibold">
                          <span className="text-slate-400">
                            {r.before}
                            {r.suffix ?? ''}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                          <span className="text-white">
                            {r.after}
                            {r.suffix ?? ''}
                          </span>
                          <span className={`min-w-[3.2rem] text-right text-[13px] font-bold ${diff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {diff > 0 ? '+' : ''}
                            {diff}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                  <div className="mt-1 flex items-center justify-between border-t border-slate-800 pt-1.5 text-[14px]" data-testid="preview-power">
                    <span className="font-bold text-amber-200">Savaş Gücü</span>
                    <span className="font-bold text-white">
                      {plan.powerBefore.toLocaleString('tr-TR')} → {plan.powerAfter.toLocaleString('tr-TR')}
                    </span>
                  </div>
                </div>
              </section>

              {plan.setDiffs.length > 0 && (
                <section>
                  <h3 className="mb-1.5 text-[13px] font-bold uppercase tracking-wider text-slate-400">Set bonusları</h3>
                  <ul className="space-y-1.5">
                    {plan.setDiffs.map((d) => (
                      <li
                        key={d.def.id}
                        data-testid={`preview-set-${d.def.id}`}
                        className="rounded-xl border p-2.5"
                        style={{ borderColor: `${d.def.glow}77`, background: `${d.def.color}30` }}
                      >
                        <div className="flex items-center gap-2 text-[14px] font-bold" style={{ color: d.def.secondary }}>
                          <SetIcon set={d.def} size={16} /> {d.def.name}
                          <span className="ml-auto text-slate-100">
                            {d.before} → {d.after} parça
                          </span>
                        </div>
                        {d.def.bonuses
                          .filter((b) => d.gained.includes(b.pieces))
                          .map((b) => (
                            <p key={`g${b.pieces}`} className="mt-1 text-[12px] font-semibold text-emerald-300">
                              Açılır · {b.pieces} parça: {describeEffect(b.effect)}
                            </p>
                          ))}
                        {d.def.bonuses
                          .filter((b) => d.lost.includes(b.pieces))
                          .map((b) => (
                            <p key={`l${b.pieces}`} className="mt-1 text-[12px] font-semibold text-rose-300">
                              Kapanır · {b.pieces} parça: {describeEffect(b.effect)}
                            </p>
                          ))}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="text-[11px] leading-relaxed text-slate-500">
                Öneri, eşyaların temel özelliklerini ve aktif 2/4 parça set bonuslarını birlikte puanlar (koşullu bonuslar
                gerçekleşme olasılığıyla ağırlıklandırılır). Puan: {Math.round(plan.currentScore)} → {Math.round(plan.proposedScore)}.
              </p>
            </>
          )}
        </div>

        <div
          className="flex gap-2.5 border-t border-slate-800 bg-[#0a0f1e] px-4 pt-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
          data-testid="equip-preview-actions"
        >
          {plan.unchanged ? (
            <button
              type="button"
              onClick={onCancel}
              data-testid="preview-cancel"
              className="gold-btn flex min-h-[52px] flex-1 items-center justify-center rounded-xl font-display text-[17px] font-bold text-slate-950"
            >
              Tamam
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancel}
                data-testid="preview-cancel"
                className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-[16px] font-bold text-slate-100 hover:bg-slate-700"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={onApply}
                data-testid="preview-apply"
                className="gold-btn flex min-h-[52px] flex-[1.4] items-center justify-center rounded-xl font-display text-[18px] font-bold text-slate-950"
              >
                Kuşan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
