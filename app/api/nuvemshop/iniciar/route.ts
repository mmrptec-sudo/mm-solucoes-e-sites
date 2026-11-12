import { NextResponse } from "next/server";
import { adminDb, authUser, makeState, nsCredentials, requireCompanyAdmin, sha256, nsError } from "../../../../lib/nuvemshop-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const user = await authUser(request);
    const { empresa_id: empresaId } = await request.json() as {empresa_id?:string};
    if (typeof empresaId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(empresaId))
      return NextResponse.json({ error: "Empresa inválida." }, { status: 400 });
    await requireCompanyAdmin(user.id, empresaId);
    const { id } = nsCredentials();
    const state = makeState();
    const { error } = await adminDb().from("nuvemshop_oauth_sessoes").insert({
      state_hash: sha256(state), empresa_id: empresaId, usuario_id: user.id,
      expira_em: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (error) throw error;
    const url = new URL(`https://www.nuvemshop.com.br/apps/${id}/authorize`);
    url.searchParams.set("state", state);
    return NextResponse.json({ authorization_url: url.toString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    return NextResponse.json({ error: nsError(err) }, { status: 403 });
  }
}
