import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 try{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!token)return NextResponse.json({error:"Acesso não autenticado"},{status:401});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!publishable||!secret)return NextResponse.json({error:"Servidor não configurado"},{status:503});
  const auth=createClient(url,publishable,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user},error:authErr}=await auth.auth.getUser(token);
  if(authErr||!user)return NextResponse.json({error:"Sessão inválida"},{status:401});
  const db=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:roles,error:roleErr}=await db.from("mm_papeis_plataforma").select("papel").eq("usuario_id",user.id);
  if(roleErr)return NextResponse.json({error:"Não foi possível validar permissões"},{status:500});
  if(!roles?.some((r:{papel:string})=>r.papel==="proprietario"||r.papel==="super_admin"))return NextResponse.json({error:"Acesso restrito ao proprietário e Super Admin"},{status:403});
  // Somente totais globais; não expor pedidos, credenciais, nomes ou dados financeiros de clientes.
  const [empresas,lojas,pedidos,contas]=await Promise.all([
   db.from("empresas").select("id",{count:"exact",head:true}),
   db.from("lojas").select("id",{count:"exact",head:true}),
   db.from("pedidos").select("id",{count:"exact",head:true}),
   db.from("mercadolivre_conexoes").select("id",{count:"exact",head:true})
  ]);
  if(empresas.error||lojas.error||pedidos.error||contas.error)return NextResponse.json({error:"Falha ao consultar indicadores administrativos"},{status:500});
  return NextResponse.json({empresas:empresas.count??0,lojas:lojas.count??0,pedidos:pedidos.count??0,conexoesML:contas.count??0,papeis:roles.map((r:{papel:string})=>r.papel)},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Erro interno no painel administrativo"},{status:500})}
}
