import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {NextRequest,NextResponse} from "next/server";
import {mmAdminDb,mmGetUser,mmIsAdmin} from "../../../../lib/mm-access-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

// HTML privado do módulo; nunca servido em /public. A sessão e o acesso aos
// registros por empresa são controlados separadamente por Auth + Supabase RLS.
export async function GET(request:NextRequest){
 try{
  const user=await mmGetUser(request);
  if(!user.email_confirmed_at)return NextResponse.json({error:"Confirme seu e-mail."},{status:403});
  const allowed=await mmIsAdmin(user.id) || Boolean((await mmAdminDb().from("acessos_plataforma")
    .select("usuario_id").eq("usuario_id",user.id).maybeSingle()).data);
  if(!allowed)return NextResponse.json({error:"Acesso à plataforma não aprovado."},{status:403});
  const html=await readFile(join(process.cwd(),"private","mm-central-operacoes.html"),"utf8");
  return new NextResponse(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }catch{
  return NextResponse.json({error:"Sessão inválida ou módulo indisponível."},{status:401,headers:{"Cache-Control":"no-store"}});
 }
}
