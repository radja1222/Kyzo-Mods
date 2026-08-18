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

    const id = Number(
      form.get("id")
    );

    const action = String(
      form.get("action") || ""
    );

    if (!id) {
      return NextResponse.json(
        {
          error:
            "ID mod tidak valid.",
        },
        { status: 400 }
      );
    }

    /*
     * DELETE
     */

    if (action === "delete") {

      const { data: mod } =
        await supabase
          .from("mods")
          .select(
            "id,file_path,thumbnail_url"
          )
          .eq("id", id)
          .single();

      if (!mod) {
        return NextResponse.json(
          {
            error:
              "Mod tidak ditemukan.",
          },
          { status: 404 }
        );
      }

      /*
       * Hapus file mod dari Storage
       */

      if (mod.file_path) {
        await supabase.storage
          .from("mods")
          .remove([
            mod.file_path,
          ]);
      }

      /*
       * Hapus thumbnail
       */

      if (mod.thumbnail_url) {

        try {
          const url =
            new URL(
              mod.thumbnail_url
            );

          const marker =
            "/storage/v1/object/public/thumbnails/";

          const index =
            url.pathname.indexOf(
              marker
            );

          if (index !== -1) {
            const thumbPath =
              decodeURIComponent(
                url.pathname.slice(
                  index +
                    marker.length
                )
              );

            await supabase.storage
              .from("thumbnails")
              .remove([
                thumbPath,
              ]);
          }
        } catch {
          // thumbnail tidak wajib dihapus
        }
      }

      /*
       * Hapus database record
       */

      const { error } =
        await supabase
          .from("mods")
          .delete()
          .eq("id", id);

      if (error) {
        return NextResponse.json(
          {
            error: error.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.redirect(
        new URL(
          "/admin/mods?status=approved",
          request.url
        )
      );
    }

    /*
     * STATUS ACTION
     */

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
          { status: 400 }
        );
    }

    const { error } =
      await supabase
        .from("mods")
        .update({
          status: newStatus,
          updated_at:
            new Date().toISOString(),
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

    return NextResponse.redirect(
      new URL(
        `/admin/mods?status=${newStatus}`,
        request.url
      )
    );
  } catch (error: any) {
    console.error(
      "ADMIN MOD ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Internal server error.",
      },
      { status: 500 }
    );
  }
        }
