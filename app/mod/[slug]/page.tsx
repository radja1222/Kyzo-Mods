import { supabaseServer } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/FavoriteButton";
import { CommentForm } from "@/components/CommentForm";
import { RatingForm } from "@/components/RatingForm";

export default async function ModPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const s = await supabaseServer();

  // =========================
  // GET MOD
  // =========================

  const { data: m, error } = await s
    .from("mods")
    .select(`
      id,
      user_id,
      category_id,
      title,
      slug,
      description,
      version,
      mod_type,
      price,
      file_path,
      thumbnail_url,
      downloads,
      views,
      status,
      created_at,
      profiles!mods_user_id_fkey(
        id,
        username,
        avatar_url,
        bio
      ),
      categories!mods_category_id_fkey(
        id,
        name,
        game
      )
    `)
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    console.error(
      "Gagal mengambil detail mod:",
      error
    );

    notFound();
  }

  if (!m) {
    notFound();
  }

  // =========================
  // GET CURRENT USER
  // =========================

  const {
    data: { user },
  } = await s.auth.getUser();

  // =========================
  // GET COMMENTS
  // =========================

  const { data: comments } = await s
    .from("comments")
    .select(`
      id,
      content,
      created_at,
      profiles(
        username,
        avatar_url
      )
    `)
    .eq("mod_id", m.id)
    .eq("status", "visible")
    .order("created_at", {
      ascending: false,
    });

  // =========================
  // GET RATINGS
  // =========================

  const { data: ratings } = await s
    .from("ratings")
    .select(`
      user_id,
      rating,
      review,
      created_at,
      profiles(
        username,
        avatar_url
      )
    `)
    .eq("mod_id", m.id)
    .order("created_at", {
      ascending: false,
    });

  // =========================
  // RATING CALCULATION
  // =========================

  const ratingList = ratings || [];

  const ratingCount = ratingList.length;

  const ratingTotal = ratingList.reduce(
    (total: number, item: any) =>
      total + Number(item.rating || 0),
    0
  );

  const averageRating =
    ratingCount > 0
      ? ratingTotal / ratingCount
      : 0;

  const roundedRating =
    Math.round(averageRating * 10) / 10;

  // =========================
  // CURRENT USER RATING
  // =========================

  const currentRating = user
    ? ratingList.find(
        (item: any) =>
          item.user_id === user.id
      )
    : null;

  // =========================
  // RELATION DATA
  // =========================

  const category = Array.isArray(m.categories)
    ? m.categories[0]
    : m.categories;

  const creator = Array.isArray(m.profiles)
    ? m.profiles[0]
    : m.profiles;

  return (
    <div className="container detail">

      <main className="detailMain">

        {/* =========================
            THUMBNAIL
        ========================= */}

        {m.thumbnail_url && (
          <img
            className="detailImg"
            src={m.thumbnail_url}
            alt={m.title}
          />
        )}

        {/* =========================
            CATEGORY
        ========================= */}

        <span className="tag">
          {category?.game?.toUpperCase()}
          {" · "}
          {category?.name}
        </span>

        {/* =========================
            TITLE
        ========================= */}

        <h1>{m.title}</h1>

        {/* =========================
            RATING SUMMARY
        ========================= */}

        <div className="ratingSummary">

          <div className="ratingBig">
            {roundedRating > 0
              ? roundedRating.toFixed(1)
              : "0.0"}
          </div>

          <div>

            <div className="ratingSummaryStars">
              {[1, 2, 3, 4, 5].map(
                (star) => (
                  <span
                    key={star}
                    className={
                      star <=
                      Math.round(
                        averageRating
                      )
                        ? "star filled"
                        : "star"
                    }
                  >
                    ★
                  </span>
                )
              )}
            </div>

            <div className="muted">
              {ratingCount}{" "}
              {ratingCount === 1
                ? "rating"
                : "ratings"}
            </div>

          </div>

        </div>

        {/* =========================
            DESCRIPTION
        ========================= */}

        <p>{m.description}</p>

        {/* =========================
            ACTIONS
        ========================= */}

        <div className="actions">

          <FavoriteButton
            modId={m.id}
          />

          {m.mod_type === "free" ? (
            <a
              className="btn primary"
              href={`/api/download/${m.id}`}
            >
              Download FREE
            </a>
          ) : (
            <a
              className="btn primary"
              href={`/checkout/${m.id}`}
            >
              Buy · Rp{" "}
              {Number(
                m.price
              ).toLocaleString(
                "id-ID"
              )}
            </a>
          )}

        </div>

        {/* =========================
            RATING FORM
        ========================= */}

        <section
          className="ratingSection"
        >

          <h2>
            {currentRating
              ? "Update Rating Kamu"
              : "Beri Rating"}
          </h2>

          <p className="muted">
            Bagikan pengalaman kamu
            menggunakan mod ini.
          </p>

          <RatingForm
            modId={m.id}
            existingRating={
              currentRating?.rating ||
              null
            }
          />

        </section>

        {/* =========================
            REVIEWS
        ========================= */}

        <section className="reviewsSection">

          <h2>
            Reviews
          </h2>

          {ratingList.length === 0 ? (
            <div className="empty">
              <div className="emptyIcon">
                ★
              </div>

              <h3>
                Belum ada review
              </h3>

              <p className="muted">
                Jadilah orang pertama
                yang memberikan rating.
              </p>
            </div>
          ) : (
            <div className="reviewsList">

              {ratingList.map(
                (r: any) => {

                  const reviewUser =
                    Array.isArray(
                      r.profiles
                    )
                      ? r.profiles[0]
                      : r.profiles;

                  return (
                    <div
                      className="reviewCard"
                      key={`${r.user_id}-${r.created_at}`}
                    >

                      <div className="reviewHeader">

                        <div className="reviewUser">

                          {reviewUser?.avatar_url ? (
                            <img
                              src={
                                reviewUser.avatar_url
                              }
                              alt={
                                reviewUser.username ||
                                "User"
                              }
                            />
                          ) : (
                            <div className="reviewAvatar">
                              {(reviewUser?.username ||
                                "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div>

                            <strong>
                              {reviewUser?.username ||
                                "User"}
                            </strong>

                            <small>
                              {new Date(
                                r.created_at
                              ).toLocaleString(
                                "id-ID"
                              )}
                            </small>

                          </div>

                        </div>

                        <div className="reviewStars">

                          {[1, 2, 3, 4, 5].map(
                            (star) => (
                              <span
                                key={star}
                                className={
                                  star <=
                                  r.rating
                                    ? "star filled"
                                    : "star"
                                }
                              >
                                ★
                              </span>
                            )
                          )}

                        </div>

                      </div>

                      {r.review && (
                        <p className="reviewText">
                          {r.review}
                        </p>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* =========================
            COMMENTS
        ========================= */}

        <section className="commentsSection">

          <h2>
            Comments
          </h2>

          <CommentForm
            modId={m.id}
          />

          {(comments || []).map(
            (c: any) => {

              const commentUser =
                Array.isArray(
                  c.profiles
                )
                  ? c.profiles[0]
                  : c.profiles;

              return (
                <div
                  className="comment"
                  key={c.id}
                >

                  <b>
                    {commentUser?.username ||
                      "User"}
                  </b>

                  <br />

                  <span>
                    {c.content}
                  </span>

                  <br />

                  <small>
                    {new Date(
                      c.created_at
                    ).toLocaleString(
                      "id-ID"
                    )}
                  </small>

                </div>
              );
            }
          )}

        </section>

      </main>

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="side">

        <div className="sideRow">

          <span>
            Creator
          </span>

          <b>

            {creator?.username ? (
              <a
                href={`/creator/${creator.username}`}
              >
                {creator.username}
              </a>
            ) : (
              "Unknown"
            )}

          </b>

        </div>

        <div className="sideRow">

          <span>
            Type
          </span>

          <b>
            {m.mod_type.toUpperCase()}
          </b>

        </div>

        <div className="sideRow">

          <span>
            Version
          </span>

          <b>
            {m.version}
          </b>

        </div>

        <div className="sideRow">

          <span>
            Rating
          </span>

          <b>
            ⭐{" "}
            {roundedRating > 0
              ? roundedRating.toFixed(1)
              : "Belum ada"}
          </b>

        </div>

        <div className="sideRow">

          <span>
            Downloads
          </span>

          <b>
            {m.downloads}
          </b>

        </div>

        <div className="sideRow">

          <span>
            Views
          </span>

          <b>
            {m.views}
          </b>

        </div>

      </aside>

    </div>
  );
        }
