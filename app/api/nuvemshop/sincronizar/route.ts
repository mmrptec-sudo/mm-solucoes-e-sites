import {NextRequest,NextResponse} from "next/server";
import {authUser,requireCompanyAdmin,safeError} from "../../../../lib/ml-server";
import {syncConnection} from "../../../../lib/nuvemshop-sync";
export const runtime="nodejs";
export const maxDuration=60;
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 try{
  const user=await authUser(request);
  const body=await request.json() as {empresa_id?:unknown;conexao_id?:unknown};
  if(typeof body.empresa_id!=="string"||typeof body.conexao_id!=="string"||! /^[0-9a-f-]{36}$/i.test(body.empresa_id)||! /^[0-9a-f-]{36}$/i.test(body.conexao_id))return NextResponse.json({error:"Empresa ou conexão inválida."},{status:400});
  await requireCompanyAdmin(user.id,body.empresa_id);
  const result=await syncConnection(body.conexao_id,body.empresa_id);
  return NextResponse.json({ok:!result.erro_pedidos||!result.erro_produtos,...result},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:safeError(e)},{status:400});}
}
