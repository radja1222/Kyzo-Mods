import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    // =========================
    // AUTH
    // =========================

    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login", req.url)
      );
    }

    // =========================
    // FORM
    // =========================

    const form = await req.formData();
    const modIdRaw = form.get("mod_id");

    const modId = Number(modIdRaw);

    if (
      !modIdRaw ||
      !Number.isInteger(modId) ||
      modId <= 0
    ) {
      return NextResponse.redirect(
        new URL(
          "/dashboard?order=invalid_mod_id",
          req.url
        )
      );
    }

    // =========================
    // ADMIN SUPABASE
    // =========================

    const admin = supabaseAdmin();

    // =========================
    // CARI MOD
    // =========================

    const {
      data: mod,
      error: modError,
    } = await admin
      .from("mods")
      .select(
        "id,title,slug,price,mod_type,status"
      )
      .eq("id", modId)
      .maybeSingle();

    if (modError) {
      console.error(
        "DATABASE ERROR MOD:",
        modError
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${modId}?error=mod_database`,
          req.url
        )
      );
    }

    if (!mod) {
      console.error(
        "MOD TIDAK DITEMUKAN:",
        modId
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${modId}?error=mod_not_found`,
          req.url
        )
      );
    }

    console.log(
      "MOD DITEMUKAN:",
      {
        id: mod.id,
        title: mod.title,
        status: mod.status,
        type: mod.mod_type,
      }
    );

    // =========================
    // CEK STATUS MOD
    // =========================

    if (mod.status !== "approved") {
      console.error(
        "MOD BELUM APPROVED:",
        {
          id: mod.id,
          status: mod.status,
        }
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${modId}?error=mod_not_approved`,
          req.url
        )
      );
    }

    // =========================
    // CEK TIPE MOD
    // =========================

    if (mod.mod_type !== "paid") {
      return NextResponse.redirect(
        new URL(
          `/mod/${mod.slug}`,
          req.url
        )
      );
    }

    // =========================
    // CEK HARGA
    // =========================

    const amount = Math.round(
      Number(mod.price)
    );

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      console.error(
        "HARGA INVALID:",
        mod.price
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${modId}?error=invalid_price`,
          req.url
        )
      );
    }

    // =========================
    // CEK ORDER PAID
    // =========================

    const {
      data: paidOrder,
      error: paidError,
    } = await admin
      .from("orders")
      .select("id,status")
      .eq("user_id", user.id)
      .eq("mod_id", mod.id)
      .eq("status", "paid")
      .maybeSingle();

    if (paidError) {
      console.error(
        "GAGAL CEK ORDER PAID:",
        paidError
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${modId}?error=order_check`,
          req.url
        )
      );
    }

    if (paidOrder) {
      return NextResponse.redirect(
        new URL(
          `/mod/${mod.slug}`,
          req.url
        )
      );
    }

    // =========================
    // CARI ORDER PENDING
    // =========================

    const {
      data: pendingOrder,
      error: pendingError,
    } = await admin
      .from("orders")
      .select(
        "id,amount,status"
      )
      .eq("user_id", user.id)
      .eq("mod_id", mod.id)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingError) {
      console.error(
        "GAGAL CEK PENDING ORDER:",
        pendingError
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${modId}?error=order_check`,
          req.url
        )
      );
    }

    let orderId: string | number;

    // =========================
    // ORDER LAMA
    // =========================

    if (pendingOrder) {
      orderId = pendingOrder.id;

      const oldAmount = Math.round(
        Number(pendingOrder.amount)
      );

      if (oldAmount !== amount) {
        const {
          error: updateError,
        } = await admin
          .from("orders")
          .update({
            amount,
          })
          .eq(
            "id",
            pendingOrder.id
          );

        if (updateError) {
          console.error(
            "GAGAL UPDATE ORDER:",
            updateError
          );

          return NextResponse.redirect(
            new URL(
              `/checkout/${modId}?error=order_update`,
              req.url
            )
          );
        }
      }
    }

    // =========================
    // ORDER BARU
    // =========================

    else {
      const {
        data: newOrder,
        error: insertError,
      } = await admin
        .from("orders")
        .insert({
          user_id: user.id,
          mod_id: mod.id,
          amount,
          status: "pending",
        })
        .select(
          "id,amount,status"
        )
        .single();

      if (
        insertError ||
        !newOrder
      ) {
        console.error(
          "GAGAL INSERT ORDER:",
          insertError
        );

        return NextResponse.redirect(
          new URL(
            `/checkout/${modId}?error=order_create`,
            req.url
          )
        );
      }

      orderId = newOrder.id;
    }

    // =========================
    // MIDTRANS CONFIG
    // =========================

    const serverKey =
      process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error(
        "MIDTRANS_SERVER_KEY KOSONG"
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${modId}?error=midtrans_config`,
          req.url
        )
      );
    }

    const isProduction =
      process.env.MIDTRANS_IS_PRODUCTION ===
      "true";

    const midtransUrl = isProduction
      ? "https://app.midtrans.com/snap/v1/transactions"
      : "https://app.sandbox.midtrans.com/snap/v1/transactions";

    // =========================
    // MIDTRANS ORDER ID
    // =========================

    const midtransOrderId =
      `KYZO-${orderId}-${Date.now()}`;

    const authorization =
      Buffer.from(
        `${serverKey}:`
      ).toString("base64");

    // =========================
    // PAYLOAD MIDTRANS
    // =========================

    const payload = {
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
          "Kyzo User",

        email:
          user.email || undefined,
      },

      enabled_payments: [
        "gopay",
      ],

      expiry: {
        unit: "minutes",
        duration: 15,
      },
    };

    console.log(
      "MIDTRANS REQUEST:",
      {
        order_id: midtransOrderId,
        amount,
      }
    );

    // =========================
    // REQUEST MIDTRANS
    // =========================

    const response =
      await fetch(midtransUrl, {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          Authorization:
            `Basic ${authorization}`,
        },

        body: JSON.stringify(
          payload
        ),
      });

    const result =
      await response.json();

    // =========================
    // MIDTRANS ERROR
    // =========================

    if (!response.ok) {
      console.error(
        "MIDTRANS ERROR:",
        result
      );

      return NextResponse.redirect(
        new URL(
          `/checkout/${modId}?error=midtrans`,
          req.url
        )
      );
    }

    console.log(
      "MIDTRANS BERHASIL:",
      result
    );

    // =========================
    // SIMPAN PAYMENT REF
    // =========================

    const {
      error: saveError,
    } = await admin
      .from("orders")
      .update({
        payment_ref:
          result.token ||
          midtransOrderId,
      })
      .eq(
        "id",
        orderId
      );

    if (saveError) {
      console.error(
        "GAGAL SIMPAN PAYMENT REF:",
        saveError
      );
    }

    // =========================
    // REDIRECT MIDTRANS
    // =========================

    if (result.redirect_url) {
      return NextResponse.redirect(
        result.redirect_url,
        303
      );
    }

    // =========================
    // SNAP TOKEN
    // =========================

    if (result.token) {
      return NextResponse.redirect(
        new URL(
          `/checkout/${modId}?snap_token=${encodeURIComponent(
            result.token
          )}`,
          req.url
        ),
        303
      );
    }

    console.error(
      "MIDTRANS TIDAK MEMBERIKAN TOKEN/REDIRECT:",
      result
    );

    return NextResponse.redirect(
      new URL(
        `/checkout/${modId}?error=no_payment_url`,
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
