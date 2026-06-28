# Web Creator Business Dokumani

## Urun Ozeti

Web Creator, kucuk ve orta olcekli ekiplerin WordPress/Drupal kurmadan kendi web sitelerini hazirlayabilecegi, onaya gonderebilecegi ve yonetebilecegi bir site olusturucu platformdur.

Temel deger onerisi:

- Teknik bilgisi az olan kullanici siteyi builder ile hazirlar.
- Admin/superadmin yayin kalitesini ve hosting sureclerini kontrol eder.
- Her kullanici birden fazla siteye, her site birden fazla hosting hedefine sahip olabilir.
- Site, herkese acik veya uyelik gerektiren yapida calisabilir.
- TR/EN ve ek diller route/path seviyesinde yonetilebilir.
- Superadmin her siteyi izleyebilir, site admini gibi simulasyon yapabilir ve audit loglari inceleyebilir.

## Hedef Musteriler

- Ajanslar ve freelancer web tasarim ekipleri
- Kobi ve yerel isletmeler
- Etkinlik, kampanya ve landing page ekipleri
- Cok dilli mikro site ihtiyaci olan markalar
- Kurumsal ekiplerde merkezi yayin onayi isteyen departmanlar

## MVP Kapsami

Bu repo icindeki MVP su alanlari kapsar:

- Rol bazli demo giris
- Site portfoyu dashboardu
- Visual builder ve responsive preview
- Tema ve component ozellestirme
- Site seviyesinde uyelik modu
- TR/EN ve ek dil/path ayarlari
- Hosting hedefi kaydi
- Superadmin yayin onayi
- Yayin durdurma
- Site admin dashboardu
- Superadmin simulasyonu
- Audit log
- Public site gorunumu
- Kullanim ve is dokumani

## Production Yol Haritasi

### Faz 1: Firebase Backend MVP

Onerilen en dusuk operasyon maliyetli baslangic Firebase'dir. Mevcut projede Angular + Firebase paketleri zaten var.

Kapsam:

- Firebase Authentication ile gercek login/register
- Firestore ile project/page/block/user verisi
- Firebase Storage ile medya yukleme
- Firebase Hosting multi-site ile yayin
- Cloud Functions ile yayin onayi, deploy tetikleme ve sure bitimi kontrolu
- Firestore audit log koleksiyonu

Bu fazda NextJS backend ve Docker sart degildir. Sunucu bakimi olmadan ilerlenebilir. Gercekten gizli kalmasi gereken admin islemleri Cloud Functions tarafina alinmistir; production deploy icin Firebase Blaze plan karari gerekir.

### Faz 2: Operasyon ve Faturalama

Kapsam:

- Plan/paket tanimlari
- Kullanici/site/hosting kota kontrolleri
- Yayin suresi ve yenileme bildirimleri
- Custom domain dogrulama
- Form cevaplari ve lead yonetimi
- Audit log

### Faz 3: Gelismis Platform

Kapsam:

- NextJS veya Node API ile ozel deploy orchestration
- PostgreSQL ile raporlama ve finansal kayitlar
- Docker tabanli worker veya CI runner
- Template marketplace
- Ajans/musteri ayrimi ve workspace modeli
- Webhook ve entegrasyonlar

## Teknik Tercih

Baslangic icin onerilen stack:

- Frontend: Angular
- Auth: Firebase Authentication
- DB: Firestore
- File storage: Firebase Storage
- Hosting: Firebase Hosting
- Serverless jobs: Cloud Functions

Neden bu tercih:

- Mevcut proje Firebase bagimliliklarini iceriyor.
- MVP icin backend/Docker operasyonu gerektirmiyor.
- Hosting, auth, DB ve storage ayni ekosistemde cozuluyor.
- Kullanici ve site sayisi dusukken maliyet kontrollu baslar.

PostgreSQL veya NextJS backend ne zaman mantikli olur:

- Karmasik faturalama ve raporlama gerekiyorsa
- Yogun relational sorgular varsa
- Deploy sureci Firebase disinda farkli providerlara yayilacaksa
- Musteriye ozel backend entegrasyonlari gerekiyorsa
- Audit/compliance ihtiyaclari artarsa

## Gelir Modeli

Olasiliklar:

- Site basina aylik ucret
- Aktif hosting hedefi basina ucret
- Ajans paketi: daha fazla site, daha fazla kullanici, white-label
- Custom domain ve storage kotasi icin ek ucret
- Template/component marketplace komisyonu
- Kurumsal destek ve ozel entegrasyon paketi

Ornek paketleme:

- Starter: 1 site, 1 hosting, temel componentler
- Growth: 5 site, coklu dil, form cevaplari, custom domain
- Agency: 25+ site, ekip rolleri, white-label, oncelikli destek
- Enterprise: SLA, ozel entegrasyon, audit log, dedicated workflow

## Operasyon Akisi

1. Kullanici site olusturur.
2. Builder ile sayfa, tema, dil ve hosting ayarlarini tamamlar.
3. Yayin talebi olusturur.
4. Superadmin kalite, icerik ve hosting bilgilerini kontrol eder.
5. Onaylanirsa hosting hedefi aktif olur.
6. Site sahibi aktif hosting uzerinden yeni yayinlari gunceller.
7. Onay suresi bitmeden yenileme veya tekrar onay sureci calisir.

## Riskler ve Onlemler

- Yetkisiz yayin: Superadmin onay ve audit log ile kontrol edilir.
- Maliyet artisi: Site, storage, bandwidth ve function kullanimi kota ile sinirlanir.
- Domain karmasasi: Custom domain dogrulama ve DNS kontrol ekrani gerekir.
- Icerik kalitesi: Onay kuyrugu ve preview ekranlariyla incelenir.
- Veri kaybi: Firestore yedekleme ve export stratejisi planlanir.

## Basari Metrikleri

- Olusturulan site sayisi
- Yayina alinan site orani
- Ilk siteyi yayina alma suresi
- Aktif hosting sayisi
- Kullanici basina ortalama site sayisi
- Paket donusum orani
- Support ticket hacmi

## Sonraki Kararlar

- Firebase projesi tek tenant mi, her musteri icin ayri proje mi olacak?
- Custom domain self-servis mi, admin kontrollu mu olacak?
- Yayina alma otomasyonu Cloud Functions ile mi, CI runner ile mi calisacak?
- Form cevaplari musteri panelinde mi, entegrasyon webhooklarinda mi tutulacak?
- Ucretlendirme site, bandwidth, storage veya kullanici bazli mi olacak?
