import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login", request.url)
      );
    }

    /* =========================
       CHECK ADMIN
    ========================= */

    const { data: profile } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      !profile ||
      !["admin", "owner"].includes(
        profile.role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Akses ditolak.",
        },
        {
          status: 403,
        }
      );
    }

    /* =========================
       FORM DATA
    ========================= */

    const form =
      await request.formData();

    const id = Number(
      form.get("id")
    );

    const action = String(
      form.get("action") || ""
    );

    if (!id || !action) {
      return NextResponse.json(
        {
          error:
            "Data tidak lengkap.",
        },
        {
          status: 400,
        }
      );
    }

    /* =========================
       ACTION
    ========================= */

    let newStatus = "";

    switch (action) {

      case "approve":
        newStatus = "approved";
        break;

      case "reject":
        newStatus = "rejected";
        break;

      case "hide":
        newStatus = "hidden";
        break;

      default:
        return NextResponse.json(
          {
            error:
              "Action tidak valid.",
          },
          {
            status: 400,
          }
        );
    }

    /* =========================
       UPDATE MOD
    ========================= */

    const { error } =
      await supabase
        .from("mods")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    if (error) {
      console.error(
        "ADMIN MOD ERROR:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    /* =========================
       REDIRECT
    ========================= */

    return NextResponse.redirect(
      new URL(
        `/admin/mods?status=${newStatus}`,
        request.url
      )
    );

  } catch (error: any) {

    console.error(
      "ADMIN API ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}
