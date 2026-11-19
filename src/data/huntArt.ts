import type { HuntId } from '../types/game';
import frozenThrone from '../art/arena-frozen-throne.webp?inline';
import ashArena from '../art/arena-ash.webp?inline';

/** Av arenası yatay görselleri (savaş sahnesinde karakterlerin arkasına yerleşir). */
export const ARENA_IMAGES: Record<HuntId, string> = {
  frozen_throne: frozenThrone,
  ash_arena: ashArena,
};
