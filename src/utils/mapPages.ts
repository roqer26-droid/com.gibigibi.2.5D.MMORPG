/** Dünya Haritası sayfalama: bölgeler sırasıyla 10'arlı sayfalara bölünür; sayfa sayısı bölge sayısından türetilir. */
export const MAP_PAGE_SIZE = 10;

export const pageCount = (regionCount: number, size = MAP_PAGE_SIZE): number => Math.max(1, Math.ceil(regionCount / size));

export const pageOf = (regionIndex: number, size = MAP_PAGE_SIZE): number => Math.floor(Math.max(0, regionIndex) / size);

/** Sayfanın bölge aralığı: [başlangıç, bitiş) (genel bölge sırası). */
export function pageRange(page: number, regionCount: number, size = MAP_PAGE_SIZE): [number, number] {
  const start = Math.min(Math.max(0, page) * size, Math.max(0, regionCount - 1));
  return [start, Math.min(regionCount, start + size)];
}
