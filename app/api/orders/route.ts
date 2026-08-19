import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const s = await supabaseServer();

    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login", req.url)
      );
    }

    const form = await req.formData();

    const modIdRaw = form.get("mod_id");

    if (!modIdRaw) {
      return NextResponse.redirect(
        new URL("/dashboard?error=invalid_mod", req.url)
      );
    }

    const mod_id = Number(modIdRaw);

    if (!Number.isInteger(mod_id)) {
      return NextResponse.redirect(
        new URL("/dashboard?error=invalid_mod", req.url)
      );
    }

    /*
     * Ambil data mod
     */

    const { data: m, error: modError } = await s
      .from("mods")
      .select(`
        id,
        title,
        slug,
        price,
        mod_type,
        status
      `)
      .eq("id", mod_id)
      .eq("status", "approved")
      .single();

    if (modError || !m) {
      console.error("Mod tidak ditemukan:", modError);

      return NextResponse.redirect(
        new URL("/dashboard?error=mod_not_found", req.url)
      );
    }

    if (m.mod_type !== "paid") {
      return NextResponse.redirect(
        new URL(`/mod/${m.slug}`, req.url)
      );
    }

    const amount = Math.round(Number(m.price));

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.redirect(
        new URL(
          `/checkout/${m.id}?error=invalid_price`,
          req.url
        )
      );
    }

    /*
     * Cek apakah user sudah pernah punya order
     */

    const { data: existing } = await s
      .from("orders")
      .select(`
        id,
        status,
        amount,
        payment_ref
      `)
      .eq("user_id", user.id)
      .eq("mod_id", m.id)
      .maybeSingle();

    let orderId: string;

    /*
     * Kalau sudah ada order paid,
     * langsung kembali ke halaman mod.
     */

    if (existing?.status === "paid") {
      return NextResponse.redirect(
        new URL(`/mod/${m.slug}`, req.url)
      );
    }

    /*
     * Gunakan order lama jika masih ada.
     */

    if (existing) {
      orderId = String(existing.id);

      const { error: updateError } = await s
        .from("orders")
        .update({
          amount,
          status: "pending",
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error(
          "Gagal update order:",
          updateError
        );

        return NextResponse.redirect(
          new URL(
            `/checkout/${m.id}?error=order_failed`,
            req.url
          )
        );
      }
    } else {
      /*
       * Buat order baru
       */

      const { data: newOrder, error: orderError } =
        await s
          .from("orders")
          .insert({
            user_id: user.id,
            mod_id: m.id,
            amount,
            status: "pending",
          })
          .select("id")
          .single();

      if (orderError || !newOrder) {
        console.error(
          "Gagal membuat order:",
          orderError
        );

        return NextResponse.redirect(
          new URL(
            `/checkout/${m.id}?error=order_failed`,
            req.url
          )
        );
      }

      orderId = String(newOrder.id);
    }

    /*
     * Pastikan Midtrans Server Key tersedia
     */

    const serverKey =
      process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error(
        "MIDTRANS_SERVER_KEY belum diset."
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${m.id}?error=payment_config`,
          req.url
        )
      );
    }

    /*
     * Midtrans Sandbox
     *
     * Server Key digunakan untuk Authorization.
     */

    const auth = Buffer
      .from(`${serverKey}:`)
      .toString("base64");

    /*
     * Buat transaksi Snap Midtrans
     */

    const midtransResponse = await fetch(
      "https://app.sandbox.midtrans.com/snap/v1/transactions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },

        body: JSON.stringify({
          transaction_details: {
            order_id: orderId,
            gross_amount: amount,
          },

          item_details: [
            {
              id: String(m.id),
              price: amount,
              quantity: 1,
              name: String(m.title).slice(0, 50),
            },
          ],

          customer_details: {
            first_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "KyzoMods User",

            email:
              user.email || undefined,
          },

          enabled_payments: [
            "gopay",
          ],

          callbacks: {
            finish:
              `${new URL(
                `/mod/${m.slug}`,
                req.url
              ).toString()}`,
          },

          expiry: {
            unit: "hours",
            duration: 1,
          },
        }),
      }
    );

    const paymentData =
      await midtransResponse.json();

    /*
     * Midtrans gagal
     */

    if (
      !midtransResponse.ok ||
      !paymentData.redirect_url
    ) {
      console.error(
        "Midtrans error:",
        paymentData
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${m.id}?error=midtrans`,
          req.url
        )
      );
    }

    /*
     * Simpan reference transaksi
     */

    await s
      .from("orders")
      .update({
        payment_ref:
          paymentData.token ||
          orderId,
      })
      .eq("id", orderId);

    /*
     * Redirect user ke halaman pembayaran Midtrans
     */

    return NextResponse.redirect(
      paymentData.redirect_url
    );

  } catch (error) {
    console.error(
      "ORDER API ERROR:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/dashboard?error=payment_failed",
        req.url
      )
    );
  }
        }
