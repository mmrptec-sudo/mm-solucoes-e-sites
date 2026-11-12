import { NextResponse } from "next/server";
import { adminDb, authUser, encrypt, makeState, mlCredentials, ML_CALLBACK, pkceChallenge, requireCompanyAdmin, safeError, sha256 } from "../../../../lib/ml-server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await authUser(request);
    const body = await request.json() as { empresa_id?: string };
    const empresaId = body.empresa_id;
    if (!empresaId || !/^[0-9a-f-]{36}$/i.test(empresaId)) return NextResponse.json({error:"Empresa inválida."},{status:400});
    await requireCompanyAdmin(user.id,empresaId);
    const {clientId}=mlCredentials();
    const state=makeState(); const verifier=makeState();
    const {error}=await adminDb().from("mercadolivre_oauth_sessoes").insert({
      empresa_id:empresaId, usuario_id:user.id, state_hash:sha256(state),
      pkce_verifier_criptografado:encrypt(verifier), expira_em:new Date(Date.now()+10*60*1000).toISOString()
    });
    if (error) throw error;
    const url=new URL("https://auth.mercadolivre.com.br/authorization");
    url.searchParams.set("response_type","code");url.searchParams.set("client_id",clientId);
    url.searchParams.set("redirect_uri",ML_CALLBACK);url.searchParams.set("state",state);
    url.searchParams.set("code_challenge",pkceChallenge(verifier));url.searchParams.set("code_challenge_method","S256");
    return NextResponse.json({authorization_url:url.toString()},{headers:{"Cache-Control":"no-store"}});
  } catch(e) { return NextResponse.json({error:safeError(e)},{status:403}); }
}
