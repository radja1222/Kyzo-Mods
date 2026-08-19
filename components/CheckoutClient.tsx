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

export function CheckoutClient({
  mod,
}: {
  mod: Mod;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append(
        "mod_id",
        String(mod.id)
      );

      const response = await fetch(
        "/api/orders",
        {
          method: "POST",
          body: formData,
        }
      );

      /*
       * Jika backend mengembalikan redirect
       * dari NextResponse.redirect(), fetch
       * akan mengikuti redirect tersebut.
       */

      if (
        response.redirected &&
        response.url
      ) {
        window.location.href =
          response.url;

        return;
      }

      const data =
        await response.json().catch(
          () => null
        );

      if (
        data?.alreadyPaid &&
        data?.redirectUrl
      ) {
        window.location.href =
          data.redirectUrl;

        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Gagal membuat transaksi."
        );
      }

      if (data?.redirectUrl) {
        window.location.href =
          data.redirectUrl;

        return;
      }

      throw new Error(
        "Midtrans tidak memberikan URL pembayaran."
      );
    } catch (err) {
      console.error(
        "CHECKOUT ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal membuat transaksi."
      );

      setLoading(false);
    }
  }

  const price = Number(mod.price);

  return (
    <main className="checkoutPage">

      <div className="checkoutGlow glowOne" />
      <div className="checkoutGlow glowTwo" />

      <div className="container checkoutContainer">

        <div className="checkoutBack">
          <a href={`/mod/${mod.slug}`}>
            ← Kembali ke mod
          </a>
        </div>

        <div className="checkoutLayout">

          {/* LEFT */}

          <section className="checkoutProduct">

            <div className="checkoutProductImage">

              {mod.thumbnail_url ? (
                <img
                  src={mod.thumbnail_url}
                  alt={mod.title}
                />
              ) : (
                <div className="checkoutPlaceholder">
                  <img
                    src="/kyzo-logo.svg"
                    alt="KyzoMods"
                  />
                </div>
              )}

              <div className="checkoutImageOverlay" />

              <span className="checkoutProductBadge">
                PREMIUM MOD
              </span>

            </div>

            <div className="checkoutProductInfo">

              <div className="checkoutMiniBrand">
                <img
                  src="/kyzo-logo.svg"
                  alt="KyzoMods"
                />

                <span>
                  KYZO <b>MODS</b>
                </span>
              </div>

              <h1>
                {mod.title}
              </h1>

              <p>
                Dapatkan akses penuh ke resource
                premium ini setelah pembayaran
                berhasil diverifikasi.
              </p>

              <div className="checkoutFeatures">

                <div>
                  <span>✓</span>
                  Instant access
                </div>

                <div>
                  <span>✓</span>
                  Pembayaran aman
                </div>

                <div>
                  <span>✓</span>
                  Download setelah paid
                </div>

              </div>

            </div>

          </section>

          {/* RIGHT */}

          <section className="checkoutCard">

            <div className="checkoutCardTop">

              <div>
                <span className="checkoutEyebrow">
                  SECURE CHECKOUT
                </span>

                <h2>
                  Selesaikan Pembayaran
                </h2>
              </div>

              <div className="checkoutSecure">
                🔒
              </div>

            </div>

            <div className="checkoutDivider" />

            <div className="checkoutSummary">

              <span>
                {mod.title}
              </span>

              <strong>
                Rp{" "}
                {price.toLocaleString(
                  "id-ID"
                )}
              </strong>

            </div>

            <div className="checkoutPayment">

              <div className="paymentIcon">
                G
              </div>

              <div>
                <strong>
                  GoPay
                </strong>

                <small>
                  Diproses melalui Midtrans
                </small>
              </div>

              <span className="paymentCheck">
                ✓
              </span>

            </div>

            {error && (
              <div className="checkoutError">
                <strong>
                  Pembayaran gagal
                </strong>

                <span>
                  {error}
                </span>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
            >

              <button
                type="submit"
                className="checkoutPayButton"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="checkoutSpinner" />
                    Menghubungkan...
                  </>
                ) : (
                  <>
                    Bayar Rp{" "}
                    {price.toLocaleString(
                      "id-ID"
                    )}
                  </>
                )}

              </button>

            </form>

            <div className="checkoutTrust">

              <span>
                🔒 Secure payment
              </span>

              <span>
                •
              </span>

              <span>
                Midtrans
              </span>

            </div>

            <p className="checkoutNotice">
              Setelah pembayaran berhasil,
              server akan menerima notifikasi
              pembayaran dari Midtrans. Download
              hanya akan tersedia setelah transaksi
              berstatus <b>paid</b>.
            </p>

          </section>

        </div>

      </div>

    </main>
  );
      }
