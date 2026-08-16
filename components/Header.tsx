import { supabaseServer } from "@/lib/supabase-server";
export async function Header(){
 const supabase=await supabaseServer(); const {data:{user}}=await supabase.auth.getUser();
 return <header><div className="container nav"><a className="logo" href="/"><span className="logoMark">K</span>KYZO<b>MODS</b></a><nav className="links"><a href="/">Home</a><a href="/mods?game=samp">SA-MP</a><a href="/mods?game=fivem">FiveM</a>{user?<><a href="/upload">Upload</a><a href="/dashboard">Dashboard</a><a className="pill" href="/auth/signout">Logout</a></>:<a className="pill" href="/login">Login</a>}</nav></div></header>
}