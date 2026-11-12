import { NextResponse } from "next/server";
import { adminDb, authUser, requireCompanyAdmin, nsCredentials } from "../../../../../lib/nuvemshop-server";
import { decrypt } from "../../../../../lib/ml-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const RECEIVER="https://mm-solucoes-digitais.vercel.app/api/nuvemshop/webhooks/receber";
const json=(data:object,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const API="https://api.nuvemshop.com.br/2025-03";
export async function POST(req:Request){
 try{
  const user=await authUser(req);
  const payload=await req.json() as {empresa_id?:string;conexao_id?:string};
  const empresaId=payload.empresa_id||"";
  const conexaoId=payload.conexao_id||"";
  if(!/^[0-9a-f-]{36}$/i.test(empresaId)||!/^[0-9a-f-]{36}$/i.test(conexaoId))return json({error:"Identificadores inválidos"},400);
  await requireCompanyAdmin(user.id,empresaId);
  const db=adminDb();
  const {data:c,error}=await db.from("nuvemshop_conexoes")
   .select("id,store_id,access_token_criptografado,status")
   .eq("id",conexaoId).eq("empresa_id",empresaId).eq("app_id",nsCredentials().id).eq("status","conectada").maybeSingle();
  if(error||!c||!/^\d+$/.test(c.store_id))return json({error:"Loja não autorizada"},403);
  const token=decrypt(c.access_token_criptografado);
  const headers={Authorization:`Bearer ${token}`,"User-Agent":`MM Intelligence OS (${nsCredentials().id})`,Accept:"application/json","Content-Type":"application/json"};
  const uri=`${API}/${c.store_id}/webhooks`;
  const list=await fetch(uri,{headers,cache:"no-store",signal:AbortSignal.timeout(10000)});
  if(!list.ok)return json({error:`Consulta de webhooks HTTP ${list.status}; não há confirmação de que a API esteja disponível para esta loja.`},422);
  const saved=await list.json() as unknown;
  if(!Array.isArray(saved))return json({error:"Lista de webhooks inesperada"},502);
  const result:Record<string,string>={};
  for(const event of ['order/created','order/updated']){
   const existing=saved.find((v:unknown)=>v && typeof v==="object" && (v as {event?:string}).event===event && (v as {url?:string}).url===RECEIVER);
   if(existing){result[event]="já registrado";continue;}
   const r=await fetch(uri,{method:"POST",headers,body:JSON.stringify({event,url:RECEIVER}),cache:"no-store",signal:AbortSignal.timeout(10000)});
   result[event]=r.ok?"registrado":`Falha HTTP ${r.status}`;
  }
  return json({loja:c.store_id,eventos:result,observacao:"Webhooks avisam IDs; detalhes e valores continuam dependendo da consulta de pedidos."});
 }catch(err){
  const message=err instanceof Error && /faça login|sessão|autorizada|administrador/i.test(err.message)?err.message:"Erro ao configurar webhooks";
  return json({error:message},403);
 }
}
