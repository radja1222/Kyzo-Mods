import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

export default async function AdminUsersPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const { data: users } = await supabase
    .from("profiles")
    .select(
      `
      id,
      username,
      avatar_url,
      bio,
      role,
      created_at
      `
    )
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

            <h1>
              User Management
            </h1>

            <p className="muted">
              Kelola pengguna dan role akun.
            </p>
          </div>

          <a
            href="/admin"
            className="btn"
          >
            ← Admin Dashboard
          </a>

        </div>

        <div className="adminTableWrap">

          <table className="adminTable">

            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Role</th>
                <th>Bergabung</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>

              {(users || []).map(
                (item: any) => (
                  <tr key={item.id}>

                    <td>
                      <div className="tableMod">

                        {item.avatar_url ? (
                          <img
                            src={item.avatar_url}
                            alt=""
                          />
                        ) : (
                          <div className="tableThumb">
                            {item.username
                              ?.charAt(0)
                              ?.toUpperCase() ||
                              "U"}
                          </div>
                        )}

                      </div>
                    </td>

                    <td>
                      <b>
                        @{item.username}
                      </b>
                    </td>

                    <td>

                      <span
                        className={`roleBadge role-${item.role}`}
                      >
                        {item.role.toUpperCase()}
                      </span>

                    </td>

                    <td>
                      {new Date(
                        item.created_at
                      ).toLocaleDateString(
                        "id-ID"
                      )}
                    </td>

                    <td>

                      {item.role !== "owner" && (
                        <form
                          action="/api/admin/users"
                          method="POST"
                          className="inlineForm"
                        >

                          <input
                            type="hidden"
                            name="id"
                            value={item.id}
                          />

                          <select
                            name="role"
                            defaultValue={
                              item.role
                            }
                            className="roleSelect"
                          >

                            <option value="user">
                              User
                            </option>

                            <option value="moderator">
                              Moderator
                            </option>

                            <option value="admin">
                              Admin
                            </option>

                          </select>

                          <button
                            className="btn"
                            type="submit"
                          >
                            Simpan
                          </button>

                        </form>
                      )}

                      {item.role === "owner" && (
                        <span className="muted">
                          Protected Owner
                        </span>
                      )}

                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

      </div>
    </main>
  );
  }
