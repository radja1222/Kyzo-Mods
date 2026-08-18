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

    // Pastikan ID valid
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
    const { data: mod, error: modError } = await supabase
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

    if (modError || !mod) {
      console.error("MOD ERROR:", modError);

      return NextResponse.json(
        {
          error: "Mod tidak ditemukan atau belum approved.",
        },
        {
          status: 404,
        }
      );
    }

    // Download hanya untuk mod FREE
    if (mod.mod_type !== "free") {
      return NextResponse.json(
        {
          error: "Mod ini merupakan mod berbayar.",
        },
        {
          status: 403,
        }
      );
    }

    if (!mod.file_path) {
      return NextResponse.json(
        {
          error: "File mod tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Bucket "mods" dibuat PRIVATE.
     * Karena itu kita menggunakan signed URL.
     */
    const { data: signed, error: signedError } =
      await supabase.storage
        .from("mods")
        .createSignedUrl(mod.file_path, 60);

    if (signedError || !signed?.signedUrl) {
      console.error("SIGNED URL ERROR:", signedError);

      return NextResponse.json(
        {
          error:
            "Gagal membuat link download. Pastikan file masih ada di Storage.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Redirect langsung ke file Storage.
     */
    return NextResponse.redirect(signed.signedUrl);
  } catch (error) {
    console.error("DOWNLOAD API ERROR:", error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan pada server.",
      },
      {
        status: 500,
      }
    );
  }
}
