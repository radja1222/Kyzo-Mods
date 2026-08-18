"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loginDiscord() {
    try {
      setLoading(true);
      setError("");

      const supabase = supabaseBrowser();

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        window.location.origin;

      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: "discord",
          options: {
            redirectTo:
              `${siteUrl}/auth/callback?next=/dashboard`,
          },
        });

      if (error) {
        console.error(
          "Discord OAuth error:",
          error
        );

        setError(error.message);
        setLoading(false);
      }
    } catch (err) {
      console.error(
        "Discord login error:",
        err
      );

      setError(
        "Gagal menghubungkan ke Discord."
      );

      setLoading(false);
    }
  }

  return (
    <main className="loginPage">

      {/* BACKGROUND */}

      <div className="loginBackground">

        <div className="loginGlow loginGlowOne" />
        <div className="loginGlow loginGlowTwo" />
        <div className="loginGlow loginGlowThree" />

        <div className="loginGrid" />

        <span className="particle p1" />
        <span className="particle p2" />
        <span className="particle p3" />
        <span className="particle p4" />
        <span className="particle p5" />

      </div>

      {/* NAV LOGO */}

      <div className="loginTop">

        <a
          href="/"
          className="loginBrand"
        >
          <img
            src="/kyzo-logo.svg"
            alt="KyzoMods"
          />

          <span>
            KYZO <b>MODS</b>
          </span>
        </a>

        <a
          href="/"
          className="backHome"
        >
          ← Back to website
        </a>

      </div>

      {/* LOGIN */}

      <section className="loginCenter">

        <div className="loginCard">

          <div className="loginCardGlow" />

          {/* LOGO */}

          <div className="loginLogoWrap">

            <div className="loginLogoRing">

              <img
                src="/kyzo-logo.svg"
                alt="KyzoMods Logo"
                className="loginLogo"
              />

            </div>

          </div>

          <div className="loginHeading">

            <span className="loginEyebrow">
              KYZO MODS COMMUNITY
            </span>

            <h1>
              Welcome
              <span> back.</span>
            </h1>

            <p>
              Masuk ke akun KyzoMods untuk
              mengupload dan menikmati berbagai
              mod GTA terbaik.
            </p>

          </div>

          {/* ERROR */}

          {error && (
            <div className="loginError">

              <span className="errorIcon">
                !
              </span>

              <span>
                {error}
              </span>

            </div>
          )}

          {/* DISCORD BUTTON */}

          <button
            type="button"
            className="discordLoginButton"
            onClick={loginDiscord}
            disabled={loading}
          >

            <span className="discordButtonIcon">

              {loading ? (
                <span className="loginSpinner" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M19.54 5.19A16.9 16.9 0 0 0 15.46 4l-.52 1.05a15.5 15.5 0 0 0-5.88 0L8.54 4a16.9 16.9 0 0 0-4.08 1.19C1.88 9.02 1.18 12.76 1.53 16.45A16.7 16.7 0 0 0 6.55 19l1.22-1.67a10.7 10.7 0 0 1-1.71-.82l.42-.33a11.9 11.9 0 0 0 11.04 0l.42.33c-.55.33-1.12.61-1.71.82L17.45 19a16.7 16.7 0 0 0 5.02-2.55c.41-4.29-.69-7.99-2.93-11.26ZM8.68 14.4c-1.08 0-1.97-.99-1.97-2.2s.87-2.21 1.97-2.21 1.99.99 1.97 2.21c0 1.21-.87 2.2-1.97 2.2Zm6.64 0c-1.08 0-1.97-.99-1.97-2.2s.87-2.21 1.97-2.21 1.99.99 1.97 2.21c0 1.21-0.87 2.2-1.97 2.2Z" />
                </svg>
              )}

            </span>

            <span className="discordButtonText">

              <strong>
                {loading
                  ? "Connecting..."
                  : "Continue with Discord"}
              </strong>

              <small>
                Secure authentication
              </small>

            </span>

            {!loading && (
              <span className="buttonArrow">
                →
              </span>
            )}

          </button>

          {/* DIVIDER */}

          <div className="loginDivider">
            <span />
            <small>SECURE LOGIN</small>
            <span />
          </div>

          {/* BENEFITS */}

          <div className="loginBenefits">

            <div className="loginBenefit">

              <span className="benefitIcon">
                ✓
              </span>

              <div>
                <strong>
                  Creator Access
                </strong>

                <small>
                  Upload your own mods
                </small>
              </div>

            </div>

            <div className="loginBenefit">

              <span className="benefitIcon">
                ⚡
              </span>

              <div>
                <strong>
                  Fast & Secure
                </strong>

                <small>
                  Powered by Supabase Auth
                </small>
              </div>

            </div>

          </div>

          {/* TERMS */}

          <p className="loginTerms">
            Dengan melanjutkan, kamu menyetujui
            <a href="/terms">
              Terms of Service
            </a>
            dan
            <a href="/privacy">
              Privacy Policy
            </a>
            KyzoMods.
          </p>

        </div>

      </section>

      {/* FOOTER */}

      <div className="loginFooter">
        <span>
          © {new Date().getFullYear()} KyzoMods
        </span>

        <span className="footerDot">
          •
        </span>

        <span>
          GTA SA-MP & FiveM Community
        </span>
      </div>

    </main>
  );
  }
