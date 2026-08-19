"use client";

import { useState } from "react";

type Mod = {
  id: number;
  title: string;
  slug: string;
  price: number | string;
  mod_type: string;
  thumbnail_url?: string | null;
};

export function CheckoutClient({ mod }: { mod: Mod }) {
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
  }

  return (
    <main className="checkoutPage">
      <div className="container">
        <div className="checkoutCard">

          <div className="checkoutBadge">
            SECURE CHECKOUT · GOPAY
          </div>

          {mod.thumbnail_url && (
            <img
              src={mod.thumbnail_url}
              alt={mod.title}
              className="checkoutThumbnail"
            />
          )}

          <h1>{mod.title}</h1>

          <p className="checkoutDescription">
            Pembayaran diproses melalui Midtrans
            dengan metode GoPay.
          </p>

          <div className="checkoutPrice">
            Rp {Number(mod.price).toLocaleString("id-ID")}
          </div>

          <form
            action="/api/orders"
            method="POST"
            onSubmit={handleSubmit}
          >
            <input
              type="hidden"
              name="mod_id"
              value={mod.id}
            />

            <button
              type="submit"
              className="checkoutPayButton"
              disabled={loading}
            >
              {loading
                ? "Menghubungkan ke Midtrans..."
                : "Bayar dengan GoPay"}
            </button>
          </form>

          <p className="checkoutNotice">
            Jangan tutup halaman sebelum menyelesaikan
            pembayaran. Akses download hanya dibuka
            setelah server menerima status pembayaran
            yang terverifikasi.
          </p>

        </div>
      </div>
    </main>
  );
             }
