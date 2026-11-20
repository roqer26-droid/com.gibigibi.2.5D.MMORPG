# Sürüm Notları

Her güncellemede sürüm artırılır (`npm version minor --no-git-tag-version`), ardından
`npm run release` çalıştırılır: tek dosyalık oynanabilir derleme `releases/` altına
`legendary-gems-v<sürüm>.html` olarak yedeklenir. Eski sürümler silinmez.

## v1.6.0 — 2×2 kare eşleşmesi
- Aynı türden dört taş 2×2 kare oluşturduğunda geçerli eşleşme sayılır. Dört taş patlar ve kendi türünün
  mevcut etkisini dört taş üzerinden uygular (hasar, mana, iyileştirme, kalkan vb.).
- Yatay, dikey ve kare eşleşmeleri aynı çözümleme akışında bulunur. Bir taş birden fazla eşleşmenin
  (çizgi + kare, örtüşen kareler) parçası olsa da yalnızca bir kez patlar ve bir kez kazanç sağlar.
- Kare oluşturan taş değişimi geçerli hamledir; eşleşme oluşturmayanlar eskisi gibi geri alınır.
- Düşen ve yeniden dolan taşlarda oluşan kareler de algılanır ve kombo zincirine katılır.
- Donmuş ve özel taşlar kare eşleşmelerinde mevcut kurallarıyla davranır.
- Kare patlamasında dört taş tür renginde kısa bir ışık çerçevesi ve "KARE!" yazısıyla vurgulanır.
- Hamle ipucu ve oynanabilir hamle kontrolü kareleri tanır. Başlangıç tahtası hazır çizgi ya da kare
  içermeyecek şekilde üretilir (yeni `createStartingBoard`).
- Ayarlardaki Taş Rehberi'ne kare eşleşmesi eklendi.

## v1.5.0 — Keşif Rotası (Dünya Haritası)
- **Dünya Haritası yeniden tasarlandı:** Mobilde dikey kaydırılan, kıvrımlı noktalı bir rota. 28 bölgenin
  tamamı aşağıdan yukarıya dizilir; simgeler sağa/sola dağılır, bölge adı simgenin yanında durur ve rota
  çizgisiyle çakışmaz (320–480 px genişliklerde testle doğrulandı).
- Tamamlanan bölgede onay işareti, seçili bölgede renkli halka, kilitli bölgede kilit simgesi (kayda göre).
  Tamamlanan bölgeden sonraki rota parçası altın renkte.
- Harita açılınca ilerleyebileceğin ilk tamamlanmamış bölgeye odaklanır.
- Alt panel (başparmakla erişilir): bölge adı, önerilen seviye aralığı, tamamlanan aşama sayısı ve
  "Aşamaları Gör". Kilitli bölgede açılma koşulu yazar ve düğme devre dışıdır. Panel son durağın üzerine binmez.
- "Aşamaları Gör" mevcut aşama ekranını açar. Aşama ekranından ya da savaştan haritaya dönünce seçili bölge,
  seçili aşama ve kaydırma konumu korunur. Ana menüden yeniden girince harita odağa döner.
- Bölge simgeleri: 24 şeffaf görsel (`src/art/regions/<bölge-kimliği>.webp`) + ilk dört bölge için aynı
  geometrik stilde SVG (ağaç, buzlu dağlar, yanardağ, mor kapı).
- **Boss Avları** artık Dünya Haritası'nda değil, ana menüde ayrı bir seçenek.
- Dünya Haritası ekranı ayrı paket olarak yüklenir (ilk açılış küçük kalır).
- Aşama ekranındaki bölge sekmeleri kaldırıldı (bölge seçimi artık haritadan).

## v1.4.0 — Boss Avları
- **Boss Avları:** Dünya Haritası'nda tek girişle açılan yeni mod. İlk sürümde Buz Kraliçesi (Donmuş Taht)
  ve Cehennem Ejderhası (Kül Arenası). Her av, ilgili boss hikâyede yenilince açılır; eski kayıtlardaki
  boss zaferleri (veya tamamlanmış boss aşaması) geçerlidir.
- Av listesi iki dikey kart gösterir; kilitli kartta açılma şartı yazar. Açık kart detay ekranına gider
  (boss çizimi, özel kural, ilk zafer ödülü, "Ava Başla").
- **Donmuş Taht:** Her turun ilk ateş eşleşmesi sahadaki bir donmuş taşı çözer. Zincirde tekrar etmez.
  İlk zafer: 800 altın + 10 kristal.
- **Kül Arenası:** Her turun ilk ateş eşleşmesi +5 ulti enerjisi verir. İlk zafer: 1.200 altın + 15 kristal.
- Av kaydı: boss başına en az turda kazanma rekoru, galibiyet sayısı ve ilk zafer ödülünün verildiği
  bilgisi (ödül ve bilgi tek güncellemede yazılır; ödül yalnızca bir kez verilir).
- Savaş sonucunda "Tekrar Dene" ve "Avlara Dön". Arena görselleri karakterlerin arkasında.
- Kayıt sürümü 5 (eski kayıtlar sorunsuz yüklenir).
- **Hata düzeltmesi:** Kendi faz kuralı olan bosslar (Orman Muhafızı, Buz Kraliçesi, Cehennem Ejderhası,
  Kristal Titan) eşiklerine gelmeden "genel faz"a düşüp zayıflığını değiştiriyordu; Buz Kraliçesi'nin
  %55'teki Buz Bariyeri hiç tetiklenmiyordu. Artık her boss yalnızca kendi fazını izler.
- Öfke fazına geçen düşmanın saldırı sayacı hemen güncel hıza iner (ekrandaki tur sayısı doğru).

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
