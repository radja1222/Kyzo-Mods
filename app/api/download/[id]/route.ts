import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await context.params;

    // Validasi ID
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json(
        {
          error: "ID mod tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = await supabaseServer();

    // Ambil data mod
    const { data: mod, error } = await supabase
      .from("mods")
      .select(
        `
        id,
        title,
        file_path,
        mod_type,
        status
        `
      )
      .eq("id", Number(id))
      .eq("status", "approved")
      .single();

    if (error) {
      console.error("SUPABASE MOD ERROR:", error);

      return NextResponse.json(
        {
          error: "Gagal mengambil data mod.",
          detail: error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!mod) {
      return NextResponse.json(
        {
          error: "Mod tidak ditemukan atau belum approved.",
        },
        {
          status: 404,
        }
      );
    }

    // Pastikan hanya FREE yang bisa langsung didownload
    if (mod.mod_type !== "free") {
      return NextResponse.json(
        {
          error: "Mod ini adalah mod berbayar.",
        },
        {
          status: 403,
        }
      );
    }

    // Pastikan file_path tersedia
    if (!mod.file_path) {
      return NextResponse.json(
        {
          error: "Path file mod kosong.",
        },
        {
          status: 404,
        }
      );
    }

    console.log("DOWNLOAD MOD:", {
      id: mod.id,
      title: mod.title,
      file_path: mod.file_path,
    });

    /*
     * Bucket mods sekarang PUBLIC.
     * Ambil URL file secara langsung.
     */
    const { data } = supabase.storage
      .from("mods")
      .getPublicUrl(mod.file_path);

    if (!data?.publicUrl) {
      return NextResponse.json(
        {
          error: "URL file tidak dapat dibuat.",
        },
        {
          status: 500,
        }
      );
    }

    console.log("PUBLIC DOWNLOAD URL:", data.publicUrl);

    // Redirect ke file
    return NextResponse.redirect(data.publicUrl);
  } catch (error: any) {
    console.error("DOWNLOAD ERROR:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
        detail: error?.message || "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
          }
