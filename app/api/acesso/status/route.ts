import {NextRequest,NextResponse} from "next/server";
import {mmAdminDb,mmGetUser,mmIsAdmin} from "../../../../lib/mm-access-server";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 try{
  const user=await mmGetUser(req),db=mmAdminDb();
  if(!user.email_confirmed_at)return NextResponse.json({status:"confirmar_email"},{headers:{"Cache-Control":"no-store"}});
  if(await mmIsAdmin(user.id))return NextResponse.json({status:"aprovado",admin:true},{headers:{"Cache-Control":"no-store"}});
  const {data:access,error:accessError}=await db.from("acessos_plataforma").select("usuario_id").eq("usuario_id",user.id).maybeSingle();if(accessError)throw accessError;
  if(access)return NextResponse.json({status:"aprovado",admin:false},{headers:{"Cache-Control":"no-store"}});
  const {data:existing,error:getError}=await db.from("mm_solicitacoes_acesso").select("status,notificacao_enviada_em").eq("usuario_id",user.id).maybeSingle();if(getError)throw getError;
  if(!existing){
   const {error}=await db.from("mm_solicitacoes_acesso").insert({usuario_id:user.id,email:user.email||"",status:"pendente"});if(error&&error.code!=="23505")throw error;
  }
  const status=existing?.status==="recusado"?"recusado":"pendente";
  // A solicitação entra no Admin Center mesmo que o e-mail ainda não esteja configurado.
  if(status==="pendente"&&!existing?.notificacao_enviada_em&&process.env.RESEND_API_KEY&&process.env.MM_NOTIFICACOES_FROM){
   try{
    const from=process.env.MM_NOTIFICACOES_FROM;
    const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:["mmrptec@gmail.com"],subject:"MM Intelligence — nova solicitação de acesso",text:`Uma conta confirmou o e-mail e solicitou acesso à MM: ${user.email||"sem e-mail"}. Entre no MM Admin Center para aprovar ou recusar. Nenhuma conta é aprovada por e-mail automaticamente.`})});
    if(response.ok)await db.from("mm_solicitacoes_acesso").update({notificacao_enviada_em:new Date().toISOString()}).eq("usuario_id",user.id).is("notificacao_enviada_em",null);
   }catch{/* A aprovação continua disponível no Admin Center. */}
  }
  return NextResponse.json({status,admin:false},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Não foi possível verificar o acesso. Tente novamente."},{status:500})}
}
