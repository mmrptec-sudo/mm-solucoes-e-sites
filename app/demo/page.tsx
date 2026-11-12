"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, BarChart3, Bell, BrainCircuit, CalendarDays, Check, ChevronDown,
  Clock, Coins,  Moon, Plus, Search, ShieldCheck, ShoppingBag, Sparkles,
  Sun, Users, Wallet, X, Package, MessageSquare, TrendingUp, CheckCircle2, RotateCcw,
  UserRound, Camera, LayoutDashboard
} from "lucide-react";
import TechRoom3D from "../../components/TechRoom3D";
import { MEMBERS } from "../../lib/room3d-engine";
import { priceAnalysis, type PricingValues } from "../../lib/pricing";
import "./studio-demo.css";

type View = "inicio" | "sala" | "reuniao" | "analise" | "price" | "financeiro" | "estoque" | "clientes" | "tarefas";
type AnalysisTab = "faturamento" | "produtos";
type BusinessProfile = "ecommerce" | "autonomo" | "hibrido";
type Mission = { id: string; agent: string; title: string; done: boolean };
type DemoOrder = { id:string; product:string; qty:number; gross:number; cost:number; fee:number; tax:number; status:"concluido"|"cancelado";channel:string;date:string };
const orders: DemoOrder[] = [
  {id:"PED-1001",product:"Creatina 300g",qty:2,gross:159.80,cost:72,fee:24,tax:11.19,status:"concluido",channel:"Mercado Livre",date:"2026-11-03"},
  {id:"PED-1002",product:"Whey 900g",qty:1,gross:139.90,cost:82,fee:18,tax:9.79,status:"concluido",channel:"Shopee",date:"2026-11-03"},
  {id:"PED-1003",product:"Serviço de consultoria",qty:1,gross:300,cost:60,fee:5,tax:18,status:"concluido",channel:"Direto",date:"2026-11-02"},
  {id:"PED-1004",product:"Creatina 300g",qty:1,gross:79.90,cost:36,fee:12,tax:5.59,status:"cancelado",channel:"Mercado Livre",date:"2026-11-01"},
  {id:"PED-1005",product:"Camiseta esportiva",qty:3,gross:209.70,cost:105,fee:25,tax:14.68,status:"concluido",channel:"TikTok Shop",date:"2026-11-01"},
];
const products = [
  { sku:"CR300",name:"Creatina 300g",current:14,min:20,cost:36,price:79.90 },
  { sku:"WH900",name:"Whey 900g",current:34,min:12,cost:82,price:139.90 },
  { sku:"CAM01",name:"Camiseta esportiva",current:8,min:15,cost:35,price:69.90 },
];
const clients = [
  { name:"Mariana Costa",type:"Serviços",status:"Proposta enviada",amount:350 },
  { name:"Pedro Lima",type:"E-commerce",status:"Cliente recorrente",amount:220 },
  { name:"Loja Horizonte",type:"E-commerce",status:"Aguardando pagamento",amount:790 },
];
const receivables = [
  {name:"Consultoria - cliente",amount:300,date:"06/11/2026",paid:false},
  {name:"Repasse marketplace",amount:247.50,date:"07/11/2026",paid:false},
  {name:"Serviço realizado",amount:200,date:"02/11/2026",paid:true},
];
const agentColors:Record<string,string> = {atlas:"#67AAFF",max:"#FFAD62",luna:"#65E2BD",nexa:"#BF9AFF",vega:"#FF7CA0",price:"#FFD06F"};
const agentSymbols:Record<string,string> = {atlas:"✦",max:"↗",luna:"◈",nexa:"⬡",vega:"✺",price:"◉"};
const menu: { id:View;label:string;icon: typeof LayoutDashboard }[] = [
  {id:"inicio",label:"Meu dia",icon:LayoutDashboard}, {id:"sala",label:"Sala da IA 3D",icon:BrainCircuit},
  {id:"reuniao",label:"Mesa de estratégia",icon:Users},{id:"analise",label:"Análise Completa",icon:BarChart3},
  {id:"price",label:"Price — Precificação",icon:Coins}, {id:"financeiro",label:"Financeiro",icon:Wallet},
  {id:"estoque",label:"Produtos e estoque",icon:Package}, {id:"clientes",label:"Clientes",icon:Users},
  {id:"tarefas",label:"Missões",icon:CheckCircle2},
];
const currency=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const percent=(n:number)=>`${n.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})}%`;
const idMission=()=>`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const initialPricing:PricingValues={preco_atual:79.9,custo:36,frete:6,tarifa_fixa:1.5,taxa_percentual:13,imposto_percentual:7,ads_percentual:2,margem_minima:10,concorrente_preco:75.9};

export default function DemonstracaoTypeScript() {
  const [view,setView]=useState<View>("inicio");
  const [profile,setProfile]=useState<BusinessProfile>("hibrido");
  const [dark,setDark]=useState(true);
  const [name,setName]=useState("Usuário demo");
  const [photo,setPhoto]=useState("");
  const [profileOpen,setProfileOpen]=useState(false);
  const [clock,setClock]=useState<Date|null>(null);
  const [selected,setSelected]=useState("atlas");
  const [motion,setMotion]=useState(true);
  const [analysisTab,setAnalysisTab]=useState<AnalysisTab>("faturamento");
  const [pricing,setPricing]=useState<PricingValues>(initialPricing);
  const [missions,setMissions]=useState<Mission[]>([]);
  const [missionDraft,setMissionDraft]=useState("");
  const [chatDraft,setChatDraft]=useState("");
  const [chat,setChat]=useState<{agent:string;question:string;reply:string}[]>([]);
  const [search,setSearch]=useState("");
  const [notice,setNotice]=useState("");

  useEffect(()=>{
    const timer=window.setInterval(()=>setClock(new Date()),1000);
    setClock(new Date());
    try {
      const saved=localStorage.getItem("mm5-demo-state");
      if(saved){
        const raw:unknown=JSON.parse(saved);
        if(raw&&typeof raw==="object"){
          const d=raw as Record<string,unknown>;
          if(typeof d.name==="string")setName(d.name.slice(0,80));
          if(typeof d.dark==="boolean")setDark(d.dark);
          if(d.profile==="ecommerce"||d.profile==="autonomo"||d.profile==="hibrido")setProfile(d.profile);
          if(Array.isArray(d.missions))setMissions(d.missions.filter((m:unknown):m is Mission=>{
            if(!m||typeof m!=="object")return false;
            const item=m as Record<string,unknown>;
            return typeof item.id==="string"&&typeof item.title==="string"&&typeof item.agent==="string"&&typeof item.done==="boolean";
          }).slice(0,100));
        }
      }
    } catch { /* Demonstração inicia com estado padrão se os dados locais estiverem inválidos. */ }
    return ()=>window.clearInterval(timer);
  },[]);
  useEffect(()=>{try{localStorage.setItem("mm5-demo-state",JSON.stringify({name,dark,profile,missions}));}catch{/* Modo privado: os dados permanecem somente nesta sessão. */}},[name,dark,profile,missions]);

  const active=orders.filter(o=>o.status==="concluido"&& (profile==="hibrido" || (profile==="ecommerce" ? o.channel!=="Direto" : o.channel==="Direto")));
  const revenue=active.reduce((sum,o)=>sum+o.gross,0);
  const variable=active.reduce((sum,o)=>sum+o.cost+o.fee+o.tax,0);
  const contribution=revenue-variable;
  const margin=revenue>0?contribution/revenue*100:0;
  const salesCount=active.length;
  const selectedAgent=MEMBERS.find(a=>a.id===selected)??MEMBERS[0];
  const calculation=useMemo(()=>priceAnalysis(pricing),[pricing]);
  const lowStock=products.filter(p=>p.current<p.min);
  const results=menu.filter(entry=>entry.label.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR").trim()));

  function createMission(agent:string,title:string){
    const clean=title.trim().slice(0,180);
    if(!clean)return;
    setMissions(prev=>[{id:idMission(),agent,title:clean,done:false},...prev].slice(0,100));
    setMissionDraft("");setNotice(`Missão preparada para ${MEMBERS.find(m=>m.id===agent)?.name ?? "o especialista"}. Nenhuma ação automática foi executada.`);
    setView("tarefas");
  }
  function respond(){
    const question=chatDraft.trim().slice(0,300);
    if(!question)return;
    let reply="A Sala da IA está em modo de diagnóstico guiado. Conecte um provedor autorizado para respostas generativas com seus dados reais.";
    if(selected==="luna")reply=`Nos pedidos de exemplo concluídos, o faturamento do perfil selecionado é ${currency(revenue)} e a contribuição após custo direto, taxas e tributos informados é ${currency(contribution)}. Isto ainda não é lucro líquido: faltam despesas fixas, devoluções e conciliação.`;
    if(selected==="max")reply=`Identifiquei ${salesCount} pedidos concluídos no perfil atual. Os pedidos cancelados não foram somados ao faturamento. Acompanhe as vendas por canal na aba Análise Completa.`;
    if(selected==="nexa")reply=`Há ${lowStock.length} produtos abaixo do estoque mínimo: ${lowStock.map(p=>p.name).join(" e ")}. Recomendo conferir o estoque real antes de comprar.`;
    if(selected==="price")reply=calculation.valid?`O preço mínimo simulado é ${currency(calculation.minimum??0)}. ${calculation.status} Não é uma cotação automática de concorrentes.`:"Revise custo, frete, comissão e margem no simulador Price.";
    if(selected==="atlas")reply=`Sugiro priorizar: ${lowStock.length} alertas de estoque, ${receivables.filter(x=>!x.paid).length} recebimentos em aberto e revisão dos preços na Sala Price. Posso preparar uma missão para cada assunto.`;
    if(selected==="vega")reply="O demonstrativo não possui relatórios de anúncios reais. Ao integrar os canais, podemos comparar investimento, vendas atribuídas e margem antes de sugerir escala.";
    setChat(prev=>[...prev,{agent:selected,question,reply}].slice(-10));setChatDraft("");
  }
  function updatePrice(key:keyof PricingValues,value:string){
    const parsed=value.trim()===""?0:Number(value);
    setPricing(prev=>({...prev,[key]:Number.isFinite(parsed)?parsed:0}));
  }
  function photoChange(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>500_000){setNotice("Escolha JPG, PNG ou WebP com até 500 KB para a demonstração.");return;}
    const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==="string")setPhoto(reader.result)};reader.readAsDataURL(file);
  }
  function go(viewId:View){setView(viewId);setSearch("");setNotice("");}
  const tabName=menu.find(m=>m.id===view)?.label ?? "Painel";
  const now=clock?.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})??"Carregando data";
  const time=clock?.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})??"--:--";

  return <main className={`mm5-demo ${dark?"mm5-night":"mm5-day"}`}>
    <aside className="mm5-side"><Link href="/" className="mm5-brand"><span>MM</span><strong>Intelligence <small>5.0 · TypeScript</small></strong></Link>
      <div className="mm5-workspace"><span>AMBIENTE DE DEMONSTRAÇÃO</span><strong>Minha empresa exemplo</strong><small>Dados fictícios · sem conexão externa</small></div>
      <nav aria-label="Navegação principal">{menu.map(({id,label,icon:Icon})=><button key={id} type="button" onClick={()=>go(id)} className={view===id?"mm5-menu-active":""} aria-current={view===id?"page":undefined}><Icon size={18}/>{label}{id==="tarefas"&&missions.some(m=>!m.done)&&<b>{missions.filter(m=>!m.done).length}</b>}</button>)}</nav>
      <div className="mm5-sidebar-bottom"><ShieldCheck size={16}/> Nada é enviado para marketplaces nesta demonstração.</div>
    </aside>
    <div className="mm5-main">
      <header className="mm5-header"><div className="mm5-header-title"><span className="mm5-eyebrow">MM / ESTÚDIO DE GESTÃO</span><h1>{tabName}</h1></div>
        <div className="mm5-header-controls"><div className="mm5-time"><Clock size={17}/><span><b>{time}</b><small>{now}</small></span></div><button type="button" onClick={()=>setDark(v=>!v)} aria-label={dark?"Ativar modo claro":"Ativar modo noturno"} className="mm5-iconbtn">{dark?<Sun size={18}/>:<Moon size={18}/>}</button><button type="button" onClick={()=>setProfileOpen(true)} className="mm5-profile-btn"><span className="mm5-profile-avatar">{photo?<img src={photo} alt="Foto de perfil"/>:<UserRound size={19}/>}</span><span>{name}<small>Meu perfil</small></span><ChevronDown size={14}/></button></div>
      </header>
      <div className="mm5-bar"><span><span className="mm5-online"/> DEMONSTRAÇÃO LOCAL</span><div className="mm5-profile-selector"><label htmlFor="mm5-segment">Perfil do negócio</label><select id="mm5-segment" value={profile} onChange={e=>setProfile(e.target.value as BusinessProfile)}><option value="hibrido">Híbrido</option><option value="ecommerce">E-commerce</option><option value="autonomo">Autônomo / Serviços</option></select></div><div className="mm5-search"><Search size={16}/><input aria-label="Buscar módulo" placeholder="Buscar módulo..." value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<div className="mm5-searchresults">{results.map(r=><button key={r.id} onClick={()=>go(r.id)}>{r.label}</button>)}{results.length===0&&<small>Nenhum módulo encontrado</small>}</div>}</div></div>
      {notice&&<div role="status" className="mm5-notice">{notice}<button type="button" aria-label="Dispensar aviso" onClick={()=>setNotice("")}><X size={15}/></button></div>}

      {view==="inicio"&&<section className="mm5-content"><div className="mm5-intro"><div><span className="mm5-eyebrow">SUA VISÃO OPERACIONAL</span><h2>Um bom dia começa com prioridades claras.</h2><p>Indicadores demonstrativos calculados apenas a partir de pedidos concluídos. O perfil de negócio altera os resultados exibidos.</p></div><button type="button" className="mm5-accent" onClick={()=>go("sala")}><Sparkles size={18}/> Explorar Sala da IA <ArrowRight size={16}/></button></div>
        <div className="mm5-metrics"><article><span>Faturamento bruto</span><strong>{currency(revenue)}</strong><small>{salesCount} pedidos concluídos</small></article><article><span>Contribuição estimada</span><strong>{currency(contribution)}</strong><small>Antes de despesas fixas</small></article><article><span>Margem de contribuição</span><strong>{percent(margin)}</strong><small>Não é lucro líquido</small></article><article><span>Pendências</span><strong>{lowStock.length+receivables.filter(x=>!x.paid).length}</strong><small>Estoque e recebimentos</small></article></div>
        <div className="mm5-twocol"><article className="mm5-card"><div className="mm5-sectionhead"><div><span className="mm5-eyebrow">PRÓXIMOS PASSOS</span><h3>O que merece atenção</h3></div><Bell size={18}/></div><div className="mm5-actionlist"><button onClick={()=>go("estoque")}><Package size={18}/> {lowStock.length} produtos com estoque abaixo do mínimo <ArrowRight size={15}/></button><button onClick={()=>go("financeiro")}><Wallet size={18}/> {receivables.filter(x=>!x.paid).length} recebimentos em aberto <ArrowRight size={15}/></button><button onClick={()=>go("price")}><Coins size={18}/> Conferir margem do produto no Price <ArrowRight size={15}/></button></div></article>
        <article className="mm5-card mm5-ai-promo"><span className="mm5-eyebrow">SALA DA IA</span><h3>Seis especialistas. Uma operação.</h3><p>Atlas, Max, Luna, Nexa, Vega e Price compartilham o mesmo contexto demonstrativo. Explore a cena tridimensional ou reúna a equipe.</p><div className="mm5-agentrow">{MEMBERS.map(a=><button key={a.id} type="button" title={a.role} onClick={()=>{setSelected(a.id);go("sala")}} style={{"--agent-color":a.color} as CSSProperties}>{agentSymbols[a.id]}</button>)}</div><button className="mm5-linklike" onClick={()=>go("reuniao")}>Abrir mesa de estratégia <ArrowRight size={16}/></button></article></div>
      </section>}

      {view==="sala"&&<section className="mm5-content"><div className="mm5-intro"><div><span className="mm5-eyebrow">SALA VIRTUAL · WEBGL OU CANVAS</span><h2>Conheça sua equipe em 3D</h2><p>Gire, aproxime e selecione cada especialista. São personagens 3D procedurais; não executam trabalho em segundo plano.</p></div><button type="button" className="mm5-ghost" onClick={()=>setMotion(v=>!v)}>{motion?<Check size={16}/>:<Plus size={16}/>} {motion?"Animações ativas":"Animar personagens"}</button></div><div className="mm5-room-layout"><div className="mm5-room-stage"><TechRoom3D agents={MEMBERS.map(a=>({...a,symbol:agentSymbols[a.id]}))} selected={selected} onSelect={setSelected} moving={motion}/></div><aside className="mm5-card mm5-agent-panel"><span className="mm5-eyebrow">EQUIPE DIGITAL</span><h3>Selecione o especialista</h3><div className="mm5-roster">{MEMBERS.map(a=><button key={a.id} type="button" className={selected===a.id?"active":""} style={{"--agent-color":a.color} as CSSProperties} onClick={()=>setSelected(a.id)}><span>{agentSymbols[a.id]}</span><span><b>{a.name}</b><small>{a.role}</small></span></button>)}</div><div className="mm5-agentstory" style={{"--agent-color":selectedAgent.color} as CSSProperties}><strong>{selectedAgent.name}</strong><p>{selectedAgent.story}</p><button type="button" className="mm5-accent" onClick={()=>createMission(selected,selectedAgent.tasks[0])}><Plus size={15}/> Criar missão sugerida</button></div></aside></div>
        <div className="mm5-card mm5-conversation"><div className="mm5-sectionhead"><div><span className="mm5-eyebrow">CONVERSA DE EXEMPLO</span><h3>Fale com {selectedAgent.name}</h3></div><span className="mm5-chip">Respostas por regras, sem API de IA</span></div><div className="mm5-chatlog">{chat.filter(c=>c.agent===selected).slice(-3).map((c,i)=><div key={i}><p className="mm5-question">Você: {c.question}</p><p className="mm5-answer">{selectedAgent.name}: {c.reply}</p></div>)}{!chat.some(c=>c.agent===selected)&&<p>Experimente: “O que eu devo priorizar hoje?” ou “Qual a margem dos meus pedidos?”</p>}</div><form className="mm5-chatinput" onSubmit={e=>{e.preventDefault();respond()}}><input aria-label={`Perguntar para ${selectedAgent.name}`} value={chatDraft} maxLength={300} placeholder={`Pergunte algo para ${selectedAgent.name}...`} onChange={e=>setChatDraft(e.target.value)}/><button type="submit" disabled={!chatDraft.trim()}><MessageSquare size={17}/> Enviar</button></form></div>
      </section>}

      {view==="reuniao"&&<section className="mm5-content"><div className="mm5-intro"><div><span className="mm5-eyebrow">SALA DE ESTRATÉGIA</span><h2>Seis pontos de vista. Um plano.</h2><p>Agenda conjunta construída com regras sobre dados fictícios. As tarefas são aprovadas manualmente.</p></div><button type="button" className="mm5-accent" onClick={()=>createMission("atlas","Revisar prioridades de vendas, estoque, precificação e recebimentos.")}><Plus size={16}/> Criar missão principal</button></div><div className="mm5-meeting-grid">{MEMBERS.map(a=><article className="mm5-card" key={a.id} style={{"--agent-color":a.color} as CSSProperties}><span className="mm5-meeticon">{agentSymbols[a.id]}</span><h3>{a.name} <small>{a.role}</small></h3><p>{a.tasks[0]}</p><button onClick={()=>createMission(a.id,a.tasks[0])}>Adicionar ao quadro <Plus size={15}/></button></article>)}</div></section>}

      {view==="analise"&&<section className="mm5-content"><div className="mm5-intro"><div><span className="mm5-eyebrow">ANÁLISE COMPLETA · PRESERVADA</span><h2>Entenda os resultados com transparência.</h2><p>Estas tabelas usam dados de exemplo. A Análise Completa conectada do sistema original permanece no painel autenticado.</p></div><button className="mm5-ghost" onClick={()=>setAnalysisTab(v=>v==="faturamento"?"produtos":"faturamento")}><BarChart3 size={16}/> Alternar relatório</button></div><div className="mm5-subtabs"><button type="button" className={analysisTab==="faturamento"?"active":""} onClick={()=>setAnalysisTab("faturamento")}>Faturamento e impostos</button><button type="button" className={analysisTab==="produtos"?"active":""} onClick={()=>setAnalysisTab("produtos")}>Rentabilidade por produto</button></div>
        {analysisTab==="faturamento"?<><div className="mm5-metrics mm5-metrics-three"><article><span>Faturamento bruto</span><strong>{currency(revenue)}</strong></article><article><span>Custos, taxas e tributos informados</span><strong>{currency(variable)}</strong></article><article><span>Contribuição comercial estimada</span><strong>{currency(contribution)}</strong></article></div><div className="mm5-card"><h3>Composição dos pedidos</h3><div className="mm5-tablewrap"><table><thead><tr><th>Pedido</th><th>Canal</th><th>Situação</th><th>Bruto</th><th>Custos + taxas + tributos</th><th>Contribuição</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td>{o.id}</td><td>{o.channel}</td><td>{o.status==="cancelado"?"CAN — fora dos totais":"Concluído"}</td><td>{currency(o.gross)}</td><td>{currency(o.cost+o.fee+o.tax)}</td><td>{o.status==="cancelado"?"Não realizada":currency(o.gross-o.cost-o.fee-o.tax)}</td></tr>)}</tbody></table></div><p className="mm5-hint">Os valores dos pedidos cancelados não entram no faturamento. Esta simulação não inclui impostos efetivos, despesas fixas ou conciliação de repasses.</p></div></>:<div className="mm5-card"><h3>Contribuição por produto ou serviço</h3><div className="mm5-tablewrap"><table><thead><tr><th>Produto / serviço</th><th>Unidades</th><th>Faturamento</th><th>Contribuição</th><th>Margem estimada</th></tr></thead><tbody>{active.map(o=><tr key={o.id}><td>{o.product}</td><td>{o.qty}</td><td>{currency(o.gross)}</td><td>{currency(o.gross-o.cost-o.fee-o.tax)}</td><td>{percent((o.gross-o.cost-o.fee-o.tax)/o.gross*100)}</td></tr>)}</tbody></table></div><p className="mm5-hint">Os resultados são por linha de pedido e não incluem rateios financeiros; não representam lucro líquido contábil.</p></div>}
      </section>}

      {view==="price"&&<section className="mm5-content"><div className="mm5-intro"><div><span className="mm5-eyebrow">PRICE · ESPECIALISTA EM PRECIFICAÇÃO</span><h2>Proteger margem antes de competir.</h2><p>Simule preço mínimo, custo e referência de concorrente informada manualmente. Nada é publicado nos marketplaces.</p></div></div><div className="mm5-twocol"><div className="mm5-card"><h3>Parâmetros de precificação</h3><div className="mm5-priceform">{([ ["preco_atual","Preço atual (R$)"],["custo","Custo do produto (R$)"],["frete","Frete (R$)"],["tarifa_fixa","Tarifa fixa (R$)"],["taxa_percentual","Comissões (%)"],["imposto_percentual","Tributos estimados (%)"],["ads_percentual","Publicidade (%)"],["margem_minima","Margem mínima desejada (%)"],["concorrente_preco","Concorrente informado (R$)"]] as [keyof PricingValues,string][]).map(([key,label])=><label key={key}>{label}<input type="number" inputMode="decimal" step="0.01" min="0" value={pricing[key]??""} onChange={e=>updatePrice(key,e.target.value)} /></label>)}</div><button type="button" className="mm5-ghost" onClick={()=>setPricing(initialPricing)}><RotateCcw size={15}/> Restaurar exemplo</button></div><div className="mm5-card mm5-price-result"><span className="mm5-eyebrow">RESULTADO DA SIMULAÇÃO</span><h3>{calculation.valid?"Sugestão orientativa":"Revise os parâmetros"}</h3><div className="mm5-pricemetrics"><div><span>Preço mínimo</span><strong>{calculation.minimum===null?"—":currency(calculation.minimum)}</strong></div><div><span>Preço sugerido</span><strong>{calculation.suggested===null?"—":currency(calculation.suggested)}</strong></div><div><span>Margem do preço atual</span><strong>{calculation.margin===null?"—":percent(calculation.margin)}</strong></div></div><p>{calculation.status}</p><p className="mm5-hint">O concorrente não foi pesquisado automaticamente. É necessário comparar frete, quantidade, entrega e características equivalentes.</p><button className="mm5-accent" onClick={()=>createMission("price","Revisar preço simulado da Creatina 300g e validar concorrentes equivalentes.")}><Plus size={16}/> Criar missão Price</button></div></div></section>}

      {view==="financeiro"&&<section className="mm5-content"><div className="mm5-intro"><div><span className="mm5-eyebrow">FINANCEIRO · CAIXA ≠ LUCRO</span><h2>Recebimentos e despesas separados.</h2><p>Controle demonstrativo de contas a receber. Não confundir pedidos faturados com recursos já recebidos.</p></div></div><div className="mm5-metrics mm5-metrics-three"><article><span>Recebido no exemplo</span><strong>{currency(receivables.filter(r=>r.paid).reduce((s,r)=>s+r.amount,0))}</strong></article><article><span>A receber</span><strong>{currency(receivables.filter(r=>!r.paid).reduce((s,r)=>s+r.amount,0))}</strong></article><article><span>Contribuição de pedidos</span><strong>{currency(contribution)}</strong><small>Não equivale ao saldo em caixa</small></article></div><div className="mm5-card"><h3>Contas a receber</h3><div className="mm5-tablewrap"><table><thead><tr><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Situação</th></tr></thead><tbody>{receivables.map(r=><tr key={r.name}><td>{r.name}</td><td>{r.date}</td><td>{currency(r.amount)}</td><td>{r.paid?"Recebido":"Pendente"}</td></tr>)}</tbody></table></div></div></section>}

      {view==="estoque"&&<section className="mm5-content"><div className="mm5-intro"><div><span className="mm5-eyebrow">PRODUTOS E ESTOQUE</span><h2>Evite rupturas e compras desnecessárias.</h2><p>Dados de exemplo. Em produção, saldos devem vir de movimentações auditáveis por depósito.</p></div></div><div className="mm5-card"><h3>Estoque por SKU</h3><div className="mm5-tablewrap"><table><thead><tr><th>SKU</th><th>Produto</th><th>Quantidade</th><th>Mínimo</th><th>Preço de venda</th><th>Alerta</th></tr></thead><tbody>{products.map(p=><tr key={p.sku}><td>{p.sku}</td><td>{p.name}</td><td>{p.current}</td><td>{p.min}</td><td>{currency(p.price)}</td><td>{p.current<p.min?"Repor":"Estoque adequado"}</td></tr>)}</tbody></table></div><button className="mm5-accent" onClick={()=>createMission("nexa","Conferir disponibilidade e reposição dos produtos abaixo do estoque mínimo.")}>Criar missão de reposição</button></div></section>}

      {view==="clientes"&&<section className="mm5-content"><div className="mm5-intro"><div><span className="mm5-eyebrow">CLIENTES E CRM</span><h2>Relacionamentos que geram recorrência.</h2><p>Consulte os contatos demonstrativos e prepare tarefas de acompanhamento.</p></div></div><div className="mm5-card"><div className="mm5-tablewrap"><table><thead><tr><th>Cliente</th><th>Perfil</th><th>Situação</th><th>Valor de referência</th></tr></thead><tbody>{clients.map(c=><tr key={c.name}><td>{c.name}</td><td>{c.type}</td><td>{c.status}</td><td>{currency(c.amount)}</td></tr>)}</tbody></table></div><button className="mm5-accent" onClick={()=>createMission("atlas","Preparar acompanhamento das propostas enviadas e pagamentos pendentes.")}>Criar missão de relacionamento</button></div></section>}

      {view==="tarefas"&&<section className="mm5-content"><div className="mm5-intro"><div><span className="mm5-eyebrow">MISSÕES E ACOMPANHAMENTO</span><h2>Transforme diagnósticos em ações.</h2><p>As missões ficam apenas neste navegador. Marcar como concluída não significa que alguma IA realizou o trabalho.</p></div></div><div className="mm5-card"><form className="mm5-missionform" onSubmit={e=>{e.preventDefault();createMission(selected,missionDraft)}}><input maxLength={180} value={missionDraft} onChange={e=>setMissionDraft(e.target.value)} placeholder={`Nova missão para ${selectedAgent.name}`} aria-label="Descrição da missão"/><button type="submit" disabled={!missionDraft.trim()}><Plus size={16}/> Adicionar</button></form>{missions.length===0?<p>Nenhuma missão adicionada. Comece pela Sala da IA ou pelo Price.</p>:<div className="mm5-missionlist">{missions.map(m=><div key={m.id}><label><input type="checkbox" checked={m.done} onChange={()=>setMissions(prev=>prev.map(x=>x.id===m.id?{...x,done:!x.done}:x))}/><span className={m.done?"mm5-done":""}><b>{MEMBERS.find(a=>a.id===m.agent)?.name}: </b>{m.title}</span></label><button onClick={()=>setMissions(prev=>prev.filter(x=>x.id!==m.id))} aria-label="Excluir missão"><X size={16}/></button></div>)}</div>}</div></section>}
      <footer className="mm5-footer"><span><ShieldCheck size={15}/> Protótipo visual e dados fictícios · Nenhuma IA real ou integração externa ativa</span><Link href="/"><ArrowLeft size={15}/> Voltar ao site</Link></footer>
    </div>
    {profileOpen&&<div className="mm5-modaloverlay" onClick={e=>{if(e.target===e.currentTarget)setProfileOpen(false)}}><section role="dialog" aria-modal="true" aria-labelledby="mm5-profile-title" className="mm5-modal"><div className="mm5-sectionhead"><div><span className="mm5-eyebrow">PERSONALIZAÇÃO LOCAL</span><h2 id="mm5-profile-title">Meu perfil</h2></div><button type="button" onClick={()=>setProfileOpen(false)} aria-label="Fechar"><X size={18}/></button></div><label>Nome de exibição<input value={name} maxLength={80} onChange={e=>setName(e.target.value)}/></label><label className="mm5-photo-input"><Camera size={16}/> Alterar foto da demonstração<input type="file" accept="image/png,image/jpeg,image/webp" onChange={photoChange}/></label><p>Esta foto permanece apenas na sessão atual. Nenhum dado é enviado ao servidor.</p><button className="mm5-accent" onClick={()=>setProfileOpen(false)}>Salvar aparência</button></section></div>}
  </main>;
}
