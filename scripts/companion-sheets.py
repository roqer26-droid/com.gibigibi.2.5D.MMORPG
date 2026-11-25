"""
Yoldaş animasyon sheet'lerini oyuna hazırlar (Pillow + numpy + scipy).

Kaynak: 4 sütun × 3 satır, hücre 362×362 (1. satır bekleme/nefes, 2. satır saldırı/özel yetenek, 3. satır savunma).
1) Her hücrede (alfa > 12) bağlı bileşenler bulunur. Bir hücrenin SOL kenarına değen ve hücrenin ana çizimi olmayan parça,
   aynı satırdaki önceki karenin sağ kenarından taşan efekttir (ör. yaprak / ateş püskürtmesi): önceki kareye geri taşınır.
2) Taşan parçaya yer açmak için her kare sağdan aynı miktarda şeffaf boşlukla genişletilir (karakterin hücre içindeki
   konumu değişmez; kareler yeniden ortalanmaz, böylece animasyonda boyut/konum kayması olmaz).
3) Sheet SCALE oranında küçültülüp şeffaf WebP olarak `src/art/companions-anim/<id>.webp` yazılır; kare ölçüleri ve
   ayak noktası `companion-anim-manifest.json` dosyasına eklenir.

Kullanım: python3 scripts/companion-sheets.py <kaynak_klasör (içinde <id>.png)> [id ...]
Yeni yoldaş: aynı düzende bir sheet ver ve bu betiği o kimlikle çalıştır; oyun manifestteki kaydı otomatik kullanır.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

CELL = 362
COLS, ROWS = 4, 3
SCALE = 0.5
ALPHA_MIN = 12
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'art', 'companions-anim')
MANIFEST = os.path.join(OUT, 'companion-anim-manifest.json')


def process(src_dir: str, cid: str) -> dict:
    img = np.array(Image.open(os.path.join(src_dir, f'{cid}.png')).convert('RGBA'))
    h, w = img.shape[:2]
    if (w, h) != (CELL * COLS, CELL * ROWS):
        raise SystemExit(f'{cid}: beklenen {CELL * COLS}×{CELL * ROWS}, gelen {w}×{h}')
    cells = [[img[r * CELL:(r + 1) * CELL, c * CELL:(c + 1) * CELL].copy() for c in range(COLS)] for r in range(ROWS)]
    moved = []  # (satır, kaynak sütun, genişlik)
    extra = {}  # (r, c) -> taşınan parça (CELL yüksekliğinde, genişlik değişken)
    for r in range(ROWS):
        for c in range(1, COLS):
            cell = cells[r][c]
            mask = cell[:, :, 3] > ALPHA_MIN
            lab, k = ndimage.label(mask, structure=np.ones((3, 3)))
            if k < 2:
                continue
            sizes = ndimage.sum(mask, lab, range(1, k + 1))
            main = int(np.argmax(sizes)) + 1
            prev_right = cells[r][c - 1][:, -1, 3] > ALPHA_MIN
            for i in range(1, k + 1):
                if i == main:
                    continue
                ys, xs = np.where(lab == i)
                # sol kenara değiyor ve önceki karenin sağ kenarında aynı yükseklikte çizim var → taşan efekt
                if xs.min() == 0 and prev_right[ys.min():ys.max() + 1].any():
                    wpx = int(xs.max()) + 1
                    piece = np.zeros((CELL, wpx, 4), dtype=np.uint8)
                    sel = lab[:, :wpx] == i
                    piece[sel] = cell[:, :wpx][sel]
                    cell[:, :wpx][sel] = 0
                    prev = extra.get((r, c - 1))
                    extra[(r, c - 1)] = piece if prev is None else np.maximum(prev[:, :max(prev.shape[1], wpx)], np.pad(piece, ((0, 0), (0, max(0, prev.shape[1] - wpx)), (0, 0))))
                    moved.append({'row': r, 'fromCol': c, 'toCol': c - 1, 'width': wpx})
    pad = max([p.shape[1] for p in extra.values()], default=0)
    pad = (pad + 3) // 4 * 4  # ölçeklemede tam piksel
    fw = CELL + pad
    sheet = np.zeros((CELL * ROWS, fw * COLS, 4), dtype=np.uint8)
    for r in range(ROWS):
        for c in range(COLS):
            sheet[r * CELL:(r + 1) * CELL, c * fw:c * fw + CELL] = cells[r][c]
            piece = extra.get((r, c))
            if piece is not None:
                sheet[r * CELL:(r + 1) * CELL, c * fw + CELL:c * fw + CELL + piece.shape[1]] = piece
    # ayak noktası: bekleme karelerindeki çizimin en alt satırı (hücrenin yatay ortası)
    foot = max(int(np.where((cells[0][c][:, :, 3] > ALPHA_MIN).any(axis=1))[0].max()) for c in range(COLS)) + 1
    out_w, out_h = round(fw * COLS * SCALE), round(CELL * ROWS * SCALE)
    im = Image.fromarray(sheet, 'RGBA').resize((out_w, out_h), Image.LANCZOS)
    im.save(os.path.join(OUT, f'{cid}.webp'), 'WEBP', quality=90, method=6)
    return {
        'columns': COLS,
        'rows': ROWS,
        'frameWidth': out_w // COLS,
        'frameHeight': out_h // ROWS,
        # karakterin asıl hücresi (taşma boşluğu hariç) ve ayak noktası, küçültülmüş kare pikselinde
        'cellSize': round(CELL * SCALE),
        'originX': round(CELL / 2 * SCALE),
        'originY': round(foot * SCALE),
        'padRight': round(pad * SCALE),
        'movedOverflow': moved,
    }


def main():
    src = sys.argv[1]
    ids = sys.argv[2:] or [f[:-4] for f in sorted(os.listdir(src)) if f.endswith('.png')]
    data = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    data.setdefault('source', {'cell': CELL, 'columns': COLS, 'rows': ROWS, 'scale': SCALE})
    data.setdefault('companions', {})
    for cid in ids:
        data['companions'][cid] = process(src, cid)
        print(cid, data['companions'][cid])
    json.dump(data, open(MANIFEST, 'w'), ensure_ascii=False, indent=2)
    open(MANIFEST, 'a').write('\n')


if __name__ == '__main__':
    main()
