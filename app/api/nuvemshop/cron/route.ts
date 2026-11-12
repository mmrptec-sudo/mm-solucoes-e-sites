import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {adminDb} from "../../../../lib/ml-server";
import {syncConnection} from "../../../../lib/nuvemshop-sync";
export const runtime="nodejs";
export const maxDuration=60;
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 const received=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 if(!secret||!received||received.length!==secret.length||!timingSafeEqual(Buffer.from(received),Buffer.from(secret)))return NextResponse.json({error:"Não autorizado."},{status:401});
 const {data,error}=await adminDb().from("nuvemshop_conexoes").select("id,empresa_id").eq("status","conectada").limit(100);
 if(error)return NextResponse.json({error:"Falha ao listar conexões."},{status:500});
 const {data:statuses,error:statusError}=await adminDb().from("nuvemshop_sync_status").select("conexao_id,ultima_tentativa").limit(100);
 if(statusError)return NextResponse.json({error:"Falha ao consultar histórico."},{status:500});
 const lastAttempt=new Map((statuses||[]).map(s=>[s.conexao_id,s.ultima_tentativa||""]));
 // Rotação: lojas há mais tempo sem consulta têm prioridade.
 const connections=(data||[]).sort((a,b)=>(lastAttempt.get(a.id)||"").localeCompare(lastAttempt.get(b.id)||"")).slice(0,5);
 const results=await Promise.all(connections.map(async c=>{try{const result=await syncConnection(c.id,c.empresa_id);return {ok:!result.erro_pedidos&&!result.erro_produtos}}catch{return {ok:false}}}));
 return NextResponse.json({executadas:results.length,concluidas:results.filter(r=>r.ok).length},{headers:{"Cache-Control":"no-store"}});
}
