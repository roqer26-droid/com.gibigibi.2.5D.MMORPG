export type QuestGroup = 'ready' | 'active' | 'claimed';

/** Görev durumu: ödülü alınmış > tamamlanmış (alınabilir) > devam eden. Durum mevcut kayıt işlevlerinden gelir. */
export function questGroup(claimed: boolean, value: number, target: number): QuestGroup {
  return claimed ? 'claimed' : value >= target ? 'ready' : 'active';
}

/** Görevleri sırayla grupla: hazır → devam eden → alınmış. Her grupta özgün (liste) sırası korunur. */
export function orderQuests<T>(items: T[], groupOf: (item: T) => QuestGroup): { group: QuestGroup; items: T[] }[] {
  const order: QuestGroup[] = ['ready', 'active', 'claimed'];
  return order.map((group) => ({ group, items: items.filter((i) => groupOf(i) === group) })).filter((g) => g.items.length > 0);
}
