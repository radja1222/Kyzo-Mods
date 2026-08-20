const {
  data: mod,
  error: modError,
} = await admin
  .from("mods")
  .select(`
    id,
    title,
    slug,
    price,
    mod_type,
    status
  `)
  .eq("id", modId)
  .maybeSingle();

console.log("========== DEBUG MOD ==========");
console.log("MOD ID:", modId);
console.log("MOD DATA:", mod);
console.log("MOD ERROR:", modError);
console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("SERVICE ROLE ADA:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("================================");

if (modError) {
  console.error("DATABASE ERROR MOD:", modError);

  return NextResponse.redirect(
    new URL(
      `/checkout/${modId}?error=mod_database`,
      req.url
    )
  );
}

if (!mod) {
  console.error("MOD TIDAK DITEMUKAN DENGAN ADMIN:", modId);

  return NextResponse.redirect(
    new URL(
      `/checkout/${modId}?error=mod_not_found`,
      req.url
    )
  );
}
