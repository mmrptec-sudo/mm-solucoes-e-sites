import { NextRequest, NextResponse } from "next/server";
import { adminDb, encrypt, nsCredentials, nsError, requireCompanyAdmin, sha256 } from "../../../../lib/nuvemshop-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const destination = (status:string) => new URL(`/painel?aba=lojas&ns=${status}`, "https://mm-solucoes-digitais.vercel.app");
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state || code.length > 2048 || state.length > 256) return NextResponse.redirect(destination("cancelado"));
  try {
    const db = adminDb();
    // Uso único do state: evita CSRF e impede vincular a loja a outra empresa.
    const { data: session, error: sessionError } = await db.from("nuvemshop_oauth_sessoes")
      .delete().eq("state_hash", sha256(state))
      .select("empresa_id,usuario_id,expira_em").maybeSingle();
    if (sessionError || !session || Date.parse(session.expira_em) <= Date.now()) throw new Error("Sessão OAuth inválida ou expirada.");
    await requireCompanyAdmin(session.usuario_id, session.empresa_id);
    const { id, secret } = nsCredentials();
    const response = await fetch("https://www.nuvemshop.com.br/apps/authorize/token", {
      method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: "authorization_code", code }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("A Nuvemshop não autorizou a instalação.");
    const result = await response.json() as {user_id?:string|number;store_id?:string|number;access_token?:string;scope?:string};
    const storeId = String(result.user_id || result.store_id || "");
    if (!/^\d+$/.test(storeId) || !result.access_token) throw new Error("Autorização sem dados da loja.");
    const { data: existing, error: existingError } = await db.from("nuvemshop_conexoes")
      .select("empresa_id").eq("app_id", id).eq("store_id", storeId).maybeSingle();
    if (existingError) throw existingError;
    if (existing && existing.empresa_id !== session.empresa_id) {
      throw new Error("Esta loja já pertence a outra empresa na MM.");
    }
    const { error } = await db.from("nuvemshop_conexoes").upsert({
      app_id: id, empresa_id: session.empresa_id, store_id: storeId,
      nome_loja: `Nuvemshop ${storeId}`, scopes: String(result.scope || ""),
      access_token_criptografado: encrypt(result.access_token),
      status: "conectada", atualizado_em: new Date().toISOString(),
    }, { onConflict: "app_id,store_id" });
    if (error) throw error;
    return NextResponse.redirect(destination("conectado"));
  } catch (err: unknown) {
    console.error("Autorização Nuvemshop:", nsError(err));
    return NextResponse.redirect(destination("erro"));
  }
}
