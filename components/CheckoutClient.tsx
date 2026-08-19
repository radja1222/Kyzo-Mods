"use client";

import { useEffect, useState } from "react";

type Mod = {
  id: number;
  title: string;
  slug: string;
  price: number | string;
  mod_type: string;
  thumbnail_url?: string | null;
};

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export function CheckoutClient({ mod }: { mod: Mod }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
   * Load Midtrans Snap JS
   */
  useEffect(() => {
    const clientKey =
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

    if (!clientKey) {
      console.error(
        "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY belum diset."
      );
      return;
    }

    if (document.getElementById("midtrans-snap")) {
      return;
    }

    const script = document.createElement("script");

    script.id = "midtrans-snap";

    /*
     * Sandbox
     */
    script.src =
      "https://app.sandbox.midtrans.com/snap/snap.js";

    script.setAttribute(
      "data-client-key",
      clientKey
    );

    script.async = true;

    document.body.appendChild(script);

    return () => {
      const oldScript =
        document.getElementById("midtrans-snap");

      if (oldScript) {
        oldScript.remove();
      }
    };
  }, []);

  async function handlePayment() {
    try {
      setLoading(true);
      setError("");

      /*
       * Tunggu Snap JS tersedia
       */
      let attempts = 0;

      while (!window.snap && attempts < 50) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100)
        );

        attempts++;
      }

      if (!window.snap) {
        throw new Error(
          "Midtrans belum siap. Silakan refresh halaman."
        );
      }

      /*
       * Buat transaksi di server
       */
      const response = await fetch(
        "/api/orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mod_id: mod.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Gagal membuat transaksi Midtrans."
        );
      }

      if (!data.token) {
        throw new Error(
          "Token pembayaran Midtrans tidak ditemukan."
        );
      }

      /*
       * Buka Midtrans Snap
       */
      window.snap.pay(data.token, {
        onSuccess: (result) => {
          console.log(
            "Pembayaran berhasil:",
            result
          );

          setLoading(false);

          window.location.href =
            `/mod/${mod.slug}?payment=success`;
        },

        onPending: (result) => {
          console.log(
            "Pembayaran pending:",
            result
          );

          setLoading(false);

          setError(
            "Pembayaran sedang menunggu konfirmasi."
          );
        },

        onError: (result) => {
          console.error(
            "Midtrans payment error:",
            result
          );

          setLoading(false);

          setError(
            "Pembayaran gagal. Silakan coba lagi."
          );
        },

        onClose: () => {
          console.log(
            "Popup Midtrans ditutup."
          );

          setLoading(false);
        },
      });
    } catch (err: any) {
      console.error(
        "Checkout error:",
        err
      );

      setLoading(false);

      setError(
        err?.message ||
          "Gagal menghubungkan ke Midtrans."
      );
    }
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
            Rp{" "}
            {Number(mod.price).toLocaleString(
              "id-ID"
            )}
          </div>

          {error && (
            <div className="checkoutError">
              {error}
            </div>
          )}

          <button
            type="button"
            className="checkoutPayButton"
            onClick={handlePayment}
            disabled={loading}
          >
            {loading
              ? "Menghubungkan ke Midtrans..."
              : "Bayar dengan GoPay"}
          </button>

          <p className="checkoutNotice">
            Jangan tutup halaman sebelum
            menyelesaikan pembayaran. Akses
            download hanya dibuka setelah server
            menerima status pembayaran yang
            terverifikasi.
          </p>

        </div>

      </div>
    </main>
  );
    }
