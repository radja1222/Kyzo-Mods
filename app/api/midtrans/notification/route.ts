import {NextResponse} from "next/server";
import {createHash} from "crypto";
import {supabaseAdmin} from "@/lib/supabase-admin";

export async function POST(req:Request){
 try{
  const n=await req.json(); const serverKey=process.env.MIDTRANS_SERVER_KEY;
  if(!serverKey)return new NextResponse("Server misconfigured",{status:500});
  const raw=`${n.order_id}${n.status_code}${n.gross_amount}${serverKey}`;
  const expected=createHash("sha512").update(raw).digest("hex");
  if(!n.signature_key||expected!==n.signature_key)return new NextResponse("Invalid signature",{status:403});
  const s=supabaseAdmin(); const {data:o}=await s.from("orders").select("id,amount,status").eq("id",n.order_id).single();
  if(!o)return new NextResponse("Order not found",{status:404});
  if(Math.round(Number(o.amount))!==Math.round(Number(n.gross_amount)))return new NextResponse("Amount mismatch",{status:400});
  let status="pending";
  if(n.transaction_status==="settlement" || (n.transaction_status==="capture" && (!n.fraud_status||n.fraud_status==="accept")))status="paid";
  else if(["expire","cancel","deny","failure"].includes(n.transaction_status))status="failed";
  if(o.status!=="paid" || status==="paid")await s.from("orders").update({status,payment_ref:n.transaction_id||n.order_id}).eq("id",o.id);
  return new NextResponse("OK",{status:200});
 }catch(e){return new NextResponse("Server error",{status:500})}
}
