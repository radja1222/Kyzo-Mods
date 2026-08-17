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

  const game = params.game || "";
  const search = params.q || "";

  const s = await supabaseServer();

  // ==========================================
  // 1. AMBIL MOD
  // ==========================================

  let query = s
    .from("mods")
    .select(`
      id,
      user_id,
      category_id,
      title,
      slug,
      description,
      mod_type,
      price,
      thumbnail_url,
      downloads,
      views,
      created_at
    `)
    .eq("status", "approved")
    .order("created_at", {
      ascending: false,
    });

  if (search.trim()) {
    query = query.ilike(
      "title",
      `%${search.trim()}%`
    );
  }

  const { data: mods, error } = await query;

  if (error) {
    console.error("MOD QUERY ERROR:", error.message);

    return (
      <section className="section">
        <div className="container">
          <div className="alert">
            Gagal mengambil data mod.
            <br />
            {error.message}
          </div>
        </div>
      </section>
    );
  }

  let finalMods = mods || [];

  // ==========================================
  // 2. FILTER GAME
  // ==========================================

  if (game) {
    const {
      data: gameCategories,
      error: categoryError,
    } = await s
      .from("categories")
      .select("id")
      .eq("game", game);

    if (!categoryError) {
      const ids =
        gameCategories?.map(
          (category) => category.id
        ) || [];

      finalMods = finalMods.filter((mod) =>
        ids.includes(mod.category_id)
      );
    }
  }

  // ==========================================
  // 3. AMBIL CATEGORY
  // ==========================================

  const categoryIds = [
    ...new Set(
      finalMods.map(
        (mod) => mod.category_id
      )
    ),
  ];

  const {
    data: categories,
  } = categoryIds.length
    ? await s
        .from("categories")
        .select("id,name,game")
        .in("id", categoryIds)
    : { data: [] };

  // ==========================================
  // 4. AMBIL CREATOR
  // ==========================================

  const userIds = [
    ...new Set(
      finalMods.map(
        (mod) => mod.user_id
      )
    ),
  ];

  const {
    data: profiles,
  } = userIds.length
    ? await s
        .from("profiles")
        .select(
          "id,username,avatar_url"
        )
        .in("id", userIds)
    : { data: [] };

  // ==========================================
  // 5. BUAT MAP
  // ==========================================

  const categoryMap = new Map(
    (categories || []).map(
      (category) => [
        category.id,
        category,
      ]
    )
  );

  const profileMap = new Map(
    (profiles || []).map(
      (profile) => [
        profile.id,
        profile,
      ]
    )
  );

  // ==========================================
  // 6. TAMPILAN
  // ==========================================

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
                  key={mod.id}
                  href={`/mod/${mod.slug}`}
                  className="card"
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
                          mod.mod_type === "paid"
                            ? "price"
                            : ""
                        }
                      >
                        {mod.mod_type === "paid"
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
                        👁 {mod.views || 0}
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
