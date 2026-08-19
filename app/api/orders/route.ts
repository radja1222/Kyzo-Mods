import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Silakan login terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    const form = await req.formData();

    const modIdRaw = form.get("mod_id");

    if (!modIdRaw) {
      return NextResponse.json(
        {
          error: "Mod tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    const modId = Number(modIdRaw);

    if (!Number.isInteger(modId)) {
      return NextResponse.json(
        {
          error: "ID mod tidak valid.",
        },
        { status: 400 }
      );
    }

    /*
     * Ambil data mod
     */

    const { data: mod, error: modError } =
      await supabase
        .from("mods")
        .select(`
          id,
          title,
          slug,
          price,
          mod_type,
          status
        `)
        .eq("id", modId)
        .eq("status", "approved")
        .single();

    if (modError || !mod) {
      console.error("MOD ERROR:", modError);

      return NextResponse.json(
        {
          error: "Mod tidak ditemukan atau belum disetujui.",
        },
        { status: 404 }
      );
    }

    if (mod.mod_type !== "paid") {
      return NextResponse.json(
        {
          error: "Mod ini gratis.",
        },
        { status: 400 }
      );
    }

    const amount = Math.round(Number(mod.price));

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "Harga mod tidak valid.",
        },
        { status: 400 }
      );
    }

    /*
     * Gunakan admin client untuk membuat order.
     * Ini menghindari masalah RLS ketika server membuat order.
     */

    const admin = supabaseAdmin();

    /*
     * Cek apakah user sudah pernah membeli
     */

    const { data: paidOrder } = await admin
      .from("orders")
      .select("id,status")
      .eq("user_id", user.id)
      .eq("mod_id", mod.id)
      .eq("status", "paid")
      .maybeSingle();

    if (paidOrder) {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        redirectUrl: `/mod/${mod.slug}`,
      });
    }

    /*
     * Cari order pending lama
     */

    const { data: existingOrder } = await admin
      .from("orders")
      .select("id,status,amount")
      .eq("user_id", user.id)
      .eq("mod_id", mod.id)
      .eq("status", "pending")
      .order("id", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    let orderId: number;

    if (existingOrder) {
      orderId = existingOrder.id;

      /*
       * Pastikan nominal order mengikuti harga mod terbaru.
       */

      if (
        Math.round(Number(existingOrder.amount)) !== amount
      ) {
        const { error: updateError } =
          await admin
            .from("orders")
            .update({
              amount,
            })
            .eq("id", existingOrder.id);

        if (updateError) {
          console.error(
            "UPDATE ORDER ERROR:",
            updateError
          );

          return NextResponse.json(
            {
              error: "Gagal memperbarui order.",
            },
            { status: 500 }
          );
        }
      }
    } else {
      /*
       * Buat order baru
       */

      const { data: newOrder, error: orderError } =
        await admin
          .from("orders")
          .insert({
            user_id: user.id,
            mod_id: mod.id,
            amount,
            status: "pending",
          })
          .select("id")
          .single();

      if (orderError || !newOrder) {
        console.error(
          "CREATE ORDER ERROR:",
          orderError
        );

        return NextResponse.json(
          {
            error:
              "Gagal membuat order. Periksa tabel orders dan Supabase.",
          },
          { status: 500 }
        );
      }

      orderId = newOrder.id;
    }

    /*
     * MIDTRANS
     */

    const serverKey =
      process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error(
        "MIDTRANS_SERVER_KEY belum diset."
      );

      return NextResponse.json(
        {
          error:
            "MIDTRANS_SERVER_KEY belum dikonfigurasi di Vercel.",
        },
        { status: 500 }
      );
    }

    const isProduction =
      process.env.MIDTRANS_IS_PRODUCTION === "true";

    const midtransUrl = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    /*
     * Midtrans menggunakan Basic Auth:
     * Base64(ServerKey:)
     */

    const auth = Buffer.from(
      `${serverKey}:`
    ).toString("base64");

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(req.url).origin;

    const midtransResponse = await fetch(
      midtransUrl,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },

        body: JSON.stringify({
          transaction_details: {
            order_id: String(orderId),
            gross_amount: amount,
          },

          item_details: [
            {
              id: String(mod.id),
              price: amount,
              quantity: 1,
              name: mod.title.slice(0, 50),
            },
          ],

          customer_details: {
            email: user.email || undefined,
          },

          callbacks: {
            finish: `${siteUrl}/dashboard`,
          },
        }),
      }
    );

    const midtransData =
      await midtransResponse.json();

    if (!midtransResponse.ok) {
      console.error(
        "MIDTRANS CREATE ERROR:",
        midtransData
      );

      return NextResponse.json(
        {
          error:
            midtransData?.error_messages?.join(
              ", "
            ) ||
            midtransData?.status_message ||
            "Gagal membuat transaksi Midtrans.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * Simpan reference Midtrans kalau tersedia
     */

    if (midtransData.order_id) {
      await admin
        .from("orders")
        .update({
          payment_ref: String(
            midtransData.order_id
          ),
        })
        .eq("id", orderId);
    }

    /*
     * Redirect ke halaman pembayaran Midtrans
     */

    if (!midtransData.redirect_url) {
      console.error(
        "MIDTRANS RESPONSE TANPA REDIRECT URL:",
        midtransData
      );

      return NextResponse.json(
        {
          error:
            "Midtrans tidak memberikan redirect URL.",
        },
        { status: 502 }
      );
    }

    return NextResponse.redirect(
      midtransData.redirect_url
    );

  } catch (error) {
    console.error(
      "ORDER API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan pada server pembayaran.",
      },
      { status: 500 }
    );
  }
}
