"use client";
import {useEffect,useMemo,useState} from "react";
import {getSupabase} from "../lib/supabase";
import "./analytics.css";
type P={status:string|null;valor_bruto:number|null;loja_id:string};type L={id:string;nome:string};
const brl=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export default function Fiscal({companyId}:{companyId:string}){
 const [lojas,setLojas]=useState<L[]>([]);const [peds,setPeds]=useState<P[]>([]);const [cfg,setCfg]=useState({imposto_pct:6,comissao_pct:14,custo_pct:40});const [msg,setMsg]=useState("");const [load,setLoad]=useState(true);
 useEffect(()=>{let live=true;(async()=>{try{const db=getSupabase();
  const {data:l}=await db.from("lojas").select("id,nome").eq("empresa_id",companyId);const ids=(l||[]).map(x=>x.id);
  const {data:p}=ids.length?await db.from("pedidos").select("status,valor_bruto,loja_id").in("loja_id",ids).limit(1000):{data:[]};
  const {data:c}=await db.from("config_fiscal").select("imposto_pct,comissao_pct,custo_pct").eq("empresa_id",companyId).maybeSingle();
  if(live){setLojas(l||[]);setPeds((p as P[])||[]);if(c)setCfg({imposto_pct:+c.imposto_pct,comissao_pct:+c.comissao_pct,custo_pct:+c.custo_pct})}
 }catch{}finally{if(live)setLoad(false)}})();return()=>{live=false}},[companyId]);
 async function save(){setMsg("Salvando...");const {error}=await getSupabase().from("config_fiscal").upsert({empresa_id:companyId,...cfg,atualizado_em:new Date().toISOString()});setMsg(error?`Não foi possível salvar: ${error.message}`:"Percentuais salvos.")}
 const r=useMemo(()=>{const isC=(p:P)=>(p.status||"").includes("cancel");const calc=(ps:P[])=>{const fat=ps.filter(p=>!isC(p)).reduce((s,p)=>s+(p.valor_bruto||0),0);const perd=ps.filter(isC).reduce((s,p)=>s+(p.valor_bruto||0),0);const imp=fat*cfg.imposto_pct/100,com=fat*cfg.comissao_pct/100,cus=fat*cfg.custo_pct/100;return{fat,perd,imp,com,cus,res:fat-imp-com-cus}};
  return{t:calc(peds),por:lojas.map(l=>({nome:l.nome,...calc(peds.filter(p=>p.loja_id===l.id))})).sort((a,b)=>a.res-b.res)}},[peds,lojas,cfg]);
 if(load)return <div className="an-empty">Carregando...</div>;
 const t=r.t;const parts:[string,number,string][]=[["Imposto",t.imp,"#ff6b4a"],["Comissão do canal",t.com,"#ffa35b"],["Custo dos produtos",t.cus,"#c395ff"],["Resultado",Math.max(t.res,0),"#4de5bd"]];
 const num=(k:"imposto_pct"|"comissao_pct"|"custo_pct",l:string)=><label>{l}<input type="number" min="0" max="100" step="0.1" value={cfg[k]} onChange={e=>setCfg({...cfg,[k]:Math.max(0,Math.min(100,+e.target.value||0))})}/></label>;
 return <div className="an">
  <div className="an-card"><h4>Seus percentuais <small>ajuste conforme seu regime e seus custos</small></h4><div className="an-form">{num("imposto_pct","Imposto sobre vendas (%)")}{num("comissao_pct","Comissão e taxas do canal (%)")}{num("custo_pct","Custo dos produtos (%)")}<button type="button" onClick={save}>Salvar</button></div>{msg&&<p className="an-note">{msg}</p>}</div>
  <div className="an-kpis">{[["Vendas válidas",brl(t.fat)],["Imposto estimado",brl(t.imp)],["Perdido em cancelamentos",brl(t.perd)],["Resultado estimado",brl(t.res)]].map(([k,v],i)=><div key={k}><small>{k}</small><b className={i===3?(t.res<0?"an-neg":"an-pos"):""}>{v}</b></div>)}</div>
  <div className="an-card"><h4>Para onde vai cada R$ 100 vendidos</h4>{t.fat>0?<><div className="an-split">{parts.map(([k,v,c])=><i key={k} style={{width:`${v/t.fat*100}%`,background:c}}/>)}</div><div className="an-leg">{parts.map(([k,v,c])=><span key={k} style={{"--c":c} as React.CSSProperties}>{k}: {brl(v)}</span>)}</div></>:<p className="an-note">Sem vendas válidas para calcular.</p>}</div>
  <div className="an-card"><h4>Resultado por loja <small>da pior para a melhor</small></h4><div className="an-table"><table><thead><tr><th>Loja</th><th>Vendas</th><th>Imposto</th><th>Cancelado</th><th>Resultado</th></tr></thead><tbody>{r.por.map(s=><tr key={s.nome}><td>{s.nome}</td><td>{brl(s.fat)}</td><td>{brl(s.imp)}</td><td>{brl(s.perd)}</td><td className={s.res<0?"an-neg":"an-pos"}>{brl(s.res)}</td></tr>)}</tbody></table></div></div>
  <p className="an-note">Estimativa com base nos percentuais acima, não é contabilidade. A análise por produto (qual dá prejuízo) depende de sincronizar os itens dos pedidos e o custo de cada produto, o que será a próxima etapa.</p>
 </div>}
