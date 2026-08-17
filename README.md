# KyzoMods — Vercel + Supabase + GoPay (Midtrans Snap)

Versi ini menambahkan pembayaran GoPay otomatis melalui **Midtrans Snap**. GoPay perlu aktif pada akun Midtrans kamu; akun GoPay Merchant pada screenshot tidak menjadi API credential untuk integrasi ini.

## Alur pembayaran
1. User login.
2. Buka mod PAID.
3. Klik **Bayar dengan GoPay**.
4. KyzoMods membuat order pending di Supabase.
5. Server membuat transaksi Snap dengan `enabled_payments: ["gopay"]`.
6. User menyelesaikan pembayaran di GoPay/Snap.
7. Midtrans mengirim webhook ke `/api/midtrans/notification`.
8. Server memverifikasi `signature_key`, `gross_amount`, dan status transaksi.
9. Order menjadi `paid`.
10. Download mod dibuka menggunakan signed URL private.

Midtrans merekomendasikan verifikasi notification sebelum menyerahkan barang/jasa, dan webhook harus berupa URL HTTPS publik. Lihat dokumentasi resmi Midtrans: https://docs.midtrans.com/docs/https-notification-webhooks

## Environment Vercel
Set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (SERVER ONLY, jangan `NEXT_PUBLIC_`)
- `NEXT_PUBLIC_SITE_URL`
- `MIDTRANS_SERVER_KEY` (SERVER ONLY)
- `MIDTRANS_IS_PRODUCTION` = `false` untuk sandbox, `true` untuk production
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
- `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` = sama dengan mode Midtrans

## Midtrans dashboard
Set **Payment Notification URL** ke:
`https://DOMAIN-KYZOMODS-KAMU.vercel.app/api/midtrans/notification`

Pastikan URL dapat diakses publik dengan HTTPS. Aktifkan GoPay pada payment methods Midtrans.

## Supabase
Jalankan `supabase/schema.sql`. Setelah akun Owner dibuat:
`update public.profiles set role='owner' where id='UUID_KAMU';`

## Catatan
- Jangan pernah menaruh Server Key di browser.
- Jangan menerima screenshot sebagai bukti pembayaran otomatis.
- Jangan mengubah order menjadi `paid` dari callback browser. Hanya webhook/status terverifikasi yang membuka akses.
- Midtrans GoPay di Snap mendukung QR/deeplink dan dapat menyesuaikan tampilan berdasarkan perangkat
- Di Larang keras Menjual/Belikan Script ini paham.
