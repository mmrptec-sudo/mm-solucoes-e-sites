import { NextResponse } from "next/server";
import { adminDb, authUser, requireCompanyAdmin, safeError } from "../../../../lib/ml-server";
export const runtime="nodejs";
export async function GET(request:Request){
  try{
    const user=await authUser(request);
    const empresaId=new URL(request.url).searchParams.get("empresa_id")||"";
    if(!/^[0-9a-f-]{36}$/i.test(empresaId))return NextResponse.json({error:"Empresa inválida."},{status:400});
    await requireCompanyAdmin(user.id,empresaId);
    const {data,error}=await adminDb().from("mercadolivre_conexoes")
      .select("id,ml_user_id,nome_loja,status,atualizado_em").eq("empresa_id",empresaId).order("atualizado_em",{ascending:false});
    if(error)throw error;
    return NextResponse.json({lojas:data||[]},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return NextResponse.json({error:safeError(e)},{status:403});}
}
