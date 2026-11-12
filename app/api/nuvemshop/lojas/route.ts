import { NextRequest, NextResponse } from "next/server";
import { adminDb, authUser, requireCompanyAdmin, nsError } from "../../../../lib/nuvemshop-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const user = await authUser(request);
    const empresaId = request.nextUrl.searchParams.get("empresa_id") || "";
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(empresaId))
      return NextResponse.json({ error: "Empresa inválida." }, { status: 400 });
    await requireCompanyAdmin(user.id, empresaId);
    const { data, error } = await adminDb().from("nuvemshop_conexoes")
      .select("id,store_id,nome_loja,status,scopes,atualizado_em")
      .eq("empresa_id", empresaId).order("atualizado_em", { ascending: false });
    if (error) throw error;
    const connIds=(data||[]).map(l=>l.id);
    let statuses:unknown[]=[];
    if(connIds.length){const {data:state,error:stateErr}=await adminDb().from("nuvemshop_sync_status").select("conexao_id,ultima_tentativa,ultimo_sucesso_pedidos,ultimo_sucesso_produtos,erro_pedidos,erro_produtos,total_pedidos_ultima_execucao,total_variantes_ultima_execucao").eq("empresa_id",empresaId).in("conexao_id",connIds);if(stateErr)throw stateErr;statuses=state||[];}
    return NextResponse.json({ lojas: data || [], sincronizacoes: statuses }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    return NextResponse.json({ error: nsError(err) }, { status: 403 });
  }
}
