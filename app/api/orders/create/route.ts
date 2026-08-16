import {NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase-server";

const MIDTRANS_BASE=process.env.MIDTRANS_IS_PRODUCTION==="true"?"https://app.midtrans.com":"https://app.sandbox.midtrans.com";

export async function POST(req:Request){
 try{
  const s=await supabaseServer(); const {data:{user}}=await s.auth.getUser();
  if(!user)return NextResponse.json({error:"Login required"},{status:401});
  const body=await req.json(); const modId=Number(body.mod_id); if(!Number.isInteger(modId))return NextResponse.json({error:"Invalid mod"},{status:400});
  const {data:m}=await s.from("mods").select("id,title,slug,price,mod_type,status").eq("id",modId).single();
  if(!m||m.status!=="approved"||m.mod_type!=="paid")return NextResponse.json({error:"Paid mod tidak tersedia"},{status:404});
  const amount=Math.round(Number(m.price)); if(!Number.isFinite(amount)||amount<1000)return NextResponse.json({error:"Harga mod tidak valid"},{status:400});
  const {data:existing}=await s.from("orders").select("id,status").eq("user_id",user.id).eq("mod_id",m.id).maybeSingle();
  if(existing?.status==="paid")return NextResponse.json({error:"Mod sudah dibeli"},{status:409});
  const orderId=existing?.id||crypto.randomUUID();
  const {error:dbErr}=await s.from("orders").upsert({id:orderId,user_id:user.id,mod_id:m.id,amount,status:"pending"},{onConflict:"user_id,mod_id"});
  if(dbErr)throw dbErr;
  const serverKey=process.env.MIDTRANS_SERVER_KEY; if(!serverKey)throw new Error("MIDTRANS_SERVER_KEY belum diatur di Vercel");
  const auth=Buffer.from(`${serverKey}:`).toString("base64");
  const site=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
  const response=await fetch(`${MIDTRANS_BASE}/snap/v1/transactions`,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",Authorization:`Basic ${auth}`},body:JSON.stringify({transaction_details:{order_id:orderId,gross_amount:amount},item_details:[{id:String(m.id),price:amount,quantity:1,name:m.title.slice(0,50)}],customer_details:{email:user.email},enabled_payments:["gopay"],callbacks:{finish:`${site}/mod/${m.slug}`}})});
  const data=await response.json();
  if(!response.ok||!data.token){await s.from("orders").update({status:"failed"}).eq("id",orderId);return NextResponse.json({error:data.error_messages?.join(", ")||data.status_message||"Midtrans gagal membuat transaksi"},{status:502});}
  await s.from("orders").update({payment_ref:data.token}).eq("id",orderId);
  return NextResponse.json({order_id:orderId,token:data.token,redirect_url:data.redirect_url});
 }catch(e:any){return NextResponse.json({error:e.message||"Server error"},{status:500})}
}
