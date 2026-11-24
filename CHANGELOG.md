# Sürüm Notları

Her güncellemede sürüm artırılır (`npm version minor --no-git-tag-version`), ardından
`npm run release` çalıştırılır: tek dosyalık oynanabilir derleme `releases/` altına
`legendary-gems-v<sürüm>.html` olarak yedeklenir. Eski sürümler silinmez.

## v1.88.0 — Dünya Haritası: aşama sırasına göre düşman canı artışı
- Yalnızca Dünya Haritası savaşlarında (normal, elit, hazine, boss) düşmanın en yüksek canı haritanın gerçek aşama sırasına göre artar (bölgeler arasında kesintisiz sıra). Tek ayar tablosu `WORLD_HP_BONUS_TABLE` (`src/data/stageHpScaling.ts`): 1–10. aşama %0 → %10, 11–20. aşama %10 → %20, 21–50. aşama %20 → %50 (aralık içinde doğrusal), 50. aşamadan sonra %50 sabit. Yuvarlama en sonda bir kez: yeni can = round(temel can × (1 + yüzde/100)); örn. 50. aşamada 10.000 → 15.000.
- Düşman saldırısı, saldırı aralığı, savunma ve ödüller değişmedi; animasyon/bekleme süreleri dokunulmadı. Can yüzdesine bağlı boss fazları yeni en yüksek can üzerinden çalışır (Buz Bariyeri yine %50'de). Artış savaş başlarken temel aşama verisinden bir kez hesaplanır: "Tekrar Oyna", "Sonraki Aşama" ve ana menüden devam katlamaz. Seçimli Zindan, Lig ve Boss Avı etkilenmez.
- Harita aşama listesi ve aşama ayrıntısı yeni canı gösterir. Aşama bazlı düzeltme için `WORLD_HP_STAGE_ADJUST` boş bırakıldı (simülasyonda düzeltme gerektiren aşama çıkmadı).
- Denge aracı: `scripts/simulate-world-hp.ts` (eski/yeni can ile önerilen seviye, seviyeye uygun tam set ekipman, dağıtılmış pasif puanları, yetenek/Ulti ve zayıflığı tercih eden oyuncu ile hamle karşılaştırması); `battleSim` seçenekleri `weakAware`, `passives`, `levelCap`.

## v1.87.0 — Pasif ağacı: 10 seviye + ortak Ustalık pasifleri
- Tüm pasiflerin en yüksek seviyesi 10; her yükseltme 1 puan. Her kahramanın kendi pasifleri eski tam seviyede (3/3 ya da 2/2) verdiği toplam bonusu 10/10'da birebir verir; her seviye bunun onda biri (`src/data/passiveTree.ts`). Ara değerler yuvarlanmaz; yuvarlama nihai yapı değerlerinde tek kez yapılır.
- Yeni ortak Ustalık pasifleri (her kahramanda aynı, 10/10): Kare Ustalığı %12 (2×2 karede eşleşen taşların hasarı; örtüşme/çizgi kesişiminde taş tek sayılır), Zincir Gücü %10 (2. ve sonraki zincir adımları), Mana Akışı %10 ve Ulti Odağı %10 (taş eşleşmeleri; mevcut sınırlar geçerli), Sağlam Bariyer %12 (oluşturulan tüm kalkanlar), Ağır Darbe Savunması %10 (planlanan ağır saldırı gerçekleşince). Oyunda birebir karşılığı olan iki öneri değiştirildi: Boss Avcısı → Elit Avcısı %8 (elit düşmanlara hasar), Yaşam Bağı → Son Direniş %12 (can %35 ve altındayken alınan hasar azalır).
- Puan kazanımı: seviye başına 1 → 3 puan (50. seviyede 148; tüm pasifler 200 puan — 10/10'a ulaşılır, odaklanma seçimi anlamlı kalır).
- Kayıt v13 (bir kez): eski yatırım eski bonusu karşılayan en düşük yeni seviyeye taşınır (3'lük 1→4, 2→7, 3→10; 2'lik 1→5, 2→10); harcanmamış puanlar korunur, yeni kazanım hızına göre eksik bütçe harcanmamış puan olarak eklenir; yeni pasifler 0/10.
- Pasif ekranı: kartlar Hasar / Savunma / Kaynaklar başlıkları altında; "3/10 · Şu an … · Sonraki …" ve 10/10 toplamı; puan yokken düğme pasif, 10/10'da "Maksimum". Seviye atlama penceresi kazanılan puanı (seviye × 3) gösterir.

## v1.86.0 — Hızlı Tekrar ve Ustalık Hedefleri
- Dünya Haritası aşama zaferinde alt bölüm: yan yana "Tekrar Oyna" ve "Sonraki Aşama"; harita ve ana menü dönüşü erişilebilir. Düğmelerin üstünde aşamanın yıldız durumu ("1/3 yıldız" / "3/3 yıldız · Ustalık tamamlandı") ve "Eksik ustalık hedefi" başlığı altında eksik hedeflerin mevcut açıklamaları. Yıldızlar zafer kaydı yazıldıktan sonraki güncel kayıttan okunur (bu savaşta kazanılan yıldız eksik görünmez). Ödül/hedef alanı kayarken düğme alanı panelin altında sabit kalır; 360×640'ta yatay kaydırma yok, uzun hedef metinleri sarar.
- Sıradaki aşama dünya rotasının gerçek sırasına ve mevcut açılma kuralına göre seçilir (`src/game/quickReplay.ts`, `nextRouteStage`): bölge bossundan sonra sıradaki bölgenin ilk aşaması; kilitliyse düğme pasif; rotanın son (500.) aşamasında düğmenin yerinde "Haritaya Dön".
- "Tekrar Oyna" aynı aşamayı aynı kahramanla yeni savaş olarak başlatır (tahta, sayaçlar ve hedeflerin savaş içi ilerlemesi sıfır; kayıttaki yıldızlar korunur). Geçişler zafer kaydı tamamlanınca açılır; ilk dokunuş kilitler, çift dokunma tek savaş başlatır ve aynı zaferin ödülü ikinci kez verilmez. Seçimli Zindan, Boss Avı ve Lig kendi zafer akışlarını kullanır.

## v1.85.0 — Buz Kraliçesi: Buz Bariyeri (tahta fazı)
- Gönderilen yama uygulandı (`src/game/boardBossPhase.ts`). Buz Kraliçesi %50 canda Buz Bariyeri açar: o anda ölümcül vuruş bile canı yarıda durdurur; bariyer açıkken tüm doğrudan hasar ve yanma/zehir/kanama/köz/çağırma/karşı saldırı/diken hasarı 0 olur ("ENGELLENDİ!", kalkan sesi). Bariyer, açıldığı turdan sonraki iki ayrı turda yapılan buz eşleşmesiyle kırılır (aynı turdaki ikinci eşleşme sayılmaz).
- Eski Buz Kraliçesi fazı (%55'te kalkan + 3 taş dondurma) kaldırıldı. Tahtada buz hamlesi yoksa tur başında en fazla üç sıradan taş buza çevrilerek bir hamle açılır (donmuş ve özel taşlar korunur); ipucu bariyer açıkken buz hamlesini gösterir.
- Arayüz: niyet satırında "Bariyer %50" / "Buz 0/2" çipi (dokununca açıklama, Esc kapatır), bariyer açıkken buz renkli can çubuğu; aşama ve av açıklamaları güncellendi.

## v1.84.0 — Vuruş sesi tüm kostümlerde: ses kahramandan (heroId)
- Vuruş sesi artık görünüm anahtarı (`costumeId`) yerine yalnızca kahraman kimliğinden (`heroId`) seçilir (`heroAttackCue`). Kahramanın varsayılan görünümü ve tüm kostümleri — sonradan eklenecekler dahil — aynı ses kaydını kullanır; kostüm başına ses tanımı ya da MP3 kopyası yoktur (örn. Savaşçı, Köz Muhafızı ve Kutup Çeliği aynı kılıç sesi).
- Animasyon ve görsel efekt seçimi `heroId + costumeId` ile sürer: kostüm kendi saldırı klibini, vuruş karesini, atış çıkış noktasını ve efekt rengini kullanır; ses yakın saldırıda o klibin `impact` anında, uzak saldırıda ok/büyü varışında çalar. Kostümün saldırı klibi yoksa eski animasyon zamanlaması kullanılır, ses yine kahramandan gelir.
- Kurallar değişmedi: normal → kahramanın sesi, kritik → kritik, tam kalkan engellemesi → kalkan, kısmi engellemede kalan hasara göre normal/kritik, sıyrılmada ses yok; her isabet tek ses; ses ayarları ve 1×/2× yığılma sınırı korunur.

## v1.83.0 — Vuruş sesleri v2: 22 kahramanın varsayılan görünümü
- Vuruş ve ses paketi v2 (`hero-sounds.mjs`) eşleşmesi `HERO_ATTACK_SOUNDS` olarak eklendi: kılıç (Savaşçı, Şövalye, Vampir, Suikastçı, Ejderkalp, Naga, Minotor, İblis), pençe (Kurt Adam, Ruh Tilkisi), yumruk (Koca Ayak, Kristal Golem), ok (Korucu), büyü (Büyücü, Gecenin Çığırtkanı, Ölüm Çağıran, Fırtına Çağıran, Peri, Siren, Anka, Cin, Serafim). Yalnızca varsayılan görünüm; alternatif kostümler ve düşman saldırıları eski ses akışında.
- MP3'ler ve kurallar v1.82.0 ile aynı (paketteki dosyalar birebir aynı): tam kalkan engellemesi `block`, kritik `critical`, normal ve kısmen emilen hasar kahramanın sesi, sıyrılmada isabet sesi yok; her isabet tek ses; 1× 48 ms / 2× 75 ms yığılma sınırı; ayarlar (sessiz, efekt ses seviyesi) oyundan.
- Yakın saldırıda isabet karesinde, uzak saldırıda ok/büyü hedefe varınca. Savaş hesabı, tur sırası ve efekt renkleri değişmedi.

## v1.82.0 — Vuruş sesleri ve isabet efektleri (pilot: Savaşçı, Kurt Adam, Kristal Golem, Büyücü)
- Vuruş ve ses paketinden 7 MP3 (`src/audio/sfx/`: sword, claw, fist, spell, arrow, critical, block). Mevcut `SoundEngine`'e örnek tabanlı `playHitCue` eklendi: sfx kanalından çalar, sessiz ve efekt ses seviyesi oyun ayarlarına bağlı; ilk dokunuşta (`unlock`) yüklenir, yüklenemezse eski sentez vuruş sesine düşer. 2× hızda perde korunur, kuyruk kısalır.
- Karar mantığı `src/game/hitFeedback.ts` (paketteki `combat-feedback.mjs` kurallarının TypeScript karşılığı): sonuç = tam kalkan engellemesi `block` > kritik `critical` > normal/kısmen emilen hasar (kahramanın sesi); her vuruşta tek ses; 1× 48 ms / 2× 75 ms içindeki tekrar bastırılır, kritik ve kalkan yakın zamandaki normal sese öncelik alır.
- Pilot yalnızca dört varsayılan görünüm (Savaşçı kılıç, Kurt Adam pençe, Kristal Golem yumruk, Büyücü büyü); kostümler ve diğer kahramanlar eski ses akışında. Ses ve kısa isabet efekti (paketteki `drawHitEffect` çiziminin Phaser karşılığı) yakın saldırıda `impact` anında, Büyücü'de büyü hedefe varınca çıkar. Tam kalkan engellemesinde düşmanın hasar tepkisi (parlama/geri tepme) oynamaz; kahramana gelen vuruşu kalkan tamamen emerse kalkan sesi çalar ve hasar alma klibi oynamaz. Savaş hesabı ve tur sırası değişmedi.

## v1.81.0 — Saldırı ve hasar alma animasyonları, paket 9 (kalan 30 kostüm) — tam kapsam
- Kalan 30 kostümün saldırı (4×2, 520 ms) ve hasar alma (4×1, 260 ms) klipleri `hero` + `costume` çiftiyle bağlandı; ilk sekiz paket korundu. Artık 22 varsayılan görünümün ve 44 kostümün tamamında çizilmiş savaş klibi var (66 görünüm, 132 sheet). Klip seçili kostümün bekleme sheet'iyle aynı ölçek/çapada oynar ve aynı kostümün bekleme döngüsüne döner.
- Paket kimliği farklı yedi kostüm mevcut kimliklere eşlendi (kayıtlar bozulmaz): `murdum_gecidi`→`bigfoot_yosun_bekcisi`, `yesil_pence`→`assassin_mor_sis`, `kehribar_yildirimi`→`stormcaller_mercan_firtinasi`, `firuze_pul`→`dragonheart_kor_pulu`, `safir_gelgit`→`naga_yakut_tahti`, `kizil_firman`→`djinn_gece_sarayi`, `gece_yapragi`→`seraph_gunes_mabedi`.
- Uzak saldırı efektleri seçili kostümün renginde: kostüm efekt renkleri tek tabloda (`CLIP_FX`: ok/büyü rengi, küre paleti, ses dalgası/yıldırım/kıvılcım/hilal paleti); kıvılcım ve hilal efektlerine de palet parametresi eklendi. Kaydı olmayan görünüm efekt türünün varsayılan rengini kullanır.

## v1.80.0 — Saldırı ve hasar alma animasyonları, paket 8 (on kostüm)
- `hero` + `costume` çiftiyle on kostüm klibi: Kurt Adam / Ay Pençesi, Vampir / Kızıl Kadife, Koca Ayak / Kırağı Gezgini, Gecenin Çığırtkanı / Fırtına Çığlığı, Ölüm Çağıran / Mezar Ayazı, Suikastçı / Kızıl Gölge, Fırtına Çağıran / Kara Bulut, Ejderkalp / Safir Ejder, Peri / Çiy Bahçesi, Ruh Tilkisi / Sonbahar Ruhu. Önceki yedi paket korundu (36 görünüm). Klip seçili kostümün bekleme sheet'iyle aynı ölçek ve çapada oynar, bitince aynı kostümün bekleme döngüsüne döner.
- Yakın saldırılar `impact` anında (240 ms); uzak saldırılar 240 ms'de `originPx`'ten, 120 ms yolculuk.
- Kostüme özgü efekt renkleri (ENTEGRASYON.md): Fırtına Çığlığı mor ses dalgası, Mezar Ayazı buz mavisi ruh kıvılcımı (`ORB_TINTS.frost`), Kara Bulut kehribar yıldırım (`CLIP_LIGHTNING_TINT`), Çiy Bahçesi pembe çiçek kıvılcımı. Yıldırım efektine renk paleti parametresi eklendi.

## v1.79.0 — Saldırı ve hasar alma animasyonları, paket 7 (ilk dört kahramanın birer kostümü)
- Kostüm klipleri `hero` + `costume` çiftiyle bağlandı: Savaşçı / Köz Muhafızı, Şövalye / Gümüş Şafak, Korucu / Gece İzcisi, Büyücü / Ay Kristali. Önceki altı paketin kayıtları korundu. Klip, seçili kostümün bekleme sheet'iyle aynı ölçek ve çapada oynar ve aynı kostümün bekleme döngüsüne döner; animasyonu olmayan kostümler eski statik poz akışını kullanır.
- Köz Muhafızı ve Gümüş Şafak: hasar göstergesi, ses ve hedef tepkisi `impact` anında (240 ms).
- Gece İzcisi: 240 ms'de `originPx`'ten gümüş ok (120 ms). Ay Kristali: mavi-beyaz büyü (140 ms). Kostüme özgü mermi rengi `CLIP_PROJECTILE_TINT` tablosunda; diğerleri taş rengini kullanır.

## v1.78.0 — Saldırı ve hasar alma animasyonları, paket 6 (İblis, Serafim)
- İblis ve Serafim'in varsayılan görünümü için saldırı (4×2, 520 ms) ve hasar alma (4×1, 260 ms) klipleri; ilk beş paket korundu. Artık 22 kahramanın tamamının varsayılan görünümünde çizilmiş savaş klibi var. Idle ile aynı ölçek ve çapa; Serafim'in havadaki yüksekliği karelerde; bitince idle'a dönülür.
- İblis: hasar göstergesi, ses ve hedef tepkisi `impact` anında (240 ms).
- Serafim: `radiantCrescent` — 240 ms'de `originPx`'ten kısa altın ışık hilali (`launchRadiantCrescent`); 120 ms sonra varınca hasar ve tepki. Aynalanan kahramanda çıkış noktası da aynalanır.

## v1.77.0 — Saldırı ve hasar alma animasyonları, paket 5 (Minotor, Kristal Golem, Anka, Cin)
- Dört kahramanın varsayılan görünümü için saldırı (4×2, 520 ms) ve hasar alma (4×1, 260 ms) klipleri; ilk dört paket korundu (toplam 20 kahraman). Idle ile aynı ölçek ve çapa; Anka ve Cin'in havadaki yüksekliği karelerde; bitince idle'a dönülür.
- Minotor ve Kristal Golem: hasar göstergesi, ses ve hedef tepkisi `impact` anında (240 ms).
- Anka: `emberBolt` — gagadan küçük turuncu kor. Cin: `aetherOrb` — avuçtan küçük turkuaz küre. Küre efektleri ortak `launchSpiritBolt` + renk/dalga ayarı (`ORB_TINTS`). 240 ms'de `originPx`'ten çıkar, 120 ms sonra varınca hasar ve tepki gösterilir; aynalanan kahramanda çıkış noktası da aynalanır.

## v1.76.0 — Saldırı ve hasar alma animasyonları, paket 4 (Peri, Ruh Tilkisi, Naga, Siren)
- Dört kahramanın varsayılan görünümü için saldırı (4×2, 520 ms) ve hasar alma (4×1, 260 ms) klipleri; ilk üç paket korundu (toplam 16 kahraman). Idle ile aynı ölçek ve çapa; süzülme ve sıçrama karelerde; bitince idle'a dönülür.
- Ruh Tilkisi ve Naga: hasar göstergesi, ses ve hedef tepkisi `impact` anında (240 ms).
- Peri: `blossomBolt` — 240 ms'de `originPx` noktasından pembe kıvılcım (`launchBlossomBolt`). Siren: `lyreWave` — kısa mavi ses dalgası (ses dalgası efektinin mavi tonu). 120 ms sonra hedefe varınca hasar ve tepki gösterilir; aynalanan kahramanda çıkış noktası da aynalanır.

## v1.75.0 — Saldırı ve hasar alma animasyonları, paket 3 (Ölüm Çağıran, Suikastçı, Fırtına Çağıran, Ejderkalp)
- Dört kahramanın varsayılan görünümü için saldırı (4×2, 520 ms) ve hasar alma (4×1, 260 ms) klipleri; ilk iki paket korundu (toplam 12 kahraman). Idle ile aynı ölçek ve çapa; bitince idle'a dönülür. Alternatif kostümler eski akışı kullanır.
- Suikastçı ve Ejderkalp: hasar göstergesi, ses ve hedef tepkisi `impact` anında (240 ms).
- Ölüm Çağıran: `spiritBolt` — 240 ms'de `originPx` noktasından küçük yeşil ruh büyüsü (`launchSpiritBolt`). Fırtına Çağıran: `lightningBolt` — kısa mavi yıldırım (`launchLightningBolt`). Efekt 120 ms sonra hedefe varınca hasar ve tepki gösterilir.
- Kahraman sprite'ı yatay aynalanırsa mermi çıkış noktası da aynalanır (kap aynalaması zaten dünya dönüşümüyle uygulanıyordu).

## v1.74.0 — Saldırı ve hasar alma animasyonları, paket 2 (Kurt Adam, Vampir, Koca Ayak, Gecenin Çığırtkanı)
- Dört kahramanın varsayılan görünümü için saldırı (4×2, 520 ms) ve hasar alma (4×1, 260 ms) klipleri; Paket 1 kayıtları korundu (toplam 8 kahraman). Kareler idle ile aynı dikey ölçek ve ayak noktasında; bitince idle'a dönülür.
- Kurt Adam, Vampir, Koca Ayak: hasar göstergesi, ses ve düşman tepkisi `impact` anında (240 ms).
- Gecenin Çığırtkanı: `projectileRelease` anında (240 ms) `originPx` noktasından kısa mor ses dalgası (`launchSonicPulse`) çıkar; 120 ms sonra hedefe varınca hasar ve tepki gösterilir. Bu klipte pençe temas efekti çizilmez.
- 2× hızda kareler, vuruş anı ve dalga yolculuğu birlikte yarıya iner (sahne saati).

## v1.73.0 — Çizilmiş saldırı ve hasar alma animasyonları (Savaşçı, Şövalye, Korucu, Büyücü)
- Dört kahramanın varsayılan görünümü için saldırı (4×2, 520 ms) ve hasar alma (4×1, 260 ms) klipleri (`src/art/heroes-combat/`, `src/data/heroCombat.ts`). Kareler idle ile aynı dikey piksel ölçeğinde ve aynı ayak noktasında (372/384) çizilir; klip bir kez oynar ve idle döngüsüne döner (boyut/konum sıçraması yok). Kostüm seçiliyse eski statik poz davranışı sürer.
- Zamanlama `frameDurationsMs` ile sahne saatinde: 2× hızda kareler, vuruş işaretleri ve mermi yolculuğu birlikte (tek kez) yarıya iner. Savaşçı/Şövalye: hasar sayısı, ses ve düşman tepkisi `impact` anında (240 ms). Korucu/Büyücü: ok ya da büyü `projectileRelease` karesinde çizimdeki `originPx` noktasından çıkar, hedefe varınca (240+120 / 240+140 ms) sonuç gösterilir. Hasarı savaş motoru bir kez hesaplar.
- Hasar alma klibi düşman isabetinde (hasar > 0) başlar; sıyrılma ve tam kalkan engellemesi mevcut geri bildirimi kullanır.
- Artifact önizlemesi tek dosya sınırını aştığı için yeni derleme modu: `npm run build:artifact` (`dist-artifact/`) — her şey index.html'e gömülü, yalnızca kahraman bekleme/savaş sheet'leri yanında ayrı dosya. `npm run release` yedeği yine tam tek dosyadır.

## v1.72.0 — Bekleme döngüleri 0,5 saniye daha kısaldı
- `IDLE_LOOP_REDUCTION_MS` 1000 → 1500: tüm idle sheet'ler manifestteki süreden 1,5 sn kısa oynar (3,75 sn → 2,25 sn; 4 sn → 2,5 sn; 3,5 sn → 2 sn; 4,5 sn → 3 sn).

## v1.71.0 — Bekleme döngüleri 1 saniye kısaldı
- Tüm idle sheet'ler manifestteki süreden 1 sn kısa oynar (örn. 3,75 sn → 2,75 sn; 4,5 sn → 3,5 sn): kare dizisi aynı, oynatma hızı orantılı artar. Ayar `IDLE_LOOP_REDUCTION_MS` (`src/data/heroIdle.ts`); 0 yapılırsa manifest hızına döner.

## v1.70.0 — 12 pozlu bekleme animasyonları, paket 4 (Ölüm Çağıran, Vampir, Kristal Golem)
- Ölüm Çağıran ve Vampir'in 6 sheet'i 12 pozlu (4×3) sürümleriyle güncellendi; Kristal Golem için varsayılan + 2 kostüm sheet'i ilk kez eklendi (toplam 66 sheet: 45 adet 12 pozlu, 17 adet 16 pozlu, kalanı 8 pozlu). Artık sheet'i olmayan kahraman kalmadı. Her görünüm kendi `frameSequence` ve `frameRate` değeriyle oynar.
- Yayın boyutu için düşman görselleri kalite 34'e yeniden sıkıştırıldı.

## v1.69.0 — 12 pozlu bekleme animasyonları, paket 3 (İblis, Korucu, Büyücü, Koca Ayak)
- İblis için varsayılan + 2 kostüm sheet'i ilk kez eklendi; Korucu, Büyücü ve Koca Ayak'ın 8 pozlu kayıtları 12 pozlu (4×3) sürümleriyle güncellendi (toplam 63 sheet: 36 adet 12 pozlu, 17 adet 16 pozlu, kalanı 8 pozlu). Her görünüm kendi `frameSequence` ve `frameRate` değeriyle oynar. Sheet'i olmayan tek kahraman: Golem.
- `bigfoot_murdum_gecidi` → mevcut `bigfoot_yosun_bekcisi` kimliğine eşlendi.
- Yayın boyutu için tüm sheet'ler kalite 38'e (12/16 pozlular orijinalinden), düşman görselleri kalite 40'a yeniden sıkıştırıldı.

## v1.68.0 — 12 pozlu bekleme animasyonları, paket 2 (Kurt Adam, Ejderkalp, Naga, Minotor)
- Kurt Adam, Ejderkalp ve Naga'nın 9 sheet'i 12 pozlu (4×3) sürümleriyle güncellendi; Minotor için varsayılan + 2 kostüm sheet'i ilk kez eklendi (toplam 60 sheet: 24 adet 12 pozlu, 17 adet 16 pozlu, kalanı 8 pozlu). Her görünüm kendi `frameSequence` ve `frameRate` değeriyle oynar.
- Kostüm eşlemeleri: `dragonheart_firuze_pul`→`dragonheart_kor_pulu`, `naga_safir_gelgit`→`naga_yakut_tahti`.
- Yayın boyutu için düşman görselleri en uzun kenar 224 px'e (kalite 46) indirildi.

## v1.67.0 — 12 pozlu bekleme animasyonları (Savaşçı, Şövalye, Ruh Tilkisi, Fırtına Çağıran)
- Dört kahramanın varsayılan + 2'şer kostüm sheet'i (12) 12 pozlu (4×3) sürümleriyle güncellendi; 16 pozlu kayıtlar korundu (toplam 57 sheet: 12 adet 12 pozlu, 17 adet 16 pozlu, kalanı 8 pozlu). Her görünüm kendi `frameSequence` ve `frameRate` değeriyle oynar (3,5–3,75 sn döngü).
- `stormcaller_kehribar_yildirimi` → mevcut `stormcaller_mercan_firtinasi` kimliğine eşlendi. Sheet'ler 768×693 (kalite 44).

## v1.66.0 — 16 pozlu bekleme animasyonları (Anka, Cin, Serafim + dört kahramanın kostümleri)
- Anka, Cin ve Serafim için varsayılan + 2'şer kostüm (9 yeni sheet); Gecenin Çığırtkanı, Suikastçı, Peri ve Siren'in 8 kostümü 16 pozlu sürümleriyle değiştirildi (toplam 57 sheet, 17'si 16 pozlu 4×4). Bu dört kahramanın varsayılan görünümleri mevcut 8 pozlu sheet'te kaldı (pakette 16 pozlu varsayılan yoktu).
- Oynatma sheet başına: ızgara (4×2 / 4×4), kare sayısı, `frameRate`, `frameSequence` ve süre manifestteki kayıttan okunur (`idleSpec`); kaydı olmayanlar eski 4×2 varsayılanını kullanır. 16 pozlular 3,5–3,75 sn döngü.
- Kostüm eşlemeleri: `assassin_yesil_pence`→`assassin_mor_sis`, `djinn_kizil_firman`→`djinn_gece_sarayi`, `seraph_gece_yapragi`→`seraph_gunes_mabedi`.
- Yayın boyutu için: 16 pozlu sheet'ler 768×924 (kalite 44), 8 pozlular 768×464 (kalite 44), düşman görselleri en uzun kenar 240 px (kalite 52).

## v1.65.0 — Kahramanlar 13–16 çizilmiş bekleme animasyonları
- Peri, Ruh Tilkisi, Naga ve Siren için 12 yeni sheet (varsayılan + 2'şer kostüm); önceki paketlerin 36 kaydı korunur (toplam 48). 4×2 ızgarada 8 poz (320×384); `frameSequence` 12 FPS, 4,5 sn döngü, manifest `origin`; sheet oynarken esnetme ve ayrı süzülme (bob) kapalı — Peri ve Siren'in hafif süzülmesi karelerde.
- `naga_safir_gelgit` → mevcut `naga_yakut_tahti` kimliğine eşlendi (kayıtlar bozulmaz). Saldırı/hasar sonrası seçili kostümün bekleme döngüsüne dönülür.

## v1.64.0 — Kahramanlar 09–12 çizilmiş bekleme animasyonları
- Ölüm Çağıran, Suikastçı, Fırtına Çağıran ve Ejderkalp için 12 yeni sheet (varsayılan + 2'şer kostüm); ilk sekiz kahramanın 24 kaydı korunur (toplam 36). 4×2 ızgarada 8 poz (320×384); manifest `frameSequence` 12 FPS, 4,5 sn döngü, `origin` ayak noktası; sheet oynarken esnetme kapalı. Saldırı/hasar sonrası seçili kostümün bekleme döngüsüne dönülür.
- Paket kostüm adları mevcut kimliklere eşlendi: `yesil_pence`→`assassin_mor_sis`, `kehribar_yildirimi`→`stormcaller_mercan_firtinasi`, `firuze_pul`→`dragonheart_kor_pulu` (kayıtlar bozulmaz).
- Yayın boyutu için: tüm sheet'ler 896×540'a (kalite 50) ve düşman görselleri en uzun kenar 264 px'e (kalite 58) yeniden sıkıştırıldı.

## v1.63.0 — Kahramanlar 05–08 çizilmiş bekleme animasyonları
- Kurt Adam, Vampir, Koca Ayak ve Gecenin Çığırtkanı için 12 yeni sheet (varsayılan + 2'şer kostüm); ilk dört kahramanın 12 kaydı korunur (toplam 24). Her sheet 4×2 ızgarada 8 poz (320×384 kare); manifest `frameSequence` 12 FPS, 4,5 sn döngü, `origin` ayak noktası. Sheet oynarken eski esnetme efekti kapalıdır.
- Gecenin Çığırtkanı'nın hafif yükselmesi çizimlerde olduğundan ayrı süzülme (bob) animasyonu sheet modunda uygulanmaz; saldırı pozu statik çizimle aynı yükseklikte durur.
- Pakettaki `murdum_gecidi` kostümü mevcut `bigfoot_yosun_bekcisi` kimliğine eşlenir (kayıtlar bozulmaz). Yeni sheet'ler 0,75 ölçeğinde saklanır.

## v1.62.0 — İlk dört kahramanın çizilmiş bekleme animasyonları
- Savaşçı, Şövalye, Korucu ve Büyücü için 12 sheet (varsayılan görünüm + her birinin 2 kostümü): her biri 4×2 ızgarada 8 poz. Manifestteki `frameSequence` 12 FPS hızında oynar (54 kare = 4,5 sn; tekrarlar pozun ekranda kalma süresidir), savaş hızıyla ölçeklenir. Ayak noktası manifestteki `origin` ile zemin çizgisine oturur; bu sheet'lerde eski esnetme (nefes) animasyonu uygulanmaz. `src/data/heroIdle.ts`, `src/art/heroes-idle/`.
- Saldırı pozu sırasında (statik, seçili kostümün çizimi) sheet gizlenir; saldırı ve hasar bitince seçili kostümün bekleme döngüsüne dönülür. Sheet'i olmayan kahramanlar eski çizim + esnetmeyle devam eder; sheet yüklenemezse de aynı yedek çalışır. Sheet yalnızca savaşa girilen kahraman/kostüm için yüklenir.
- Yayın boyutu için: sheet'ler 0,75 ölçeğinde (kalite 60) saklanır; kahraman ve kostüm statik görselleri en uzun kenar 480 px'e indirildi (kalite 60–62).

## v1.61.0 — Naga kostümü: Safir Gelgit
- Naga'nın ikinci kostümü Yakut Tahtı → **Safir Gelgit** olarak yeniden adlandırıldı ve çizimi güncellendi. Dahili kimlik (`naga_yakut_tahti`) korundu; kostümü daha önce açan/seçen oyuncular yeni görünümü otomatik alır.

## v1.60.0 — Kostüm renk düzeltmesi
- Altı ikinci kostümün çizimi ve görünen adı yerinde güncellendi; dahili kimlikler değişmedi, bu yüzden kostümü daha önce seçen oyuncular yeni çizimi otomatik görür: Suikastçı Mor Sis → **Yeşil Pençe**, Kocaayak Yosun Bekçisi → **Mürdüm Geçidi**, Cin Gece Sarayı → **Kızıl Ferman**, Ejder Kalbi Kor Pulu → **Firuze Pul**, Serafim Güneş Mabedi → **Gece Yaprağı**, Fırtına Çağıran Mercan Fırtınası → **Kehribar Yıldırımı**.
- Kostüm sayısı (44), animasyonlar ve oynanış değerleri değişmedi.

## v1.59.0 — Kostümler: üçüncü paket
- Kalan 11 şampiyona yeni kostüm: Kor Pulu (Rhogar), Yıldız Tozu (Peri), Ay Tılsımı (Ruh Tilkisi), Yakut Tahtı (Naga), Mercan Ezgisi (Siren), Buz Labirenti (Minotor), Zümrüt Çekirdek (Kristal Golem), Kutup Ankası (Anka), Gece Sarayı (Cin), Soluk Alev (İblis) ve Güneş Mabedi (Serafim). Toplam 44 kostüm; 22 şampiyonun hepsinin iki kostümü var.
- Mevcut kostüm sistemi üzerinden (liste satırı + dosya + `meta.json`); önceki kostümler ve kayıtlı seçimler korunur. Süzülen şampiyonlarda (Peri, Anka, Cin, Serafim) taban 1,0 ve mevcut hafif süzülme; nefes, parlama ve saldırı efektleri değişmedi.

## v1.58.0 — Kostümler: ikinci set
- 11 şampiyona yeni kostüm: Kutup Çeliği (Savaşçı), Zümrüt Yemini (Şövalye), Gece İzcisi (Korucu), Kor Akademisi (Büyücü), Kanlı Ay (Kurt Adam), Buz Soylusu (Vampir), Yosun Bekçisi (Koca Ayak), Bakır Tutulma (Gecenin Çığırtkanı), Mor Sis (Suikastçı), Zehirli Lahit (Ölü Çağıran) ve Mercan Fırtınası (Fırtına Çağıran). Toplam 33 kostüm; bu 11 şampiyonun artık iki kostümü var.
- Mevcut kostüm sistemi üzerinden: yalnızca `costumes.ts` listesine satır + `src/art/costumes/` dosyası + `meta.json`. Önceki kostümler ve kayıtlı seçimler korunur; nefes, parlama, saldırı efektleri ve hizalama değişmedi.

## v1.57.0 — Kristal taş seti
- Savaş tahtasının altı temel taşı yeni kristal görselleriyle güncellendi (`src/art/gems/gem_*.png`, 128×128 şeffaf, merkez hizalı). Dosya adı = Phaser doku anahtarı (`gem_fire`, `gem_frost`, `gem_nature`, `gem_lightning`, `gem_arcane`, `gem_golden`); `src/data/gemArt.ts`.
- Dokular `BattleScene.preload` içinde tahta kurulmadan önce yüklenir. Bir doku yüklenemezse o taş için eski çizim işlevi (`createGemTextures`) yedek olarak çalışır. Tek dosyalık HTML çıktısında PNG'ler gömülüdür.
- Özel taş okları ve nova halkasına koyu dış çizgi eklendi (açık renkli Yıldırım/Altın taşlarında okunaklılık). Donma katmanı, seçili taş çerçevesi ve hamle ipuçları aynı.
- Taş kimlikleri, düşme oranları, eşleşme kuralları ve savaş etkileri değişmedi.

## v1.56.0 — Hazine çizimleri paket 3 (son hazineler)
- 12 hazine çizimi: Ejder Hazinesi (×2), Kutsal Hazine (×2), Yeniden Doğuş Sandığı (×2, 8. aşama süzülür), Fırtına Sandığı (×2, 8. aşama süzülür), Ölümsüzlük Sandığı (×2) ve Sonsuzluk Sandığı (×2) (`<aşama>_enemy.webp`). Bununla oyundaki tüm karşılaşmalar özel çizimli ya da havuz çizimli; eski vektör çizime düşen aşama kalmadı. Toplam 311 çizim.
- Yayın boyutu için tüm düşman WebP'leri en uzun kenar 320 px'e indirildi (kalite 58, alfa 55); yeni çizimler de aynı ayarda. Saldırı efektleri, ganimet ve yedek çizim davranışı değişmedi.

## v1.55.0 — Hazine çizimleri paket 2
- 12 hazine çizimi: Ebedi Saatin Sandığı (×2), Kızıl Ay Sandığı (×2), Demir Hazine Sandığı (×2), Buz Çekirdeği Sandığı (×2), Rüya Sandığı (×2, süzülür) ve Denge Sandığı (×2) (`<aşama>_enemy.webp`; aynı adlı sandıklar kendi aşama kimliğiyle). Toplam 299 çizim.
- Saldırı animasyonları, savaş değerleri, ganimet kuralları ve yedek çizim değişmedi.

## v1.54.0 — Hazine çizimleri paket 1
- 15 hazine çizimi: Donmuş Sandık Golemi, Obsidyen Kral Sandığı, Prizma Hazine Sandığı, Kaos Hazine Bekçisi, İnci Sandığı Bekçisi, Altın Firavun Sandığı, Bataklık Hazine Ruhu (süzülür), Aytaşı Sandığı Bekçisi, Elmas Hazine Golemi, Kül Altını Sandığı, Yıldız Çekirdeği Sandığı, Ruh Sandığı Bekçisi (süzülür), Mitik Kaos Sandığı ve iki Yıldız Tozu Sandığı (`<aşama>_enemy.webp`; ikisi kendi aşama kimliğiyle). Toplam 287 çizim.
- Saldırı animasyonları, savaş değerleri, ganimet kuralları ve yedek çizim değişmedi.

## v1.53.0 — Elit çizimleri paket 6 (son elitler)
- 9 elit çizimi: Renk Ayıran Dev, Halka Nöbetçisi (süzülür), Çapa Avcısı, Yıldız Demircisi, Kutup Nöbetçisi, Zümrüt Buz Golemi, Mahzen Mızrağı (süzülür), Uykucu Avcı ve Mor Kamış Bekçisi (`<aşama>_enemy.webp`). Bununla tüm elit aşamalar özel çizimli. Toplam 272 çizim.
- Saldırı profilleri, animasyonlar ve oynanış değerleri değişmedi.

## v1.52.0 — Elit çizimleri paket 5
- 10 elit çizimi: Yıldırım Golemi (×2), Bulut Yaratığı (süzülür), Ruh Biçici (×2, süzülür), Zaman Yiyici (süzülür), Sonsuzluk Muhafızı (×2), Yargıç ve Prizma Terzisi (`<aşama>_enemy.webp`; aynı adlı düşmanlar kimliğine göre ayrı eşlenir). Toplam 263 çizim.
- Yayın boyutu sınırı için tüm düşman WebP'leri en uzun kenar 360 px'e indirildi (kalite 64, alfa 60); yeni çizimler de aynı ayarda. Saldırı profilleri, animasyonlar ve oynanış değerleri değişmedi.

## v1.51.0 — Elit çizimleri paket 4
- 10 elit çizimi: Gölge Rahibi (×2), Karanlık Kılıç (süzülür), Alev Kertenkelesi, Tanrı Elçisi (×2, süzülür), Kutsal Şövalye, Kor Ruhu (×2, süzülür) ve Yenilen Yaratık (`<aşama>_enemy.webp`; aynı adlı düşmanlar kimliğine göre ayrı eşlenir). Toplam 253 çizim.
- Saldırı profilleri, animasyonlar ve oynanış değerleri değişmedi.

## v1.50.0 — Elit çizimleri paket 3
- 10 elit çizimi: Kan Kurtları (×2), Ay Işığı Vampiri, Buhar Golemi (×2), Lav Dişlisi (süzülür), Donmuş Kurt, Kabus Perisi (×2, süzülür) ve Bulanık Hatıra (süzülür) (`<aşama>_enemy.webp`; aynı adlı düşmanlar kimliğine göre ayrı eşlenir). Toplam 243 çizim.
- Yayın boyutu sınırına yer açmak için tüm düşman WebP'leri yeniden kodlandı (renk q62, alfa kalitesi 60); yeni çizimler q66. Saldırı profilleri, animasyonlar ve oynanış değerleri değişmedi.

## v1.49.0 — Elit çizimleri paket 2
- 10 elit çizimi: Elit Meteor Golemi (Meteor Krateri), Kayıp Ruh (süzülür), Mezar Bekçisi, Kaos Parçacığı (süzülür), Hiçlik Ejderi, Yıldız Gezgini (×2), Meteor Golemi (Yıldızlararası Geçit) ve Dişli Golem (×2) (`<aşama>_enemy.webp`; aynı adlı düşmanlar kimliğine göre ayrı eşlenir). Toplam 233 çizim.
- Saldırı profilleri, animasyonlar ve oynanış değerleri değişmedi.

## v1.48.0 — Elit çizimleri paket 1
- 10 elit çizimi: Elit Uyanmış Rün Heykeli, Gök Okçusu, Batık Gemi Hayaleti (süzülür), Kum Solucanı, Bataklık Kurbağası, Çürümüş Golem, Gece Avcısı, Kristal Yarasası (süzülür), Lav Akrebi ve Yıldız Paraziti (süzülür) (`<aşama>_enemy.webp`; düşman kimliği = çizim anahtarı = dosya adı). Toplam 223 çizim.
- Saldırı profilleri, zorluk, ödüller ve kayıt davranışı değişmedi.

## v1.47.0 — Bölge bossları paket 2 (aşama 10)
- 13 boss çizimi: Yıldızların Anası Astraia (süzülür), Zaman Muhafızı Chronos, Kanlı Ay Kraliçesi Lilith, Demir İmparator Malakar, Kar Tanrıçası Skadi, Rüya Yiyici Morpheus, Işık ve Gölge Yargıcı Aion, Kadim Ejderha Kralı Bahamut, Gök Tanrısı Valorian, Anka Kraliçesi Pyria (süzülür), Fırtına Tanrısı Tempest, Ölümsüzlük Muhafızı Eternia ve Sonsuzluk İmparatoru Valdris (`<aşama>_enemy.webp`; düşman kimliği = çizim anahtarı = dosya adı). Paket 1 ile aynı işleme/ayarlar. Toplam 213 çizim.
- Boss kimliği, fazlar, saldırı türü, zayıflık, direnç, ödül ve kayıt davranışı değişmedi.

## v1.46.0 — Bölge bossları paket 1 (aşama 8)
- Gök Tiranı Zephyros, Leviathan, Kum Firavunu Ramsutek, Hidra, Ay Matronu Selene, Kristal Hükümdarı Prismox, Kül Savaş Lordu Magmor, Astral Yutucu Nihiloth, Ruh Biçici Azrail ve Kaos İmparatoru Vorakh çizimleri (`<aşama>_enemy.webp`; düşman kimliği = çizim anahtarı = dosya adı). Şeffaf WebP, ≤400 px, sola dönük (aynalanmadı), en-boy oranı ve ayak hizası `meta.json`'da. Azrail hafifçe süzülür, diğerleri ayakta. Toplam 200 çizim.
- Boss kimliği, fazlar, saldırı türü, zayıflık, direnç, ödül ve kayıt davranışı değişmedi.

## v1.45.0 — Kostümler
- 22 şampiyonun her biri için alternatif görünüm (`src/art/costumes/*.webp`, şeffaf WebP, ≤560 px). Veri tabanlı yapı: `src/data/costumes.ts` (kimlik = dosya adı = çizim anahtarı; şampiyon başına birden fazla kostüm eklenebilir). Yeni kostüm = dosya + `meta.json` satırı + tek liste satırı.
- Kahramanlar ekranı: detayda küçük **Kostümler** düğmesi → alt çekmece (Varsayılan Görünüm + kostümler). Karta dokununca önizleme değişir, **Kullan** ile kaydedilir, takılı görünümde **Kullanılıyor** etiketi çıkar, **Varsayılana dön** ile geri dönülür. Esc yalnızca çekmeceyi kapatır.
- Kostüm kahraman detayında, listede, ana menüde ve savaşta görünür. Yerleşim (boy/genişlik sınırı, ayak çizgisi, süzülme) sınıfa göre aynıdır; nefes, parlama, aura ve mevcut saldırı efektleri değişmeden çalışır. Kostüm görselleri yalnızca gösterildiğinde yüklenir.
- Kayıt: tercih `HeroProgress.costumeId` ile şampiyon kimliğine göre saklanır (isteğe bağlı alan; kayıt sürümü değişmedi, eski kayıtlar varsayılanla açılır). Geçersiz/yabancı kimlik varsayılana düşer; görsel yüklenemezse varsayılan görsel kullanılır. Tamamen kozmetik: güç, yetenek, ekipman ve hasar hesabı aynı.
- Açma kuralı: ayrı bir kostüm açma sistemi yoktu; kostüm, şampiyon açıldığında kullanıma açılır (`isCostumeUnlocked`).

## v1.44.0 — Ortak saldırı animasyonları
- Dört animasyon tipi (`src/game/attackAnimation.ts`, saf karar katmanı): silahlı yakın dövüş (hamle + gövde dönüşü + kavisli savurma izi; kılıç/hançer/mızrak ince, balta/tırpan/çekiç geniş), silahsız yakın dövüş (yumruk, pençe, ısırık, kıskaç temas efekti), büyü (el ışığı + küçük atış, element rengi), menzilli (geri çekilme + ok izi). Süreler 1× hızda: yakın dövüş 280/240 ms, büyü 360 ms, menzilli 340 ms; sahne zamanı çarpanıyla 2×'te yarıya iner.
- Tip seçimi: kahraman çizimine göre sınıf tablosu (kuşanılan silah türü yalnızca iz genişliğini seçer), yetenek etkisi/`anim` alanı (kılıçlı kahraman Ateş Topu atınca büyü), düşman için eylem türü > çizime özel tanım (havuz) > ad > arketip > varsayılan kısa hamle + temas.
- Tek parça PNG'lerde hareket küçük konum/dönüş değişimidir; ayaklı/süzülen idle (nefes/bob) saldırı sonrası devam eder, karakterler başlangıç konumuna döner.
- Aynı eylem bir kez oynar: taş eşleşmesinde her kaskad adımı tek eylemdir (adımdaki tüm taş türleri/hasar kayıtları görseli tekrarlamaz); yetenekler yalnızca poz verir (kendi efektleriyle çift oynatma yok); sürerken yenisi üst üste binmez.
- Hasar sayısı/geri tepme temas anına hizalanır (hasar hesabı, tur sırası ve yetenek davranışı değişmedi). Düşman geri tepmesi artık başlangıca göre yapılır (art arda vuruşlarda kayma düzeltildi).
- Havuz çizimlerine çizime özel saldırı biçimi eklendi (`attack`).

## v1.43.0 — Ortak normal düşman görsel havuzu
- 10 görsellik havuz (`src/data/enemyArtPool.ts`, tek veri tanımı): Obsidyen Köpeği, Yosun Tırtılı, Kırağı Kirpisi, Paslı Maden Örümceği, Sis Güvesi (süzülür), Kum Kertenkelesi, Kaya Yengeci, Gölge Kuzgunu (süzülür), Kristal Kobold, Kor Mantarı.
- Özel çizimi olmayan NORMAL aşamalar (şu an 77, 23 bölge) çözümleyici üzerinden otomatik havuzdan görsel alır: bölge temasına uyan adaylar, aşama kimliğinden türetilen sabit seçim (FNV-1a), bölgede art arda aynı görsel tekrarlanmaz. Özel çizim her zaman önceliklidir; elit/boss/hazine değişmez. Yeni aşama/bölge eklemek mevcut atamaları değiştirmez; tanınmayan bölgeler anahtar kelimeyle ya da tüm havuzla eşleşir.
- Tüm düşman WebP'leri yeniden kodlandı (alfa kalitesi 60, renk q72): görsel fark yok (alfa farkı ≤%5), dosya boyutu −2,5 MB; Artifact 16 MB sınırının altında kalır.

## v1.42.0 — Elit karşılaşmalar 71–75 (son 5)
- Sıfır Nöbetçisi, Yokluk Kılıcı (süzülür; `zero_threshold_7/9`), Kor Nöbetçisi, Şafak Devriyesi ve Güneş Omurgası (`dawn_core_5/7/9`) çizimleri; elit aşamanın `<aşama>_enemy` kimliğine bağlı. Toplam 190 çizim.
- Genişleme bölgelerindeki 75 elit aşamanın 65'i özel çizimli; 10'u (prism_labyrinth_7/9, iron_orbit_5/7/9, aurora_vault_5/7/9, dream_marsh_5/7) henüz çizimsiz.

## v1.41.0 — Elit karşılaşmalar 61–70
- Kuyruk Nöbetçisi, Köprü Okçusu, Göktaşı Devriyesi (`comet_bridge_5/7/9`), Yazıt Kazıyıcı, Dikilitaş Nöbetçisi, Rün Celladı (`rune_necropolis_5/7/9`), Çatlak Nöbetçisi, Yörünge Sapması (süzülür), Kubbe Yontucusu (`shattered_sky_5/7/9`) ve Hiçlik Avcısı (`zero_threshold_5`) çizimleri; elit aşamanın `<aşama>_enemy` kimliğine bağlı. Toplam 185 çizim.

## v1.40.0 — Elit karşılaşmalar 51–60
- Kâbus Böceği (`dream_marsh_9`), Yansıma Mızrağı, Ayna Düellocusu, Cam Yargıç (`mirror_court_5/7/9`), Gözcü Baykuş (süzülür), Kutup Çarkı (süzülür), Gece Gökbilimcisi (`midnight_observatory_5/7/9`), Işın Bekçisi, Sönük Alev Devriyesi ve Altın Çeper Muhafızı (`hollow_sun_5/7/9`) çizimleri; elit aşamanın `<aşama>_enemy` kimliğine bağlı. Toplam 175 çizim.

## v1.39.0 — Elit karşılaşmalar 31–40
- Çan Döven, Yankı Golemi, Suskun Rahip (`echo_terrace_5/7/9`), Kalıp Bekçisi, Akışkan Zırh (süzülür), Gümüş Omurga (`mercury_foundry_5/7/9`), Alev Salyangozu, Kömür Çiçeği, Kızıl Polen Devi
  (`cinder_garden_5/7/9`) ve Kırılım Bekçisi (`prism_labyrinth_5`, süzülür) çizimleri; elit aşamanın `<aşama>_enemy` kimliğine bağlı. Toplam 165 çizim, 277 düşman kimliği.

## v1.38.1 — Ekipman geliştirmede alt bildirim kaldırıldı
- Ekipman her geliştirildiğinde altta çıkan "… +N seviyesine yükseltildi!" bildirimi kaldırıldı (ekranı kalabalıklaştırıyordu). Geri bildirim ses ve eşyanın seviye rozetiyle sürer.
  Yetersiz altın/kristal uyarısı ve nadir "Büyü Aurası yükseldi" bildirimi korunur.

## v1.38.0 — Elit karşılaşmalar 21–30
- Sarnıç Yazmanı (`sunken_archive_9`), Tuz Ağzı, Gül Tuzu Golemi, Tuz Zırhlı Kral (`salt_bastion_5/7/9`), Rıhtım Celladı, Gece Korsanı, Islak Cam Pençesi (`obsidian_harbor_5/7/9`),
  Köpük Dişi, Karanlık Dalgıç, Gelgit Pençesi (`black_tide_5/7/9`) çizimleri; elit aşamanın `<aşama>_enemy` kimliğine bağlı. Toplam 155 çizim, 267 düşman kimliği.
  Derleme Artifact sınırında kalsın diye tüm düşman WebP'leri en fazla 400 px'e indirildi.

## v1.37.0 — Elit karşılaşmalar 11–20
- Gri Pelerin, Sarnıç Yılanı (`mist_aqueduct_7/9`), Çit Muhafızı, Diken Zırhlı Şövalye, Kuşatma Böceği (`thorn_citadel_5/7/9`), Kum Isıranı, Kızıl Akrep, Kehribar Pençe (`amber_dunes_5/7/9`),
  Mürekkep Yılanı (`sunken_archive_5`, süzülür) ve Arşiv Nöbetçisi (`sunken_archive_7`) çizimleri; elit aşamanın `<aşama>_enemy` kimliğine bağlı. Toplam 145 çizim, 257 düşman kimliği.
  Derleme Artifact sınırı içinde kalsın diye tüm düşman WebP'leri en fazla 448 px'e indirildi (düşman dokusu 240–300 px'tir).

## v1.36.0 — İlk on elit karşılaşma
- Keskin Dal Bekçisi, Kristal Boynuz, Cam Kabuklu Dev (`glass_forest_5/7/9`), Sahil Nöbetçisi, Paslı Kaptan, Dalgakıran Devi (`silent_shore_5/7/9`), Çekiç Ustası, Bakır Böcek, Vagon Kıran
  (`copper_mines_5/7/9`) ve Buhar Nöbetçisi (`mist_aqueduct_5`) çizimleri; her biri elit aşamanın `<aşama>_enemy` kimliğine bağlı. Toplam 135 çizim, 247 düşman kimliği.
  Aynı türü paylaşan diğer aşamalar kendi eşleşmelerini korur. Ödüller, denge ve kayıt değişmedi.

## v1.35.0 — Üçüncü hazine seti (10 karşılaşma)
- Aurora Emaneti (`aurora_vault_3_enemy`), Rüya Kavanozu (`dream_marsh_3_enemy`), Ayna Kutusu (`mirror_court_3_enemy`), Gözlem Sandığı (`midnight_observatory_3_enemy`),
  Güneş Çentiği (`hollow_sun_3_enemy`), Kuyruk Kristali (`comet_bridge_3_enemy`, süzülür), Mühürlü Lahit (`rune_necropolis_3_enemy`), Kubbe Kalıntısı (`shattered_sky_3_enemy`, süzülür),
  Eşik Mührü (`zero_threshold_3_enemy`, süzülür), Şafak Hazinesi (`dawn_core_3_enemy`). Karşılaşma kimliğiyle bağlanır. 25 genişleme bölgesinin hazine karşılaşmalarının hepsi artık çizimli
  (toplam 125 çizim, 237 düşman kimliği). Ödüller, istatistikler ve kayıt değişmedi.

## v1.34.0 — İkinci hazine seti (10 karşılaşma)
- Kehribar Yığını (`amber_dunes_3_enemy`), Mühürlü Katalog (`sunken_archive_3_enemy`), Kristal Ambar (`salt_bastion_3_enemy`), Kırık Çapa Sandığı (`obsidian_harbor_3_enemy`),
  Gelgit Kasası (`black_tide_3_enemy`), Ses Mührü (`echo_terrace_3_enemy`, havada salınır), Döküm Kasası (`mercury_foundry_3_enemy`), Kızıl Mantar Sandığı (`cinder_garden_3_enemy`),
  Spektrum Hazinesi (`prism_labyrinth_3_enemy`) ve Yörünge Kasası (`iron_orbit_3_enemy`) çizimleri. Bölge kimliği + hazine karşılaşması kimliğiyle bağlanır (her bölgede tek hazine aşaması).
  Toplam 115 çizim, 227 düşman kimliği. Aynı bölgelerin normal/elit/boss eşleşmeleri korunur; hazine ödülleri ve istatistikleri değişmedi.

## v1.33.0 — Seviye iksirleri: sabit XP
- İksirler seviyeden bağımsız sabit XP verir: Küçük 2.000, Orta 5.000, Büyük 20.000 (`POTION_META`, `src/data/potions.ts`). Mevcut XP sistemi üzerinden uygulanır;
  tek kullanımda birden fazla seviye atlanabilir, seviye 50'de iksir tüketilmez.
- Düşme (yalnızca dünya haritası zaferleri): küçük için zafer başına tek %70 kontrolü (başarılıysa 1 adet, %30 ihtimalle 2 adet; 2 adet %70'in içinde),
  orta oranları aynı (normal %18, elit/hazine %30, boss %45), büyük yalnızca boss zaferinde %25. Lig, Seçimli Zindanlar ve Boss Avı iksir düşürmez (değişmedi).
- Kahramanlar ekranı: her iksirin stok adedi ve sabit XP'si; seviye atlanacaksa "+20.000 XP · Sv. 1 → 12" biçiminde gerçek sonuç. Önizleme ve uygulama aynı hesabı kullanır.
  "Yaklaşık X seviye" metinleri kaldırıldı. Mevcut stoklar ve kayıtlar korunur.

## v1.32.0 — "En İyilerini Kuşan" düzeltmesi + Seviye İksirleri
- **Hata düzeltmesi:** Plan bir yüzüğü Yüzük 2'den Yüzük 1'e taşıyorsa (ör. Yüzük 2'deki güçlü yüzük + çantadan daha iyi bir yüzük) "Kuşan" "Ekipman değişti,
  öneriyi yeniden hesapla" diyerek hiçbir şey yapmıyordu. Kuşanılmış eşya artık herhangi bir yuvadan kullanılabilir sayılıyor. 300 rastgele senaryoluk taramada
  57 başarısızlık → 0. Regresyon testi eklendi (düzeltmeden önceki kodda başarısız oluyor).
- **Seviye İksirleri** (`src/data/potions.ts`, kayıt v12): küçük (≈⅓ seviye), orta (≈1,2 seviye), büyük (≈4 seviye). Her aşama zaferinde küçük iksir (%90, bazen 2 adet),
  orta iksir belli ihtimalle (normal %18, elit/hazine %30, boss %45); büyük iksir YALNIZCA boss zaferinde %30. Zafer ekranında düşenler gösterilir.
  Kahramanlar ekranının üstündeki panelden seçili kahramana uygulanır; seviye 50'de kullanılamaz. Eski kayıtlar boş iksir stoğuyla yüklenir.

## v1.31.1 — Savaşta dairesel + parlaması, +10 ilerlemesi
- Savaşta kahramanın arkasındaki dikdörtgen ışık sütunu kaldırıldı (kademe 3+ aurası); yalnızca dairesel parlama kalır. Karakter/ekipman ekranındaki görünüm değişmedi.
- +10'a ulaşan her ekipman (en çok 10) dairesel parlamayı güçlendirir ve çevresinde bir ışık parçacığı ekler; 10 ekipmanın tamamı +10 olunca
  dönen altın-beyaz çift halka ve sıcak merkez ışıması çıkar.

## v1.31.0 — İlk beş genişleme hazine karşılaşması
- Cam Kozası (`glass_forest_3_enemy`), Fener Sandığı (`silent_shore_3_enemy`), Cevher Kasası (`copper_mines_3_enemy`), Sarnıç Hazinesi (`mist_aqueduct_3_enemy`, süzülür)
  ve Dikenli Kasa (`thorn_citadel_3_enemy`) çizimleri; hepsi `treasure` aşamasının düşmanı. Toplam 105 çizim, 217 düşman kimliği.
  Aynı bölgelerin normal/elit/boss eşleşmeleri korunur. Hazine ödülleri ve istatistikleri değişmedi.

## v1.30.0 — Son beş genişleme bossu (25 genişleme bossunun tamamı çizimli)
- Köprünün Kuyruklu Muhafızı (`comet_bridge_10_enemy`), Adsız Mezar Kralı (`rune_necropolis_10_enemy`, süzülür), Gökkubbeyi Kıran Velyr (`shattered_sky_10_enemy`),
  Sıfırın Bekçisi (`zero_threshold_10_enemy`, süzülür) ve Şafağın Kalbi Aurel (`dawn_core_10_enemy`) çizimleri. Paket 1 + 2 ile birlikte 25 genişleme bossunun
  hepsi kendi çizimine bağlı (toplam 100 çizim, 212 düşman kimliği). Aynı bölgelerin normal/elit/hazine eşleşmeleri korunur.

## v1.29.0 — Paket 2: 12 bölge bossu
- Obsidyen Amiral, Kara Gelgitin Leviathanı, Bin Sesli Velora, Cıva Ustası Rhodin, Küllerin Bahçıvanı, Spektrum Muhafızı, Demir Gezegenin Kalbi (süzülür),
  Aurora Kasasının Anahtarcısı, Bataklığın Rüya Dokuyucusu, Çift Suretli Hükümdar, Yıldız Avcısı Neros ve Solgun Güneşin Yutucusu (süzülür) çizimleri;
  her biri kendi bölgesinin `<bölge>_10_enemy` boss karşılaşmasına bağlı. Paket 1 ile birlikte 25 görsel, 45 karşılaşma (toplam 95 çizim, 207 düşman kimliği).
- Uzun mızrak/anahtar/kılıç/yay uçlarının sahne üst kenarında kesilmemesi için boss boyları 0,62–0,68'e ayarlandı.

## v1.28.0 — 13 görsel, 33 karşılaşma (5 normal düşman + 8 bölge bossu)
- Normal (bölge başına 5 karşılaşma: aşama 1, 2, 4, 6, 8): Kuyruklu Buz Golemi (`comet_bridge`), Rün Yağmacı (`rune_necropolis`), Kırık Boşluk Avcısı (`shattered_sky`),
  Sıfır Boşluk Avcısı (`zero_threshold`), Şafak Ateş Ruhu (`dawn_core`, süzülür).
- Boss (`<bölge>_10_enemy`): Camorman Bekçisi, Sönük Fenerin Bekçisi, Bakır Yürekli Golem, Sisin Mimarı (süzülür), Diken Tacı, Altın Kabuklu Mahrak,
  Derinliklerin Arşivcisi, Surların Beyaz Muhafızı. Toplam 70 → 83 çizim, 162 → 195 düşman kimliği. Hazine/elit karşılaşmaları kendi görsellerini korur.

## v1.27.0 — Dördüncü beşli düşman seti (25 karşılaşma)
- Kutup Buz Golemi (`aurora_vault`), Düş Ağaç Ruhu (`dream_marsh`), Ayna Boşluk Avcısı (`mirror_court`), Gece Boşluk Avcısı (`midnight_observatory`) ve
  Sönük Ateş Ruhu (`hollow_sun`) çizimleri; her biri kendi bölgesinin 5 normal karşılaşmasına (aşama 1, 2, 4, 6, 8; `<bölge>_<no>_enemy`) bağlı:
  toplam 25 kimlik, 5 dosya (şimdiye kadar 70 çizim, 162 düşman kimliği). Ayna ve Gece Boşluk Avcıları aynı türü paylaşsa da ayrı çizim kullanır.
  Hazine/elit/boss düşmanları kendi görsellerini korur. Sönük Ateş Ruhu süzülür, diğerlerinin temas noktası sabit.

## v1.26.0 — Üçüncü beşli düşman paketi (25 karşılaşma)
- Yankı Boşluk Avcısı (`echo_terrace`), Cıva Ateş Ruhu (`mercury_foundry`), Kor Semender (`cinder_garden`), Prizma Taş Nöbetçi (`prism_labyrinth`) ve
  Demir Yağmacı (`iron_orbit`) çizimleri. Her çizim kendi bölgesinin 5 normal karşılaşmasına (aşama 1, 2, 4, 6, 8; `<bölge>_<no>_enemy`) bağlıdır:
  toplam 25 kimlik, 5 dosya (şimdiye kadar 65 çizim, 137 düşman kimliği). Aynı bölgenin hazine/elit/boss düşmanları kendi görsellerini korur.
- Ortak bekleme nefesi bu düşmanlarda da çalışır; Cıva Ateş Ruhu süzülür, diğer dördünün ayak/pençe noktası sabit. Saldırı/hasar sonrası döngüye dönüş 1× ve 2×'te doğrulandı.

## v1.25.0 — Sıradaki beş genişleme düşmanı (25 karşılaşma)
- Kehribar Semender (`amber_dunes`), Batık Yağmacı (`sunken_archive`), Tuz Taş Nöbetçi (`salt_bastion`), Obsidyen Yağmacı (`obsidian_harbor`) ve
  Kara Boşluk Avcısı (`black_tide`) çizimleri. Her çizim kendi bölgesinin 5 normal karşılaşmasına (aşama 1, 2, 4, 6, 8; `<bölge>_<no>_enemy`) bağlıdır:
  toplam 25 kimlik, 5 dosya (şimdiye kadar 60 çizim, 112 düşman kimliği). Aynı bölgenin hazine/elit/boss düşmanları kendi görsellerini korur.
- Ortak bekleme nefesi (v1.24.0) bu düşmanlarda da çalışır; ayak/pençe sabit, saldırı/hasar sonrası döngüye dönüş 1× ve 2×'te doğrulandı.

## v1.24.0 — Beş yeni bölge düşmanı (25 karşılaşma) + tüm düşmanlara ortak nefes
- **Yeni çizimler:** Cam Ağaç Ruhu (`glass_forest`), Sessiz Yağmacı (`silent_shore`), Bakır Yağmacı (`copper_mines`), Sis Boşluk Avcısı (`mist_aqueduct`) ve
  Diken Kurt (`thorn_citadel`). Her çizim kendi bölgesinin 5 normal karşılaşmasına (aşama 1, 2, 4, 6, 8; `<bölge>_<no>_enemy`) bağlıdır: toplam 25 kimlik, 5 dosya.
  Aynı bölgenin hazine/elit/boss düşmanları (aynı türü paylaşsalar da) kendi görsellerini korur.
- **Ortak bekleme nefesi** (`startEnemyIdle`): normal, elit, hazine ve boss; özel çizimli ve eski vektör çizimli (yedek) tüm düşmanlar. Esneme %1,5, döngü
  2,5–4 sn (özel `breathSec` varsa o, yoksa 3,0 / boss 3,6 sn). Temas noktası (ayak/kök/pençe) sabit; havada duran düşmanlarda süzülme nefese eşlik eder
  (eski çizimlerde gök/hiçlik/ateş ruhu türleri). Aynı düşmanda tek döngü çalışır.
- Hasar alma, düşman saldırısı ve faz geçişinde nefes durur, ardından düşman hayattaysa yumuşakça devam eder; zafer ve sahne kapanışında temizlenir.
  Dünya Haritası ve Seçimli Zindanlar'da aynı davranış; 1×/2× zamanlaması ve tahta/HUD yerleşimi değişmedi.

## v1.23.0 — Beş bölge bossunun yeni çizimleri
- Yaban Kalbi Ordun (`forest_lord`, `forest_8_enemy`), Buz Devi Kralı Skrymir (`frost_giant_king`, `mountains_8_enemy`), Magma İmparatoriçesi Vhara
  (`magma_empress`, `volcano_8_enemy`), Rün İmparatoru Kaelos (`rune_emperor`, `ruins_8_enemy`) ve Uçurum İmparatoriçesi Nirvaya (`abyss_empress`, `abyss_8_enemy`)
  için şeffaf çizimler (`src/art/enemies`). Eşleştirme render'ın kullandığı `enemy.id` ile yapılır; ortak tür üzerinden değil.
- Kadim Orman Muhafızı, Elit Buzul Dev Avcısı, Elit Magma Lordu ve Uçurum Kralı Malakor kendi çizimlerini korur; önceki 45 çizim eşleştirmesi değişmedi (toplam 50 çizim, 62 düşman kimliği).
- Nirvaya hafif süzülür; diğer dördünün ayağı sabit. Boylar sahne yüksekliğine sığacak şekilde ≤ %76. Boss portresi (`BossPortrait`) aynı çizim yolunu kullanır.

## v1.22.0 — Genişleme bölgelerindeki 20 düşmanın yeni çizimleri
- Dikenli Yaban Domuzu, Kutsal Koru Bekçisi, Buzul Dev Avcısı, Magma Fenrisi, Uçurum Celladı, Gök Hazine Kartalı, Bulut Kartalı, Fırtına Şövalyesi,
  Deniz Yılanı, Çöl Akrebi, Mumya Muhafız, Sis Cadısı, Ay Kurdu, Elmas Golem, Kül Zombisi, Zaman Kurdu, Kan Yarasası, Buz Ejderi Yavrusu,
  Yavru Ejderha ve Kaos Lordu çizimleri (`src/art/enemies`, anahtar = şablon adı).
- Şablonla üretilen düşmanlara aşama başına kimlikle (`<bölge>_<no>_enemy`) bağlandı: 34 düşman kimliği 20 çizimi paylaşır. Aynı şablonun tekrarlandığı
  aşamalar (ör. Bulut Kartalı normal + Elit, Fırtına Şövalyesi ×2, Buz Ejderi Yavrusu ×3) aynı çizimi kullanır; Elit varyantı %8 büyük çizilir.
  Yalnızca türü paylaşan diğer düşmanlar (ör. gerçek bölge bossları, İnci Sandığı Bekçisi) eski çizimini korur.
- Not: Dikenli Yaban Domuzu, Buzul Dev Avcısı, Magma Fenrisi, Uçurum Celladı (Elit) ile Kutsal Koru Bekçisi ve Gök Hazine Kartalı (Hazine) oyunda boss değil;
  bölge bossları (Yaban Kalbi Ordun vb.) bu pakette yok ve değişmedi. Elit/hazine karşılaşmaları normal düşmandan büyük çizildi.
- Karada duranlarda ayak sabit nefes; Bulut Kartalı, Gök Hazine Kartalı, Kan Yarasası ve Sis Cadısı hafif süzülür. Silüeti izleyen ışıma, mevcut efektler,
  1×/2× zamanlaması ve yalnızca aktif düşmanın görselinin yüklenmesi korunur.

## v1.21.2 — Savaş sonu ekranında "Ana Menüye Dön"
- Dünya haritasındaki bir aşamayı kazandığında ya da kaybettiğinde sonuç ekranında "Haritaya Dön" yanında "Ana Menüye Dön" düğmesi çıkar.
  Zindan, boss avı ve lig savaşlarında sonuç ekranı değişmedi (onların kendi dönüş akışı var).

## v1.21.1 — Düşman arkasındaki dairesel renk lekeleri kaldırıldı
- Çizimli düşmanların arkasındaki dairesel boss aurası (zayıflık rengi/öfkede kırmızı dolu daire) ve dairesel kristal ışıması kaldırıldı.
- Yerine çizimin SİLÜETİNİ izleyen yumuşak ışıma geldi (`createEnemyGlowTexture`): ışık yalnızca konturdan taşar, çizimle birlikte nefes alır/süzülür.
  Boss'ta renk zayıflık rengidir, öfkede kırmızıya döner; normal düşmanda düşmanın kristal rengi. Düşman yenilince kapanır.
- Bu yol tüm çizimli düşmanlar için ortaktır: `ENEMY_ART_LAYOUT`'a eklenen yeni düşman çizimleri ayrıca ayar yapmadan aynı ışımayı alır.
  Çizimsiz düşmanlar eski görünümünü korur.

## v1.21.0 — 21 düşmanın yeni savaş çizimleri
- Gölge Kurdu, Yosun Hazine Muhafızı, Kadim Orman Muhafızı (boss), Buzul Kurdu, Dağ Yetisi, Buz Hazine Golemi, Elit Kadim Buz Golemi, Ateş Semenderi,
  Alev Elementali, Obsidyen Hazine Ruhu, Elit Magma Lordu, Cehennem Ejderhası (boss), Kadim Taş Gözcü, Hiçlik İzleyicisi, Prizma Mahzen Bekçisi,
  Kristal Titan (boss), Uçurum Akıncısı, Elit Kaos Golemi, Kaos Hazine Bekçisi, Elit Uçurum Generali ve Uçurum Kralı Malakor (boss) için şeffaf çizimler.
- Çizimler düşman KİMLİĞİNE bağlıdır (dosya adı = kimlik, `src/art/enemies`); aynı arketipi paylaşan diğer düşmanlar (ör. `forest_6_enemy`) eski çizimini korur.
  Önceki setten Goblin Yağmacısı, Elit Dikenli Ağaç, Buz Kraliçesi ve Gölge İblisi yeni çizimlerini kullanmaya devam eder (toplam 25).
- Sola dönük çizimler aynalanmadan kahramana bakar. Her düşmanın boyu/genişliği/zemin hizası `src/data/enemyArt.ts` içinde silüetine göre ayarlı;
  bosslar normal düşmanlardan hem daha büyük dokuda hem de daha yüksek çizilir ama tahtaya/HUD'a taşmaz.
- Karada duranlarda ayak sabit, ~3 sn %1,5 nefes; havada duran ruh/elementallerde (Alev Elementali, Obsidyen Hazine Ruhu, Hiçlik İzleyicisi) hafif süzülme.
  Hafif kristal parlaması, mevcut saldırı/hasar/yenilgi efektleri ve 1×/2× zamanlaması aynen korunur. Savaşta yalnızca karşılaşmadaki düşmanın görseli yüklenir.

## v1.20.0 — Zorluk: nadir eşyalar zor düşer, düşmanlar geç oyunda sert vurur; + parlaması yeni çizimlere göre
- **Eşya düşüşü** (`src/data/loot.ts`): Efsanevi/Mitik çok daha nadir. Seviye 30–41 aşamalarında Efsanevi %34 → %7,5, Mitik %10 → %0,5;
  seviye 22–29'da Efsanevi %27 → %5, Mitik kalktı; 12–21'de %14 → %3. Boss/elit "garanti" artık Destansı+ tabandır; bildirilen Efsanevi %12,
  Mitik %3 (Efsanevi %15) şansla düşer. Haritadaki "Garanti Ganimet" yazısı buna göre güncellendi.
- **Görevler:** Boss görevlerinin eşya ödülü bir kademe düştü. Kolay sayaç görevleri Destansı'ya indi; Efsanevi/Mitik ödül yalnızca uzun hedeflerde kaldı
  (500 savaş kazan, 200/400 aşama temizle, 40 boss, 300 yetenek, 150 geliştirme, 25 Destansı+ eşya, 22 kahraman). Daha önce alınmış ödüller etkilenmez.
- **Düşman gücü** (`src/data/difficulty.ts`): Geç oyunda düşman canı tabanı tam efsanevi setli kahramanın hasarına bağlandı (seviye 8'den itibaren
  kademeli); saldırı ×3'e kadar artar; ve her vuruş savunma ne olursa olsun kahramanın en yüksek canının en az %9'unu (boss %14) götürür
  (seviye 10–30 arası kademeli). `npm run sim:gear` tam setli kahramanı ölçer: seviye 36'da efsanevi sette boss 3–5 hamle → ~10–12 hamle,
  destansıda ~20, nadirde ~28; ekipmansız kahraman 25+ seviyede boss'ta kaybeder.
- **+ parlaması:** Ekipman aura'sı çizimli 22 kahramanın boyuna/genişliğine göre ölçeklenir ve gövdenin ortasında durur (eski çizimin ölçüsüne göre
  küçük kalıp çizimin arkasında kalıyordu). Ön yarı zerreler, ön rune yayı ve hafif ışıma çizimin ÖNÜNDE çizilir; rune halkası yere yassı çizilir, ışık sütunu
  tüm boyu kaplar, altın hale başın üstüne oturur. Ejder Formu eski vektör çizim ve eski aurasını korur.

## v1.19.1 — Kahramanlar sekmesi: tüm çizimler açılışta görünür
- Kahramanlar sekmesindeki kartlar artık kilitli/açık ayrımı olmadan 22 kahramanın tam boy çizimini gösterir (yüz portresi kaldırıldı).
  Görseller yüklenmeden çizilen kartlar boş kalıyor, dokununca görünüyordu; görsel yüklenince kart yeniden çizilir.
- Kilitli kartlarda çizim karartılmaz; kilit simgesi küçük bir rozet olarak köşede durur. Kart görseli 64 → 72 px.

## v1.19.0 — Dört düşmanın yeni savaş çizimleri
- Goblin Yağmacısı (`goblin_raider`), Elit Dikenli Ağaç (`elder_treant`), Buz Kraliçesi (`boss_frost_queen`) ve Gölge İblisi (`boss_shadow_demon`)
  için şeffaf, köşeli kristal tarzı çizimler savaşta ve boss kartlarında kullanılır. Çizim düşman KİMLİĞİNE bağlıdır: normal ağaç, kaya muhafızı,
  uçurumdaki gölge iblisi gibi aynı türü paylaşan düşmanlar eski çizimlerini korur.
- Çizimler sola dönüktür, kahramana bakar, aynalanmaz. Her düşmanın ölçeği ve zemin hizası kendi silüetine göre ayarlıdır (`src/data/enemyArt.ts`).
- Mevcut bekleme, saldırı, hasar ve yenilgi efektleri aynen çalışır. Beklemede ayak/kök çizgisinde sabit, ~3 sn'lik %1,5 nefes ve düşük yoğunluklu
  kristal parlaması vardır. Görsel yüklenene kadar eski çizim yedek olarak gösterilir. Düşman değerleri, boss fazları, ödüller ve kayıtlar değişmedi.

## v1.18.0 — On yaratık kahramanın yeni çizimleri
- Peri (`fairy`), Ruh Tilkisi (`kitsune`), Naga (`naga`), Siren (`siren`), Minotor (`minotaur`), Kristal Golem (`golem`), Anka (`phoenix`),
  Cin (`djinn`), İblis (`demon`) ve Serafim (`seraph`) için şeffaf çizimler seçim ekranı, menü ve savaşta kullanılır. Kimlik, yetenek, istatistik,
  açılma koşulu, ekipman ve kayıtlar değişmedi. Yoldaş Buz Tilkisi kendi görselini kullanmaya devam eder.
- Peri çiziminin gömülü gri sisi temizlendi. Ayaklı kahramanların ayakları sabit, havadakiler (Peri, Anka, Cin, Serafim) hafif süzülür;
  mevcut nefes, parlama, saldırı ve hasar efektleri aynen çalışır. Ölçek/hizalama kahraman başına `src/data/heroArt.ts` içinde ayarlanır.
- Savaşta ve menüde yalnızca gösterilen kahramanın tam boy görseli yüklenir (önceden hepsi açılışta istenirdi). Kahraman sınıfları listesindeki küçük
  kartlar yeni 10 kahraman için yüz kadrajlı 128 px portre kullanır.

## v1.17.0 — Sekiz kahramanın yeni çizimleri
- Savaşçı, Şövalye, Korucu, Büyücü, Nekromant, Suikastçı, Fırtına Çağıran ve Ejder Kalbi (Rhogar) için şeffaf PNG çizimler
  seçim ekranında, menüde ve savaşta kullanılır. Sınıf kimlikleri aynı olduğundan seviye, ekipman, yetenek, yoldaş ve açılma durumu eski kayıtlardan aynen gelir.
- Silah ve zırh çizimin üzerindedir; ekipman hesaplara girmeye devam eder ama görselde ikinci bir silah/zırh katmanı çizilmez.
- Ayaklar ortak yer çizgisine hizalanır (`src/art/heroes/meta.json`). Bekleme nefesi ayak çizgisinde sabitlenmiş ~3 sn, %1,5 esnemedir;
  sınıf renginde düşük yoğunluklu parlama arayüzün altında kalır.
- Saldırı, hasar alma ve ulti animasyonları nefesten önceliklidir; bitince kahraman yumuşakça nefes döngüsüne döner (1× ve 2×).
- Rhogar'ın yeni çizimi normal formudur; Ejder Formu mevcut kanatlı çizimi ve dönüşüm akışını kullanır.

## v1.16.0 — Dört yeni kahraman: Kurt Adam, Vampir, Kocaayak, Gecenin Çığırtkanı
- Şeffaf tam boy görseller (`src/art/heroes`) kahraman seçim ekranında ve savaşta kullanılır; oran korunur, ayaklar yer çizgisine oturur,
  Gecenin Çığırtkanı hafifçe havada durur. Bekleme/saldırı/hasar animasyonları mevcut kapsayıcı katmanda aynen çalışır.
- Kurt Adam (Av yükü, Pençe Darbesi, Dolunay Hücumu), Vampir (Kan Bağı, Yakut Kesik, Kızıl Düello), Kocaayak (Sağlam Duruş, Kaya Siperi,
  Orman Sarsıntısı), Gecenin Çığırtkanı (Gece Yankısı, Yankı Dalgası, Hilal Çığlığı). Tüm değerler `src/data/imageHeroes.ts` içinde ayarlanır;
  mantık `src/game/heroKits.ts` içindedir. Kurt Adam ve Vampir eski kimliklerini (ve yetenek ağacı yatırımlarını) korur.
- Açılma şartları başarıyla: Büyülü Orman tamamlanınca / Karanlık Uçurum'un son boss'u / Köklerin Mahzeni'nin son savaşı / genel sıradaki 100. aşama.
  Eski kayıtlarda yüklemede otomatik tanınır ("… kahramanı açıldı!"). Seçim ekranı rolü, pasifi, yeteneği, ultiyi ve açılma şartını gösterir.
- Gecenin Çığırtkanı geciktirmesi aynı eylem için toplamda en fazla 1 tur; niyet göstergesi hemen güncellenir; geciktirme "ağır saldırıyı engelle"
  ustalık hedefini tamamlamaz. Savaş ekranında Kurt Adam için Av yükü göstergesi.

## v1.15.1 — Kilitli 2× düğmesi ipucu
- Savaşta kilitli 2× düğmesine dokununca "Dünya Haritası 100. seviyede açılır" yazısı çıkar ve 2 saniye sonra kaybolur (hız 1× kalır).

## v1.15.0 — 1× / 2× savaş hızı
- Dünya Haritası'ndaki genel sıraya göre 100. aşama tamamlanınca 2× hız kalıcı açılır (`src/data/battleSpeed.ts`); 100. ya da sonraki bir aşaması
  tamamlanmış eski kayıtlarda yüklemede otomatik açılır. Açılışta "2× savaş hızı açıldı!" bildirimi bir kez gösterilir. Kayıt sürümü 11.
- Savaş ekranında "1× / 2×" düğmesi (kilitliyken kilit simgeli): tüm savaş modlarında ve eski aşamalarda çalışır, varsayılan 1×, son tercih kaydedilir.
- 2×: sahne zaman ölçeği (taş takası, patlama, düşme, saldırılar, efektler, bekleme süreleri, kamera efektleri) iki katına çıkar. Animasyon sürerken
  basılırsa değişiklik hamlenin çözümlemesi bitince uygulanır; hareket eden taşlara yeni hamle verilemez. Menü ve açıklama pencereleri normal hızdadır.
- Savaş kuralları hızdan bağımsızdır: tahta rastgeleliği (`rng`) ile savaş kararları (`combatRng`: kritik, sıyrılma, düşman planı) ayrı akışlardır ve
  kritik kararı efekt zamanlamasına bağlı değildir. Aynı tahta, tohum ve hamle dizisiyle 1× ve 2× sonuçları birebir aynıdır.
- Düzeltme: kayıtlı 2× tercihiyle savaşa girerken sahne kurulmadan hız istendiği için ekranın boş kalması önlendi.

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
