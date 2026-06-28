# Web Creator App

Angular + Firebase odakli, WordPress/Drupal benzeri bir site olusturucu MVP'si.

## Bu surumde neler var

- Rol bazli giris: `superadmin`, `admin`, `moderator`, `visitor`
- Giris yapmadan public site olusturma akisi
- Sol panelden generic component ekleme
- Hazir section setleri, favori componentler ve son kullanilan component kisayollari
- Sayfa olusturma ve route mantigi
- Block siralama, silme, tiklayarak secme, undo/redo ve versiyon snapshotlari
- Tema presetleri, custom temalar, buton/kart/spacing ozellestirmeleri
- SEO, medya kutuphanesi, yayin kontrol listesi ve maliyet politikasi
- Site seviyesinde uyelik modu: herkese acik, sadece giris, kayit ve giris
- TR/EN ve ek diller icin path/slug ayarlari
- Site basina coklu hosting hedefi kaydi
- Custom domain DNS durum notlari
- Web, tablet, mobil builder gorunumleri
- Yayin talebi gonderme, admin/superadmin onayi ve yayin durdurma
- Kullanici ve superadmin dashboardlari
- Lead, medya, SEO ve maliyet ozetli siteye ozel admin dashboardu
- Superadmin simulasyon modu ve islem gecmisi
- Public site gorunumu

## Demo hesaplar

- `owner@webcreator.dev` / `Owner123!`
- `admin@webcreator.dev` / `Admin123!`
- `moderator@webcreator.dev` / `Mod123!`

## Kurulum

```bash
npm install
npm start
```

Uygulama varsayilan olarak `http://localhost:4200` adresinde calisir.

## Dokumanlar

- [Kullanim Dokumani](docs/USAGE.md)
- [Business Dokumani](docs/BUSINESS.md)
- [Firebase Kurulumu](docs/FIREBASE.md)

## Onerilen production stack

MVP icin en dusuk operasyon maliyetli yol Firebase ile devam etmektir. Bu repo `web-creator-anilyilmaz` Firebase projesine baglandi. Firebase config kaynak kodda tutulmaz; local runtime config `.gitignore` icindeki `public/firebase-config.js` dosyasindan okunur.

Firebase komutlari:

```bash
npm run firebase:bootstrap
npm run functions:build
npm run firebase:deploy:functions
npm run firebase:deploy:hosting
npm run firebase:deploy:firestore
npm run firebase:deploy
```

Mevcut Firebase entegrasyonu:

1. Auth icin Firebase Authentication destekli servis
2. Site, sayfa, block, kullanici ve audit log verileri icin Firestore sync
3. Firestore security rules ile uid/role bazli yetkilendirme
4. Firebase Hosting config ve multi-site hedefine hazir yapi

Sonraki iterasyonda:

1. Gorsel yukleme icin Firebase Storage
2. Firebase Hosting deploy tetigi ve sure sonu kontrolleri icin Cloud Functions/CI otomasyonu
3. Shared-route yayin stratejisini varsayilan tutup dedicated hosting'i premium plana alma
4. Form cevaplari icin webhook/e-posta entegrasyonu
5. Kota asimi ve butce uyarilarini otomatik bildirimlere baglama

NextJS + Docker su asamada zorunlu degildir; ozel deploy orchestration, faturalama veya PostgreSQL raporlama ihtiyaci artarsa ikinci fazda eklenebilir.

## Mimari notu

- `src/app/core`: modeller, guardlar, store ve servisler
- `src/app/features`: login, dashboard, builder, review, public create, public site ve site admin ekranlari
- `src/app/shared`: generic site renderer

Bu yapi, ileride yeni generic component tipleri eklendikce buyutulecek sekilde tasarlandi.
