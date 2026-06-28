# Web Creator Kullanim Dokumani

Bu dokuman, mevcut Angular MVP uzerinden site olusturma, ozellestirme, yayin talebi ve hosting yonetimi akislarini anlatir.

## Baslatma

```bash
npm install
npm start
```

Uygulama varsayilan olarak `http://localhost:4200` adresinde calisir.

## Demo Hesaplar

- Superadmin: `owner@webcreator.dev` / `Owner123!`
- Admin: `admin@webcreator.dev` / `Admin123!`
- Moderator: `moderator@webcreator.dev` / `Mod123!`

## Rol Mantigi

- `superadmin`: Tum projeleri, yayin kuyrugunu, hosting envanterini ve kullanicilari yonetir.
- `admin`: Kendi sitelerini olusturur, builder ekranina girer, kullanici rolleri yonetebilir.
- `moderator`: Icerik ve yayin talebi akislarinda calisir.
- `visitor`: Gosterim ve test rolu olarak tutulur.

## Yeni Site Olusturma

1. Dashboard ekranina girin.
2. `Yeni site adi` alanina site adini yazin.
3. `Site Olustur` butonuna basin.
4. Uygulama yeni projeyi olusturur ve otomatik olarak builder ekranina gecirir.

Yeni site varsayilan olarak:

- `draft` durumunda baslar.
- `public` erisim moduna sahiptir.
- `tr` ve `en` dilleriyle gelir.
- Firebase icin `Production` adli draft hosting hedefi olusturur.

## Builder Kullanimi

Builder ekrani uc bolumden olusur:

- Sol panel: Sayfalar, ana blocklar ve component kutuphanesi.
- Orta alan: Web, tablet ve mobil canli onizleme.
- Sag panel: Tema, site ayarlari ve block inspector.

### Sayfa ve Block

- `Sayfalar` alanindan yeni route eklenir.
- `Ana Blocklar` ile hero, text, cards, table, image ve CTA eklenir.
- `Component Kutuphanesi` ile form, gallery, tabs, navbar, charts gibi widgetlar eklenir.
- `Yapi Sirasi` alaninda blocklar secilir, silinir veya siralanir.

### Tema

Sag paneldeki `Tema` bolumunden:

- Hazir tema secilir.
- Accent, background, surface, font, radius ve gap degerleri degistirilir.
- Custom tema kaydedilir ve daha sonra tekrar uygulanir.

### Site Ayarlari

`Site Ayarlari` bolumu site seviyesindeki urun kararlarini tutar.

#### Erisim Modu

- `Herkese acik`: Public site herkes tarafindan gorulur.
- `Sadece giris`: Site, oturum acmamis kullaniciya login mesaji gosterir.
- `Kayit ve giris`: Site, giris ve kayit akisi icin kapili davranir.

`Self servis kayit`, gercek Firebase Auth baglandiginda kullanicinin kendi hesabini acip acamayacagini belirlemek icin tutulur.

#### Diller ve Pathler

- Varsayilan diller `tr` ve `en` olarak gelir.
- Yeni dil icin kod, dil adi ve path prefix girilir.
- Her sayfa icin ana slug ve dile ozel slug ayarlanabilir.

Ornek:

- Ana slug: `services`
- TR path: `/tr/hizmetler`
- EN path: `/en/services`

#### Hosting

Her site birden fazla hosting hedefine sahip olabilir. Her hedefte su alanlar tutulur:

- Provider: `firebase` veya `external`
- Firebase project id
- Firebase site id
- Default URL
- Custom domain
- Status: `draft`, `provisioning`, `active`, `paused`, `expired`

Bu MVP'de deploy islemi simule edilir. Superadmin onay verdiginde secili hedef `active` olur ve yayin URL bilgisi kaydedilir.

## Yayin Akisi

1. Site sahibi veya editor builder/dashboard uzerinden `Yayina Gonder` aksiyonunu calistirir.
2. Proje `pending` durumuna gecer.
3. Superadmin `Yayin Kuyrugu` ekraninda talebi inceler.
4. Superadmin 7, 30 veya 90 gunluk yayin onayi verir ya da talebi reddeder.
5. Onaylanan site `published` olur ve public route uzerinden gorulur.
6. Aktif hosting acildiktan sonra site sahibi dashboarddan `Yayini Guncelle` aksiyonuyla tekrar yayin simule edebilir.

## Public Site Kontrolu

Public sayfa `/sites/:slug` route'u ile acilir.

- Site `published` degilse gorunmez.
- Onay suresi dolduysa gorunmez.
- Site `public` degilse ve oturum yoksa login/kayit mesaji gosterilir.

## Veri Saklama

Mevcut MVP verileri `localStorage` uzerinden saklar:

- Projeler: `web-creator-projects`
- Custom temalar: `web-creator-custom-themes`
- Kullanicilar: `web-creator-users`
- Session: `web-creator-session`

Production icin onerilen yol:

- Auth: Firebase Authentication
- Veritabani: Firestore
- Dosya: Firebase Storage
- Hosting: Firebase Hosting multi-site
- Yayin otomasyonu: Cloud Functions veya CI/CD pipeline

## Sifirlama

Tarayici localStorage temizlenirse uygulama demo kullanici ve demo proje verilerine geri doner.
