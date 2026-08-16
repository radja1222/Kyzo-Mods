"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loginDiscord() {
    try {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch (err) {
      setError("Gagal menghubungkan ke Discord.");
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <div className="authCard">

        <div className="authLogo">
          <img src="/kyzo-logo.svg" alt="KyzoMods" />
        </div>

        <h1>Welcome to KyzoMods</h1>

        <p className="authSubtitle">
          Login untuk upload, download dan berinteraksi
          dengan creator lainnya.
        </p>

        {error && (
          <div className="authError">
            {error}
          </div>
        )}

        <button
          type="button"
          className="discordButton"
          onClick={loginDiscord}
          disabled={loading}
        >
          <span className="discordIcon">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19.54 5.19A16.9 16.9 0 0 0 15.46 4l-.52 1.05a15.5 15.5 0 0 0-5.88 0L8.54 4a16.9 16.9 0 0 0-4.08 1.19C1.88 9.02 1.18 12.76 1.53 16.45A16.7 16.7 0 0 0 6.55 19l1.22-1.67a10.7 10.7 0 0 1-1.71-.82l.42-.33a11.9 11.9 0 0 0 11.04 0l.42.33c-.55.33-1.12.61-1.71.82L17.45 19a16.7 16.7 0 0 0 5.02-2.55c.41-4.29-.69-7.99-2.93-11.26ZM8.68 14.4c-1.08 0-1.97-.99-1.97-2.2s.87-2.21 1.97-2.21 1.99.99 1.97 2.21c0 1.21-.87 2.2-1.97 2.2Zm6.64 0c-1.08 0-1.97-.99-1.97-2.2s.87-2.21 1.97-2.21 1.99.99 1.97 2.21c0 1.21-.87 2.2-1.97 2.2Z" />
            </svg>
          </span>

          {loading ? "Menghubungkan..." : "Continue with Discord"}
        </button>

        <div className="authTerms">
          Dengan login, kamu menyetujui aturan
          penggunaan KyzoMods.
        </div>

      </div>
    </main>
  );
     }
