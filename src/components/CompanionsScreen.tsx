import { ArrowLeft } from 'lucide-react';
import type { CompanionId, GameSaveState } from '../types/game';
import { CompanionsSection } from './CompanionsSection';

interface CompanionsScreenProps {
  save: GameSaveState;
  onBack: () => void;
  onUnlock: (id: CompanionId) => void;
  onSetActive: (id: CompanionId | null) => void;
}

/** Ana menüden açılan Yoldaşlar ekranı (yeni kahramanlar eklense de yoldaşlar ayrı yerde durur). */
export function CompanionsScreen({ save, onBack, onUnlock, onSetActive }: CompanionsScreenProps) {
  return (
    <div className="flex h-full flex-col bg-[#080b14]" data-testid="companions-screen">
      <header className="flex shrink-0 items-center gap-3 border-b border-amber-500/40 bg-[#050810] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[48px] items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-[15px] font-bold text-slate-100 hover:border-amber-400/50"
        >
          <ArrowLeft className="h-4 w-4" /> Geri
        </button>
        <h1 className="font-display text-[24px] font-bold text-amber-300">Yoldaşlar</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <CompanionsSection save={save} onUnlock={onUnlock} onSetActive={onSetActive} />
        </div>
      </div>
    </div>
  );
}
