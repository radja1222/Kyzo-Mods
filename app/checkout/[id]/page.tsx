import { supabaseServer } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import { CheckoutClient } from "@/components/CheckoutClient";

export default async function Checkout({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const s=await supabaseServer();
  const {data:{user}}=await s.auth.getUser();
  if(!user) redirect("/login");
  const {data:m}=await s.from("mods").select("id,title,slug,price,mod_type,thumbnail_url").eq("id",id).eq("status","approved").single();
  if(!m || m.mod_type!=="paid") notFound();
  const {data:existing}=await s.from("orders").select("id,status").eq("user_id",user.id).eq("mod_id",m.id).eq("status","paid").maybeSingle();
  if(existing) redirect(`/mod/${m.slug}`);
  return <CheckoutClient mod={m}/>;
}
  
