import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const supabase = await supabaseServer();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) {
    notFound();
  }

  const { count: modCount } = await supabase
    .from("mods")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", profile.id)
    .eq("status", "approved");

  const { data: ratings } = await supabase
    .from("ratings")
    .select("rating")
    .in(
      "mod_id",
      (
        await supabase
          .from("mods")
          .select("id")
          .eq("user_id", profile.id)
      ).data?.map((m) => m.id) || []
    );

  const averageRating =
    ratings && ratings.length
      ? (
          ratings.reduce(
            (sum, item) => sum + item.rating,
            0
          ) / ratings.length
        ).toFixed(1)
      : "0.0";

  const { data: mods } = await supabase
    .from("mods")
    .select("downloads")
    .eq("user_id", profile.id)
    .eq("status", "approved");

  const downloads =
    mods?.reduce(
      (sum, mod) => sum + Number(mod.downloads || 0),
      0
    ) || 0;

  const avatar =
    profile.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile.username
    )}&background=ff6d00&color=fff`;

  return (
    <main className="profilePage">

      <section className="profileHero">

        <div className="profileAvatar">
          <img
            src={avatar}
            alt={profile.username}
          />
        </div>

        <div className="profileInfo">

          <h1>{profile.username}</h1>

          <p className="profileHandle">
            @{profile.username}
          </p>

          {profile.bio && (
            <p className="profileBio">
              {profile.bio}
            </p>
          )}

          <div className="profileStats">

            <div>
              <strong>🎮 {modCount || 0}</strong>
              <span>Mods</span>
            </div>

            <div>
              <strong>⭐ {averageRating}</strong>
              <span>Rating</span>
            </div>

            <div>
              <strong>
                ↓ {formatDownloads(downloads)}
              </strong>
              <span>Downloads</span>
            </div>

          </div>

        </div>

      </section>

      <section className="profileMods">

        <div className="sectionTitle">
          <h2>Mods by {profile.username}</h2>
        </div>

        {!mods?.length ? (
          <div className="emptyState">
            Creator ini belum memiliki mod.
          </div>
        ) : (
          <div className="modGrid">
            {/* nanti kita masukkan ModCard di sini */}
          </div>
        )}

      </section>

    </main>
  );
}

function formatDownloads(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return value.toString();
          }
