# Firebase Kurulumu

Bu proje icin Firebase projesi olusturuldu:

- Project ID: `web-creator-anilyilmaz`
- Display name: `Web Creator`
- Web app: `web-creator-web`
- Default Hosting site: `web-creator-anilyilmaz`
- Hosting URL: `https://web-creator-anilyilmaz.web.app`
- Firestore location: `europe-west3`
- Firestore edition: Standard, free tier aktif

## Yerel Dosyalar

- `.firebaserc`: Firebase default project ve Hosting target
- `firebase.json`: Angular build cikti klasoru, SPA rewrite, cache headerlari ve Firestore dosyalari
- `firestore.rules`: Firebase Auth/role tabanli guvenli baseline
- `firestore.indexes.json`: Su an ek composite index gerekmiyor
- `src/environments/environment.ts`: Gercek Firebase anahtari icermez
- `public/firebase-config.example.js`: Paylasilabilir ornek runtime config
- `public/firebase-config.js`: Gercek runtime config, `.gitignore` icinde tutulur

## Komutlar

```bash
npm run firebase:bootstrap
npm run functions:build
npm run firebase:deploy:functions
npm run firebase:deploy:hosting
npm run firebase:deploy:firestore
npm run firebase:deploy
```

## Runtime Config

Firebase web config degerleri frontend tarafinda gizli kabul edilmez; tarayiciya giden her web app config kullanici tarafindan gorulebilir. Bu repo yine de gercek config degerlerini kaynak koddan uzak tutar:

1. `environment.ts` icinde gercek Firebase bilgisi yoktur.
2. Local calisma icin `public/firebase-config.js` kullanilir.
3. Bu dosya `.gitignore` icindedir.
4. Yeni ortamda `public/firebase-config.example.js` kopyalanip doldurulur.

Gercekten gizli kalmasi gereken islemler Cloud Functions, NextJS API veya baska bir guvenli backend uzerinde Firebase Admin SDK ile calismalidir.

## Auth Bootstrap

Firebase Authentication icin Console'da bir kez ilk kurulum gerekir:

1. Firebase Console > `Authentication` > `Get started`.
2. `Sign-in method` ekraninda `Email/Password` providerini acin.
3. Public site olusturma icin `Anonymous` providerini acin.
4. Ardindan asagidaki komutu calistirin:

```bash
npm run firebase:bootstrap
```

Bu komut demo hesaplarini Firebase Auth'a ekler ve Firestore'da `platformUsers/{uid}` rol dokumanlarini olusturur.

## Cloud Functions Backend

`functions/` klasoru hassas operasyonlari Firebase Admin SDK ile server tarafina tasimak icin eklendi.

Runtime: Node.js 22, region: `europe-west3`.

Callable function'lar:

- `createPlatformUser`: Auth kullanicisi ve `platformUsers/{uid}` profilini olusturur.
- `updatePlatformUserRole`: Rol dokumanini ve custom claim'i gunceller.
- `requestPublication`: Siteyi yayin onay kuyruguna alir.
- `approvePublication`: Siteyi belirli sureyle yayinlar ve hosting metadata'sini aktifler.
- `rejectPublication`: Yayin talebini reddeder.
- `stopPublication`: Yayini durdurur, aktif hostingleri paused yapar.
- `writeClientAuditLog`: Client tarafindan gelen onemli aktiviteleri server tarafinda loglar.

Tum backend operasyonlari `auditLogs` koleksiyonuna superadmin icin islem gecmisi yazar.

`requestPublication` ve `approvePublication` artik bloklayici maliyet/kota kontrolleri de yapar:

- Medya kullanimi site limitini asarsa islem `failed-precondition` ile durur.
- `shared-route` modunda birden fazla hosting hedefi varsa islem durur.
- `dedicated-hosting` modunda hic hosting hedefi yoksa islem durur.

Bu bloklamalar audit log'a `publication.blocked.cost` veya `publication.approval.blocked.cost` olarak yazilir.

Deploy notu: Cloud Functions production deploy icin Firebase projesinin Blaze planinda olmasi gerekir. Blaze acilmadan emulator ve local build calisir, production deploy calismaz.

Firebase CLI deploy sonunda build image cleanup uyarisi verebilir. Redeploy tekrar denendi; uyari devam ederse asagidaki Cloud Console ekranindan eski `gcf` build image'lari manuel temizlenmelidir:

`https://console.cloud.google.com/gcr/images/web-creator-anilyilmaz/eu/gcf`

## Onemli Guvenlik Notu

Auth servisi Firebase etkinse Firebase Authentication ile calisir; Firebase kapaliysa lokal demo akisina geri dusebilir. Production'da lokal fallback kapali tutulmali ve admin islemleri Firebase Auth uid'leriyle yurutulmelidir.

Firestore kurallari gercek Firebase Authentication uid ve rol dokumanlari bekler:

- `platformUsers/{uid}`: platform rolleri (`admin`, `superadmin`)
- `siteMembers/{siteId}/members/{uid}`: site rolleri (`owner`, `admin`)
- `sites/{siteId}`: site dokumani, create icin `ownerUid` ve `ownerId`
- `auditLogs/{logId}`: islem gecmisi
- `publicationRequests/{requestId}`: yayin talepleri

Kullanici olusturma su anda Firebase client SDK ile secondary app uzerinden yapilir ve rol dokumani Firestore kurallariyla korunur. Daha sert production modeli icin kullanici olusturma, rol atama, deploy ve hosting provision islemleri Cloud Functions veya NextJS API tarafina alinmalidir.

## Coklu Hosting

Maliyet dusuk kalsin diye varsayilan model `shared-route` olabilir:

- Tek Firebase Hosting site: `web-creator-anilyilmaz.web.app`
- Her musteri sitesi public route ile yayinlanir: `/sites/:slug`
- Firestore dokumaninda `publication.publishedUrl` ve `costPolicy.deployStrategy` tutulur.
- Dedicated hosting sadece custom domain, premium paket veya izolasyon ihtiyacinda acilir.

Her musterinin sitesini ayri Firebase Hosting site olarak yayinlamak icin:

```bash
firebase hosting:sites:create customer-site-id --project web-creator-anilyilmaz
firebase target:apply hosting customer-site customer-site-id --project web-creator-anilyilmaz
firebase deploy --only hosting:customer-site --project web-creator-anilyilmaz
```

Bu MVP'de siteye ozel hosting hedefleri uygulama icinde metadata olarak tutulur. Gercek deploy otomasyonu icin Cloud Functions veya CI/CD pipeline bir sonraki fazda eklenmelidir.

## Maliyet Dostu Ayarlar

- `costPolicy.mediaLimitMb`: Site bazli medya kotasi.
- `costPolicy.auditRetentionDays`: Audit log saklama suresi.
- `costPolicy.monthlyFunctionBudget`: Function kullanimi icin takip edilecek aylik butce.
- `costPolicy.summaryFirstReads`: Dashboardlarda once ozet veri okunmasi.

Bu alanlar Firestore dokumaninda tutulur; ileride Cloud Functions tarafinda kota kontrolu ve otomatik uyarilar icin kullanilabilir.
Mevcut callable publish/onay akisi temel bloklayici kota kontrollerini backend tarafinda enforce eder.
