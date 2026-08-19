import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    /*
     * Cek user login
     */
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

    /*
     * Ambil data request
     */
    const body = await req.json();

    const mod_id = Number(body.mod_id);

    if (!mod_id) {
      return NextResponse.json(
        {
          error: "Mod ID tidak valid.",
        },
        { status: 400 }
      );
    }

    /*
     * Ambil mod
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
        .eq("id", mod_id)
        .eq("status", "approved")
        .single();

    if (modError || !mod) {
      return NextResponse.json(
        {
          error: "Mod tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    if (mod.mod_type !== "paid") {
      return NextResponse.json(
        {
          error: "Mod ini bukan mod berbayar.",
        },
        { status: 400 }
      );
    }

    const amount = Math.round(
      Number(mod.price)
    );

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          error: "Harga mod tidak valid.",
        },
        { status: 400 }
      );
    }

    /*
     * Cek apakah sudah pernah membeli
     */
    const { data: existingPaid } =
      await supabase
        .from("orders")
        .select("id,status")
        .eq("user_id", user.id)
        .eq("mod_id", mod.id)
        .eq("status", "paid")
        .maybeSingle();

    if (existingPaid) {
      return NextResponse.json(
        {
          error: "Kamu sudah membeli mod ini.",
        },
        { status: 400 }
      );
    }

    /*
     * Ambil Server Key Midtrans
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
            "Midtrans belum dikonfigurasi di server.",
        },
        { status: 500 }
      );
    }

    /*
     * Buat order terlebih dahulu
     *
     * Kita gunakan Supabase Admin agar
     * tidak terkena masalah RLS.
     */
    const admin = supabaseAdmin();

    const { data: order, error: orderError } =
      await admin
        .from("orders")
        .insert({
          user_id: user.id,
          mod_id: mod.id,
          amount: amount,
          status: "pending",
        })
        .select("id, amount, status")
        .single();

    if (orderError || !order) {
      console.error(
        "Order insert error:",
        orderError
      );

      return NextResponse.json(
        {
          error:
            "Gagal membuat order.",
          detail:
            orderError?.message,
        },
        { status: 500 }
      );
    }

    /*
     * Order ID Midtrans
     */
    const orderId =
      `KYZO-${order.id}`;

    /*
     * Authorization:
     *
     * Base64(ServerKey:)
     */
    const auth = Buffer.from(
      `${serverKey}:`
    ).toString("base64");

    /*
     * Request Snap Token
     */
    const midtransResponse =
      await fetch(
        "https://app.sandbox.midtrans.com/snap/v1/transactions",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",

            Authorization:
              `Basic ${auth}`,
          },

          body: JSON.stringify({
            transaction_details: {
              order_id:
                orderId,

              gross_amount:
                amount,
            },

            item_details: [
              {
                id:
                  String(mod.id),

                price:
                  amount,

                quantity: 1,

                name:
                  mod.title.slice(
                    0,
                    50
                  ),
              },
            ],

            enabled_payments: [
              "gopay",
            ],

            customer_details: {
              email:
                user.email ||
                undefined,
            },
          }),
        }
      );

    const midtransData =
      await midtransResponse.json();

    /*
     * Kalau Midtrans gagal
     */
    if (!midtransResponse.ok) {
      console.error(
        "Midtrans error:",
        midtransData
      );

      /*
       * Tandai order gagal
       */
      await admin
        .from("orders")
        .update({
          status: "failed",
        })
        .eq(
          "id",
          order.id
        );

      return NextResponse.json(
        {
          error:
            midtransData?.error_messages?.join(
              " "
            ) ||
            midtransData?.status_message ||
            "Midtrans menolak transaksi.",
        },
        {
          status:
            midtransResponse.status,
        }
      );
    }

    /*
     * Simpan payment reference
     *
     * Kita simpan order_id Midtrans.
     */
    await admin
      .from("orders")
      .update({
        payment_ref:
          orderId,
      })
      .eq(
        "id",
        order.id
      );

    /*
     * Kirim token ke browser
     */
    return NextResponse.json({
      success: true,

      token:
        midtransData.token,

      order_id:
        orderId,

      redirect_url:
        midtransData.redirect_url,
    });
  } catch (error) {
    console.error(
      "Orders API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan pada server.",
      },
      {
        status: 500,
      }
    );
  }
      }
