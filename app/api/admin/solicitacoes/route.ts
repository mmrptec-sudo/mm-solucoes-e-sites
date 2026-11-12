import {NextRequest,NextResponse} from "next/server";
import {mmAdminDb,mmGetUser,mmIsAdmin} from "../../../../lib/mm-access-server";
export const runtime="nodejs";export const dynamic="force-dynamic";
async function admin(req:NextRequest){const user=await mmGetUser(req);if(!(await mmIsAdmin(user.id)))return null;return user}
export async function GET(req:NextRequest){try{if(!(await admin(req)))return NextResponse.json({error:"Acesso não autorizado"},{status:403});const {data,error}=await mmAdminDb().from("mm_solicitacoes_acesso").select("usuario_id,email,status,solicitada_em,analisada_em").order("solicitada_em",{ascending:false}).limit(150);if(error)throw error;return NextResponse.json({solicitacoes:data||[]},{headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Falha ao consultar solicitações"},{status:500})}}
export async function POST(req:NextRequest){try{
 const operador=await admin(req);if(!operador)return NextResponse.json({error:"Acesso não autorizado"},{status:403});
 const b=await req.json() as {usuario_id?:string;decisao?:string};if(!b.usuario_id||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(b.usuario_id)||!["aprovar","recusar"].includes(b.decisao||""))return NextResponse.json({error:"Dados inválidos"},{status:400});
 const db=mmAdminDb();const {data:sol,error:err}=await db.from("mm_solicitacoes_acesso").select("usuario_id,status").eq("usuario_id",b.usuario_id).maybeSingle();if(err)throw err;if(!sol)return NextResponse.json({error:"Solicitação não encontrada"},{status:404});
 const {data:papel}=await db.from("mm_papeis_plataforma").select("papel").eq("usuario_id",b.usuario_id);if(papel?.some(p=>p.papel==="proprietario"||p.papel==="super_admin"))return NextResponse.json({error:"Não é permitido alterar acesso de proprietário/super admin aqui."},{status:403});
 if(b.decisao==="aprovar"){
  const {data:{user},error:userErr}=await db.auth.admin.getUserById(b.usuario_id);if(userErr||!user?.email_confirmed_at)return NextResponse.json({error:"A conta ainda não confirmou o próprio e-mail."},{status:409});
  const {error:saveErr}=await db.from("acessos_plataforma").upsert({usuario_id:b.usuario_id},{onConflict:"usuario_id"});if(saveErr)throw saveErr;
 }else{
  const {error:delErr}=await db.from("acessos_plataforma").delete().eq("usuario_id",b.usuario_id);if(delErr)throw delErr;
 }
 const {error:updateErr}=await db.from("mm_solicitacoes_acesso").update({status:b.decisao==="aprovar"?"aprovado":"recusado",analisada_em:new Date().toISOString(),analisada_por:operador.id}).eq("usuario_id",b.usuario_id);if(updateErr)throw updateErr;
 return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:"Não foi possível aplicar a decisão"},{status:500})}}
