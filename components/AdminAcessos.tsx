"use client";
import {useCallback,useEffect,useState} from "react";
import {getSupabase} from "../lib/supabase";
import "./analytics.css";
type A={usuario_id:string;email:string|null;status:string;criado_em:string};
export function Bloqueado({status}:{status:string}){
 return <div className="an-empty"><b>{status==="recusado"?"Acesso não autorizado":status==="carregando"?"Verificando seu acesso...":"Aguardando autorização"}</b><span>{status==="recusado"?"Fale com a MM Soluções para entender o motivo.":"Seu cadastro foi enviado. Assim que a MM liberar, as análises aparecem aqui."}</span></div>}
export default function AdminAcessos(){
 const [rows,setRows]=useState<A[]>([]);const [err,setErr]=useState("");const [f,setF]=useState("pendente");
 const load=useCallback(async()=>{const {data,error}=await getSupabase().from("acessos").select("usuario_id,email,status,criado_em").order("criado_em",{ascending:false});if(error)setErr(error.message);else{setErr("");setRows(data||[])}},[]);
 useEffect(()=>{load()},[load]);
 async function set(id:string,status:string){const {error}=await getSupabase().from("acessos").update({status,decidido_em:new Date().toISOString()}).eq("usuario_id",id);if(error)setErr(error.message);else load()}
 const cnt=(s:string)=>rows.filter(r=>r.status===s).length;const list=rows.filter(r=>f==="todos"||r.status===f);
 return <div className="an"><div className="an-kpis">{[["Pendentes","pendente"],["Aprovados","aprovado"],["Recusados","recusado"],["Todos","todos"]].map(([k,v])=><button key={v} type="button" onClick={()=>setF(v)} className={`an-kpi-btn ${f===v?"on":""}`}><small>{k}</small><b>{v==="todos"?rows.length:cnt(v)}</b></button>)}</div>
 {err&&<div className="an-empty an-err">{err}</div>}
 <div className="an-card"><h4>Solicitações de acesso</h4>{list.length===0?<p className="an-note">Nenhuma solicitação nesta lista.</p>:<div className="an-table"><table><thead><tr><th>E-mail</th><th>Pedido em</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{list.map(r=><tr key={r.usuario_id}><td>{r.email}</td><td>{new Date(r.criado_em).toLocaleDateString("pt-BR")}</td><td>{r.status}</td><td className="an-act">{r.status!=="aprovado"&&<button type="button" onClick={()=>set(r.usuario_id,"aprovado")}>Aprovar</button>}{r.status!=="recusado"&&<button type="button" className="no" onClick={()=>set(r.usuario_id,"recusado")}>{r.status==="aprovado"?"Revogar":"Recusar"}</button>}</td></tr>)}</tbody></table></div>}</div></div>}
