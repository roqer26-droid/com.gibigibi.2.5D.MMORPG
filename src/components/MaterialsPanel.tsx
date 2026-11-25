import { useState } from 'react';
import { MATERIAL_IDS, MATERIAL_META, type AwakenMaterials, type AwakenMaterialId } from '../data/awakening';
import { MaterialIcon } from './MaterialIcon';

/** Envanterdeki "Geliştirme Malzemeleri" kategorisi: adetler; dokununca nerelerden elde edildiği açılır. */
export function MaterialsPanel({ materials }: { materials: AwakenMaterials }) {
  const [open, setOpen] = useState<AwakenMaterialId | null>(null);
  return (
    <div className="fantasy-panel rounded-2xl p-3" data-testid="materials-panel">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>Geliştirme Malzemeleri</span>
        <span className="text-[11px] text-amber-300/80">Kahraman Uyanışı’nda kullanılır</span>
      </div>
      <ul className="space-y-2">
        {MATERIAL_IDS.map((id) => {
          const m = MATERIAL_META[id];
          const isOpen = open === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : id)}
                aria-expanded={isOpen}
                data-testid={`material-${id}`}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition hover:bg-slate-900/80"
                style={{ borderColor: `${m.color}66`, background: `${m.color}10` }}
              >
                <MaterialIcon id={id} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-extrabold" style={{ color: m.color }}>{m.name}</span>
                  <span className="block text-[11px] text-slate-400">{m.description}</span>
                </span>
                <span className="shrink-0 text-lg font-black text-white" data-testid={`material-count-${id}`}>×{materials[id].toLocaleString('tr-TR')}</span>
              </button>
              {isOpen && (
                <div className="mt-1 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2" data-testid={`material-info-${id}`}>
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">Nereden elde edilir?</p>
                  <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[12px] text-slate-200">
                    {m.sources.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
