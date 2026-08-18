"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function RatingForm({
  modId,
  existingRating,
}: {
  modId: number;
  existingRating?: number | null;
}) {
  const [rating, setRating] = useState(existingRating || 0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitRating(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (rating < 1 || rating > 5) {
      setError("Pilih rating 1 sampai 5 bintang.");
      return;
    }

    setLoading(true);

    const supabase = supabaseBrowser();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Kamu harus login untuk memberikan rating.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("ratings")
      .upsert(
        {
          user_id: user.id,
          mod_id: modId,
          rating,
          review: review.trim() || null,
        },
        {
          onConflict: "user_id,mod_id",
        }
      );

    if (insertError) {
      console.error(insertError);
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setMessage("Rating berhasil disimpan ⭐");
    setLoading(false);

    window.location.reload();
  }

  return (
    <div className="ratingForm">

      <div className="ratingStars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={
              star <= rating
                ? "ratingStar active"
                : "ratingStar"
            }
            onClick={() => setRating(star)}
            aria-label={`Rating ${star}`}
          >
            ★
          </button>
        ))}
      </div>

      <div className="ratingLabel">
        {rating === 0
          ? "Pilih rating"
          : `${rating} dari 5 bintang`}
      </div>

      <form onSubmit={submitRating}>

        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Tulis review kamu tentang mod ini..."
          maxLength={1000}
          rows={4}
        />

        {error && (
          <div className="authError">
            {error}
          </div>
        )}

        {message && (
          <div className="ratingSuccess">
            {message}
          </div>
        )}

        <button
          type="submit"
          className="btn primary"
          disabled={loading}
        >
          {loading
            ? "Menyimpan..."
            : existingRating
              ? "Update Rating"
              : "Kirim Rating"}
        </button>

      </form>
    </div>
  );
    }
