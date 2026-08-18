import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export default async function AdminDashboard() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["admin", "owner"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const [
    usersResult,
    modsResult,
    pendingResult,
    approvedResult,
    rejectedResult,
    reportsResult,
    ordersResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("mods")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("mods")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("mods")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),

    supabase
      .from("mods")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),

    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),

    supabase
      .from("orders")
      .select("id", { count: "exact", head: true }),
  ]);

  const stats = {
    users: usersResult.count || 0,
    mods: modsResult.count || 0,
    pending: pendingResult.count || 0,
    approved: approvedResult.count || 0,
    rejected: rejectedResult.count || 0,
    reports: reportsResult.count || 0,
    orders: ordersResult.count || 0,
  };

  const { data: pendingMods } = await supabase
    .from("mods")
    .select(`
      id,
      title,
      slug,
      mod_type,
      price,
      thumbnail_url,
      created_at,
      profiles(username),
      categories(name, game)
    `)
    .eq("status", "pending")
    .order("created_at", {
      ascending: false,
    })
    .limit(8);

  const { data: reports } = await supabase
    .from("reports")
    .select(`
      id,
      reason,
      status,
      created_at,
      mods(id,title,slug),
      profiles(username)
    `)
    .eq("status", "open")
    .order("created_at", {
      ascending: false,
    })
    .limit(6);

  return (
    <main className="adminPage">
      <div className="container">

        {/* HEADER */}
        <div className="adminHeader">

          <div>
            <div className="adminEyebrow">
              KYZO MODS ADMIN
            </div>

            <h1>
              Admin Dashboard
            </h1>

            <p className="muted">
              Kelola marketplace, mod, user,
              laporan dan moderation.
            </p>
          </div>

          <div className="adminHeaderActions">

            <a
              href="/"
              className="btn"
            >
              ← Website
            </a>

            <a
              href="/admin/mods"
              className="btn primary"
            >
              🛡️ Moderation
            </a>

          </div>

        </div>

        {/* STATISTICS */}

        <div className="adminStats">

          <div className="adminStatCard">
            <div className="adminStatIcon">
              👥
            </div>

            <div>
              <span>Total Users</span>
              <strong>{stats.users}</strong>
            </div>
          </div>

          <div className="adminStatCard">
            <div className="adminStatIcon">
              📦
            </div>

            <div>
              <span>Total Mods</span>
              <strong>{stats.mods}</strong>
            </div>
          </div>

          <div className="adminStatCard pending">
            <div className="adminStatIcon">
              ⏳
            </div>

            <div>
              <span>Pending</span>
              <strong>{stats.pending}</strong>
            </div>
          </div>

          <div className="adminStatCard approved">
            <div className="adminStatIcon">
              ✓
            </div>

            <div>
              <span>Approved</span>
              <strong>{stats.approved}</strong>
            </div>
          </div>

          <div className="adminStatCard rejected">
            <div className="adminStatIcon">
              ✕
            </div>

            <div>
              <span>Rejected</span>
              <strong>{stats.rejected}</strong>
            </div>
          </div>

          <div className="adminStatCard report">
            <div className="adminStatIcon">
              🚨
            </div>

            <div>
              <span>Open Reports</span>
              <strong>{stats.reports}</strong>
            </div>
          </div>

          <div className="adminStatCard">
            <div className="adminStatIcon">
              💰
            </div>

            <div>
              <span>Orders</span>
              <strong>{stats.orders}</strong>
            </div>
          </div>

        </div>

        {/* QUICK ACTIONS */}

        <section className="adminSection">

          <div className="adminSectionHeader">

            <div>
              <h2>
                Quick Actions
              </h2>

              <p className="muted">
                Akses cepat panel administrator.
              </p>
            </div>

          </div>

          <div className="adminQuickGrid">

            <a
              href="/admin/mods"
              className="adminQuickCard"
            >
              <span>🛡️</span>
              <div>
                <b>Moderation</b>
                <small>
                  Approve dan reject mod
                </small>
              </div>
            </a>

            <a
              href="/admin/users"
              className="adminQuickCard"
            >
              <span>👥</span>
              <div>
                <b>Users</b>
                <small>
                  Kelola akun dan role
                </small>
              </div>
            </a>

            <a
              href="/admin/reports"
              className="adminQuickCard"
            >
              <span>🚨</span>
              <div>
                <b>Reports</b>
                <small>
                  Lihat laporan pengguna
                </small>
              </div>
            </a>

            <a
              href="/mods"
              className="adminQuickCard"
            >
              <span>📦</span>
              <div>
                <b>All Mods</b>
                <small>
                  Lihat marketplace
                </small>
              </div>
            </a>

          </div>

        </section>

        {/* PENDING MODS */}

        <section className="adminSection">

          <div className="adminSectionHeader">

            <div>
              <h2>
                Pending Moderation
              </h2>

              <p className="muted">
                Mod terbaru yang menunggu approval.
              </p>
            </div>

            <a
              href="/admin/mods"
              className="adminLink"
            >
              Lihat semua →
            </a>

          </div>

          <div className="adminTableWrap">

            <table className="adminTable">

              <thead>
                <tr>
                  <th>Mod</th>
                  <th>Creator</th>
                  <th>Kategori</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>

                {(pendingMods || []).map(
                  (mod: any) => (
                    <tr key={mod.id}>

                      <td>
                        <div className="tableMod">

                          {mod.thumbnail_url ? (
                            <img
                              src={mod.thumbnail_url}
                              alt={mod.title}
                            />
                          ) : (
                            <div className="tableThumb">
                              K
                            </div>
                          )}

                          <div>
                            <b>
                              {mod.title}
                            </b>

                            <small>
                              #{mod.id}
                            </small>
                          </div>

                        </div>
                      </td>

                      <td>
                        {mod.profiles?.username ||
                          "Unknown"}
                      </td>

                      <td>
                        {mod.categories?.game?.toUpperCase()}
                        {" · "}
                        {mod.categories?.name}
                      </td>

                      <td>
                        {mod.mod_type === "paid"
                          ? `Rp ${Number(
                              mod.price
                            ).toLocaleString(
                              "id-ID"
                            )}`
                          : "FREE"}
                      </td>

                      <td>
                        <span className="status pendingStatus">
                          PENDING
                        </span>
                      </td>

                      <td>
                        <a
                          href="/admin/mods"
                          className="tableAction"
                        >
                          Review
                        </a>
                      </td>

                    </tr>
                  )
                )}

                {(!pendingMods ||
                  pendingMods.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="emptyTable"
                    >
                      Tidak ada mod pending.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* REPORTS */}

        <section className="adminSection">

          <div className="adminSectionHeader">

            <div>
              <h2>
                Open Reports
              </h2>

              <p className="muted">
                Laporan yang membutuhkan tindakan.
              </p>
            </div>

            <a
              href="/admin/reports"
              className="adminLink"
            >
              Lihat semua →
            </a>

          </div>

          <div className="reportList">

            {(reports || []).map(
              (report: any) => (
                <div
                  className="reportCard"
                  key={report.id}
                >

                  <div className="reportIcon">
                    🚨
                  </div>

                  <div className="reportContent">

                    <b>
                      {report.reason}
                    </b>

                    <span>
                      Mod:{" "}
                      {report.mods?.title ||
                        "Unknown"}
                    </span>

                    <small>
                      Dilaporkan oleh{" "}
                      {report.profiles?.username ||
                        "Unknown"}
                    </small>

                  </div>

                  <a
                    href="/admin/reports"
                    className="btn"
                  >
                    Review
                  </a>

                </div>
              )
            )}

            {(!reports ||
              reports.length === 0) && (
              <div className="empty">
                <h3>
                  Tidak ada laporan terbuka
                </h3>

                <p className="muted">
                  Semua laporan sudah ditangani.
                </p>
              </div>
            )}

          </div>

        </section>

      </div>
    </main>
  );
        }
