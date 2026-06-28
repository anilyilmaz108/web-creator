# Firebase Kurulumu

Bu proje icin Firebase projesi olusturuldu:

- Project ID: `web-creator-anilyilmaz`
- Display name: `Web Creator`
- Web app: `web-creator-web`
- Web app ID: `1:310189531670:web:e9ab1f38a3b739cdaccb37`
- Default Hosting site: `web-creator-anilyilmaz`
- Hosting URL: `https://web-creator-anilyilmaz.web.app`
- Firestore location: `europe-west3`
- Firestore edition: Standard, free tier aktif

## Yerel Dosyalar

- `.firebaserc`: Firebase default project ve Hosting target
- `firebase.json`: Angular build cikti klasoru, SPA rewrite, cache headerlari ve Firestore dosyalari
- `firestore.rules`: Firebase Auth/role tabanli guvenli baseline
- `firestore.indexes.json`: Su an ek composite index gerekmiyor
- `src/environments/environment.ts`: Web SDK config

## Komutlar

```bash
npm run firebase:deploy:hosting
npm run firebase:deploy:firestore
npm run firebase:deploy
```

## Onemli Guvenlik Notu

MVP uygulamasinda rol/session akisi su anda frontend mock auth ve `localStorage` ile calisiyor. Bu yuzden `environment.firebaseEnabled` varsayilan olarak `false`.

Firestore kurallari gercek Firebase Authentication uid ve rol dokumanlari bekler:

- `platformUsers/{uid}`: platform rolleri (`admin`, `superadmin`)
- `siteMembers/{siteId}/members/{uid}`: site rolleri (`owner`, `admin`)
- `sites/{siteId}`: site dokumani, create icin `ownerUid`
- `auditLogs/{logId}`: islem gecmisi
- `publicationRequests/{requestId}`: yayin talepleri

Production'a gecmeden once Firebase Authentication, uid tabanli owner/member modeli ve admin operasyonlari icin Cloud Functions veya guvenli bir backend eklenmelidir.

## Coklu Hosting

Her musterinin sitesini ayri Firebase Hosting site olarak yayinlamak icin:

```bash
firebase hosting:sites:create customer-site-id --project web-creator-anilyilmaz
firebase target:apply hosting customer-site customer-site-id --project web-creator-anilyilmaz
firebase deploy --only hosting:customer-site --project web-creator-anilyilmaz
```

Bu MVP'de siteye ozel hosting hedefleri uygulama icinde metadata olarak tutulur. Gercek deploy otomasyonu icin Cloud Functions veya CI/CD pipeline bir sonraki fazda eklenmelidir.
