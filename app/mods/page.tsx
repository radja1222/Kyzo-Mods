import { supabaseServer } from "@/lib/supabase-server";

export default async function Mods({
  searchParams,
}: {
  searchParams: Promise<{
    game?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;

  const game = params.game?.trim().toLowerCase() || "";
  const search = params.q?.trim() || "";

  const supabase = await supabaseServer();

  let query = supabase
    .from("mods")
    .select(`
      id,
      title,
      slug,
      description,
      mod_type,
      price,
      thumbnail_url,
      downloads,
      views,
      created_at,
      profiles (
        id,
        username,
        avatar_url
      ),
      categories (
        id,
        name,
        game,
        slug
      )
    `)
    .eq("status", "approved")
    .order("created_at", {
      ascending: false,
    });

  // Filter game
  if (game === "samp" || game === "fivem") {
    query = query.eq("categories.game", game);
  }

  // Search judul + deskripsi
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  const {
    data: mods,
    error,
  } = await query;

  if (error) {
    console.error("KYZO MODS SEARCH ERROR:", error);

    return (
      <section className="section">
        <div className="container">
          <div className="alert">
            Gagal mengambil data mod.
            <br />
            <small>{error.message}</small>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">

        {/* HEADER */}
        <div className="head">
          <div>
            <h2>Browse Mods</h2>

            <p className="muted">
              Temukan mod grafik, vehicle, map,
              script dan berbagai mod GTA.
            </p>
          </div>

          <div className="modTotal">
            {mods?.length || 0} Mods
          </div>
        </div>

        {/* SEARCH */}
        <form
          className="toolbar"
          method="GET"
        >
          <input
            type="text"
            name="q"
            placeholder="Cari mod, graphics, vehicle..."
            defaultValue={search}
          />

          <select
            name="game"
            defaultValue={game}
          >
            <option value="">
              Semua Game
            </option>

            <option value="samp">
              SA-MP
            </option>

            <option value="fivem">
              FiveM
            </option>
          </select>

          <button
            type="submit"
            className="btn primary"
          >
            🔎 Search
          </button>
        </form>

        {/* RESULT */}
        {!mods || mods.length === 0 ? (
          <div className="emptyMods">

            <div className="emptyModsIcon">
              🔍
            </div>

            <h3>
              {search
                ? `Mod "${search}" tidak ditemukan`
                : "Belum ada mod tersedia"}
            </h3>

            <p>
              Coba gunakan kata kunci lain
              atau pilih kategori game yang berbeda.
            </p>

          </div>
        ) : (

          <div className="grid">

            {mods.map((mod: any) => (

              <a
                className="card"
                href={`/mod/${mod.slug}`}
                key={mod.id}
              >

                {/* THUMBNAIL */}
                <div className="thumb">

                  {mod.thumbnail_url ? (
                    <img
                      src={mod.thumbnail_url}
                      alt={mod.title}
                    />
                  ) : (
                    <div className="noThumb">
                      KYZO MODS
                    </div>
                  )}

                  {/* TYPE */}
                  <span
                    className={
                      mod.mod_type === "paid"
                        ? "modType paid"
                        : "modType free"
                    }
                  >
                    {mod.mod_type === "paid"
                      ? `Rp ${Number(
                          mod.price
                        ).toLocaleString("id-ID")}`
                      : "FREE"}
                  </span>

                </div>

                {/* CONTENT */}
                <div className="body">

                  {mod.categories && (
                    <span className="tag">
                      {mod.categories.game?.toUpperCase()}
                      {" · "}
                      {mod.categories.name}
                    </span>
                  )}

                  <h3>
                    {mod.title}
                  </h3>

                  <p>
                    {mod.description
                      ? mod.description.length > 100
                        ? `${mod.description.slice(
                            0,
                            100
                          )}...`
                        : mod.description
                      : "Tidak ada deskripsi."}
                  </p>

                  {/* META */}
                  <div className="meta">

                    <span>
                      by{" "}
                      {mod.profiles?.username ||
                        "Unknown"}
                    </span>

                    <span>
                      ↓{" "}
                      {formatNumber(
                        Number(mod.downloads || 0)
                      )}
                    </span>

                  </div>

                </div>

              </a>

            ))}

          </div>

        )}

      </div>
    </section>
  );
}

function formatNumber(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return value.toString();
      }
