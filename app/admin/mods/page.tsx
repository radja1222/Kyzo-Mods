import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

type SearchParams = {
  status?: string;
};

export default async function AdminModsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["admin", "owner"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const allowedStatuses = [
    "pending",
    "approved",
    "rejected",
    "hidden",
  ];

  const status = allowedStatuses.includes(
    params.status || ""
  )
    ? params.status!
    : "pending";

  const { data: mods, error } = await supabase
    .from("mods")
    .select(`
      id,
      title,
      slug,
      description,
      version,
      mod_type,
      price,
      thumbnail_url,
      downloads,
      views,
      status,
      created_at,
      updated_at,
      profiles(
        id,
        username,
        avatar_url
      ),
      categories(
        id,
        name,
        game
      )
    `)
    .eq("status", status)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);
  }

  return (
    <main className="adminPage">
      <div className="container">

        {/* HEADER */}

        <div className="adminHeader">

          <div>
            <div className="adminEyebrow">
              KYZO MODS
            </div>

            <h1>
              Mod Moderation
            </h1>

            <p className="muted">
              Review, approve dan kelola mod
              yang dikirim creator.
            </p>
          </div>

          <a
            href="/admin"
            className="btn"
          >
            ← Dashboard
          </a>

        </div>

        {/* FILTER */}

        <div className="moderationFilters">

          <a
            href="/admin/mods?status=pending"
            className={
              status === "pending"
                ? "filterActive"
                : ""
            }
          >
            ⏳ Pending
          </a>

          <a
            href="/admin/mods?status=approved"
            className={
              status === "approved"
                ? "filterActive"
                : ""
            }
          >
            ✓ Approved
          </a>

          <a
            href="/admin/mods?status=rejected"
            className={
              status === "rejected"
                ? "filterActive"
                : ""
            }
          >
            ✕ Rejected
          </a>

          <a
            href="/admin/mods?status=hidden"
            className={
              status === "hidden"
                ? "filterActive"
                : ""
            }
          >
            👁 Hidden
          </a>
        <a
        <form
  action="/api/admin/mods"
  method="POST"
>
  <input
    type="hidden"
    name="id"
    value={mod.id}
  />

  <input
    type="hidden"
    name="action"
    value="delete"
  />

  <button
    className="btn rejectBtn"
    type="submit"
  >
    🗑 Delete
  </button>
</form>
      </a>
        </div>

        {/* MOD LIST */}

        <div className="moderationList">

          {(mods || []).map(
            (mod: any) => (
              <article
                className="moderationCard"
                key={mod.id}
              >

                {/* THUMBNAIL */}

                <div className="moderationThumb">

                  {mod.thumbnail_url ? (
                    <img
                      src={mod.thumbnail_url}
                      alt={mod.title}
                    />
                  ) : (
                    <div className="moderationNoThumb">
                      KYZO
                    </div>
                  )}

                </div>

                {/* CONTENT */}

                <div className="moderationContent">

                  <div className="moderationTop">

                    <div>

                      <span className="tag">
                        {mod.categories?.game?.toUpperCase()}
                        {" · "}
                        {mod.categories?.name}
                      </span>

                      <h2>
                        {mod.title}
                      </h2>

                    </div>

                    <span
                      className={`status status-${mod.status}`}
                    >
                      {mod.status.toUpperCase()}
                    </span>

                  </div>

                  <p>
                    {mod.description?.slice(
                      0,
                      220
                    )}
                    {mod.description?.length >
                    220
                      ? "..."
                      : ""}
                  </p>

                  {/* META */}

                  <div className="moderationMeta">

                    <span>
                      👤{" "}
                      {mod.profiles?.username ||
                        "Unknown"}
                    </span>

                    <span>
                      📦 v{mod.version}
                    </span>

                    <span>
                      {mod.mod_type === "paid"
                        ? `💰 Rp ${Number(
                            mod.price
                          ).toLocaleString(
                            "id-ID"
                          )}`
                        : "🆓 FREE"}
                    </span>

                    <span>
                      ↓ {mod.downloads}
                    </span>

                    <span>
                      👁 {mod.views}
                    </span>

                  </div>

                  {/* ACTION */}

                  <div className="moderationActions">

                    <a
                      href={`/mod/${mod.slug}`}
                      target="_blank"
                      className="btn"
                    >
                      👁 Preview
                    </a>

                    {status === "pending" && (
                      <>
                        <form
                          action="/api/admin/mods"
                          method="POST"
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={mod.id}
                          />

                          <input
                            type="hidden"
                            name="action"
                            value="approve"
                          />

                          <button
                            className="btn approveBtn"
                            type="submit"
                          >
                            ✓ Approve
                          </button>
                        </form>

                        <form
                          action="/api/admin/mods"
                          method="POST"
                        >
                          <input
                            type="hidden"
                            name="id"
                            value={mod.id}
                          />

                          <input
                            type="hidden"
                            name="action"
                            value="reject"
                          />

                          <button
                            className="btn rejectBtn"
                            type="submit"
                          >
                            ✕ Reject
                          </button>
                        </form>
                      </>
                    )}

                    {status === "approved" && (
                      <form
                        action="/api/admin/mods"
                        method="POST"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={mod.id}
                        />

                        <input
                          type="hidden"
                          name="action"
                          value="hide"
                        />

                        <button
                          className="btn"
                          type="submit"
                        >
                          👁 Hide
                        </button>
                      </form>
                    )}

                    {status === "hidden" && (
                      <form
                        action="/api/admin/mods"
                        method="POST"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={mod.id}
                        />

                        <input
                          type="hidden"
                          name="action"
                          value="approve"
                        />

                        <button
                          className="btn approveBtn"
                          type="submit"
                        >
                          ✓ Publish
                        </button>
                      </form>
                    )}

                    {status === "rejected" && (
                      <form
                        action="/api/admin/mods"
                        method="POST"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={mod.id}
                        />

                        <input
                          type="hidden"
                          name="action"
                          value="approve"
                        />

                        <button
                          className="btn approveBtn"
                          type="submit"
                        >
                          ✓ Approve
                        </button>
                      </form>
                    )}

                  </div>

                  <small className="moderationDate">
                    Dikirim{" "}
                    {new Date(
                      mod.created_at
                    ).toLocaleString(
                      "id-ID"
                    )}
                  </small>

                </div>

              </article>
            )
          )}

          {(!mods ||
            mods.length === 0) && (
            <div className="empty moderationEmpty">

              <div className="emptyIcon">
                ✓
              </div>

              <h2>
                Tidak ada mod{" "}
                {status}
              </h2>

              <p className="muted">
                Belum ada mod dalam kategori
                status ini.
              </p>

            </div>
          )}

        </div>

      </div>
    </main>
  );
        }
