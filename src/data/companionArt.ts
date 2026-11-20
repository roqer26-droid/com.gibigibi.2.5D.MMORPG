import type { CompanionId } from '../types/game';

const IMAGES = import.meta.glob('../art/companions/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

/** Şeffaf yoldaş görselleri (dosya adı = yoldaş kimliği). */
export const COMPANION_IMAGES = Object.fromEntries(
  Object.entries(IMAGES).map(([path, url]) => [path.split('/').pop()!.replace(/\.webp$/, ''), url])
) as Record<CompanionId, string>;
