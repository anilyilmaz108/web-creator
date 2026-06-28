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

## Giris Yapmadan Site Olusturma

`/create-site` route'u herkese aciktir.

1. Ad soyad ve site adi girilir.
2. Sistem gecici bir `visitor` oturumu acar.
3. Site `draft` ve `public` erisim modu ile olusturulur.
4. Kullanici builder ekranina yonlendirilir.
5. `Yayina Gonder` aksiyonu admin/superadmin onayina duser.

## Rol Mantigi

- `superadmin`: Tum projeleri, yayin kuyrugunu, hosting envanterini, loglari ve simulasyon modunu yonetir.
- `admin`: Site yayin taleplerini degerlendirir, kendi sitelerini olusturur, builder ekranina girer, kullanici rolleri yonetebilir.
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
- Sag panel: Sekmeli `Block`, `Tema`, `Site` inspector.
- Ust aksiyon bar: `Geri Al`, `Ileri Al`, son kayit zamani ve yayin aksiyonlari.

### Sayfa ve Block

- `Sayfalar` alanindan yeni route eklenir.
- `Hazir Section Setleri` ile landing, guven/icerik veya lead capture akislari tek tikla eklenir.
- Hazir setler arasinda `Blog Sayfasi`, `Kafe Sayfasi`, `Restoran Ana Sayfasi`, `Klinik Landing`, `Portfolyo` ve `SaaS` vardir.
- `Ana Blocklar` ile hero, text, cards, table, image ve CTA eklenir.
- `Component Kutuphanesi` ile form, gallery, tabs, navbar, charts gibi widgetlar eklenir.
- Sik kullanilan componentler favoriye alinabilir; son kullanilanlar otomatik kisayol olarak gorunur.
- `Yapi Sirasi` alaninda blocklar secilir, silinir veya siralanir.
- Canli preview icindeki bir componente tiklayinca ilgili block otomatik secilir.
- Hover durumunda component uzerinde `Edit` rozeti gorunur.

### Tema

Sag paneldeki `Tema` bolumunden:

- Hazir tema secilir.
- Accent, background, surface, font, radius ve gap degerleri degistirilir.
- Buton formu, kart stili ve spacing olcegiyle sitenin genel hissi hizli ayarlanir.
- Custom tema kaydedilir ve daha sonra tekrar uygulanir.

### Site Ayarlari

`Site Ayarlari` bolumu site seviyesindeki urun kararlarini tutar.

#### Yayin Kontrol Listesi

Builder, yayina gondermeden once su kalite sinyallerini kontrol eder:

- Site adi, slug ve sayfa varligi
- Bos icerik alanlari
- SEO basligi ve aciklamasi
- Aktif diller icin path girisi
- Harici link formati
- Medya kotasi
- Hosting/yayin stratejisi

Eksikler site panelinde `pass`, `warning` veya `fail` olarak gorunur. `fail` olan maddeler admin onayinda da gorunur.

#### SEO ve Paylasim

Site seviyesinde SEO basligi, aciklama, anahtar kelimeler, OG gorsel, canonical URL ve `noIndex` ayari tutulur. Public route acildiginda title, description, keywords, OG ve robots meta tag'leri bu alandan guncellenir.

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
- Domain status: `not-started`, `pending-dns`, `verified`, `failed`
- DNS yonlendirme notu

Bu MVP'de deploy islemi simule edilir. Superadmin onay verdiginde secili hedef `active` olur ve yayin URL bilgisi kaydedilir.

#### Medya ve Maliyet

- `Medya Kutuphanesi` siteye ait gorsel, video veya dokuman URL'lerini ve KB degerlerini tutar.
- `Maliyet Politikasi` deploy stratejisi, medya kotasi, audit log saklama gunu, aylik function butcesi ve dashboardlarda ozet veri okuma kararini tutar.
- Varsayilan deploy stratejisi `shared-route` olarak gelir. Bu, MVP ve dusuk trafik icin tek Firebase Hosting altinda `/sites/:slug` yayinlamayi tercih eder.
- `dedicated-hosting`, her site icin ayri Firebase Hosting site hedefi gerektiren premium/kurumsal senaryolara ayrilabilir.

#### Versiyon Gecmisi

`Versiyon Gecmisi` alanindan manuel snapshot alinabilir. Gerekirse onceki snapshot yuklenerek site tasarimi geri getirilebilir. `Geri Al` ve `Ileri Al` ise o anki duzenleme oturumunda hizli geri/ileri hareketi saglar.

## Yayin Akisi

1. Site sahibi veya editor builder/dashboard uzerinden `Yayina Gonder` aksiyonunu calistirir.
2. Proje `pending` durumuna gecer.
3. Superadmin `Yayin Kuyrugu` ekraninda talebi inceler.
4. Superadmin 7, 30 veya 90 gunluk yayin onayi verir ya da talebi reddeder.
5. Onaylanan site `published` olur ve public route uzerinden gorulur.
6. Aktif hosting acildiktan sonra site sahibi dashboarddan `Yayini Guncelle` aksiyonuyla tekrar yayin simule edebilir.
7. `Yayini Durdur` aksiyonu siteyi tekrar `draft` durumuna alir ve aktif hosting hedeflerini `paused` yapar.

## Site Admin Dashboard

Yayina hazir veya yayindaki her site icin `/site-admin/:siteId` route'u vardir.

Bu ekranda:

- Yayin durumu ve yayin URL'i
- Sayfa, block, dil, lead ve hosting kartlari
- Trafik simulasyon grafigi
- Sayfa ve component tablolari
- Lead tablosu ve lead durum guncelleme
- SEO, medya kullanimi, maliyet modu ve log saklama ozeti
- Siteye ait islem gecmisi
- Builder'a gecis ve yayin durdurma/yayina gonderme aksiyonlari

## Superadmin Simulasyonu

Superadmin dashboard uzerinde herhangi bir site icin `Simule Et` aksiyonunu kullanabilir.

- Dashboard secilen site baglamina daralir.
- Site admin paneli ve builder secilen site uzerinden acilir.
- `Simulasyondan Cik` ile tekrar tum platform gorunumune donulur.

## Superadmin Araclari

Dashboard superadmin rolunde ek operasyon panelleri gosterir:

- `Detayli Site Kiyaslama`: Iki siteyi durum, sayfa, block, dil, lead, medya, hazirlik skoru, hosting, maliyet modu ve log sayisina gore karsilastirir.
- `Kullanici Aktivitesi`: Audit loglardan aktor bazli toplam islem, uyari, risk ve son aktivite bilgisini cikarir.
- `Maliyet Alarmlari`: Site bazli kota ve maliyet uyarilarini listeler. Bloklayici alarmlar yayin talebi/onayini durdurur.
- `Islem Gecmisi`: Level, site, aktor ve metin aramasina gore filtrelenebilir. Filtreli liste CSV olarak export edilebilir.

## Islem Gecmisi

Sistem veri degistiren operasyonlari audit log olarak saklar.

Loglanan ornek islemler:

- Site, sayfa, block ve widget olusturma/silme
- Tema, dil, access ve hosting guncelleme
- SEO, medya, maliyet politikasi, versiyon snapshot ve lead durum guncelleme
- Yayina gonderme, onay, red ve durdurma
- Superadmin simulasyon baslatma/bitirme

Superadmin dashboard'da son loglari, site admin panelinde ise ilgili siteye ait loglari gorebilir.

## Maliyet/Kota Enforcement

Maliyet politikasi sadece bilgi olarak tutulmaz; bazi kurallar otomatik uygulanir:

- Medya kotasi asilirsa yeni medya ekleme engellenir.
- Medya kotasi asan site yayina gonderilemez ve admin tarafindan onaylanamaz.
- `shared-route` modunda ek hosting hedefi acma engellenir.
- `shared-route` modunda birden fazla hosting hedefi varsa yayin talebi ve backend onay akisi bloklanir.
- Audit log saklama suresi, function butcesi, aktif hosting sayisi ve summary-first reads ayarlari superadmin icin alarm uretir.

## Public Site Kontrolu

Public sayfa `/sites/:slug` route'u ile acilir.

- Site `published` degilse gorunmez.
- Onay suresi dolduysa gorunmez.
- Site `public` degilse ve oturum yoksa login/kayit mesaji gosterilir.

## Veri Saklama

Mevcut MVP verileri `localStorage` uzerinden saklar:

- Projeler: `web-creator-projects`
- Custom temalar: `web-creator-custom-themes`
- Favori componentler: `web-creator-favorite-widgets`
- Son kullanilan componentler: `web-creator-recent-widgets`
- Kullanicilar: `web-creator-users`
- Session: `web-creator-session`

Firebase kullanimi:

1. Firebase projesi: `web-creator-anilyilmaz`.
2. Web SDK config `environment.ts` icinde tutulmaz.
3. Local runtime config `public/firebase-config.js` icindedir ve git'e eklenmez.
4. Ornek dosya: `public/firebase-config.example.js`.
5. Hosting config `.firebaserc` ve `firebase.json` icinde tanimli.
6. Firestore database `europe-west3` lokasyonunda olusturuldu.
7. Authentication Console'da Email/Password ve Anonymous providerlari acildiktan sonra `npm run firebase:bootstrap` calistirilir.

Production icin onerilen yol:

- Auth: Firebase Authentication
- Veritabani: Firestore
- Dosya: Firebase Storage
- Hosting: Firebase Hosting multi-site
- Yayin otomasyonu: Cloud Functions veya CI/CD pipeline

## Sifirlama

Tarayici localStorage temizlenirse uygulama demo kullanici ve demo proje verilerine geri doner.
