"use client";

import {useEffect,useMemo,useState,type CSSProperties} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Activity,ArrowLeft,ArrowRight,BarChart3,Bell,BrainCircuit,Check,ChevronDown,Clock3,Coins,Eye,LockKeyhole,MonitorDot,Pause,Play,Plus,ShieldCheck,Sparkles,Store,Trash2,Workflow,X} from "lucide-react";
import {getSupabase} from "../../lib/supabase";
import "./studio.css";
import "./room.css";
import "./room3d.css";
import {useAcesso} from "../../lib/acesso";
import Fiscal from "../../components/Fiscal";
import AdminAcessos,{Bloqueado} from "../../components/AdminAcessos";
import Analytics from "../../components/Analytics";
import AnaliseCompleta from "../../components/AnaliseCompleta";
import TechRoom3D from "../../components/TechRoom3D";
import {WorkspaceControls} from "../../components/WorkspaceControls";
import PriceLab from "../../components/PriceLab";
import OperationalInsights from "../../components/OperationalInsights";

type AgentId="atlas"|"max"|"luna"|"nexa"|"vega"|"price";
type TabId="office"|"insights"|"price"|"fiscal"|"admin"|"analise"|"lojas"|"tasks"|"costs"|"activity";
type Task={id:string;agent:AgentId;title:string;done:boolean;created:string};
type Event={id:string;message:string;time:string;kind:"user"|"task"};
type Agent={id:AgentId;name:string;role:string;color:string;symbol:string;seat:string;description:string;skills:string[]};
const agents:Agent[]=[
  {id:"atlas",name:"Atlas",role:"Operações",color:"#5fa6ff",symbol:"✦",seat:"north",description:"Organiza prioridades e coordena a visão geral da empresa.",skills:["Visão gerencial","Prioridades","Resumo da operação"]},
  {id:"max",name:"Max",role:"Vendas",color:"#ffa35b",symbol:"↗",seat:"west",description:"Especialista em pedidos, vendas e desempenho por canal.",skills:["Pedidos","Faturamento","Marketplaces"]},
  {id:"luna",name:"Luna",role:"Financeiro",color:"#4de5bd",symbol:"◈",seat:"east",description:"Estrutura análises de comissões, taxas e conciliação financeira.",skills:["Taxas","Repasses","Margem"]},
  {id:"nexa",name:"Nexa",role:"Estoque",color:"#c395ff",symbol:"⬡",seat:"south",description:"Ajuda a acompanhar estoque, giro e risco de ruptura.",skills:["Cobertura","Rupturas","Reposição"]},
  {id:"vega",name:"Vega",role:"Marketing",color:"#ff5d8f",symbol:"✺",seat:"north",description:"Acompanha anúncios, campanhas e oportunidades de crescimento por canal.",skills:["Anúncios","Campanhas","Conversão"]},
  {id:"price",name:"Price",role:"Precificação",color:"#f9ce6a",symbol:"◉",seat:"south",description:"Calcula preços mínimos, protege margens e compara referências competitivas informadas pelo usuário.",skills:["Preço mínimo","Concorrência","Margem"]},
];
const tabs:{id:TabId;label:string;icon:typeof Activity}[]=[
 {id:"office",label:"Sala tecnológica",icon:MonitorDot},
 {id:"insights",label:"Diagnósticos",icon:BrainCircuit},
 {id:"price",label:"Price · Precificação",icon:Coins},
 {id:"analise",label:"Análise Completa",icon:BarChart3},
 {id:"lojas",label:"Lojas",icon:Store},
 {id:"fiscal",label:"Impostos & perdas",icon:Coins},
 {id:"admin",label:"Admin",icon:ShieldCheck},
 {id:"tasks",label:"Tarefas",icon:Workflow},
 {id:"costs",label:"Custos & uso",icon:Coins},
 {id:"activity",label:"Atividade",icon:Activity},
];
const nowTime=()=>new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const cssAgent=(a:Agent)=>({"--agent":a.color} as CSSProperties);

export default function CentralIAs(){
 const router=useRouter();const ac=useAcesso();
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [email,setEmail]=useState("");
 const [companies,setCompanies]=useState<{id:string;nome:string}[]>([]);
 const [companyId,setCompanyId]=useState("");
 const [selected,setSelected]=useState<AgentId>("atlas");
 const [tab,setTab]=useState<TabId>("office");
 const [motion,setMotion]=useState(true);
 const [tour,setTour]=useState(false);
 const [tasks,setTasks]=useState<Task[]>([]);
 const [events,setEvents]=useState<Event[]>([]);
 const [draft,setDraft]=useState("");
 const [composeOpen,setComposeOpen]=useState(false);
 const [taskScope,setTaskScope]=useState("");
 useEffect(()=>{let live=true;(async()=>{
  try{
   const client=getSupabase();const {data:{user},error:authErr}=await client.auth.getUser();
   if(authErr||!user){router.replace("/entrar");return;}
   const {data,error:companiesError}=await client.from("empresas").select("id,nome").order("criado_em",{ascending:false});
   if(companiesError)throw companiesError;
   if(live){setEmail(user.email||"");setCompanies(data||[]);setCompanyId(data?.[0]?.id||"");}
  }catch(e){if(live)setError(e instanceof Error?e.message:"Não foi possível abrir a Central de IAs.");}
  finally{if(live)setLoading(false);}
 })();return()=>{live=false};},[router]);
 useEffect(()=>{const target=new URLSearchParams(window.location.search).get("aba");if(target==="price"){setTab("price");setSelected("price");}else if(target==="insights"){setTab("insights");}},[]);
 useEffect(()=>{if(!companyId||!email)return;const key=`mm4-tasks:${email}:${companyId}`;setTaskScope("");try{const raw=JSON.parse(localStorage.getItem(key)||"[]");setTasks(Array.isArray(raw)?raw.filter((x:Task)=>x&&agents.some(a=>a.id===x.agent)&&typeof x.title==="string"&&typeof x.id==="string").slice(0,200):[]);}catch{setTasks([]);}setTaskScope(key);},[companyId,email]);
 useEffect(()=>{if(taskScope&&taskScope===`mm4-tasks:${email}:${companyId}`)localStorage.setItem(taskScope,JSON.stringify(tasks.slice(0,200)));},[tasks,taskScope,email,companyId]);
 const agent=agents.find(a=>a.id===selected)!;
 const openCount=useMemo(()=>tasks.filter(t=>!t.done).length,[tasks]);
 const doneCount=tasks.length-openCount;
 function event(message:string,kind:Event["kind"]="user"){
  setEvents(prev=>[{id:`${Date.now()}-${Math.random()}`,message,time:nowTime(),kind},...prev].slice(0,35));
 }
 function switchAgent(id:AgentId){setSelected(id);event(`Você selecionou ${agents.find(a=>a.id===id)?.name}.`);}
 function switchCompany(id:string){setCompanyId(id);setTaskScope("");setTasks([]);setEvents([]);setSelected("atlas");setTab("office");setDraft("");}
 function createMission(agentId:AgentId,title:string){setTasks(prev=>[{id:`${Date.now()}-${Math.random()}`,agent:agentId,title:title.slice(0,180),done:false,created:nowTime()},...prev]);event(`Missão criada para ${agentId}: ${title}`,"task");setTab("tasks");}
 function addTask(){let title=draft.trim();if(!title)return;title=title.slice(0,180);setTasks(prev=>[{id:`${Date.now()}-${Math.random()}`,agent:selected,title,done:false,created:nowTime()},...prev]);event(`Tarefa preparada para ${agent.name}: ${title}`,"task");setDraft("");setComposeOpen(false);setTab("tasks");}
 function toggleTask(id:string){const found=tasks.find(t=>t.id===id);if(!found)return;setTasks(prev=>prev.map(t=>t.id===id?{...t,done:!t.done}:t));event(`Tarefa marcada manualmente como ${found.done?"pendente":"concluída"}.`,"task");}
 function deleteTask(id:string){setTasks(prev=>prev.filter(t=>t.id!==id));event("Tarefa removida da sessão.","task");}
 return <main className="mm-hq">
  <header className="hq-top"><div className="hq-top-left"><Link className="hq-back" href="/painel" aria-label="Voltar ao painel"><ArrowLeft size={18}/></Link><div className="hq-brand"><span className="hq-brand-mark">MM<span>✳</span></span><span><strong>INTELLIGENCE <i>AI</i></strong><small>MISSION CONTROL</small></span></div><span className="hq-top-divider"/><span className="hq-top-context">CENTRAL DE OPERAÇÕES</span></div><div className="hq-top-right"><span className="hq-security"><ShieldCheck size={14}/> Espaço privado</span><WorkspaceControls email={email} compact/></div></header>
  <div className="hq-container">
  <div className="hq-heading"><div><div className="hq-eyebrow"><span className="hq-pulse"/> SEU QUARTEL-GENERAL DIGITAL <span className="hq-eyebrow-sep">/</span> VERSÃO CONCEITUAL</div><h1>Uma equipe inteira.<br/><em>Uma nova dimensão.</em></h1><p>Conheça os especialistas da sua operação, explore as estações e organize missões para a futura equipe de IAs.</p></div><div className="hq-heading-right"><span className="hq-demo-pill"><Eye size={14}/> AMBIENTE DE DEMONSTRAÇÃO</span></div></div>
  {loading?<div className="hq-message">Preparando seu ambiente...</div>:error?<div className="hq-message hq-error">{error}</div>:companies.length===0?<div className="hq-message">Cadastre uma empresa em <Link href="/painel">Meu painel</Link> para abrir a Central de IAs.</div>:<>
  <div className="hq-contextbar"><div className="hq-company"><span className="hq-label">EMPRESA ATIVA</span><div className="hq-select"><Store size={16}/><select value={companyId} onChange={e=>switchCompany(e.target.value)} aria-label="Selecionar empresa">{companies.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select><ChevronDown size={15}/></div></div><div className="hq-context-right"><span><span className="hq-status-dot"/> 6 agentes visuais</span><span className="hq-context-muted">Sem motor de IA conectado</span></div></div>
  <div className="hq-stats">
   <div className="hq-stat"><div><span>AGENTES NO ESCRITÓRIO</span><BrainCircuit size={17}/></div><strong>06 <small>/ 06</small></strong><p>Personagens interativos</p></div>
   <div className="hq-stat"><div><span>TAREFAS PREPARADAS</span><Workflow size={17}/></div><strong>{openCount.toString().padStart(2,"0")}</strong><p>{doneCount} concluída(s) manualmente</p></div>
   <div className="hq-stat"><div><span>EXECUÇÕES COM IA</span><Activity size={17}/></div><strong>—</strong><p>Motor ainda não conectado</p></div>
   <div className="hq-stat hq-stat-glow"><div><span>GASTO COM IA</span><Coins size={17}/></div><strong>—</strong><p>Sem medição de uso habilitada</p></div>
  </div>
  <nav className="hq-tabs" aria-label="Áreas da Central de IAs">{tabs.filter(t=>t.id!=="admin"||ac.isAdmin).map(t=>{const Icon=t.icon;return <button key={t.id} className={tab===t.id?"hq-tab is-active":"hq-tab"} onClick={()=>setTab(t.id)} type="button"><Icon size={17}/>{t.label}{t.id==="tasks"&&openCount>0&&<b>{openCount}</b>}</button>})}</nav>
  <div className="hq-main-grid"><section className="hq-main-panel">
   {tab==="office"&&<><div className="hq-panel-top"><div><span className="hq-panel-eyebrow"><span className="hq-status-dot"/> ESTÚDIO 3D · NOVA EXPERIÊNCIA</span><h2>Sala de comando MM</h2><p>Novo escritório tridimensional com seis personagens. Gire a câmera, clique em um agente e explore as estações da equipe.</p></div><div className="hq-panel-buttons"><button type="button" onClick={()=>setTour(v=>!v)} className={tour?"is-highlighted":""}><Eye size={15}/>{tour?"Ocultar guia":"Explorar"}</button><button type="button" onClick={()=>setMotion(v=>!v)} aria-pressed={motion}>{motion?<Pause size={15}/>:<Play size={15}/>} {motion?"Pausar":"Animar"}</button></div></div>{tour&&<div className="hq-guide"><Sparkles size={16}/> Clique em um personagem ou em seu nome. A sala e os movimentos são uma simulação visual: nenhuma IA está executando trabalho em segundo plano.</div>}
    <div className={`hq-viewport ${motion?"hq-moving":"hq-still"}`}><TechRoom3D agents={agents} selected={selected} onSelect={(id)=>switchAgent(id as AgentId)} moving={motion}/><div className="hq-scene-bottom"><span><span className="hq-status-dot"/> SIMULAÇÃO VISUAL · MOVIMENTO {motion?"ATIVO":"PAUSADO"}</span><span>ARRASTE PARA EXPLORAR · GIRO CONTROLADO</span></div></div>
   </>}
   {tab==="insights"&&<OperationalInsights companyId={companyId} createMission={createMission}/>}
   {tab==="price"&&<PriceLab companyId={companyId}/>}
   {tab==="analise"&&<><div className="hq-panel-top"><div><span className="hq-panel-eyebrow"><span className="hq-status-dot"/> ANÁLISE COMPLETA PRESERVADA</span><h2>Faturamento, impostos e rentabilidade</h2><p>Duas visões: Faturamento e impostos / Rentabilidade por produto. Informações reais apenas quando cadastradas e consultadas.</p></div></div>{ac.liberado?<AnaliseCompleta companyId={companyId} companyName={companies.find(c=>c.id===companyId)?.nome||"Empresa"}/>:<Bloqueado status={ac.status}/>}</>}
   {tab==="lojas"&&<><div className="hq-panel-top"><div><span className="hq-panel-eyebrow"><span className="hq-status-dot"/> DADOS DO BANCO</span><h2>Desempenho por loja</h2><p>Pedidos, faturamento bruto, ticket e cancelamentos por canal.</p></div></div>{ac.liberado?<Analytics companyId={companyId} view="lojas"/>:<Bloqueado status={ac.status}/>}</>}
   {tab==="fiscal"&&<><div className="hq-panel-top"><div><span className="hq-panel-eyebrow"><span className="hq-status-dot"/> IMPOSTOS, TAXAS E PERDAS</span><h2>Quanto sobra de cada venda</h2><p>Estimativa de impostos, comissões e perdas por cancelamento.</p></div></div>{ac.liberado?<Fiscal companyId={companyId}/>:<Bloqueado status={ac.status}/>}</>}
   {tab==="admin"&&ac.isAdmin&&<><div className="hq-panel-top"><div><span className="hq-panel-eyebrow"><span className="hq-status-dot"/> SOMENTE ADMINISTRADOR</span><h2>Autorizar acessos</h2><p>Quem cria uma conta fica pendente até você aprovar.</p></div></div><AdminAcessos/></>}
   {tab==="tasks"&&<><div className="hq-panel-top"><div><span className="hq-panel-eyebrow">WORKFLOW / MISSÕES</span><h2>Quadro de tarefas</h2><p>Planeje missões e organize as prioridades da sua equipe digital.</p></div><button type="button" className="hq-primary-small" onClick={()=>setComposeOpen(true)}><Plus size={16}/> Nova tarefa</button></div><div className="hq-tasks-columns"><div><div className="hq-column-head">PENDENTES <b>{openCount}</b></div>{tasks.filter(t=>!t.done).length===0?<div className="hq-empty">Nenhuma tarefa pendente.<small>Crie uma missão para começar.</small></div>:tasks.filter(t=>!t.done).map(t=><TaskCard key={t.id} task={t} toggle={()=>toggleTask(t.id)} remove={()=>deleteTask(t.id)}/>)}</div><div><div className="hq-column-head">CONCLUÍDAS MANUALMENTE <b>{doneCount}</b></div>{tasks.filter(t=>t.done).length===0?<div className="hq-empty">Nada concluído ainda.</div>:tasks.filter(t=>t.done).map(t=><TaskCard key={t.id} task={t} toggle={()=>toggleTask(t.id)} remove={()=>deleteTask(t.id)}/>)}</div></div><p className="hq-note"><LockKeyhole size={14}/> As tarefas são guardadas apenas neste navegador e nesta conta/empresa, sem sincronização na nuvem. Marcar como concluída não significa que uma IA executou a tarefa.</p></>}
   {tab==="costs"&&<><div className="hq-panel-top"><div><span className="hq-panel-eyebrow">FINOPS / INTELIGÊNCIA ARTIFICIAL</span><h2>Custos & consumo</h2><p>Transparência total sobre o que os agentes vão consumir.</p></div><span className="hq-pending">AINDA NÃO CONECTADO</span></div><div className="hq-cost-intro"><div><Coins size={22}/><span>Gasto total com IA neste período</span><strong>Não disponível</strong><p>Sem provedor de IA e medição de consumo integrados. Não mostramos valores estimados como gastos reais.</p></div><div className="hq-cost-side"><span>CHAMADAS À API</span><b>Não disponível</b><span>TOKENS CONSUMIDOS</span><b>Não disponível</b><span>ORÇAMENTO MENSAL</span><b>Não configurado</b></div></div><h3 className="hq-subheading">Consumo por agente</h3><div className="hq-cost-list">{agents.map(a=><div key={a.id} style={cssAgent(a)}><span className="hq-cost-icon">{a.symbol}</span><div><strong>{a.name}</strong><small>{a.role}</small></div><span>Sem medições</span><b>—</b></div>)}</div><div className="hq-future"><Bell size={17}/><div><strong>Como ficará quando conectarmos a IA</strong><p>Gastos em R$, quantidade de requisições, tokens, custo por agente, limites de orçamento e alertas. Tudo calculado a partir de registros reais de uso.</p></div></div></>}
   {tab==="activity"&&<><div className="hq-panel-top"><div><span className="hq-panel-eyebrow">LIVE FEED / ESTA SESSÃO</span><h2>Registro de atividade</h2><p>Ações feitas nesta interface, separadas das futuras atividades reais dos agentes.</p></div><span className="hq-pending">REGISTRO LOCAL</span></div>{events.length===0?<div className="hq-activity-empty"><Clock3 size={34}/><h3>Nenhuma atividade nesta sessão</h3><p>Selecione um agente ou crie uma tarefa para começar.</p></div>:<div className="hq-feed">{events.map(ev=><div key={ev.id}><span className={ev.kind==="task"?"hq-feed-bullet hq-feed-task":"hq-feed-bullet"}/><div><b>{ev.message}</b><small>{ev.kind==="task"?"Tarefa / ação manual":"Interação com a interface"}</small></div><time>{ev.time}</time></div>)}</div>}<p className="hq-note"><LockKeyhole size={14}/> Atividades exibidas apenas durante a sessão atual; não representam execuções automáticas ou logs persistentes.</p></>}
   </section>
   <aside className="hq-aside"><div className="hq-roster-head"><div><span>SEU TIME DIGITAL</span><h3>Conheça os agentes</h3></div><span className="hq-roster-count">06</span></div><div className="hq-roster">{agents.map(a=><button key={a.id} type="button" className={selected===a.id?"hq-person is-selected":"hq-person"} onClick={()=>{switchAgent(a.id);setTab("office")}} style={cssAgent(a)}><span className="hq-person-avatar">{a.symbol}</span><span><strong>{a.name}</strong><small>{a.role}</small></span><ArrowRight size={16}/></button>)}</div><div className="hq-aside-detail" style={cssAgent(agent)}><span className="hq-agent-caption">PERFIL SELECIONADO</span><div className="hq-profile-title"><span>{agent.symbol}</span><div><h3>{agent.name}</h3><small>{agent.role}</small></div></div><p>{agent.description}</p><div className="hq-skilltags">{agent.skills.map(s=><span key={s}>{s}</span>)}</div><div className="hq-offline"><span className="hq-offline-dot"/> Modo visual — IA não conectada</div></div><button type="button" className="hq-create" onClick={()=>setComposeOpen(true)}><Plus size={18}/> Preparar missão para {agent.name}</button><p className="hq-aside-footnote"><LockKeyhole size={13}/> Nenhuma execução ou cobrança é iniciada por esta ação.</p></aside>
  </div><div className="hq-bottom-banner"><Sparkles size={19}/><div><strong>Próxima evolução: agentes conectados aos dados reais</strong><span>O ambiente é interativo; o motor de IA, o histórico persistente e o faturamento de uso serão adicionados em etapas separadas.</span></div><Link href="/painel">Voltar ao painel <ArrowRight size={15}/></Link></div>
  {composeOpen&&<div className="hq-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setComposeOpen(false)}}><div className="hq-modal" role="dialog" aria-modal="true" aria-label="Preparar missão"><div className="hq-modal-head"><span><Sparkles size={19}/> Preparar nova missão</span><button type="button" onClick={()=>setComposeOpen(false)} aria-label="Fechar"><X size={20}/></button></div><label htmlFor="hq-agent-select">Agente responsável</label><select id="hq-agent-select" value={selected} onChange={e=>setSelected(e.target.value as AgentId)}>{agents.map(a=><option key={a.id} value={a.id}>{a.name} — {a.role}</option>)}</select><label htmlFor="hq-mission">Descrição da tarefa</label><textarea id="hq-mission" value={draft} onChange={e=>setDraft(e.target.value)} rows={4} maxLength={180} placeholder="Ex.: Analisar pedidos cancelados dos últimos 30 dias..."/><p>Esta missão será adicionada ao quadro, mas não será executada por IA nesta versão.</p><button type="button" onClick={addTask} disabled={!draft.trim()} className="hq-modal-submit"><Plus size={16}/> Adicionar ao quadro</button></div></div>}
  </>}
  </div>
 </main>;
}
function TaskCard({task,toggle,remove}:{task:Task;toggle:()=>void;remove:()=>void}){const a=agents.find(x=>x.id===task.agent)!;return <article className="hq-taskcard" style={cssAgent(a)}><div className="hq-taskcard-top"><span>{a.symbol} {a.name}</span><small>{task.created}</small></div><p>{task.title}</p><div className="hq-task-actions"><button type="button" onClick={toggle}><Check size={14}/>{task.done?"Reabrir":"Concluir manualmente"}</button><button type="button" onClick={remove} aria-label="Remover tarefa"><Trash2 size={15}/></button></div></article>}
