import { NextRequest, NextResponse } from "next/server";
import { adminDb, decrypt, encrypt, ML_CALLBACK, mlCredentials, requireCompanyAdmin, sha256 } from "../../../../lib/ml-server";
export const runtime="nodejs";
const dest=(result:string)=>`https://mm-solucoes-digitais.vercel.app/painel?aba=lojas&ml=${result}`;
export async function GET(request:NextRequest) {
  const u=request.nextUrl;
  const code=u.searchParams.get("code"),state=u.searchParams.get("state");
  if(!state||!code) return NextResponse.redirect(dest("cancelado"));
  try {
    const db=adminDb();
    const {data:session,error:sError}=await db.from("mercadolivre_oauth_sessoes")
      .delete().eq("state_hash",sha256(state))
      .select("empresa_id,usuario_id,pkce_verifier_criptografado,expira_em").maybeSingle();
    if(sError||!session||new Date(session.expira_em).getTime()<Date.now()) throw new Error("Autorização inválida ou expirada.");
    await requireCompanyAdmin(session.usuario_id,session.empresa_id);
    const {clientId,clientSecret}=mlCredentials();
    const data=new URLSearchParams({grant_type:"authorization_code",client_id:clientId,
      client_secret:clientSecret,code,redirect_uri:ML_CALLBACK,
      code_verifier:decrypt(session.pkce_verifier_criptografado)});
    const response=await fetch("https://api.mercadolibre.com/oauth/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},body:data,cache:"no-store"});
    if(!response.ok) throw new Error("O Mercado Livre recusou a autorização.");
    const token=await response.json() as {access_token?:string;refresh_token?:string;expires_in?:number;user_id?:number};
    if(!token.access_token||!token.refresh_token) throw new Error("Resposta incompleta do Mercado Livre.");
    const profileResponse=await fetch("https://api.mercadolibre.com/users/me",{headers:{Authorization:`Bearer ${token.access_token}`},cache:"no-store"});
    if(!profileResponse.ok) throw new Error("Não foi possível identificar a loja autorizada.");
    const profile=await profileResponse.json() as {id?:number;nickname?:string};
    const externalId=String(profile.id||token.user_id||"");
    if(!externalId) throw new Error("Identificador de loja indisponível.");
    const {error}=await db.from("mercadolivre_conexoes").upsert({empresa_id:session.empresa_id,
      ml_user_id:externalId,nome_loja:profile.nickname||`Mercado Livre ${externalId}`,
      status:"conectada",access_token_criptografado:encrypt(token.access_token),
      refresh_token_criptografado:encrypt(token.refresh_token),
      token_expira_em:new Date(Date.now()+Math.max(60,token.expires_in||21600)*1000).toISOString(),
      atualizado_em:new Date().toISOString()}, {onConflict:"empresa_id,ml_user_id"});
    if(error) throw error;
    return NextResponse.redirect(dest("conectado"));
  } catch(e) {
    console.error("Falha de autorização ML:",e instanceof Error?e.name:"Falha");
    return NextResponse.redirect(dest("erro"));
  }
}
