import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const notification = await req.json();

    const serverKey =
      process.env.MIDTRANS_SERVER_KEY;

    if (!serverKey) {
      console.error(
        "MIDTRANS_SERVER_KEY tidak ditemukan."
      );

      return new NextResponse(
        "Server misconfigured",
        { status: 500 }
      );
    }

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      transaction_id,
      fraud_status,
    } = notification;

    if (
      !order_id ||
      !status_code ||
      !gross_amount ||
      !signature_key
    ) {
      return new NextResponse(
        "Invalid notification",
        { status: 400 }
      );
    }

    /*
     * Verifikasi Signature Midtrans
     */

    const raw =
      `${order_id}${status_code}${gross_amount}${serverKey}`;

    const expectedSignature =
      createHash("sha512")
        .update(raw)
        .digest("hex");

    if (
      expectedSignature !== signature_key
    ) {
      console.error(
        "Invalid Midtrans signature."
      );

      return new NextResponse(
        "Invalid signature",
        { status: 403 }
      );
    }

    const s = supabaseAdmin();

    /*
     * Cari order berdasarkan ID
     */

    const { data: order, error } =
      await s
        .from("orders")
        .select(`
          id,
          user_id,
          mod_id,
          amount,
          status
        `)
        .eq("id", order_id)
        .single();

    if (error || !order) {
      console.error(
        "Order tidak ditemukan:",
        error
      );

      return new NextResponse(
        "Order not found",
        { status: 404 }
      );
    }

    /*
     * Pastikan nominal sama
     */

    const orderAmount = Math.round(
      Number(order.amount)
    );

    const midtransAmount = Math.round(
      Number(gross_amount)
    );

    if (
      orderAmount !== midtransAmount
    ) {
      console.error(
        "Amount mismatch:",
        {
          orderAmount,
          midtransAmount,
        }
      );

      return new NextResponse(
        "Amount mismatch",
        { status: 400 }
      );
    }

    /*
     * Tentukan status pembayaran
     */

    let newStatus = "pending";

    if (
      transaction_status === "settlement"
    ) {
      newStatus = "paid";
    }

    else if (
      transaction_status === "capture" &&
      (
        !fraud_status ||
        fraud_status === "accept"
      )
    ) {
      newStatus = "paid";
    }

    else if (
      [
        "expire",
        "cancel",
        "deny",
        "failure",
      ].includes(transaction_status)
    ) {
      newStatus = "failed";
    }

    /*
     * Jangan turunkan order yang sudah paid.
     */

    if (
      order.status === "paid" &&
      newStatus !== "paid"
    ) {
      return new NextResponse(
        "OK",
        { status: 200 }
      );
    }

    /*
     * Update order
     */

    const { error: updateError } =
      await s
        .from("orders")
        .update({
          status: newStatus,
          payment_ref:
            transaction_id ||
            String(order_id),
        })
        .eq("id", order.id);

    if (updateError) {
      console.error(
        "Gagal update order:",
        updateError
      );

      return new NextResponse(
        "Database error",
        { status: 500 }
      );
    }

    console.log(
      `Midtrans order ${order_id}: ${newStatus}`
    );

    return new NextResponse(
      "OK",
      { status: 200 }
    );

  } catch (error) {
    console.error(
      "MIDTRANS WEBHOOK ERROR:",
      error
    );

    return new NextResponse(
      "Server error",
      { status: 500 }
    );
  }
}
