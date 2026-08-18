import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export default async function AdminReportsPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["admin", "owner"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const { data: reports } = await supabase
    .from("reports")
    .select(`
      id,
      reason,
      status,
      created_at,
      mods(
        id,
        title,
        slug,
        status
      ),
      profiles(
        username,
        avatar_url
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  return (
    <main className="adminPage">
      <div className="container">

        <div className="adminHeader">
          <div>
            <div className="adminEyebrow">
              KYZO MODS
            </div>

            <h1>Reports</h1>

            <p className="muted">
              Kelola laporan dari pengguna KyzoMods.
            </p>
          </div>

          <a href="/admin" className="btn">
            ← Dashboard
          </a>
        </div>

        <div className="reportList">

          {(reports || []).map((report: any) => (
            <div
              className="reportCard"
              key={report.id}
            >

              <div className="reportIcon">
                🚨
              </div>

              <div className="reportContent">

                <div className="reportTop">
                  <b>
                    {report.reason}
                  </b>

                  <span
                    className={`status status-${report.status}`}
                  >
                    {report.status.toUpperCase()}
                  </span>
                </div>

                <span>
                  Mod:{" "}
                  <strong>
                    {report.mods?.title ||
                      "Mod tidak ditemukan"}
                  </strong>
                </span>

                <small>
                  Dilaporkan oleh{" "}
                  {report.profiles?.username ||
                    "Unknown"}
                </small>

                <small>
                  {new Date(
                    report.created_at
                  ).toLocaleString("id-ID")}
                </small>

                <div className="reportActions">

                  {report.mods?.slug && (
                    <a
                      href={`/mod/${report.mods.slug}`}
                      target="_blank"
                      className="btn"
                    >
                      👁 Lihat Mod
                    </a>
                  )}

                  {report.status === "open" && (
                    <form
                      action="/api/admin/reports"
                      method="POST"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={report.id}
                      />

                      <input
                        type="hidden"
                        name="action"
                        value="resolve"
                      />

                      <button
                        type="submit"
                        className="btn approveBtn"
                      >
                        ✓ Selesaikan
                      </button>
                    </form>
                  )}

                </div>

              </div>

            </div>
          ))}

          {(!reports ||
            reports.length === 0) && (
            <div className="moderationEmpty">
              <div className="emptyIcon">
                ✓
              </div>

              <h2>
                Belum ada report
              </h2>

              <p className="muted">
                Tidak ada laporan yang masuk.
              </p>
            </div>
          )}

        </div>

      </div>
    </main>
  );
}
