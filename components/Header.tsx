import { supabaseServer } from "@/lib/supabase-server";

export async function Header() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role = "user";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    role = profile?.role || "user";
  }

  const isAdmin =
    role === "admin" ||
    role === "owner";

  return (
    <header>
      <div className="container nav">

        {/* LOGO */}
        <a className="logo" href="/">
          <img
            src="/kyzo-logo.svg"
            alt="KyzoMods"
            className="logoImage"
          />

          <span className="logoText">
            KYZO <b>MODS</b>
          </span>
        </a>

        {/* NAVIGATION */}
        <nav className="links">

          <a href="/">
            Home
          </a>

          <a href="/mods?game=samp">
            SA-MP
          </a>

          <a href="/mods?game=fivem">
            FiveM
          </a>

          {user ? (
            <>
              <a href="/upload">
                Upload
              </a>

              <a href="/dashboard">
                Dashboard
              </a>

              {/* ADMIN / OWNER ONLY */}
              {isAdmin && (
                <a
                  href="/admin"
                  className="adminNav"
                >
                  🛡️ Admin
                </a>
              )}

              <a
                className="pill"
                href="/auth/signout"
              >
                Logout
              </a>
            </>
          ) : (
            <a
              className="pill"
              href="/login"
            >
              Login
            </a>
          )}

        </nav>

      </div>
    </header>
  );
    }
