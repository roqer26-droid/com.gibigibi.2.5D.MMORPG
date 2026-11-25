import { MATERIAL_META, type AwakenMaterialId } from '../data/awakening';

/** Uyanış malzemesi simgesi (vektör; ek görsel dosyası gerektirmez). */
export function MaterialIcon({ id, size = 20 }: { id: AwakenMaterialId; size?: number }) {
  const c = MATERIAL_META[id].color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0" data-material={id}>
      <defs>
        <radialGradient id={`mg-${id}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="45%" stopColor={c} />
          <stop offset="100%" stopColor={c} stopOpacity="0.55" />
        </radialGradient>
      </defs>
      {id === 'awakenShard' && <path d="M12 2 L18 9 L14 22 L10 22 L6 9 Z" fill={`url(#mg-${id})`} stroke="#0f766e" strokeWidth="1" />}
      {id === 'soulCrystal' && <path d="M12 2 L20 8 L17 20 L7 20 L4 8 Z M12 2 L12 20 M4 8 L20 8" fill={`url(#mg-${id})`} stroke="#5b21b6" strokeWidth="1" />}
      {id === 'divineEssence' && (
        <>
          <circle cx="12" cy="12" r="7" fill={`url(#mg-${id})`} stroke="#b45309" strokeWidth="1" />
          <path d="M12 1 L13 8 L12 6 L11 8 Z M12 23 L11 16 L12 18 L13 16 Z M1 12 L8 11 L6 12 L8 13 Z M23 12 L16 13 L18 12 L16 11 Z" fill="#fde68a" />
        </>
      )}
    </svg>
  );
}
