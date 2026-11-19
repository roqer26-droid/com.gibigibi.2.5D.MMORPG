import React, { useState } from 'react';
import { Volume2, VolumeX, Save, RotateCcw, Sparkles, X, BookOpen, Copy, Upload } from 'lucide-react';
import { GEM_INFO } from '../data/skills';
import { GameSettings, GemType } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onManualSave: () => void;
  onResetProgress: () => void;
  /** Kaydı aktarılabilir metin olarak döndürür */
  onExportSave: () => string;
  /** Metinden kayıt yükler; başarılıysa true */
  onImportSave: (text: string) => boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onManualSave,
  onResetProgress,
  onExportSave,
  onImportSave,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [transferMsg, setTransferMsg] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const flash = (msg: string) => {
    setTransferMsg(msg);
    window.setTimeout(() => setTransferMsg(null), 2600);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(onExportSave());
      flash('Kayıt panoya kopyalandı ✓');
    } catch {
      setShowImport(true);
      setImportText(onExportSave());
      flash('Pano erişimi yok — metni elle kopyala.');
    }
  };

  const handleImport = () => {
    if (onImportSave(importText)) {
      setImportText('');
      setShowImport(false);
      flash('Kayıt yüklendi ✓');
    } else {
      flash('Geçersiz kayıt metni!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="fantasy-panel animate-pop-scale relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border-2 border-amber-500/40 p-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="font-display text-xl font-bold text-amber-300">Oyun Ayarları ve Rehber</h2>

        {/* Audio Section */}
        <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Ses Durumu</span>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, muted: !settings.muted })}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${
                settings.muted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {settings.muted ? 'Sessiz' : 'Ses Açık'}
            </button>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Müzik Seviyesi</span>
              <span>%{Math.round(settings.musicVolume * 100)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.musicVolume}
              onChange={(e) =>
                onUpdateSettings({ ...settings, musicVolume: Number(e.target.value) })
              }
              className="mt-1 w-full accent-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300">
              <span>Efekt Sesleri (SFX)</span>
              <span>%{Math.round(settings.sfxVolume * 100)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.sfxVolume}
              onChange={(e) =>
                onUpdateSettings({ ...settings, sfxVolume: Number(e.target.value) })
              }
              className="mt-1 w-full accent-amber-400"
            />
          </div>
        </div>

        {/* Graphics & Effects */}
        <div className="mt-3 space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <label className="flex cursor-pointer items-center justify-between text-xs font-semibold text-slate-200">
            <span>Kritik ve Boss Vuruşlarında Ekran Sarsıntısı</span>
            <input
              type="checkbox"
              checked={settings.screenShake}
              onChange={(e) =>
                onUpdateSettings({ ...settings, screenShake: e.target.checked })
              }
              className="h-4 w-4 accent-amber-400"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-between text-xs font-semibold text-slate-200">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Yüksek Parçacık ve Büyü Efektleri
            </span>
            <input
              type="checkbox"
              checked={settings.highParticles}
              onChange={(e) =>
                onUpdateSettings({ ...settings, highParticles: e.target.checked })
              }
              className="h-4 w-4 accent-amber-400"
            />
          </label>
        </div>

        {/* Gem Quick Guide */}
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <BookOpen className="h-4 w-4" />
            Taş Rehberi ve Kontroller
          </div>
          <p className="mb-2 text-[11px] text-slate-400">
            Fareyle sürükle veya tıkla (mobilde kaydır veya dokun). 4’lü eşleşme çizgi lazer, L/T eşleşme Nova Bombası, 5’li eşleşme Prizmatik Yıldız oluşturur! Kısayollar: 1–6 Yetenekler.
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {(Object.keys(GEM_INFO) as GemType[]).map((gt) => (
              <div
                key={gt}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${GEM_INFO[gt].badgeBg}`}
              >
                <div className="font-bold">{GEM_INFO[gt].name}</div>
                <div className="opacity-85">{GEM_INFO[gt].shortEffect}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Save & Reset */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              onManualSave();
              setSavedToast(true);
              setTimeout(() => setSavedToast(false), 2200);
            }}
            className="gold-btn flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-950"
          >
            <Save className="h-4 w-4" />
            {savedToast ? 'Kayıt Başarılı ✓' : 'Oyunu Şimdi Kaydet'}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
          >
            <Copy className="h-4 w-4" />
            Kaydı Kopyala
          </button>
          <button
            type="button"
            onClick={() => setShowImport((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800/70 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
          >
            <Upload className="h-4 w-4" />
            Kayıt Yükle
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-900/50"
            >
              <RotateCcw className="h-4 w-4" />
              İlerlemeyi Sıfırla
            </button>
          ) : (
            <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-rose-500 bg-rose-950/70 p-2.5 text-xs">
              <span className="font-bold text-rose-200">Tüm kayıt silinecek! Emin misin?</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                    onClose();
                  }}
                  className="rounded-lg bg-rose-500 px-3 py-1 font-bold text-white"
                >
                  Evet, Sıfırla
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-lg bg-slate-800 px-3 py-1 font-bold text-slate-300"
                >
                  İptal
                </button>
              </div>
            </div>
          )}
        </div>

        {showImport && (
          <div className="mt-3 space-y-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Kopyaladığın kayıt metnini buraya yapıştır"
              className="h-24 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 p-2 text-[11px] text-slate-200"
            />
            <button
              type="button"
              onClick={handleImport}
              disabled={!importText.trim()}
              className="gold-btn rounded-lg px-4 py-2 text-xs font-extrabold text-slate-950 disabled:opacity-50"
            >
              Yükle (mevcut kaydın üzerine yazar)
            </button>
          </div>
        )}
        {transferMsg && <div className="mt-2 text-xs font-bold text-amber-300">{transferMsg}</div>}
      </div>
    </div>
  );
};
