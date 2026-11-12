"use client";
import {useEffect,useMemo,useState} from "react";
import {getSupabase} from "../lib/supabase";

type Pedido={id:string;numero:string|null;status:string|null;pagamento:string|null;valor:number|null;moeda:string|null;data:string|null};
const brl=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
const identificador=(p:Pedido)=>{
 const numero=(p.numero||"").trim();
 if(numero && numero!=="0")return `#${numero}`;
 if(p.id.startsWith("draft:"))return `Manual #${p.id.slice("draft:".length)}`;
 return `ID ${p.id}`;
};
export default function NuvemshopFinanceiro({companyId}:{companyId:string}){
 const [pedidos,setPedidos]=useState<Pedido[]>([]);
 const [limite,setLimite]=useState(false);const [loading,setLoading]=useState(true);const [erro,setErro]=useState("");
 useEffect(()=>{let ativo=true;setLoading(true);setErro("");setPedidos([]);
  (async()=>{try{
   const {data:{session}}=await getSupabase().auth.getSession();
   if(!session)throw new Error("Faça login novamente.");
   const response=await fetch(`/api/nuvemshop/financeiro?empresa_id=${encodeURIComponent(companyId)}`,
    {headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});
   const body=await response.json();if(!response.ok)throw new Error(body.error||"Falha ao consultar pedidos da Nuvemshop.");
   if(ativo){setPedidos(body.pedidos||[]);setLimite(Boolean(body.limite));}
  }catch(e){if(ativo)setErro(e instanceof Error?e.message:"Consulta indisponível.");}
  finally{if(ativo)setLoading(false);}})();return()=>{ativo=false};},[companyId]);
 const dados=useMemo(()=>{
  let recebido=0,pendente=0,estornado=0,pagos=0,aguardando=0,cancelados=0,indefinidos=0;
  for(const p of pedidos){
   const status=(p.status||"").toLowerCase();const pay=(p.pagamento||"").toLowerCase();const v=p.valor;
   if(status==="cancelled"||status==="canceled"||status==="cancelado"){cancelados++;continue;}
   if(pay==="refunded"||pay==="partially_refunded"){estornado++;continue;}
   if(pay==="paid" && !p.id.startsWith("draft:")){pagos++;if(v!==null)recebido+=v;continue;}
   if(["pending","authorized","partially_paid","abandoned","voided"].includes(pay)||p.id.startsWith("draft:")){
    aguardando++;if(v!==null)pendente+=v;continue;
   }
   indefinidos++;
  }
  return{recebido,pendente,estornado,pagos,aguardando,cancelados,indefinidos};
 },[pedidos]);
 return <section style={{margin:"20px 0",padding:20,border:"1px solid var(--border,#304357)",borderRadius:14}}>
  <h3>Financeiro Nuvemshop — separado por pagamento</h3>
  <p style={{opacity:.8}}>Pedidos não pagos e rascunhos nunca entram como faturamento confirmado. Valores líquidos, custos e impostos ainda não foram conciliados.</p>
  {loading?<p>Consultando pedidos importados...</p>:erro?<p role="alert">{erro}</p>:<>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:12,margin:"18px 0"}}>
    <div><small>Faturamento confirmado (pagos)</small><h3>{brl(dados.recebido)}</h3><small>{dados.pagos} pedidos pagos</small></div>
    <div><small>Pedidos pendentes / manuais</small><h3>{brl(dados.pendente)}</h3><small>{dados.aguardando} pedidos fora do faturamento</small></div>
    <div><small>Cancelados / reembolsados</small><h3>{dados.cancelados+dados.estornado}</h3><small>Excluídos do faturamento confirmado</small></div>
   </div>
   {limite&&<p role="alert">Visão parcial: somente os últimos 1.000 registros importados.</p>}
   {dados.indefinidos>0&&<p role="status">{dados.indefinidos} pedidos sem status de pagamento confiável: fora do faturamento.</p>}
   {pedidos.length===0?<p>Nenhum pedido Nuvemshop importado ainda. Isso não significa que a loja não tenha pedidos.</p>:
    <div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Pedido</th><th>Pagamento</th><th>Valor</th><th>Entra no faturamento?</th></tr></thead><tbody>
     {pedidos.slice(0,30).map(p=>{const pago=p.pagamento==="paid"&&p.status!=="cancelled"&&!p.id.startsWith("draft:");return <tr key={p.id}><td>{identificador(p)}</td><td>{p.id.startsWith("draft:")?"Manual / rascunho":p.pagamento||"Não informado"}</td><td>{p.valor===null?"Não informado":brl(p.valor)}</td><td>{pago?"Sim":"Não"}</td></tr>})}
    </tbody></table></div>}
  </>}
 </section>;
}
