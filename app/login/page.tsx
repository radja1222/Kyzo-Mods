 "use client";
import { useState } from "react"; import { supabaseBrowser } from "@/lib/supabase-browser";
export default function Login(){const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [err,setErr]=useState("");
async function login(e:any){e.preventDefault();setErr("");const s=supabaseBrowser();const {error}=await s.auth.signInWithPassword({email,password});if(error){setErr(error.message);return}location.href="/dashboard"}
async function discord(){const s=supabaseBrowser();await s.auth.signInWithOAuth({provider:"discord",options:{redirectTo:`${location.origin}/auth/callback`}})}
return <div className="form"><div className="formCard"><h1>Welcome Back</h1><p className="muted">Login ke KyzoMods.</p>{err&&<div className="alert">{err}</div>}<form onSubmit={login}><div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div><button className="btn primary" style={{width:"100%"}}>Login</button></form><button className="btn" style={{width:"100%",marginTop:10}} onClick={discord}>Login with Discord</button><p className="muted">Belum punya akun? <a style={{color:"var(--orange2)"}} href="/register">Register</a></p></div></div>}
  
