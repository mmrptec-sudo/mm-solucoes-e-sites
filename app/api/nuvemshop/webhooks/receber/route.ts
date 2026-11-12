import { NextResponse } from "next/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { adminDb, nsCredentials } from "../../../../../lib/nuvemshop-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (body:object,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request: Request){
 try{
  const raw=await request.text();
  if(Buffer.byteLength(raw,"utf8")>16384) return response({error:"Payload muito grande"},413);
  const signature=request.headers.get("x-linkedstore-hmac-sha256")||"";
  if(!/^[0-9a-f]{64}$/i.test(signature))return response({error:"Assinatura ausente"},401);
  const secret=nsCredentials().secret;
  const actual=createHmac("sha256",secret).update(raw,"utf8").digest();
  const supplied=Buffer.from(signature,"hex");
  if(supplied.length!==actual.length || !timingSafeEqual(supplied,actual))return response({error:"Assinatura inválida"},401);
  let payload:unknown;
  try{payload=JSON.parse(raw);}catch{return response({error:"JSON inválido"},400);}
  if(!payload || typeof payload!=="object" || Array.isArray(payload)) return response({error:"Payload inválido"},400);
  const p=payload as Record<string,unknown>;
  const storeId=String(p.store_id??"");
  const orderId=String(p.id??"");
  const event=p.event;
  if(!/^\d{1,20}$/.test(storeId)||!/^\d{1,20}$/.test(orderId)||!['order/created','order/updated'].includes(String(event))){
   return response({error:"Evento não suportado"},422);
  }
  const db=adminDb();
  const {data:connection,error:connErr}=await db.from("nuvemshop_conexoes")
   .select("id,empresa_id").eq("store_id",storeId).eq("app_id",nsCredentials().id).eq("status","conectada").maybeSingle();
  if(connErr) return response({error:"Falha temporária"},503);
  if(!connection) return response({error:"Loja não vinculada"},404);
  const digest=createHash("sha256").update(raw,"utf8").digest("hex");
  const {error}=await db.from("nuvemshop_eventos").upsert({
   conexao_id:connection.id,empresa_id:connection.empresa_id,store_id:storeId,
   evento:event,pedido_id:orderId,digest_sha256:digest,
  },{onConflict:"conexao_id,digest_sha256",ignoreDuplicates:true});
  if(error){console.error("Nuvemshop evento: gravação recusada");return response({error:"Falha temporária"},503);}
  return response({ok:true});
 }catch{console.error("Nuvemshop webhook: erro interno");return response({error:"Erro interno"},500);}
}
