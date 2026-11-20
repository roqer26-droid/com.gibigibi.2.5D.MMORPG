import { Check, ChevronLeft, ChevronRight, ChevronsUp, Lock } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { GameSaveState } from '../types/game';
import { pageCount, pageOf, pageRange } from '../utils/mapPages';
import { ICON_R, ICON_SIZE, computeRouteLayout, nodeBox } from '../utils/routeLayout';
import {
  formatLevelRange,
  getRegionStatuses,
  overallProgress,
  unlockHint,
  type RegionStatus,
} from '../utils/worldProgress';
import { RegionIcon } from './RegionIcon';

interface ExplorationMapProps {
  save: GameSaveState;
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Daha önce kaydedilen kaydırma konumu; yoksa harita odak bölgesine açılır */
  initialScrollTop: number | null;
  onScrollChange: (top: number) => void;
  onOpenStages: (index: number) => void;
}

const DEFAULT_PANEL_H = 214;

/** Sabit tohumla üretilen, yalnızca süs olan soluk arazi şekilleri. */
function useTerrain(width: number, height: number) {
  return useMemo(() => {
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const kinds = ['water', 'land', 'ridge'] as const;
    const out: { kind: (typeof kinds)[number]; pts: string; opacity: number }[] = [];
    const count = Math.round(height / 230);
    for (let i = 0; i < count; i++) {
      const cx = rnd() * width;
      const cy = (i + 0.5) * (height / count) + (rnd() - 0.5) * 80;
      const r = 50 + rnd() * 70;
      const pts = Array.from({ length: 7 }, (_, k) => {
        const a = (k / 7) * Math.PI * 2 + rnd() * 0.5;
        const rr = r * (0.55 + rnd() * 0.6);
        return `${(cx + Math.cos(a) * rr * 1.3).toFixed(1)},${(cy + Math.sin(a) * rr * 0.8).toFixed(1)}`;
      }).join(' ');
      out.push({ kind: kinds[i % 3], pts, opacity: 0.1 + rnd() * 0.08 });
    }
    return out;
  }, [width, height]);
}

const TERRAIN_FILL = { water: '#2f6db5', land: '#2f8f5a', ridge: '#8a6a4a' } as const;

export function ExplorationMap({
  save,
  selectedIndex,
  onSelect,
  initialScrollTop,
  onScrollChange,
  onOpenStages,
}: ExplorationMapProps) {
  const statuses = useMemo(() => getRegionStatuses(save), [save]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [panelH, setPanelH] = useState(DEFAULT_PANEL_H);

  // Sayfalama: yalnızca aktif sayfanın (≤10) düğümü, simgesi ve rota çizgisi oluşturulur. Sayfa, seçili bölgeden türetilir.
  const pages = pageCount(statuses.length);
  const page = pageOf(selectedIndex);
  const [start, end] = pageRange(page, statuses.length);
  const pageStatuses = useMemo(() => statuses.slice(start, end), [statuses, start, end]);
  const progress = useMemo(() => overallProgress(statuses), [statuses]);
  const layout = useMemo(() => computeRouteLayout(pageStatuses.length, width || 360), [pageStatuses.length, width]);
  const terrain = useTerrain(layout.width, layout.height);

  // Ekran genişliği ve alt panel yüksekliğini izle
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const panel = panelRef.current;
    if (!scroller || !panel) return;
    const measure = () => {
      setWidth(scroller.clientWidth);
      setPanelH(panel.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scroller);
    ro.observe(panel);
    return () => ro.disconnect();
  }, []);

  // Kaydırma: ilk açılışta kayıtlı konum, sayfa değişince hedef bölge (yoksa seçili bölge)
  const lastPage = useRef<number | null>(null);
  const pendingFocus = useRef<number | null>(null);
  const scrollToRegion = useCallback(
    (regionIndex: number, smooth: boolean) => {
      const scroller = scrollerRef.current;
      const node = layout.nodes[regionIndex - start];
      if (!scroller || !node) return;
      const visibleH = scroller.clientHeight - panelH;
      scroller.scrollTo({ top: Math.max(0, node.y - visibleH * 0.45), behavior: smooth ? 'smooth' : 'auto' });
    },
    [layout, start, panelH]
  );
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !width) return;
    const first = lastPage.current === null;
    if (first && initialScrollTop !== null) {
      scroller.scrollTop = initialScrollTop;
      lastPage.current = page;
      return;
    }
    if (!first && lastPage.current === page && pendingFocus.current === null) return;
    lastPage.current = page;
    const target = pendingFocus.current ?? selectedIndex;
    pendingFocus.current = null;
    scrollToRegion(target, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, width, panelH]);

  const rafRef = useRef(0);
  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (scrollerRef.current) onScrollChange(scrollerRef.current.scrollTop);
    });
  }, [onScrollChange]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const selected = statuses[selectedIndex];

  /** Erişilebilir son bölge: açık olan en ileri bölge. Hızlı odak düğmesi buraya götürür. */
  const latestIndex = useMemo(() => statuses.reduce((acc, st) => (st.unlocked ? st.index : acc), 0), [statuses]);
  /** Başka sayfadaki bölgeye: sayfa değişir ve hedefe anında odaklanır; aynı sayfada yumuşak kayar. */
  const goTo = useCallback(
    (index: number) => {
      if (pageOf(index) === page) {
        onSelect(index);
        scrollToRegion(index, true);
      } else {
        pendingFocus.current = index;
        onSelect(index);
      }
    },
    [page, onSelect, scrollToRegion]
  );
  const focusLatest = useCallback(() => goTo(latestIndex), [goTo, latestIndex]);
  const goPrev = () => page > 0 && goTo(pageRange(page - 1, statuses.length)[1] - 1);
  const goNext = () => page < pages - 1 && goTo(pageRange(page + 1, statuses.length)[0]);

  return (
    <div className="relative min-h-0 flex-1 bg-[#070b17]">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        data-testid="route-scroller"
      >
        <div className="relative" style={{ height: layout.height + panelH + 16, width: '100%' }}>
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            aria-hidden="true"
          >
            {terrain.map((t, i) => (
              <polygon key={i} points={t.pts} fill={TERRAIN_FILL[t.kind]} opacity={t.opacity} />
            ))}
            {layout.segments.map((d, i) => {
              const done = pageStatuses[i].cleared;
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={done ? '#fbbf24' : '#4b6491'}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray="1 11"
                  opacity={done ? 0.95 : 0.7}
                />
              );
            })}
          </svg>

          {pageStatuses.map((st) => (
            <RouteNode
              key={st.region.id}
              status={st}
              layoutNode={layout.nodes[st.index - start]}
              selected={st.index === selectedIndex}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 z-10 border-t border-slate-700/60 bg-[#080d1c]/95 px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))' }}
        data-testid="region-panel"
      >
        <RegionPanel
          status={selected}
          statuses={statuses}
          onOpenStages={onOpenStages}
          latestName={statuses[latestIndex].region.name}
          onJumpLatest={focusLatest}
          page={page}
          pages={pages}
          onPrev={goPrev}
          onNext={goNext}
          progress={progress}
        />
      </div>
    </div>
  );
}

function RouteNode({
  status,
  layoutNode,
  selected,
  onSelect,
}: {
  status: RegionStatus;
  layoutNode: ReturnType<typeof computeRouteLayout>['nodes'][number];
  selected: boolean;
  onSelect: (i: number) => void;
}) {
  const { region, unlocked, cleared, index } = status;
  const box = nodeBox(layoutNode);
  const accent = region.accentColor;
  const stateText = cleared ? 'tamamlandı' : unlocked ? 'açık' : 'kilitli';

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      aria-pressed={selected}
      aria-label={`${region.name}, ${stateText}${selected ? ', seçili' : ''}`}
      data-region={region.id}
      data-state={cleared ? 'cleared' : unlocked ? 'open' : 'locked'}
      className={`absolute flex items-center gap-2 text-left ${layoutNode.labelSide === 'left' ? 'flex-row-reverse text-right' : ''}`}
      style={{ left: box.left, top: box.top, width: box.right - box.left, height: box.bottom - box.top }}
    >
      <span className="relative shrink-0" style={{ width: ICON_SIZE, height: ICON_SIZE }}>
        {selected && (
          <span
            className="absolute left-1/2 -translate-x-1/2 rounded-[50%]"
            style={{
              bottom: 4,
              width: ICON_SIZE + 26,
              height: 30,
              border: `3px solid ${accent}`,
              boxShadow: `0 0 14px ${accent}99, inset 0 0 10px ${accent}55`,
            }}
            data-testid="selection-ring"
          />
        )}
        <RegionIcon id={region.id} size={ICON_SIZE} dimmed={!unlocked} glow={unlocked ? accent : undefined} />
        {cleared && (
          <span
            className="absolute flex items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-950 text-emerald-300"
            style={{ right: -2, bottom: 2, width: 28, height: 28 }}
            data-testid="cleared-badge"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        )}
        {!unlocked && (
          <span
            className="absolute flex items-center justify-center rounded-full border border-slate-500 bg-slate-900/90 text-slate-200"
            style={{ left: ICON_R - 15, top: ICON_R - 12, width: 30, height: 30 }}
            data-testid="lock-badge"
          >
            <Lock className="h-4 w-4" />
          </span>
        )}
      </span>
      <span
        className={`min-w-0 flex-1 font-display text-[15px] font-bold leading-tight ${
          unlocked ? 'text-[#fff3d0]' : 'text-slate-500'
        }`}
        style={{ overflowWrap: 'anywhere' }}
      >
        {region.name}
      </span>
    </button>
  );
}

function RegionPanel({
  status,
  statuses,
  onOpenStages,
  latestName,
  onJumpLatest,
  page,
  pages,
  onPrev,
  onNext,
  progress,
}: {
  status: RegionStatus;
  statuses: RegionStatus[];
  onOpenStages: (i: number) => void;
  latestName: string;
  onJumpLatest: () => void;
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
  progress: { done: number; total: number };
}) {
  const { region, unlocked, done, total, index } = status;
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-2 flex items-center gap-2" data-testid="map-pager">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 0}
          data-testid="page-prev"
          className="flex h-11 min-w-[96px] items-center justify-center gap-1 rounded-xl border border-slate-600 bg-slate-900 px-3 text-[15px] font-bold text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Önceki
        </button>
        <div className="min-w-0 flex-1 text-center leading-tight">
          <div className="text-[16px] font-bold text-amber-300" data-testid="page-indicator">
            {page + 1} / {pages}
          </div>
          <div className="text-[11px] font-semibold text-slate-400" data-testid="overall-progress">
            Genel ilerleme {progress.done}/{progress.total}
          </div>
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= pages - 1}
          data-testid="page-next"
          className="flex h-11 min-w-[96px] items-center justify-center gap-1 rounded-xl border border-slate-600 bg-slate-900 px-3 text-[15px] font-bold text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sonraki <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <RegionIcon id={region.id} size={64} dimmed={!unlocked} className="shrink-0" />
        <span className="h-14 w-px shrink-0 bg-slate-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[22px] font-bold leading-tight text-[#fff3d0]" data-testid="panel-name">
            {region.name}
          </h2>
          {unlocked ? (
            <p className="mt-0.5 text-[15px] font-semibold text-slate-400" data-testid="panel-sub">
              {formatLevelRange(region.levelRange)} · {done}/{total} aşama
            </p>
          ) : (
            <p className="mt-0.5 text-[14px] font-semibold leading-snug text-amber-300/90" data-testid="panel-sub">
              <span className="text-slate-300">{formatLevelRange(region.levelRange)} · Kilitli. </span>
              {unlockHint(statuses, index)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onJumpLatest}
          data-testid="jump-latest"
          aria-label={`Son açık bölgeye git: ${latestName}`}
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-amber-400/50 bg-slate-900 text-amber-300 active:scale-95"
        >
          <ChevronsUp className="h-5 w-5" />
          <span className="text-[11px] font-bold leading-none">Son</span>
        </button>
      </div>
      <button
        type="button"
        disabled={!unlocked}
        onClick={() => onOpenStages(index)}
        className="gold-btn mt-2 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl font-display text-[18px] font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {unlocked ? (
          'Aşamaları Gör'
        ) : (
          <>
            <Lock className="h-5 w-5" /> Kilitli
          </>
        )}
      </button>
    </div>
  );
}
