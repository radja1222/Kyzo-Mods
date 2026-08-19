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

    /*
     * Validasi notification
     */

    if (
      !order_id ||
      !status_code ||
      !gross_amount ||
      !signature_key
    ) {
      console.error(
        "Notification Midtrans tidak lengkap:",
        notification
      );

      return new NextResponse(
        "Invalid notification",
        { status: 400 }
      );
    }

    /*
     * ==========================================
     * VERIFIKASI SIGNATURE MIDTRANS
     * ==========================================
     *
     * SHA512:
     *
     * order_id + status_code + gross_amount + ServerKey
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

    /*
     * Supabase Admin
     */

    const supabase =
      supabaseAdmin();

    /*
     * ==========================================
     * CARI ORDER
     * ==========================================
     *
     * Midtrans:
     *
     * KYZO-3
     *
     * Database:
     *
     * orders.id = 3
     *
     * Jadi kita cari menggunakan:
     *
     * payment_ref = KYZO-3
     */

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .select(`
        id,
        user_id,
        mod_id,
        amount,
        status,
        payment_ref
      `)
      .eq(
        "payment_ref",
        String(order_id)
      )
      .maybeSingle();

    if (
      orderError ||
      !order
    ) {
      console.error(
        "Order tidak ditemukan:",
        {
          order_id,
          error: orderError,
        }
      );

      return new NextResponse(
        "Order not found",
        { status: 404 }
      );
    }

    /*
     * ==========================================
     * CEK NOMINAL
     * ==========================================
     */

    const orderAmount =
      Math.round(
        Number(order.amount)
      );

    const midtransAmount =
      Math.round(
        Number(gross_amount)
      );

    if (
      orderAmount !==
      midtransAmount
    ) {
      console.error(
        "Amount mismatch:",
        {
          orderId:
            order.id,

          midtransOrderId:
            order_id,

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
     * ==========================================
     * TENTUKAN STATUS
     * ==========================================
     */

    let newStatus:
      | "pending"
      | "paid"
      | "failed" =
      "pending";

    /*
     * Pembayaran berhasil
     */

    if (
      transaction_status ===
      "settlement"
    ) {
      newStatus = "paid";
    }

    /*
     * Credit card capture
     */

    else if (
      transaction_status ===
        "capture" &&
      (
        !fraud_status ||
        fraud_status ===
          "accept"
      )
    ) {
      newStatus = "paid";
    }

    /*
     * Pembayaran gagal
     */

    else if (
      [
        "expire",
        "cancel",
        "deny",
        "failure",
      ].includes(
        transaction_status
      )
    ) {
      newStatus = "failed";
    }

    /*
     * ==========================================
     * JANGAN TURUNKAN ORDER YANG SUDAH PAID
     * ==========================================
     */

    if (
      order.status ===
        "paid" &&
      newStatus !==
        "paid"
    ) {
      console.log(
        `Order ${order_id} sudah paid.`
      );

      return new NextResponse(
        "OK",
        { status: 200 }
      );
    }

    /*
     * ==========================================
     * UPDATE ORDER
     * ==========================================
     */

    const {
      error: updateError,
    } = await supabase
      .from("orders")
      .update({
        status:
          newStatus,

        /*
         * Setelah notification
         * berhasil, simpan transaction_id
         * dari Midtrans.
         *
         * Kalau transaction_id tidak tersedia,
         * tetap pertahankan order_id.
         */
        payment_ref:
          transaction_id ||
          String(order_id),
      })
      .eq(
        "id",
        order.id
      );

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

    /*
     * Log
     */

    console.log(
      "================================="
    );

    console.log(
      "MIDTRANS PAYMENT UPDATE"
    );

    console.log(
      "Midtrans Order:",
      order_id
    );

    console.log(
      "Database Order:",
      order.id
    );

    console.log(
      "Transaction:",
      transaction_id
    );

    console.log(
      "Status:",
      newStatus
    );

    console.log(
      "================================="
    );

    /*
     * Midtrans membutuhkan HTTP 200
     */

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
