"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {getSupabase} from "../lib/supabase";
import "./analytics.css";
type P={id:string;status:string|null;valor_bruto:number|null;data_pedido:string|null;loja_id:string};
type L={id:string;nome:string;plataforma:string;status:string};
const brl=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const COL=["#19e3ff","#ff6b4a","#4de5bd","#c395ff","#ffa35b","#ff5d8f"];
const day=(d:Date)=>d.toISOString().slice(0,10);
export default function Analytics({companyId,view}:{companyId:string;view:"analise"|"lojas"}){
 const [lojas,setLojas]=useState<L[]>([]);const [peds,setPeds]=useState<P[]>([]);const [load,setLoad]=useState(true);const [err,setErr]=useState("");
 useEffect(()=>{let live=true;setLoad(true);(async()=>{try{
  const db=getSupabase();const {data:l,error:e1}=await db.from("lojas").select("id,nome,plataforma,status").eq("empresa_id",companyId);if(e1)throw e1;
  const ids=(l||[]).map(x=>x.id);let p:P[]=[];
  if(ids.length){const {data,error:e2}=await db.from("pedidos").select("id,status,valor_bruto,data_pedido,loja_id").in("loja_id",ids).order("data_pedido",{ascending:false}).limit(1000);if(e2)throw e2;p=data||[]}
  if(live){setLojas(l||[]);setPeds(p)}
 }catch(e){if(live)setErr(e instanceof Error?e.message:"Falha ao carregar os dados.")}finally{if(live)setLoad(false)}})();return()=>{live=false}},[companyId]);
 const m=useMemo(()=>{
  const fat=peds.reduce((s,p)=>s+(p.valor_bruto||0),0);const canc=peds.filter(p=>(p.status||"").includes("cancel")).length;
  const st:Record<string,number>={};peds.forEach(p=>{const k=p.status||"nao_informado";st[k]=(st[k]||0)+1});
  const series:{d:string;v:number;n:number}[]=[];const now=new Date();
  for(let i=29;i>=0;i--){const d=new Date(now);d.setDate(now.getDate()-i);series.push({d:day(d),v:0,n:0})}
  peds.forEach(p=>{if(!p.data_pedido)return;const s=series.find(x=>x.d===p.data_pedido!.slice(0,10));if(s){s.v+=p.valor_bruto||0;s.n++}});
  const wk=[0,0,0,0,0,0,0];peds.forEach(p=>{if(p.data_pedido)wk[new Date(p.data_pedido).getDay()]++});
  const por=lojas.map(l=>{const ps=peds.filter(p=>p.loja_id===l.id);const f=ps.reduce((s,p)=>s+(p.valor_bruto||0),0);const c=ps.filter(p=>(p.status||"").includes("cancel")).length;return{...l,n:ps.length,f,t:ps.length?f/ps.length:0,c:ps.length?c/ps.length*100:0}}).sort((a,b)=>b.f-a.f);
  return{fat,canc,st,series,wk,por,n:peds.length}},[peds,lojas]);
 if(load)return <div className="an-empty">Carregando dados reais do banco...</div>;
 if(err)return <div className="an-empty an-err">{err}</div>;
 if(!m.n)return <div className="an-empty"><b>Nenhum pedido sincronizado ainda.</b><span>Conecte uma loja em Marketplaces no <Link href="/painel">painel</Link> e sincronize para ver as análises.</span></div>;
 const max=Math.max(...m.series.map(s=>s.v),1);const W=600,H=190;
 const pts=m.series.map((s,i)=>[i*(W/29),H-8-(s.v/max)*(H-30)]);const line=pts.map((p,i)=>`${i?"L":"M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
 const sts=Object.entries(m.st).sort((a,b)=>b[1]-a[1]);let acc=0;const R=52,C=2*Math.PI*R;
 const wmax=Math.max(...m.wk,1);const dn=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];const smax=Math.max(...m.por.map(s=>s.f),1);
 const kpi=[["Pedidos",String(m.n)],["Faturamento bruto",brl(m.fat)],["Ticket médio",brl(m.fat/m.n)],["Cancelamentos",`${(m.canc/m.n*100).toFixed(1)}%`]];
 return <div className="an">
  <div className="an-kpis">{kpi.map(([k,v])=><div key={k}><small>{k}</small><b>{v}</b></div>)}</div>
  {view==="analise"?<>
  <div className="an-card"><h4>Faturamento bruto por dia <small>últimos 30 dias</small></h4>
   <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico de faturamento diário"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#19e3ff" stopOpacity=".45"/><stop offset="1" stopColor="#19e3ff" stopOpacity="0"/></linearGradient></defs>
    {[0,1,2,3].map(i=><line key={i} x1="0" x2={W} y1={20+i*50} y2={20+i*50} stroke="#173044"/>)}
    <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#ag)"/><path d={line} fill="none" stroke="#19e3ff" strokeWidth="2.5" strokeLinejoin="round"/></svg>
   <div className="an-axis"><span>{m.series[0].d.slice(5)}</span><span>pico {brl(max)}</span><span>{m.series[29].d.slice(5)}</span></div></div>
  <div className="an-two">
   <div className="an-card"><h4>Pedidos por status</h4><div className="an-donut"><svg viewBox="0 0 140 140"><circle cx="70" cy="70" r={R} fill="none" stroke="#10222f" strokeWidth="18"/>{sts.map(([k,v],i)=>{const len=v/m.n*C;const el=<circle key={k} cx="70" cy="70" r={R} fill="none" stroke={COL[i%6]} strokeWidth="18" strokeDasharray={`${len} ${C-len}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)"/>;acc+=len;return el})}<text x="70" y="76" textAnchor="middle" fill="#e8f6fb" fontSize="22" fontWeight="700">{m.n}</text></svg>
    <ul>{sts.map(([k,v],i)=><li key={k}><i style={{background:COL[i%6]}}/>{k.replace(/_/g," ")}<b>{v}</b></li>)}</ul></div></div>
   <div className="an-card"><h4>Pedidos por dia da semana</h4><div className="an-wk">{m.wk.map((v,i)=><div key={i}><span style={{height:`${v/wmax*100}%`}}/><small>{dn[i]}</small></div>)}</div></div>
  </div>
  <div className="an-card"><h4>Faturamento por loja</h4>{m.por.map((s,i)=><div className="an-row" key={s.id}><span>{s.nome}</span><div><i style={{width:`${s.f/smax*100}%`,background:COL[i%6]}}/></div><b>{brl(s.f)}</b></div>)}</div>
  </>:<div className="an-card"><h4>Ranking de lojas</h4><div className="an-table"><table><thead><tr><th>Loja</th><th>Canal</th><th>Pedidos</th><th>Faturamento</th><th>Ticket</th><th>Cancel.</th></tr></thead><tbody>{m.por.map(s=><tr key={s.id}><td>{s.nome}</td><td>{s.plataforma}</td><td>{s.n}</td><td>{brl(s.f)}</td><td>{brl(s.t)}</td><td>{s.c.toFixed(1)}%</td></tr>)}</tbody></table></div></div>}
  <p className="an-note">Dados lidos do seu banco (até 1.000 pedidos mais recentes). Valores brutos, sem conciliação financeira.</p>
 </div>}
