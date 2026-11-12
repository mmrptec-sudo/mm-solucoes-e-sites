import { NextRequest, NextResponse } from "next/server";
import { adminDb, authUser, requireCompanyAdmin, nsError } from "../../../../lib/nuvemshop-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

// Dados financeiros somente da empresa autorizada; não expõe tokens de loja.
export async function GET(request:NextRequest){
 try{
  const user=await authUser(request);
  const empresaId=request.nextUrl.searchParams.get("empresa_id")||"";
  if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(empresaId))
   return NextResponse.json({error:"Empresa inválida."},{status:400});
  await requireCompanyAdmin(user.id,empresaId);
  const {data,error}=await adminDb().from("nuvemshop_pedidos")
   .select("pedido_externo,numero,status,status_pagamento,valor_total,moeda,criado_na_loja")
   .eq("empresa_id",empresaId).order("criado_na_loja",{ascending:false}).limit(1000);
  if(error)throw new Error("Falha ao consultar pedidos Nuvemshop.");
  const records=(data||[]).map(r=>({
   id:String(r.pedido_externo),numero:r.numero,status:r.status,
   pagamento:r.status_pagamento,valor:r.valor_total==null?null:Number(r.valor_total),
   moeda:r.moeda,data:r.criado_na_loja,
  }));
  return NextResponse.json({pedidos:records,limite:records.length===1000},{headers:{"Cache-Control":"no-store"}});
 }catch(err){return NextResponse.json({error:nsError(err)},{status:403});}
}
