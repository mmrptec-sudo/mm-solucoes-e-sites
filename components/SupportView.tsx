"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {getSupabase} from "../lib/supabase";

type Conversa={id:string;usuario_id:string;status:string;atualizada_em?:string};
type Mensagem={id:string;remetente_id:string;texto:string;criada_em:string};
export default function Suporte({adminOnly=false}:{adminOnly?:boolean}){
 const router=useRouter();
 const [uid,setUid]=useState("");const [admin,setAdmin]=useState(false);
 const [conversas,setConversas]=useState<Conversa[]>([]);
 const [selecionada,setSelecionada]=useState("");
 const [mensagens,setMensagens]=useState<Mensagem[]>([]);
 const [texto,setTexto]=useState("");const [erro,setErro]=useState("");
 const [carregando,setCarregando]=useState(true);
 const [embedded,setEmbedded]=useState(false);const [enviando,setEnviando]=useState(false);
 const carregarConversas=useCallback(async(isAdmin:boolean,userId:string)=>{
   const sb=getSupabase();let q=sb.from("suporte_conversas").select("id,usuario_id,status,atualizada_em");
   if(!isAdmin)q=q.eq("usuario_id",userId);
   const {data,error}=await q.order("atualizada_em",{ascending:false}).limit(isAdmin?100:1);
   if(error)throw error;
   const lista=(data||[]) as Conversa[];setConversas(lista);
   setSelecionada(s=>lista.some(c=>c.id===s)?s:lista[0]?.id||"");
 },[]);
 const carregarMensagens=useCallback(async(id:string)=>{
   const {data,error}=await getSupabase().from("suporte_mensagens")
    .select("id,remetente_id,texto,criada_em").eq("conversa_id",id)
    .order("criada_em",{ascending:true}).limit(300);
   if(error)throw error;setMensagens((data||[]) as Mensagem[]);
 },[]);
 useEffect(()=>{setEmbedded(new URLSearchParams(window.location.search).has("embed"));},[]);
 useEffect(()=>{let active=true;(async()=>{try{
   const sb=getSupabase();const {data:{user},error:userError}=await sb.auth.getUser();
   if(userError)throw userError;
   if(!user){router.replace("/entrar");return;}
   if(!active)return;setUid(user.id);
   const {data,error}=await sb.from("suporte_administradores").select("usuario_id").eq("usuario_id",user.id).maybeSingle();
   if(error)throw error;const isAdmin=Boolean(data);setAdmin(isAdmin);
   if(adminOnly&&!isAdmin){router.replace("/painel");return;}
   if(!adminOnly&&isAdmin){router.replace("/admin/suporte");return;}
   await carregarConversas(isAdmin,user.id);
  }catch(e){if(active)setErro(e instanceof Error?e.message:"Não foi possível abrir o atendimento.");}
  finally{if(active)setCarregando(false);}})();return()=>{active=false};
 },[router,carregarConversas,adminOnly]);
 useEffect(()=>{if(!uid)return;
  const t=setInterval(()=>carregarConversas(admin,uid).catch(()=>{}),6000);
  return()=>clearInterval(t);
 },[uid,admin,carregarConversas]);
 useEffect(()=>{if(!selecionada){setMensagens([]);return;}
  carregarMensagens(selecionada).catch(e=>setErro(e.message));
  const t=setInterval(()=>carregarMensagens(selecionada).catch(()=>{}),5000);
  return()=>clearInterval(t);
 },[selecionada,carregarMensagens]);
 async function enviar(e:FormEvent){e.preventDefault();const conteudo=texto.trim();if(!conteudo||!uid||enviando)return;
  setErro("");setEnviando(true);
  try{
   const sb=getSupabase();let id=selecionada;
   if(!id&&!admin){
    const {data,error}=await sb.from("suporte_conversas")
      .insert({usuario_id:uid,assunto:"Atendimento"})
      .select("id,usuario_id,status,atualizada_em").single();
    if(error){
     const existente=await sb.from("suporte_conversas").select("id,usuario_id,status,atualizada_em").eq("usuario_id",uid).maybeSingle();
     if(existente.error||!existente.data)throw error;
     id=existente.data.id;
    }else id=data.id;
    setSelecionada(id);await carregarConversas(false,uid);
   }
   if(!id)throw new Error("Selecione um atendimento antes de responder.");
   const {error}=await sb.from("suporte_mensagens")
      .insert({conversa_id:id,remetente_id:uid,texto:conteudo});
   if(error)throw error;setTexto("");await carregarMensagens(id);
   await carregarConversas(admin,uid);
  }catch(e){setErro(e instanceof Error?e.message:"Falha ao enviar mensagem.");}
  finally{setEnviando(false);}
 }
 async function resolver(){if(!admin||!selecionada)return;
  const {error}=await getSupabase().from("suporte_conversas").update({status:"resolvida"}).eq("id",selecionada);
  if(error)setErro(error.message);else await carregarConversas(true,uid);
 }
 return <main className={embedded?"private-page support-embedded":"private-page"}>{!embedded&&<header className="private-header"><Link href="/painel" className="brand"><img src="/logo-mm.png" alt="MM"/><span>MM <strong>Soluções Digitais</strong></span></Link><Link href="/painel" className="btn outline btn-small">Meu painel</Link></header>}
 <section className="private-content">{!embedded&&<div className="kicker">{admin?"CENTRAL DE ATENDIMENTO — ADMINISTRADOR":"ATENDIMENTO HUMANO"}</div>}
 {!embedded&&<h1>{admin?"Suporte MM":"Fale com o suporte"}</h1>}
 {!embedded&&<p className="private-muted">{admin?"Todas as conversas autorizadas em uma única página.":"Envie sua mensagem à equipe MM. O robô ainda não está ativado."}</p>}
 {erro&&<div className="auth-error" role="alert">{erro}</div>}
 {carregando?<p>Carregando atendimento...</p>:<div className={admin?"support-layout":""}>
 {admin&&<aside className="support-list"><h2>Conversas ({conversas.length})</h2>
 {conversas.length===0&&<p className="private-muted">Ainda não há atendimentos.</p>}
 {conversas.map(c=><button type="button" key={c.id} onClick={()=>setSelecionada(c.id)} className={`support-ticket ${selecionada===c.id?"active":""}`}><strong>Cliente {c.usuario_id.slice(0,8)}</strong><span>{c.status} · {c.atualizada_em?new Date(c.atualizada_em).toLocaleString("pt-BR"):""}</span></button>)}
 </aside>}
 <div className="chat-shell"><div className="chat-history" aria-live="polite">
 {!selecionada&&<p className="private-muted">{admin?"Selecione uma conversa para atender.":"Escreva sua primeira mensagem para iniciar o atendimento."}</p>}
 {mensagens.map(m=><div className={`chat-msg ${m.remetente_id===uid?"chat-mine":"chat-other"}`} key={m.id}><span>{m.remetente_id===uid?"Você":admin?"Cliente":"Equipe MM"}</span><p>{m.texto}</p><small>{new Date(m.criada_em).toLocaleString("pt-BR")}</small></div>)}
 </div>{(!admin||selecionada)&&<form className="chat-compose" onSubmit={enviar}><label htmlFor="chat-texto">Mensagem</label><textarea id="chat-texto" rows={3} maxLength={2000} placeholder="Escreva sua mensagem..." value={texto} onChange={e=>setTexto(e.target.value)} required/><div className="chat-actions"><button className="btn" type="submit" disabled={enviando||!texto.trim()}>{enviando?"Enviando...":admin?"Responder":"Enviar mensagem"}</button>{admin&&<button className="btn outline" type="button" onClick={resolver}>Marcar resolvido</button>}</div></form>}
 </div></div>}
 </section></main>;
}
