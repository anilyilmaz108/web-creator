# Web Creator Test Senaryolari

Bu dokuman canli smoke testleri ve detayli regresyon senaryolari icin kisa bir kontrol listesidir.

## Smoke Testler

1. Auth hesaplari
   - `owner@webcreator.dev` / `Owner123!` giris yapabilmeli ve `superadmin` rolunde olmali.
   - `admin@webcreator.dev` / `Admin123!` giris yapabilmeli.
   - Yetkisiz rol yayin onayi verememeli.

2. Ana route kontrolleri
   - `/login` 200 donmeli.
   - `/dashboard` 200 donmeli.
   - `/create-site` 200 donmeli.
   - `/demo/:siteId/:pageSlug#blockId` 200 donmeli.
   - `/sites/:slug` 200 donmeli.

3. Site olusturma ve yayin
   - Yeni site dokumani `sites/{siteId}` altina owner bilgisiyle yazilabilmeli.
   - Site sahibi `requestPublication` ile yayin talebi olusturabilmeli.
   - Yetkisiz kullanici `approvePublication` cagrisi yapamamali.
   - Superadmin `approvePublication` ile siteyi `published` durumuna alabilmeli.
   - Published site public route uzerinden taze ziyaretciye gorunmeli.

4. Yayin durdurma
   - Superadmin veya site yoneticisi `stopPublication` cagrisi ile yayini durdurabilmeli.
   - Site `draft`, publication `none`, aktif hosting `paused` olmali.
   - Yeniden onay verildiginde site tekrar `published` olmali.

5. Loglama
   - `publication.requested`, `publication.approved`, `publication.stopped` audit loglari olusmali.
   - Superadmin ilgili siteye ait loglari okuyabilmeli.

## Detayli Regresyon Senaryolari

### Builder

1. Yeni sayfa ekle, slug degistir, demo route ile ac.
2. Hazir template olarak Kafe Sayfasi ekle.
3. Hero, galeri, tablo ve form bloklarini duzenle.
4. Bir bloğa tikla; inspector otomatik block sekmesine gecmeli.
5. Yapi Sirasi listesindeki `ID'ye Git` linki demo sayfasinda ilgili component id'sine scroll etmeli.
6. Sayfayi yenile; son duzenlemeler korunmali.
7. Firebase kaydi basarisizsa kullaniciya kayit uyari mesaji gorunmeli.

### Demo ve Public Site

1. `/demo/:siteId/:pageSlug` dogru sayfayi acmali.
2. `/demo/:siteId/:pageSlug#blockId` dogru componenti hedeflemeli.
3. Public route taze ziyaretcide localStorage olmadan Firestore'dan published siteyi yuklemeli.
4. Public olmayan, suresi dolan veya bulunamayan site uygun uyari ekrani gostermeli.
5. Dil barinda aktif diller gorunmeli.

### Yetki ve Roller

1. Visitor kendi sitesini olusturabilmeli ve yayin talebi gonderebilmeli.
2. Visitor yayin onayi verememeli.
3. Admin/superadmin yayin onayi verebilmeli.
4. Superadmin tum site loglarini gorebilmeli.
5. Superadmin simulasyon moduna girip cikabilmeli.

### Maliyet ve Kota

1. Shared-route modunda birden fazla hosting hedefi yayin talebini bloklamali.
2. Medya limiti asilirsa bloklayici maliyet alarmi olusmali.
3. Uzun log saklama ve dedicated hosting uyarilari bloklamayan alarm olarak gorunmeli.

### Responsive ve UX

1. Builder desktop/tablet/mobile viewport secimleri tasma yapmamali.
2. Rich text editor ve input alanlari soldan saga yazmali.
3. Dashboard kartlari ve tablolari mobilde yatay tasma yerine kontrollu scroll/word-wrap kullanmali.
4. Site admin dashboard grafikleri ve tablolar mobilde okunabilir kalmali.

## Son Smoke Referansi

- Ornek site: `Smoke Test Kafe`
- Site id: `site-cafe-smoke-202606291146`
- Public URL: `https://web-creator-anilyilmaz.web.app/sites/kafe-smoke-202606291146`
- Son durum: `published`
- Onay bitisi: `2026-07-29`
