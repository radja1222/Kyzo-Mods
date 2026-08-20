import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    /*
     * =========================
     * CEK USER
     * =========================
     */

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

    /*
     * =========================
     * AMBIL FORM
     * =========================
     */

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

    /*
     * =========================
     * ADMIN CLIENT
     * =========================
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

      return NextResponse.json(
        {
          error: "Mod tidak ditemukan atau belum disetujui.",
        },
        { status: 404 }
      );
    }

    /*
     * =========================
     * HARUS PAID
     * =========================
     */

    if (mod.mod_type !== "paid") {
      return NextResponse.json(
        {
          error: "Mod ini gratis dan tidak membutuhkan pembayaran.",
        },
        { status: 400 }
      );
    }

    /*
     * =========================
     * VALIDASI HARGA
     * =========================
     */

    const amount = Number(mod.price);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error: "Harga mod tidak valid.",
        },
        { status: 400 }
      );
    }

    /*
     * =========================
     * CEK ORDER PAID
     * =========================
     */

    const { data: paidOrder, error: paidError } =
      await admin
        .from("orders")
        .select("id,status")
        .eq("user_id", user.id)
        .eq("mod_id", mod.id)
        .eq("status", "paid")
        .maybeSingle();

    if (paidError) {
      console.error(
        "CEK ORDER PAID ERROR:",
        paidError
      );
    }

    if (paidOrder) {
      return NextResponse.json(
        {
          error: "Kamu sudah membeli mod ini.",
          alreadyPaid: true,
          slug: mod.slug,
        },
        { status: 409 }
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
        .select("id,status,amount")
        .eq("user_id", user.id)
        .eq("mod_id", mod.id)
        .eq("status", "pending")
        .maybeSingle();

    let orderId: string | number;

    /*
     * Kalau sudah ada pending,
     * gunakan order tersebut.
     */

    if (existingOrder) {
      orderId = existingOrder.id;
    } else {
      /*
       * =========================
       * BUAT ORDER BARU
       * =========================
       */

      const { data: newOrder, error: insertError } =
        await admin
          .from("orders")
          .insert({
            user_id: user.id,
            mod_id: mod.id,
            amount,
            status: "pending",
          })
          .select("id,user_id,mod_id,amount,status")
          .single();

      if (insertError || !newOrder) {
        console.error(
          "GAGAL MEMBUAT ORDER:",
          insertError
        );

        return NextResponse.json(
          {
            error: "Gagal membuat order.",
            details:
              insertError?.message ||
              "Unknown database error",
            code:
              insertError?.code || null,
          },
          { status: 500 }
        );
      }

      orderId = newOrder.id;
    }

    /*
     * =========================
     * RESPONSE
     * =========================
     */

    return NextResponse.json({
      success: true,
      orderId: String(orderId),
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
        error: "Terjadi kesalahan server.",
      },
      { status: 500 }
    );
  }
    }
