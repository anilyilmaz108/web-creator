# Web Creator App

Angular + Firebase tabanli, WordPress benzeri bir site olusturucu icin hazirlanmis ilk urun iskeleti.

## Bu surumde neler var

- Rol bazli giris: `superadmin`, `admin`, `moderator`, `visitor`
- Sol panelden generic component ekleme
- Sayfa olusturma ve route mantigi
- Block siralama, silme ve secili block duzenleme
- Tema presetleri ve temel tema ayarlari
- Web, tablet, mobil preview modlari
- Yayin talebi gonderme ve superadmin onay kuyrugu
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

## Firebase entegrasyonu icin sonraki adim

`/src/environments/environment.ts` icindeki alanlari kendi Firebase projeniz ile doldurun. Bu ilk surumde veri kaynagi olarak `localStorage` kullanan mock servisler bulunuyor. Sonraki iterasyonda:

1. Auth icin Firebase Authentication
2. Site, sayfa, block ve kullanici verileri icin Firestore
3. Gorsel yukleme icin Firebase Storage
4. Yayin istekleri ve sure sonu kontrolleri icin Cloud Functions

## Mimari notu

- `src/app/core`: modeller, guardlar, store ve servisler
- `src/app/features`: login, dashboard, builder, preview, review, public site ekranlari
- `src/app/shared`: generic site renderer

Bu yapi, ileride yeni generic component tipleri eklendikce buyutulecek sekilde tasarlandi.
