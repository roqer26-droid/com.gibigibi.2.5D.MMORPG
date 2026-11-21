# Sürüm Notları

Her güncellemede sürüm artırılır (`npm version minor --no-git-tag-version`), ardından
`npm run release` çalıştırılır: tek dosyalık oynanabilir derleme `releases/` altına
`legendary-gems-v<sürüm>.html` olarak yedeklenir. Eski sürümler silinmez.

## v1.14.1 — Yoldaşlar ana menüde
- Yoldaşlar, Kahramanlar ekranından çıkarılıp ana menüde ayrı bir seçenek ve ekran oldu (yeni kahramanlar eklense de yoldaşlar ayrı yerde durur).
  Menü kutusu "x/3 yoldaş açık" gösterir; açılabilir yoldaş varsa rozet çıkar.

## v1.14.0 — Yoldaşlar
- Kök Filizi, Buz Tilkisi ve Köz Ejderciği (`src/data/companions.ts`, tüm sayılar ayarlanabilir). Açmak için parça + doğru modda boss zaferi gerekir:
  Kök Filizi 24 Kök Parçası + Seçimli Zindanlar · Köklerin Mahzeni (Kadim Orman Muhafızı); Buz Tilkisi 32 Buz Parçası + Boss Avları · Donmuş Taht
  (Buz Kraliçesi); Köz Ejderciği 40 Köz Parçası + Boss Avları · Kül Arenası (Cehennem Ejderhası). Hikâyedeki boss zaferi av/zindan şartını karşılamaz.
- Parça kazanma: ilgili bölgenin her elit zaferi 2 parça (tekrarlar dahil); ikinci/üçüncü ustalık sandığı 4/6 parça. Eski kayıtta zaten alınmış
  sandıkların payı yüklemede bir kez tanınır. Aynı savaş sonucu ikinci kez işlenmez; zafer ekranında kazanılan parça görünür. Kayıt sürümü 10.
- Kahramanlar ekranında "Yoldaşlar": görsel, etki, "14/24 parça", boss şartı (mod ve arena adıyla), "Yoldaşı Aç" ve kahraman başına tek aktif yoldaş.
- Savaş: Kök Filizi (%40 altında ilk doğa eşleşmesi +%10 can, eşik iyileştirmeden önce kontrol edilir), Buz Tilkisi (ağır saldırı hazırlanırken ilk buz
  eşleşmesi, saldırı gerçekleşince hasarın %35'i karşılanır), Köz Ejderciği (ilk 2×2 kare: 2 tur yanma, tur başı saldırının %15'i). Savaş başına tek destek;
  zindanda her karşılaşmada yenilenir. Savaş ekranında küçük yoldaş görseli ve Hazır / Saldırıyı Bekliyor / Kullanıldı durumu.

## v1.13.2 — İtemleri Sat
- Envanterdeki "Sıradanları Parçala" düğmesi "İtemleri Sat" oldu ve tam ekran satış ekranı açar: nadirlik renk düğmeleri (adet / "3/8 seçili"),
  tek tek seçim, set simgeli satırlar, sabit alt çubuk (seçili item, toplam altın, "Seçilenleri Sat") ve satış öncesi onay
  ("12 item satılacak · +1.840 altın"). Satış her itemin mevcut `sellValue` fiyatıyla, itemler ve altın tek kayıt güncellemesinde işlenir;
  hızlı çift dokunuş ikinci satış yapmaz. Kuşanılmış (ve varsa kilitli) itemler satılamaz. (`sellItems`, `isSellable`)

## v1.13.1 — Görevler sıralaması
- Görevler/Başarımlar sekmelerinde görevler ödülü hazır → devam eden → ödülü alınmış sırasıyla gruplanır (grup içi sıra korunur).
  Ödül alınınca görev anında "Ödülü alınmış" grubuna iner, tamamlanan görev listenin başına çıkar. "Ödülü Al" düğmesi büyük ve belirgin.

## v1.13.0 — Üç Yıldızlı Aşama Ustalığı
- 53 bölge / 500 hikâye aşamasında üç yıldız: ★1 aşama zaferi, ★2 ve ★3 iki ayrı savaş hedefi. Hedefler farklı zaferlerde tamamlanabilir,
  yenilgide yıldız verilmez, kazanılmış yıldız tekrar verilmez. Hedef durumu aşama kimliğiyle kaydedilir (kayıt sürümü 9).
  Eski kayıtlarda tamamlanmış aşamalar zafer yıldızını taşır; diğer iki hedef tekrar oynayarak alınır.
- Hedefler bölgenin taş temasına ve düşman davranışına göre (`src/data/mastery.ts`): 2×2 kare, ayrı turlarda taş eşleştirme, tek turda taş
  patlatma, tek hamlede zincir, ağır saldırıyı engelleme (iptal/sıyrılma ya da kalkanın hasarı tamamen karşılaması; geciktirme sayılmaz),
  donmuş taş temizleme (yalnızca Buz Kraliçesi aşamasında). Ağır saldırı hedefleri boss aşamalarında; diğerlerinde taş/kombo hedefi.
  Sayaçlar gerçek savaş olaylarından beslenir (`src/game/masteryTracker.ts`).
- Bölge sandıkları: bölgedeki toplam yıldızın %50 / %75 / %100'ünde (10 savaşlık bölgede 15/23/30). Bölge başına bir kez; ödül (altın, kristal,
  ekipman) bölge bossunun ödül eğrisine bağlıdır ve "alındı" bilgisiyle aynı kayıt güncellemesinde yazılır.
- Arayüz: aşama düğümünde yıldızlar, aşama detayında iki hedef, bölge detayında yıldız toplamı ve üç sandık; savaşta küçük "Ustalık" düğmesi
  (tahtayı daraltmayan açılır panel); zafer ekranında yeni yıldızlar ve sıradaki sandığa kalan yıldız.

## v1.12.0 — Dünya Haritası sayfaları
- Bölgeler sırayla 10'arlı sayfalara bölünür (şu an 1–10 … 51–53, 6 sayfa; sayfa sayısı bölge sayısından türetilir).
  Alt panelde "Önceki", "1 / 6", "Sonraki" ve "Genel ilerleme x/500" (tüm haritadan hesaplanır).
- Yalnızca aktif sayfanın (≤10) düğüm, simge ve rota çizgisi oluşturulur; diğer sayfaların simgeleri sayfa açılınca istenir
  (yüklenenler tarayıcı önbelleğinden gelir). Simge boyutları baştan ayrılır, rota kaymaz.
- Harita erişilebilir son bölgenin sayfasında açılır; "Son" düğmesi gerekirse sayfa değiştirip oraya götürür.
  Bölge detayından/savaştan dönünce sayfa, seçili bölge ve kaydırma konumu korunur.

## v1.11.0 — Sonsuzluğun Ötesi: 25 yeni bölge, 250 yeni aşama
- Sonsuzluk Tahtı'ndan sonra 25 bölge / 250 aşama (toplam 53 bölge / 500 aşama). Bölge, aşama ve boss kimlikleri ile düşman türleri,
  boss zayıflık/dirençleri `src/data/expansionRegions.json` dosyasından gelir (Cam Ormanı → Şafağın Çekirdeği).
- Her bölge mevcut kalıbı izler: 5 normal, 2 hazine, 3 elit, 1 boss (hazine/elit/boss garanti ganimetli). Mevcut sıra ve kilit kuralı geçerli;
  Sonsuzluk İmparatoru'nu yenmiş kayıtlar Cam Ormanı'na doğrudan girer. Eski kayıtlar kimlikleriyle yüklenir; ilerleme x/500.
- Güç eğrisi Sonsuzluk Tahtı (Sv. 93) değerlerinden aynı eğimle devam eder (Sv. 93–168); ödüller Sv. 78 tavanından %1/seviye artar.
  Köklerin Mahzeni'nin seviye ölçeklemesi kendi modunda kalır.
- Keşif Rotası 53 bölgeye uzadı (aynı simge boyutu, kilit/tamamlandı işaretleri, panel). Panelde "Son" düğmesi erişilebilir son bölgeye odaklanır.

## v1.10.1 — Köklerin Mahzeni: zorluk ve seviye ölçeklemesi
- Temel zorluk (seviye 6, v1.10.0 değerlerinin üstüne): Goblin Yağmacısı can +%10 / saldırı +%5, Elit Dikenli Ağaç +%15 / +%7,
  Kadim Orman Muhafızı +%20 / +%10. Değerler `src/data/dungeons.ts` içinde savaş başına ayrı (`baseHpBonusPct`, `baseAttackBonusPct`).
- Seviye ölçeklemesi: değer = temel × clamp((seviye/6)^üs, min, max); can üssü 0,75, saldırı üssü 0,5 (sınırlar 0,45–2,6 ve 0,6–1,8).
  Yalnızca kahramanın seviyesine bağlıdır; ekipman, set bonusu ve geçici güçler düşmanı değiştirmez.
- Yeni denemede kahraman, seviye ve üç düşmanın can/saldırı değerleri bir kez hesaplanıp denemeye yazılır; savaş ortasında çıkıp dönünce
  ya da oyun yeniden açılınca bunlar kullanılır. Deneme başka kahramanla sürdürülemez (zindan ekranı uyarır). Güncelleme öncesi başlamış
  denemeler v1.10.0 değerleriyle tamamlanır. Kayıt sürümü 8.
- Zindan ekranında sıradaki düşmanın can/saldırısı ve ölçeklendiği seviye görünür.
- Denge aracı artık yetenek, Ulti ve zindan güçlerinin savaş içi etkilerini içerir: `npm run sim:dungeon -- 6,10,15 200 new 1`.

## v1.10.0 — Seçimli Zindanlar: Köklerin Mahzeni
- **Seçimli Zindanlar** ana menüde. İlk zindan **Köklerin Mahzeni**: Büyülü Orman'ın 8 aşamasını tamamlayınca açılır;
  kilitliyken "Büyülü Orman bölgesini tamamla (x/8 aşama)" yazar.
- Akış: Goblin Yağmacısı → güç seç → Elit Dikenli Ağaç → güç seç → Kadim Orman Muhafızı. Mevcut savaş motoru
  (2×2 kare, düşman niyeti, zayıflık, set bonusları) aynen kullanılır; zindanın can/hasar çarpanları `src/data/dungeons.ts`.
- Can savaşlar arasında taşınır; ilk iki zaferden sonra max canın %20'si yenilenir (üst sınır max can).
- 6 geçici güç (Şifalı Öz, Ulti Kıvılcımı, Kare Siper, Köz Yankısı, Buz Akışı, Hazır Muhafız); her seçimde iki farklı
  kart, ilk seçimdeki güç ikincide sunulmaz. Değerler tek veri kaynağında.
- Seçim ekranı: dikey iki büyük kart, "Devam Et" ile onay. Seçim + ilerleme tek kayıt güncellemesiyle yazılır.
  Oyun seçim ekranında kapanırsa aynı iki kartla devam eder; savaş ortasında kapanırsa o savaş başlangıç canı ve
  seçilmiş güçlerle yeniden başlar. Ana menüde aktif zindan için "Devam Et". Zindanı bırakma onay ister.
- Ödül (760 altın + 40 kristal) yalnızca boss zaferinde, tamamlanma kaydıyla aynı güncellemede ve deneme başına bir kez verilir.
- Kayıt sürümü 7 (eski kayıtlar sorunsuz taşınır). Denge aracı: `npm run sim:dungeon`.

## v1.9.0 — Akıllı kuşanma, hızlı geliştirme, okunaklı zayıflık
- **En İyilerini Kuşan** artık setleri dikkate alır ve önce önizleme açar. Kuşanılmış + çantadaki eşyalar
  (seviyesi uygun olanlar) ve mevcut kombinasyon aday olarak değerlendirilir; bir eşya iki yuvaya seçilmez,
  yüzükler iki farklı eşya olur. Önizleme: değişecek ekipmanlar, özellik farkı, savaş gücü, set bonuslarının
  açılması/kapanması; "Kuşan" tüm değişiklikleri TEK kayıt güncellemesiyle uygular, "Vazgeç" hiçbir şeyi değiştirmez.
  Mevcut kombinasyon en iyisiyse "Mevcut ekipmanların önerilen kombinasyonda" gösterilir.
  - Puanlama (`src/game/equipPlanner.ts`, ayarlanabilir): eşya puanı = oyunun güç puanı (geliştirme dahil).
    Set bonusu puanı = bonus değeri × birim puan × (koşullu bonuslar için gerçekleşme olasılığı) × (1 + (seviye-1) × 0.06).
  - Kesin ve hızlı: aynı yuva + aynı set kimliği için en iyi eşya yeter, ≤256 kombinasyon denenir (20.000 eşyada <300 ms).
- **Ekipman Geliştir ekranı:** ana ekranda "Ekipman" yanında çekiç simgeli "Geliştir". "Kuşanılanlar" / "Çantadakiler"
  sekmeleri, slot sıralı liste (simge, ad, nadirlik, +seviye, set simgesi). Kompakt panel: mevcut → sonraki seviye,
  özellik değişimi, maliyet ve elindeki kaynak, "Başarı ihtimali %100 · başarısızlık yok" (oyunda başarısızlık
  mekaniği yok), altta sabit "Geliştir" düğmesi. Yetersiz kaynakta düğme pasif ve eksik miktar yazar; maksimumda
  "Maksimum Seviye". Tek dokunuş = tek geliştirme (işlem sonrası kısa kilit, hızlı çift dokunma iki kez geliştirmez).
- **Eşya detayı** alt çekmece oldu: özellikler/set açıklamaları kaydırılır, alttaki sabit alanda Kuşan/Çıkar ve
  Geliştir. Geliştir aynı ekranı eşya seçili açar; geri dönünce ekipman ekranı ve seçili eşya korunur.
- **Zayıflık göstergesi:** renkli nokta yerine element simgeli düğme (geniş dokunma alanı). Dokununca elementin adı
  ve mevcut savaş kurallarına göre etkisi (+%45 hasar, altın taş kuralı, direnç, faz değişimi) açılır.

## v1.8.0 — Ekipman setleri
- **Üç set:** Köz (Volkanik Topraklar), Buzul (Donmuş Dağlar), Yaşam (Büyülü Orman). Her set kask,
  göğüslük, eldiven ve çizmeden oluşur. Bonuslar aynı setten KUŞANILMIŞ 2 ve 4 parçada açılır;
  4 parçada iki bonus birlikte çalışır. Bir eşya en fazla bir setin parçasıdır.
  - **Köz:** 2p ateş taşı hasarı +%10 · 4p turun ilk ateş eşleşmesi +5 ulti.
  - **Buzul:** 2p buz taşlarından mana +%10 · 4p turun ilk 2×2 karesi max canın %5'i kadar kalkan
    (bu bonustan biriken kalkan max canın %15'ini geçmez).
  - **Yaşam:** 2p doğa taşlarından iyileştirme +%10 (kalkan etkilenmez) · 4p turun ilk doğa eşleşmesi,
    bekleme süresi en yüksek yeteneğin süresini 1 tur azaltır (eşitlikte yetenek sırası).
- Bonus değerleri `src/data/sets.ts` içinde; açıklama metinleri bu değerlerden üretilir.
- "Turun ilk eşleşmesi" bonusları gerçek oyuncu turuna bağlı: zincir eşleşmeleri ve aynı anda oluşan birden
  çok kare bonusu tekrar tetiklemez. Köz 4p + Kül Arenası kuralı birlikte +10 ulti verir (üst sınır aşılmaz).
- **Düşme:** set bölgelerinde düşmesi kesinleşen ve yuvası uygun (kask/göğüslük/eldiven/çizme) ekipman %20
  ihtimalle set parçası olur (`SET_DROP_CHANCE`). Eşyanın düşme ihtimali değişmedi.
- **Arayüz:** eşya detayında set adı, kuşanılan parça sayısı ve 2/4 parça bonusları (aktif = "Aktif",
  bekleyen = soluk + "Gerekli: N"); ekipman ekranında aktif setler şeridi ve ayrıntı penceresi; eşya
  karşılaştırmasında kazanılacak/kaybedilecek set bonusu; eşya kartlarında set simgesi.
- Kayıt sürümü 6. Set bilgisi olmayan eski eşyalar normal ekipman olarak yüklenir; geçersiz set kimlikleri temizlenir.

## v1.7.0 — Düşman niyeti göstergesi
- Düşmanın yaklaşan eylemi ve kalan tur, can çubuğunun altında simgeyle gösterilir:
  "Saldırı · 2 tur sonra", "Ağır saldırı · 1 tur sonra", "Taş dondurma · 2 tur sonra",
  "Can çalma", "Ejderha nefesi", "Donmuş · 1 tur", "Sersem · 2 tur".
- Gösterge savaş motorunun gerçek eylem planına bağlı: eylem bir kez planlanır (boss'lar mevcut %45
  olasılıkla ağır saldırı seçer), turlar arasında sabit kalır ve gerçekleştiğinde gösterilen eylem
  uygulanır (ağır saldırı %25 daha sert, Buz Kraliçesi 2 taş dondurur, Gölge İblisi can çalar).
- Dondurma, sersemletme, yetenekle saldırıyı geciktirme, öfke ve faz değişimi göstergeyi anında günceller.
- Boss can eşiğinde faz değişince kısa bir bildirim görünür ("Faz 2 · Buz Bariyeri"); ardından yeni
  fazın planı gösterilir (plan faz değişiminde yeniden yapılır).
- Saldırı 1 tur kala niyet alanı hafifçe parlar (hareket azaltma tercihine saygılı).
- HUD ızgaraya çevrildi: niyet, merkez + düşman sütunlarını kapsayan ikinci satırda. HUD 61 → 56 px oldu,
  taş tahtası hiçbir ekranda daralmadı. Zayıflık artık gem renginde küçük bir noktayla gösteriliyor.
- `src/game/enemyIntent.ts` + 11 birim testi.

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
