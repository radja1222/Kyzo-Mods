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
          error: "Akses ditolak.",
        },
        { status: 403 }
      );
    }

    const form =
      await request.formData();

    const id = String(
      form.get("id") || ""
    );

    const action = String(
      form.get("action") || ""
    );

    if (!id) {
      return NextResponse.json(
        {
          error: "Report ID tidak valid.",
        },
        { status: 400 }
      );
    }

    if (action === "resolve") {
      const { error } =
        await supabase
          .from("reports")
          .update({
            status: "resolved",
          })
          .eq("id", id);

      if (error) {
        return NextResponse.json(
          {
            error: error.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.redirect(
      new URL(
        "/admin/reports",
        request.url
      )
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Server error.",
      },
      { status: 500 }
    );
  }
    }
