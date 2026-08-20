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
      return NextResponse.json(
        {
          error: "Kamu harus login terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    // =========================
    // FORM
    // =========================

    const form = await req.formData();

    const modIdRaw = form.get("mod_id");

    if (!modIdRaw) {
      return NextResponse.json(
        {
          error: "mod_id tidak ditemukan.",
        },
        { status: 400 }
      );
    }

    const modId = Number(modIdRaw);

    if (!Number.isInteger(modId) || modId <= 0) {
      return NextResponse.json(
        {
          error: "mod_id tidak valid.",
        },
        { status: 400 }
      );
    }

    // =========================
    // CARI MOD
    // PAKAI SERVER CLIENT
    // =========================

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
        .maybeSingle();

    if (modError) {
      console.error(
        "ERROR MENCARI MOD:",
        modError
      );

      return NextResponse.json(
        {
          error: "Gagal mengambil data mod.",
          details: modError.message,
        },
        { status: 500 }
      );
    }

    if (!mod) {
      return NextResponse.json(
        {
          error:
            "Mod tidak ditemukan atau belum disetujui.",
          modId,
        },
        { status: 404 }
      );
    }

    // =========================
    // VALIDASI MOD
    // =========================

    if (mod.mod_type !== "paid") {
      return NextResponse.json(
        {
          error:
            "Mod ini bukan mod berbayar.",
        },
        { status: 400 }
      );
    }

    const amount = Number(mod.price);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "Harga mod tidak valid.",
        },
        { status: 400 }
      );
    }

    // =========================
    // ADMIN CLIENT
    // HANYA UNTUK ORDERS
    // =========================

    const admin = supabaseAdmin();

    // =========================
    // CEK SUDAH BAYAR
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
        "ERROR CEK PAID ORDER:",
        paidError
      );

      return NextResponse.json(
        {
          error:
            "Gagal memeriksa order sebelumnya.",
          details: paidError.message,
        },
        { status: 500 }
      );
    }

    if (paidOrder) {
      return NextResponse.json(
        {
          error:
            "Kamu sudah membeli mod ini.",
          alreadyPaid: true,
          slug: mod.slug,
        },
        { status: 409 }
      );
    }

    // =========================
    // CEK PENDING
    // =========================

    const {
      data: pendingOrder,
      error: pendingError,
    } = await admin
      .from("orders")
      .select("id,status,amount")
      .eq("user_id", user.id)
      .eq("mod_id", mod.id)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingError) {
      console.error(
        "ERROR CEK PENDING:",
        pendingError
      );

      return NextResponse.json(
        {
          error:
            "Gagal memeriksa order pending.",
          details: pendingError.message,
        },
        { status: 500 }
      );
    }

    // =========================
    // ORDER SUDAH ADA
    // =========================

    if (pendingOrder) {
      return NextResponse.json({
        success: true,
        orderId: String(pendingOrder.id),
        modId: mod.id,
        title: mod.title,
        amount,
        existing: true,
      });
    }

    // =========================
    // BUAT ORDER
    // =========================

    const {
      data: order,
      error: orderError,
    } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        mod_id: mod.id,
        amount: amount,
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

    if (orderError) {
      console.error(
        "ERROR INSERT ORDERS:",
        orderError
      );

      return NextResponse.json(
        {
          error: "Gagal membuat order.",
          details: orderError.message,
          code: orderError.code,
          hint: orderError.hint,
        },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Order berhasil diproses tetapi data order tidak ditemukan.",
        },
        { status: 500 }
      );
    }

    // =========================
    // BERHASIL
    // =========================

    console.log(
      "ORDER CREATED:",
      order.id
    );

    return NextResponse.json({
      success: true,
      orderId: String(order.id),
      modId: mod.id,
      title: mod.title,
      amount,
    });

  } catch (error) {
    console.error(
      "ORDER API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
      }
