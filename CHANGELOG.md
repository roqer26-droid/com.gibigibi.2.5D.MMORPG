# Sürüm Notları

Her güncellemede sürüm artırılır (`npm version minor --no-git-tag-version`), ardından
`npm run release` çalıştırılır: tek dosyalık oynanabilir derleme `releases/` altına
`legendary-gems-v<sürüm>.html` olarak yedeklenir. Eski sürümler silinmez.

## v1.3.0 — Zorluk dengesi ve menü düzeni
- **Zorluk:** Erken aşamalar artık 2-3 hamlede bitmiyor. Düşman canına, kahramanın seviyesine göre
  hedeflenen hamle sayısından hesaplanan bir taban eklendi (`src/data/difficulty.ts`):
  1. aşama ~7 hamle, bosslar ~16-30 hamle (beceri kullanmayan orta oyuncu için).
- Erken düşmanların saldırısı güçlendirildi; kahraman artık savaşta gerçekten can kaybediyor.
  Etki seviye yükseldikçe sönüyor, ileri aşamalar değişmedi.
- Taşlardan (doğa/altın) gelen kalkana üst sınır kondu (max canın %30'u). Önceden kalkan sınırsız
  birikiyor ve hiçbir düşman can götüremiyordu.
- Lig ve geç oyun aşamaları değişmedi.
- `npm run sim -- <sınıf> <aşama sayısı> <oyun sayısı>` ile denge ölçümü yapılabilir.
- **Arayüz:** Ana menü sadeleşti: 7 kompakt kutu (Dünya, Kahramanlar, Ekipman, Yetenekler,
  Görevler, Başarımlar, Rekabet Ligi). Aynı yere giden "Envanter" kutusu Ekipman'a katıldı.
- Görevler (ana/yan/günlük/haftalık) ve Başarımlar (başarımlar + lig görevleri) ayrı ekranlara bölündü.
- Mobilde menü kartı küçüldü, tanıtım metinleri gizlendi.

## v1.2.0 — Android (APK) hazırlığı
- Capacitor ile `android/` projesi eklendi (paket: `com.gibigibi.mmorpg`, dikey mod).
- Yazı tipleri pakete gömüldü; oyun artık internetsiz de aynı görünür.
- Android geri tuşu: savaşta duraklatır, ekranlarda menüye döner, menüde çıkar.
- Durum çubuğu gizlenir ve oyun rengine uyarlanır.
- `npm run android:sync` sürümü Android'e aktarır; GitHub Actions debug APK üretir.

## v1.1.0 — Mobil uyum
- Arayüz ölçeği telefon genişliğine/yüksekliğine göre küçüldü (360–430 px ve yatay mod).
- Kahraman kartları mobilde dikey düzene geçti; isimler artık kesilmiyor.
- Ana menüdeki kahraman görseli küçük ekranlarda küçüldü.
- Ana menüye sürüm numarası eklendi.

## v1.0.0 — Mimari, test ve kayıt sistemi
- Eşleşme mantığı Phaser'dan ayrıldı, envanter işlemleri saf fonksiyonlara taşındı.
- Vitest ile 38 test, kayıt sürümlendirme/yedekleme, kayıt dışa/içe aktarma.
- Phaser ve lig ekranı lazy yükleniyor, lig görselleri küçültüldü.
