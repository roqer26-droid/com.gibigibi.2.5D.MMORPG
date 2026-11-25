import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import type { BattleScene, TutorialSceneEvent } from '../phaser/BattleScene';
import { GEM_ART_URL, gemTextureKey } from '../data/gemArt';
import { GEM_TEXT, manaMove, type TutorialMove, type TutorialPlan, type TutorialStep } from '../game/tutorial';

interface Props {
  plan: TutorialPlan;
  sceneRef: React.MutableRefObject<BattleScene | null>;
  /** Phaser tuvalinin kapsayıcısı (açıklama kutusu sahne alanına, tahtanın üstüne yerleşir) */
  arenaRef: React.MutableRefObject<HTMLDivElement | null>;
  heroMana: number;
  heroUlti: number;
  heroMaxUlti: number;
  /** Savaş sonucu (zafer adımı / savaş bitince öğretici kapanır) */
  outcome: 'victory' | 'defeat' | null;
  /** Öğretici tamamlandı ya da atlandı (kayda bir kez yazılır) */
  onDone: () => void;
}

type Rect = { left: number; top: number; width: number; height: number };

/**
 * İlk 5 aşamanın etkileşimli öğreticisi. Adımlar savaş olaylarıyla kendiliğinden ilerler; rehberli hamlelerde sahne hazır
 * tahtayı yalnızca oyuncu sırası başlayınca kurar ve yalnızca işaretli takasa izin verir. Açıklama kutusu tahtayı ve yetenek
 * şeridini kapatmaz; vurgu çerçeveleri ve oklar dokunmayı engellemez.
 */
export function BattleTutorial({ plan, sceneRef, arenaRef, heroMana, heroUlti, heroMaxUlti, outcome, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  /** Bu adımda sahneye uygulanan rehberli hamle (tahta kuruldu) */
  const [armed, setArmed] = useState(false);
  const [manaTries, setManaTries] = useState(0);
  const [freeMoves, setFreeMoves] = useState(0);
  const [box, setBox] = useState<{ top: number; maxH: number; boardBottom: number } | null>(null);
  const [target, setTarget] = useState<Rect | null>(null);
  const doneSent = useRef(false);
  const step: TutorialStep | undefined = plan.steps[index];

  const finishDone = useCallback(() => {
    if (doneSent.current) return;
    doneSent.current = true;
    onDone();
  }, [onDone]);

  const next = useCallback(() => {
    setArmed(false);
    setFreeMoves(0);
    setIndex((i) => i + 1);
  }, []);

  // Tamamlanma noktası: sonrası isteğe bağlı (ulti ipucu / zafer açıklaması)
  useEffect(() => {
    if (index >= plan.doneAt) finishDone();
    if (index >= plan.steps.length) setHidden(true);
  }, [index, plan.doneAt, plan.steps.length, finishDone]);

  const skip = () => {
    const sc = sceneRef.current;
    if (sc) {
      sc.tutorialSetGuide(null);
      sc.tutorial.blockSkills = false;
    }
    finishDone();
    setHidden(true);
  };

  // Savaş bitti: zafer adımı dışında öğretici kapanır (rehber kaldırılır)
  useEffect(() => {
    if (!outcome) return;
    const sc = sceneRef.current;
    sc?.tutorialSetGuide(null);
    if (sc) sc.tutorial.blockSkills = false;
    if (outcome === 'victory') {
      const vi = plan.steps.findIndex((s) => s.kind === 'victory');
      if (vi >= 0 && index <= vi) {
        setIndex(vi);
        return;
      }
    }
    if (step?.kind !== 'victory') setHidden(true);
  }, [outcome]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Rehberli hamle: sahne hazır olunca tahtayı kur ---------------------------------
  const currentMove: TutorialMove | null =
    step?.kind === 'move' ? step.move : step?.kind === 'mana' && heroMana < step.cost && manaTries < 4 ? manaMove(manaTries) : null;

  useEffect(() => {
    if (hidden || outcome || !currentMove || armed) return;
    const id = window.setInterval(() => {
      const sc = sceneRef.current;
      if (!sc || !sc.tutorialReady()) return;
      const placed = sc.tutorialSetBoard(currentMove.board);
      // Yedek: tahta kurulamazsa tahtadaki geçerli bir hamle rehber olur (öğretici kilitlenmez)
      const guide = placed ? { cells: currentMove.cells, from: currentMove.from, to: currentMove.to } : sc.tutorialAnyMove();
      sc.tutorialSetGuide(guide);
      sc.tutorial.blockSkills = true;
      setArmed(true);
      window.clearInterval(id);
    }, 120);
    return () => window.clearInterval(id);
  }, [hidden, outcome, currentMove, armed, sceneRef]);

  // Mana adımı: yeterli mana varsa doğrudan geç; 4 denemeden sonra da devam (kilitlenmez)
  useEffect(() => {
    if (step?.kind !== 'mana' || hidden) return;
    if (heroMana >= step.cost || manaTries >= 4) {
      const sc = sceneRef.current;
      if (sc) sc.tutorial.blockSkills = false;
      next();
    }
  }, [step, heroMana, manaTries, hidden, next, sceneRef]);

  // Sahne olayları
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const handler = (e: TutorialSceneEvent) => {
      const sc = sceneRef.current;
      const st = stepRef.current;
      if (!sc) return;
      if (!st) return;
      if (e.type === 'swapResolved') {
        // Yetenek adımında yapılan serbest hamleler: biri yapılınca "Devam" görünür (yetenek kullanılamazsa kilitlenmez)
        if (st.kind === 'skill' && !e.guided) setFreeMoves((n) => n + 1);
        if (st.kind === 'move' && e.guided) {
          sc.tutorial.blockSkills = false;
          next();
        } else if (st.kind === 'mana' && e.guided) {
          sc.tutorial.blockSkills = false;
          setArmed(false);
          setManaTries((n) => n + 1);
        }
      } else if (e.type === 'enemyAction') {
        if (st.kind === 'wait' && st.until === 'enemyAction') next();
      } else if (e.type === 'skillCast') {
        if (st.kind === 'skill' && !e.ulti) next();
        else if (st.kind === 'ulti' && e.ulti) next();
      }
    };
    // Sahne bu bileşenden sonra oluşur: hazır olana (ve yeniden oluşturulana) kadar bağlantı tazelenir
    const attach = () => {
      const sc = sceneRef.current;
      if (sc && sc.tutorial.onEvent !== handler) sc.tutorial.onEvent = handler;
    };
    attach();
    const id = window.setInterval(attach, 200);
    return () => {
      window.clearInterval(id);
      const sc = sceneRef.current;
      if (sc && sc.tutorial.onEvent === handler) sc.tutorial.onEvent = undefined;
    };
  }, [sceneRef, next]);

  // --- Konumlar: kutu sahne alanında (tahtanın üstünde), hedef çerçevesi --------------------
  const ulReady = heroUlti >= heroMaxUlti;
  const showBox = !hidden && !!step && (step.kind !== 'ulti' || ulReady) && (step.kind !== 'victory' || outcome === 'victory');
  const targetSel = step && 'target' in step ? step.target : undefined;

  useLayoutEffect(() => {
    if (!showBox) {
      setTarget(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      const arena = arenaRef.current;
      const sc = sceneRef.current;
      if (arena && sc) {
        const a = arena.getBoundingClientRect();
        const lay = sc.tutorialLayout();
        if (lay) {
          const k = lay.height > 0 ? a.height / lay.height : 1;
          const boardTop = a.top + (lay.boardY - 10) * k;
          const boardBottom = a.top + (lay.boardY + lay.boardSize + 8) * k;
          // Hedef üst göstergedeyse kutu biraz aşağıda başlar: ok aradaki boşlukta durur
          const tEl = targetSel ? (document.querySelector(targetSel) as HTMLElement | null) : null;
          const tAbove = !!tEl && tEl.getBoundingClientRect().bottom <= a.top + 2;
          const top = a.top + (tAbove ? 16 : 4);
          setBox((b) => {
            const nb = { top, maxH: Math.max(96, boardTop - top - 4), boardBottom };
            return b && Math.abs(b.top - nb.top) < 0.5 && Math.abs(b.maxH - nb.maxH) < 0.5 && Math.abs(b.boardBottom - nb.boardBottom) < 0.5 ? b : nb;
          });
        }
      }
      if (targetSel) {
        const el = document.querySelector(targetSel) as HTMLElement | null;
        const r = el?.getBoundingClientRect();
        setTarget((t) => {
          if (!r || r.width === 0) return null;
          const nt = { left: r.left, top: r.top, width: r.width, height: r.height };
          return t && Math.abs(t.left - nt.left) < 0.5 && Math.abs(t.top - nt.top) < 0.5 && Math.abs(t.width - nt.width) < 0.5 ? t : nt;
        });
      } else setTarget(null);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showBox, targetSel, arenaRef, sceneRef]);

  if (!showBox || !step) return null;

  const isVictory = step.kind === 'victory';
  const needsContinue = step.kind === 'info' || isVictory || (step.kind === 'skill' && freeMoves >= 1);
  const last = index >= plan.steps.length - 1;
  const title = ('title' in step && step.title) || plan.title;
  const total = plan.steps.filter((s) => s.kind !== 'ulti' && s.kind !== 'victory').length;
  const progress = Math.min(index + 1, total);

  // Ok konumu: hiçbir zaman tahtanın ya da yetenek düğmelerinin üstüne binmez.
  // - Kutunun üstündeki öğeler (üst gösterge): kutunun üst kenarından hedefe bakan küçük ok
  // - Tahtanın altındaki öğeler (yetenekler / ulti): tahta ile şerit arasındaki boşluğa sığacak boyutta, aşağı bakan ok
  // - Diğerleri (zafer ekranı): hedefin üstünde
  let arrow: { left: number; top: number; size: number; up: boolean } | null = null;
  if (target) {
    const cx = target.left + target.width / 2;
    const boxTop = isVictory ? 8 : (box?.top ?? 60);
    if (!isVictory && target.top + target.height <= boxTop + 2) {
      arrow = { left: cx, top: boxTop - 14, size: 12, up: true };
    } else if (!isVictory && box && target.top >= box.boardBottom) {
      const gap = target.top - box.boardBottom;
      const size = Math.max(8, Math.min(20, gap - 3));
      arrow = gap >= 10 ? { left: cx, top: target.top - size - 1.5, size, up: false } : null;
    } else {
      arrow = { left: cx, top: target.top - 26, size: 20, up: false };
    }
  }

  return (
    <>
      {target && (
        <>
          <div
            className="pointer-events-none fixed z-[75] rounded-xl border-2 border-amber-300 shadow-[0_0_0_3px_rgba(245,158,11,0.35),0_0_18px_rgba(251,191,36,0.55)] animate-pulse"
            style={{ left: target.left - 4, top: target.top - 4, width: target.width + 8, height: target.height + 8 }}
            data-testid="tutorial-highlight"
            aria-hidden="true"
          />
          {arrow && (
            <div
              className="tut-arrow pointer-events-none fixed z-[75] flex items-center justify-center leading-none text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.85)]"
              style={{ left: arrow.left - arrow.size / 2, top: arrow.top, width: arrow.size, height: arrow.size, fontSize: arrow.size }}
              data-testid="tutorial-arrow"
              aria-hidden="true"
            >
              {arrow.up ? '▲' : '▼'}
            </div>
          )}
        </>
      )}
      <div
        role="dialog"
        aria-label={`Öğretici: ${title}`}
        data-testid="tutorial-box"
        data-step={index}
        data-kind={step.kind}
        className={`${isVictory ? 'fixed inset-x-2 top-2 z-[80]' : 'fixed z-[70]'} flex flex-col overflow-hidden rounded-2xl border border-amber-400/60 bg-[#0b1020]/[0.88] px-3 py-2 text-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.55)] backdrop-blur-sm`}
        style={
          isVictory
            ? { maxHeight: '38vh' }
            : box
              ? { top: box.top, maxHeight: box.maxH, left: (arenaRef.current?.getBoundingClientRect().left ?? 0) + 6, width: Math.min(460, (arenaRef.current?.getBoundingClientRect().width ?? 360) - 12) }
              : { top: 60, left: 6, right: 6 }
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[12px] font-extrabold text-amber-300">
            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{title}</span>
            {!isVictory && step.kind !== 'ulti' && <span className="shrink-0 text-[10px] font-bold text-slate-400">{progress}/{total}</span>}
          </span>
          <button type="button" onClick={skip} data-testid="tutorial-skip" className="shrink-0 rounded-lg border border-slate-600 px-2 py-0.5 text-[11px] font-bold text-slate-300 hover:border-amber-400/60 hover:text-white">
            Atla
          </button>
        </div>
        <div className="mt-1 min-h-0 overflow-y-auto">
          <p className="text-[12.5px] leading-snug text-slate-100" data-testid="tutorial-text">{step.text}</p>
          {step.kind === 'info' && step.gems && (
            <ul className="mt-1 space-y-0.5" data-testid="tutorial-gems">
              {step.gems.map((g) => (
                <li key={g} className="flex items-center gap-1.5 text-[11.5px] leading-tight">
                  <img src={GEM_ART_URL[gemTextureKey(g)]} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0" />
                  <span className="font-extrabold text-amber-100">{GEM_TEXT[g].name}:</span>
                  <span className="min-w-0 text-slate-300">{GEM_TEXT[g].effect}</span>
                </li>
              ))}
            </ul>
          )}
          {step.kind === 'wait' && <p className="mt-0.5 text-[11px] font-semibold text-amber-200/80">Serbest hamle</p>}
        </div>
        {needsContinue && (
          <div className="mt-1.5 flex justify-end">
            <button
              type="button"
              data-testid="tutorial-next"
              onClick={() => {
                if (isVictory || last) {
                  finishDone();
                  setHidden(true);
                } else next();
              }}
              className="gold-btn rounded-lg px-3 py-1 text-[12px] font-extrabold text-slate-950"
            >
              {isVictory || last ? 'Tamam' : 'Devam'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
