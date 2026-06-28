# Web Creator App

Angular + Firebase odakli, WordPress/Drupal benzeri bir site olusturucu MVP'si.

## Bu surumde neler var

- Rol bazli giris: `superadmin`, `admin`, `moderator`, `visitor`
- Sol panelden generic component ekleme
- Sayfa olusturma ve route mantigi
- Block siralama, silme ve secili block duzenleme
- Tema presetleri ve temel tema ayarlari
- Site seviyesinde uyelik modu: herkese acik, sadece giris, kayit ve giris
- TR/EN ve ek diller icin path/slug ayarlari
- Site basina coklu hosting hedefi kaydi
- Web, tablet, mobil preview modlari
- Yayin talebi gonderme ve superadmin onay kuyrugu
- Kullanici ve superadmin dashboardlari
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

## Onerilen production stack

MVP icin en dusuk operasyon maliyetli yol Firebase ile devam etmektir. Bu surumde veri kaynagi olarak `localStorage` kullanan mock servisler bulunuyor. Sonraki iterasyonda:

1. Auth icin Firebase Authentication
2. Site, sayfa, block ve kullanici verileri icin Firestore
3. Gorsel yukleme icin Firebase Storage
4. Yayin istekleri, Firebase Hosting deploy tetigi ve sure sonu kontrolleri icin Cloud Functions

NextJS + Docker su asamada zorunlu degildir; ozel deploy orchestration, faturalama veya PostgreSQL raporlama ihtiyaci artarsa ikinci fazda eklenebilir.

## Mimari notu

- `src/app/core`: modeller, guardlar, store ve servisler
- `src/app/features`: login, dashboard, builder, preview, review, public site ekranlari
- `src/app/shared`: generic site renderer

Bu yapi, ileride yeni generic component tipleri eklendikce buyutulecek sekilde tasarlandi.
