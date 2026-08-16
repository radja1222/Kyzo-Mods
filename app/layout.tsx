import "./globals.css";
import { Header } from "@/components/Header";

export const metadata = {
  title: "KyzoMods",
  description: "Premium GTA SA-MP & FiveM Mod Community",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />

      <main>
        {children}
      </main>

      <footer className="footer">

        <div className="container footerGrid">

          <div className="footerBrand">

            <a href="/" className="footerLogo">
              <img
                src="/kyzo-logo.svg"
                alt="KyzoMods"
              />

              <div>
                <strong>
                  KYZO <span>MODS</span>
                </strong>

                <small>
                  GTA SA-MP & FiveM Mod Community
                </small>
              </div>
            </a>

            <p>
              Tempat berbagi mod, graphics,
              vehicle, script dan berbagai
              resource GTA.
            </p>

          </div>

          <div className="footerColumn">
            <h4>Explore</h4>

            <a href="/mods?game=samp">
              SA-MP Mods
            </a>

            <a href="/mods?game=fivem">
              FiveM Mods
            </a>

            <a href="/mods">
              Semua Mods
            </a>
          </div>

          <div className="footerColumn">
            <h4>Creator</h4>

            <a href="/upload">
              Upload Mod
            </a>

            <a href="/dashboard">
              Dashboard
            </a>

            <a href="/register">
              Become Creator
            </a>
          </div>

        </div>

        <div className="container footerBottom">

          <span>
            © {new Date().getFullYear()} KyzoMods
          </span>

          <span>
            Built for the GTA modding community.
          </span>

        </div>

      </footer>
    </>
  );
}
