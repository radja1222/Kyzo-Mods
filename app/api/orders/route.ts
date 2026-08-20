import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    /*
     * =========================
     * AUTH USER
     * =========================
     */

    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login", req.url)
      );
    }

    /*
     * =========================
     * GET FORM DATA
     * =========================
     */

    const form = await req.formData();

    const modIdRaw = form.get("mod_id");

    if (!modIdRaw) {
      return NextResponse.redirect(
        new URL(
          "/dashboard?order=invalid_mod",
          req.url
        )
      );
    }

    const modId = Number(modIdRaw);

    if (!Number.isInteger(modId) || modId <= 0) {
      return NextResponse.redirect(
        new URL(
          "/dashboard?order=invalid_mod",
          req.url
        )
      );
    }

    /*
     * =========================
     * ADMIN CLIENT
     * =========================
     *
     * Service role digunakan untuk
     * melewati RLS saat membuat order.
     */

    const admin = supabaseAdmin();

    /*
     * =========================
     * CEK MOD
     * =========================
     */

    const { data: mod, error: modError } =
      await admin
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
      console.error(
        "MOD TIDAK DITEMUKAN:",
        modError
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${modId}?error=mod_not_found`,
          req.url
        )
      );
    }

    /*
     * Pastikan mod memang berbayar
     */

    if (mod.mod_type !== "paid") {
      return NextResponse.redirect(
        new URL(
          `/mod/${mod.slug}`,
          req.url
        )
      );
    }

    /*
     * =========================
     * VALIDASI HARGA
     * =========================
     */

    const amount = Math.round(
      Number(mod.price)
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      console.error(
        "Harga mod tidak valid:",
        mod.price
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${mod.id}?error=invalid_price`,
          req.url
        )
      );
    }

    /*
     * =========================
     * CEK ORDER PAID
     * =========================
     */

    const { data: paidOrder } =
      await admin
        .from("orders")
        .select("id,status")
        .eq("user_id", user.id)
        .eq("mod_id", mod.id)
        .eq("status", "paid")
        .maybeSingle();

    if (paidOrder) {
      return NextResponse.redirect(
        new URL(
          `/mod/${mod.slug}`,
          req.url
        )
      );
    }

    /*
     * =========================
     * CEK ORDER PENDING
     * =========================
     */

    const { data: existingOrder } =
      await admin
        .from("orders")
        .select(`
          id,
          user_id,
          mod_id,
          amount,
          status,
          payment_ref
        `)
        .eq("user_id", user.id)
        .eq("mod_id", mod.id)
        .eq("status", "pending")
        .maybeSingle();

    let orderId: string | number;

    /*
     * Kalau sudah ada pending order,
     * gunakan order tersebut.
     */

    if (existingOrder) {
      orderId = existingOrder.id;

      /*
       * Pastikan nominal mengikuti harga
       * mod terbaru.
       */

      if (
        Math.round(
          Number(existingOrder.amount)
        ) !== amount
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
            "Gagal update amount:",
            updateError
          );

          return NextResponse.redirect(
            new URL(
              `/checkout/${mod.id}?error=order_update`,
              req.url
            )
          );
        }
      }
    } else {
      /*
       * =========================
       * BUAT ORDER BARU
       * =========================
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
          .select(`
            id,
            user_id,
            mod_id,
            amount,
            status
          `)
          .single();

      if (orderError || !newOrder) {
        console.error(
          "GAGAL MEMBUAT ORDER:",
          orderError
        );

        return NextResponse.redirect(
          new URL(
            `/checkout/${mod.id}?error=order_create`,
            req.url
          )
        );
      }

      orderId = newOrder.id;
    }

    /*
     * =========================
     * MIDTRANS CONFIG
     * =========================
     */

    const serverKey =
      process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error(
        "MIDTRANS_SERVER_KEY tidak ditemukan."
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${mod.id}?error=midtrans_config`,
          req.url
        )
      );
    }

    /*
     * Sandbox / Production
     */

    const isProduction =
      process.env.MIDTRANS_IS_PRODUCTION ===
      "true";

    const midtransUrl = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    /*
     * Midtrans order_id harus unik.
     *
     * Karena webhook kita mencari order
     * berdasarkan ID database, kita gunakan
     * ID order database sebagai order_id.
     */

    const midtransOrderId =
      String(orderId);

    /*
     * =========================
     * CREATE MIDTRANS SNAP
     * =========================
     */

    const auth =
      Buffer.from(
        `${serverKey}:`
      ).toString("base64");

    const midtransPayload = {
      transaction_details: {
        order_id: midtransOrderId,
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
        first_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Kyzo User",

        email:
          user.email || undefined,
      },

      /*
       * Kita prioritaskan GoPay.
       */

      enabled_payments: [
        "gopay",
      ],

      /*
       * Setelah pembayaran,
       * Midtrans dapat mengarahkan user
       * kembali ke halaman mod.
       */

      callbacks: {
        finish:
          `${new URL(
            `/mod/${mod.slug}`,
            req.url
          ).toString()}`,
      },

      expiry: {
        unit: "minutes",
        duration: 15,
      },
    };

    console.log(
      "Mengirim order ke Midtrans:",
      {
        order_id: midtransOrderId,
        amount,
        mod_id: mod.id,
      }
    );

    const midtransResponse =
      await fetch(midtransUrl, {
        method: "POST",

        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json",
          Authorization:
            `Basic ${auth}`,
        },

        body: JSON.stringify(
          midtransPayload
        ),
      });

    const midtransData =
      await midtransResponse.json();

    /*
     * =========================
     * MIDTRANS ERROR
     * =========================
     */

    if (!midtransResponse.ok) {
      console.error(
        "MIDTRANS ERROR:",
        midtransData
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${mod.id}?error=midtrans`,
          req.url
        )
      );
    }

    /*
     * =========================
     * SIMPAN SNAP TOKEN
     * =========================
     */

    const paymentRef =
      midtransData.token ||
      midtransData.redirect_url ||
      midtransOrderId;

    const { error: saveError } =
      await admin
        .from("orders")
        .update({
          payment_ref: paymentRef,
        })
        .eq("id", orderId);

    if (saveError) {
      console.error(
        "Gagal menyimpan payment_ref:",
        saveError
      );
    }

    /*
     * =========================
     * REDIRECT KE MIDTRANS
     * =========================
     */

    if (
      midtransData.redirect_url
    ) {
      return NextResponse.redirect(
        midtransData.redirect_url,
        303
      );
    }

    /*
     * Jika Midtrans tidak memberikan
     * redirect_url, gunakan Snap token.
     *
     * Untuk sementara kita tampilkan
     * error agar mudah debugging.
     */

    console.error(
      "Midtrans tidak memberikan redirect_url:",
      midtransData
    );

    return NextResponse.redirect(
      new URL(
        `/checkout/${mod.id}?error=no_redirect`,
        req.url
      )
    );

  } catch (error) {
    console.error(
      "ORDERS ROUTE ERROR:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/dashboard?order=server_error",
        req.url
      )
    );
  }
        }
