import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    // =========================
    // CEK USER LOGIN
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
    // AMBIL MOD ID
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
    // =========================

    const {
      data: mod,
      error: modError,
    } = await supabase
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
          code: modError.code,
          hint: modError.hint,
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
    // VALIDASI MOD PAID
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

    // =========================
    // VALIDASI HARGA
    // =========================

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
    // =========================

    const admin = supabaseAdmin();

    // =========================
    // CEK ORDER SUDAH PAID
    // =========================

    const {
      data: paidOrder,
      error: paidError,
    } = await admin
      .from("orders")
      .select("id")
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
          code: paidError.code,
          hint: paidError.hint,
          details_supabase:
            paidError.details,
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
    // CEK ORDER PENDING
    // =========================

    const {
      data: pendingOrder,
      error: pendingError,
    } = await admin
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("mod_id", mod.id)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingError) {
      console.error(
        "ERROR CEK PENDING ORDER:",
        pendingError
      );

      return NextResponse.json(
        {
          error:
            "Gagal memeriksa order pending.",
          details: pendingError.message,
          code: pendingError.code,
          hint: pendingError.hint,
          details_supabase:
            pendingError.details,
        },
        { status: 500 }
      );
    }

    // =========================
    // JIKA SUDAH ADA PENDING
    // =========================

    if (pendingOrder) {
      console.log(
        "Menggunakan pending order:",
        pendingOrder.id
      );

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
    // BUAT ORDER BARU
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
          details_supabase:
            orderError.details,
        },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Order berhasil dibuat tetapi data order tidak ditemukan.",
        },
        { status: 500 }
      );
    }

    // =========================
    // BERHASIL
    // =========================

    console.log(
      "ORDER BERHASIL DIBUAT:",
      order.id
    );

    return NextResponse.json({
      success: true,
      orderId: String(order.id),
      modId: mod.id,
      title: mod.title,
      amount,
      existing: false,
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
