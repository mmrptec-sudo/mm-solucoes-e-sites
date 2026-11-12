import { NextRequest, NextResponse } from "next/server";
import { adminDb, authUser, decrypt, encrypt, mlCredentials, requireCompanyAdmin, safeError } from "../../../../lib/ml-server";

export const runtime = "nodejs";
export const maxDuration = 60;

type MercadoLivreOrder = { id: number | string; status?: string; total_amount?: number; date_created?: string };
type OrdersPage = { results?: MercadoLivreOrder[]; paging?: { total?: number } };
type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number };

async function accessToken(conexao: {
  id: string;
  access_token_criptografado: string | null;
  refresh_token_criptografado: string | null;
  token_expira_em: string | null;
}): Promise<string> {
  if (!conexao.access_token_criptografado) throw new Error("Loja sem token. Reconecte a loja.");
  if (conexao.token_expira_em && Date.parse(conexao.token_expira_em) > Date.now() + 120_000) {
    return decrypt(conexao.access_token_criptografado);
  }
  if (!conexao.refresh_token_criptografado) throw new Error("Token expirado. Reconecte a loja.");
  const { clientId, clientSecret } = mlCredentials();
  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decrypt(conexao.refresh_token_criptografado),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("A autorização da loja expirou. Reconecte-a pelo Mercado Livre.");
  const token = (await response.json()) as TokenResponse;
  if (!token.access_token || !token.refresh_token) throw new Error("Falha ao renovar a autorização da loja.");
  const { error } = await adminDb().from("mercadolivre_conexoes").update({
    access_token_criptografado: encrypt(token.access_token),
    refresh_token_criptografado: encrypt(token.refresh_token),
    token_expira_em: new Date(Date.now() + Math.max(60, token.expires_in || 21600) * 1000).toISOString(),
    atualizado_em: new Date().toISOString(),
  }).eq("id", conexao.id);
  if (error) throw new Error("Não foi possível guardar a autorização renovada. Pare a sincronização e contate o suporte.");
  return token.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const user = await authUser(request);
    const body = (await request.json()) as { empresa_id?: unknown; conexao_id?: unknown };
    if (typeof body.empresa_id !== "string" || typeof body.conexao_id !== "string") {
      return NextResponse.json({ error: "Empresa e loja são obrigatórias." }, { status: 400 });
    }
    await requireCompanyAdmin(user.id, body.empresa_id);
    const db = adminDb();
    const { data: conexao, error: connError } = await db.from("mercadolivre_conexoes")
      .select("id,empresa_id,ml_user_id,nome_loja,status,access_token_criptografado,refresh_token_criptografado,token_expira_em")
      .eq("id", body.conexao_id).eq("empresa_id", body.empresa_id).eq("status", "conectada").maybeSingle();
    if (connError) throw connError;
    if (!conexao) return NextResponse.json({ error: "Loja não encontrada para esta empresa." }, { status: 404 });
    const token = await accessToken(conexao);
    const { data: existing, error: shopError } = await db.from("lojas")
      .select("id").eq("empresa_id", body.empresa_id)
      .eq("plataforma", "mercado_livre").eq("identificador_externo", conexao.ml_user_id).maybeSingle();
    if (shopError) throw shopError;
    let lojaId: string;
    if (existing?.id) {
      lojaId = existing.id;
    } else {
      const { data: loja, error: newShopError } = await db.from("lojas").insert({
        empresa_id: body.empresa_id, plataforma: "mercado_livre", nome: conexao.nome_loja || `Mercado Livre ${conexao.ml_user_id}`,
        identificador_externo: conexao.ml_user_id, status: "conectada",
      }).select("id").single();
      if (newShopError || !loja) throw new Error("Não foi possível cadastrar a loja no painel.");
      lojaId = loja.id;
    }

    // Primeira etapa: no máximo 100 pedidos por clique. Repetir é seguro (upsert por loja + pedido externo).
    let total = 0;
    let processados = 0;
    for (const offset of [0, 50]) {
      const url = new URL("https://api.mercadolibre.com/orders/search");
      url.searchParams.set("seller", conexao.ml_user_id);
      url.searchParams.set("sort", "date_desc");
      url.searchParams.set("limit", "50");
      url.searchParams.set("offset", String(offset));
      const ordersResponse = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!ordersResponse.ok) {
        if (ordersResponse.status === 401 || ordersResponse.status === 403) throw new Error("Sem permissão para ler pedidos. Verifique a autorização da loja.");
        if (ordersResponse.status === 429) throw new Error("Limite temporário da API do Mercado Livre. Tente mais tarde.");
        throw new Error(`Mercado Livre não respondeu à consulta de pedidos (${ordersResponse.status}).`);
      }
      const page = (await ordersResponse.json()) as OrdersPage;
      const lista = page.results || [];
      total = page.paging?.total || total;
      const registros = lista.filter(p => p.id != null).map(p => ({
        loja_id: lojaId,
        pedido_externo: String(p.id),
        status: p.status || "nao_informado",
        valor_bruto: Number.isFinite(Number(p.total_amount)) ? Number(p.total_amount) : 0,
        valor_liquido: null, // Não confundir faturamento bruto com repasse financeiro.
        data_pedido: p.date_created || null,
      }));
      if (registros.length) {
        const { error } = await db.from("pedidos")
          .upsert(registros, { onConflict: "loja_id,pedido_externo" });
        if (error) throw new Error("Erro ao salvar os pedidos no Supabase.");
        processados += registros.length;
      }
      if (lista.length < 50 || offset + 50 >= total) break;
    }
    return NextResponse.json({ ok: true, processados, total_encontrados: total, limite_por_execucao: 100 });
  } catch (error) {
    console.error("Falha de sincronização ML:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: safeError(error) }, { status: 400 });
  }
}
