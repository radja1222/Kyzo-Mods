import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const allowedRoles = [
  "user",
  "moderator",
  "admin",
];

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

    const { data: currentProfile } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (
      !currentProfile ||
      !["admin", "owner"].includes(
        currentProfile.role
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Tidak memiliki akses.",
        },
        {
          status: 403,
        }
      );
    }

    const form =
      await request.formData();

    const targetId =
      String(form.get("id") || "");

    const role =
      String(form.get("role") || "");

    if (!targetId) {
      return NextResponse.json(
        {
          error:
            "User ID tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !allowedRoles.includes(role)
    ) {
      return NextResponse.json(
        {
          error:
            "Role tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    // Jangan pernah mengubah owner
    const { data: target } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", targetId)
        .single();

    if (!target) {
      return NextResponse.json(
        {
          error:
            "User tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    if (target.role === "owner") {
      return NextResponse.json(
        {
          error:
            "Owner tidak dapat diubah.",
        },
        {
          status: 403,
        }
      );
    }

    // Moderator tidak boleh menaikkan user
    // menjadi admin
    if (
      currentProfile.role ===
        "moderator" &&
      role === "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Moderator tidak dapat memberikan role admin.",
        },
        {
          status: 403,
        }
      );
    }

    const { error } =
      await supabase
        .from("profiles")
        .update({
          role,
        })
        .eq("id", targetId);

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.redirect(
      new URL(
        "/admin/users",
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
      {
        status: 500,
      }
    );
  }
      }
