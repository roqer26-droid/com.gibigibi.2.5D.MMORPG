# Android (APK)

Oyun web uygulaması olarak kalır; Capacitor onu Android kabuğuna sarar. Kod tek yerde: `src/`.

## APK almanın yolları
1. **GitHub Actions (önerilen):** `Actions > Android APK > Run workflow`. Bitince çıktıdaki
   `legendary-gems-v<sürüm>-apk` dosyasından `app-debug.apk` indirilir (telefona kurulabilir).
2. **Yerelde:** Android Studio + JDK 21 kurulu olsun, sonra `npm run android:apk`
   (çıktı: `android/app/build/outputs/apk/debug/app-debug.apk`) ya da `npm run android:open`.

## Sürüm akışı
1. `npm version minor --no-git-tag-version`
2. `npm run release` (tek dosya web yedeği: `releases/`)
3. `npm run android:sync` sürümü Android'e aktarır (versionName / versionCode).

## Mağaza için sonra yapılacaklar
- İmzalı release/AAB için keystore oluşturulacak (bu repoya konmaz).
- Uygulama ikonu ve açılış ekranı özelleştirilecek (şu an Capacitor varsayılanı).
