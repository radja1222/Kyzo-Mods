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
  const s = await supabaseServer();

  const game = params.game || "";
  const search = params.q || "";

  // Ambil semua mod yang sudah approved
  let modsQuery = s
    .from("mods")
    .select(
      "id,user_id,category_id,title,slug,description,mod_type,price,thumbnail_url,downloads,created_at"
    )
    .eq("status", "approved")
    .order("created_at", {
      ascending: false,
    });

  // Search berdasarkan judul
  if (search.trim()) {
    modsQuery = modsQuery.ilike(
      "title",
      `%${search.trim()}%`
    );
  }

  const { data: mods, error: modsError } = await modsQuery;

  if (modsError) {
    console.error("MODS ERROR:", modsError);
  }

  let finalMods = mods || [];

  // Filter game berdasarkan kategori
  if (game) {
    const { data: categories } = await s
      .from("categories")
      .select("id")
      .eq("game", game);

    const categoryIds =
      categories?.map((c) => c.id) || [];

    finalMods = finalMods.filter((mod) =>
      categoryIds.includes(mod.category_id)
    );
  }

  // Ambil kategori
  const categoryIds = [
    ...new Set(
      finalMods.map((mod) => mod.category_id)
    ),
  ];

  const { data: categories } = categoryIds.length
    ? await s
        .from("categories")
        .select("id,name,game")
        .in("id", categoryIds)
    : { data: [] };

  // Ambil creator
  const userIds = [
    ...new Set(
      finalMods.map((mod) => mod.user_id)
    ),
  ];

  const { data: profiles } = userIds.length
    ? await s
        .from("profiles")
        .select("id,username,avatar_url")
        .in("id", userIds)
    : { data: [] };

  // Gabungkan data
  const categoryMap = new Map(
    (categories || []).map((c) => [
      c.id,
      c,
    ])
  );

  const profileMap = new Map(
    (profiles || []).map((p) => [
      p.id,
      p,
    ])
  );

  return (
    <section className="section">
      <div className="container">

        <div className="head">
          <div>
            <h2>Browse Mods</h2>

            <p className="muted">
              SA-MP & FiveM community marketplace.
            </p>
          </div>
        </div>

        <form
          className="toolbar"
          method="GET"
        >
          <input
            name="q"
            placeholder="Cari mod..."
            defaultValue={search}
          />

          <select
            name="game"
            defaultValue={game}
          >
            <option value="">
              Semua game
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
            Search
          </button>
        </form>

        {modsError && (
          <div className="alert">
            Gagal mengambil data mod.
          </div>
        )}

        {finalMods.length === 0 ? (
          <div className="empty">
            <h3>
              Mod tidak ditemukan
            </h3>

            <p className="muted">
              Belum ada mod yang sesuai
              dengan pencarian kamu.
            </p>
          </div>
        ) : (
          <div className="grid">

            {finalMods.map((mod) => {
              const category =
                categoryMap.get(
                  mod.category_id
                );

              const creator =
                profileMap.get(
                  mod.user_id
                );

              return (
                <a
                  className="card"
                  href={`/mod/${mod.slug}`}
                  key={mod.id}
                >

                  <div className="thumb">

                    {mod.thumbnail_url ? (
                      <img
                        src={mod.thumbnail_url}
                        alt={mod.title}
                      />
                    ) : (
                      <div className="thumbPlaceholder">
                        KYZO MODS
                      </div>
                    )}

                  </div>

                  <div className="body">

                    <span className="tag">
                      {category?.game
                        ? category.game.toUpperCase()
                        : "GAME"}

                      {" · "}

                      {category?.name ||
                        "Uncategorized"}
                    </span>

                    <h3>
                      {mod.title}
                    </h3>

                    <p>
                      {mod.description
                        ? mod.description.length > 100
                          ? mod.description.slice(
                              0,
                              100
                            ) + "..."
                          : mod.description
                        : "Tidak ada deskripsi."}
                    </p>

                    <div className="meta">

                      <span>
                        by{" "}
                        {creator?.username ||
                          "Unknown Creator"}
                      </span>

                      <span
                        className={
                          mod.mod_type ===
                          "paid"
                            ? "price"
                            : ""
                        }
                      >
                        {mod.mod_type ===
                        "paid"
                          ? `Rp ${Number(
                              mod.price
                            ).toLocaleString(
                              "id-ID"
                            )}`
                          : "FREE"}
                      </span>

                    </div>

                    <div className="meta">
                      <span>
                        ↓ {mod.downloads || 0}
                      </span>

                      <span>
                        View Mod →
                      </span>
                    </div>

                  </div>

                </a>
              );
            })}

          </div>
        )}

      </div>
    </section>
  );
            }
