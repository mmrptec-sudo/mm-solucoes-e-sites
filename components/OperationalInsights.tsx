"use client";
import {useEffect,useState} from "react";
import {AlertCircle,ArrowRight,ClipboardList,Info,RefreshCw} from "lucide-react";
import {getSupabase} from "../lib/supabase";

type Issue={id:string;agent:"atlas"|"max"|"luna"|"nexa"|"price";title:string;details:string;severity:"attention"|"info"};
function isCancelled(s:string){return /cancel|can(celad)?|refun|devolv/i.test(s)}
export default function OperationalInsights({companyId,createMission}:{companyId:string;createMission:(agent:Issue["agent"],title:string)=>void}){
 const [issues,setIssues]=useState<Issue[]>([]);const [loading,setLoading]=useState(false);const [error,setError]=useState("");const [count,setCount]=useState(0);const [refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;(async()=>{if(!companyId)return;setLoading(true);setError("");setIssues([]);try{
  const db=getSupabase();const {data:lojas,error:le}=await db.from("lojas").select("id").eq("empresa_id",companyId);if(le)throw le;
  const ids=(lojas||[]).map(l=>l.id);if(!ids.length){if(active){setIssues([{id:"none",agent:"atlas",title:"Conecte sua primeira loja",details:"Ainda não há lojas vinculadas a este ambiente. A análise de pedidos começa após a conexão ou importação.",severity:"info"}]);setCount(0);}return;}
  const {data:orders,error:oe}=await db.from("pedidos").select("id,status,valor_bruto,valor_liquido").in("loja_id",ids).limit(1000);if(oe)throw oe;
  const list=orders||[];const cancelled=list.filter(x=>isCancelled(String(x.status||"")));
  const valid=list.filter(x=>!isCancelled(String(x.status||"")));
  const noNet=valid.filter(x=>x.valor_liquido===null||x.valor_liquido===undefined);
  const nonpositive=valid.filter(x=>Number(x.valor_bruto||0)<=0);
  const next:Issue[]=[];
  if(cancelled.length)next.push({id:"cancelled",agent:"max",title:`${cancelled.length} pedido(s) com status de CAN/devolução`,details:"Revise os motivos e acompanhe o impacto operacional. Quantidade consultada, não uma taxa de cancelamento do período total.",severity:"attention"});
  if(noNet.length)next.push({id:"net",agent:"luna",title:`${noNet.length} pedido(s) sem valor líquido informado`,details:"Evite interpretar faturamento bruto como lucro. Consulte taxas e repasses antes de calcular margem.",severity:"attention"});
  if(nonpositive.length)next.push({id:"nonpositive",agent:"atlas",title:`${nonpositive.length} pedido(s) sem valor bruto positivo`,details:"Revise a integridade dos dados importados ou estados de pedidos antes de gerar relatórios.",severity:"attention"});
  next.push({id:"pricing",agent:"price",title:"Validar margens antes de competir por preço",details:"O monitoramento competitivo usa referências cadastradas manualmente. Preços automáticos só após conectores autorizados.",severity:"info"});
  if(next.filter(n=>n.severity==="attention").length===0)next.unshift({id:"ready",agent:"atlas",title:"Sem inconsistências básicas detectadas nesta amostra",details:"A análise cobre no máximo 1.000 pedidos consultados e não confirma conciliação financeira, estoque ou lucro.",severity:"info"});
  if(active){setIssues(next);setCount(list.length);}
 }catch(e){if(active)setError(e instanceof Error?e.message:"Erro ao consultar pedidos.");}finally{if(active)setLoading(false);}})();return()=>{active=false};},[companyId,refresh]);
 return <div className="mm4-insights"><div className="hq-panel-top"><div><span className="hq-panel-eyebrow">DIAGNÓSTICOS / DADOS CONSULTADOS</span><h2>Prioridades da operação</h2><p>Alertas verificáveis a partir dos pedidos autorizados para sua empresa.</p></div><button type="button" className="mm4-refresh" onClick={()=>setRefresh(i=>i+1)} disabled={loading}><RefreshCw size={16}/> Atualizar</button></div>
  <div className="mm4-insight-info"><Info size={16}/> Amostra de até 1.000 pedidos, sem filtro temporal implícito. Estas são regras locais de diagnóstico, não análises executadas por um modelo de IA. Nenhum anúncio ou preço é alterado.</div>
  {loading?<p>Consultando pedidos...</p>:error?<p className="mm4-form-error" role="alert">{error}</p>:<><div className="mm4-insight-total"><ClipboardList size={17}/> Pedidos incluídos nesta consulta: <b>{count}</b></div><div className="mm4-insight-list">{issues.map(issue=><article key={issue.id} className="mm4-insight-card"><span className={issue.severity==="attention"?"mm4-insight-flag warning":"mm4-insight-flag"}><AlertCircle size={16}/></span><div><strong>{issue.title}</strong><p>{issue.details}</p><small>Especialista responsável: {issue.agent.toUpperCase()}</small></div><button type="button" onClick={()=>createMission(issue.agent,issue.title)} title="Adicionar tarefa ao quadro">Criar missão <ArrowRight size={15}/></button></article>)}</div></>}
 </div>;
}
