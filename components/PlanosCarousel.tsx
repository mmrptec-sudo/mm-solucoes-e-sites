"use client";

import {useEffect,useRef,useState} from "react";
import {ArrowRight,Check,CheckCircle2,Copy,Mail,Sparkles} from "lucide-react";
import "./planos-carousel.css";

type Plan={nome:string;preco:string;descricao:string;itens:string[];manutencao:string;ideal:string};
const planos:Plan[]=[
 {nome:"Básico",preco:"R$ 199",ideal:"Para começar",descricao:"Sua empresa com uma presença digital clara e profissional.",itens:["Site de apresentação","Informações da empresa","Contato por e-mail","Adaptado para celular"],manutencao:"R$ 99/mês"},
 {nome:"Médio",preco:"R$ 299",ideal:"Mais escolhido",descricao:"Mais liberdade para destacar serviços, portfólio e diferenciais.",itens:["Mais páginas e seções","Design personalizado","Links e contatos integrados","Estrutura organizada"],manutencao:"R$ 199/mês"},
 {nome:"Premium",preco:"R$ 799",ideal:"Mais completo",descricao:"Uma experiência digital ampliada e personalizada para sua empresa.",itens:["Site mais completo","Páginas personalizadas","Funcionalidades extras","Integrações sob consulta"],manutencao:"R$ 299/mês"}
];
const contato="mmrptec@gmail.com";
function resumo(p:Plan){return `Olá! Tenho interesse no plano ${p.nome} da MM Soluções Digitais (${p.preco}, pagamento único, sujeito à avaliação do projeto). Gostaria de conversar sobre o meu site. Entendo que a manutenção de ${p.manutencao} é opcional.`}
export default function PlanosCarousel(){
 const [selecionado,setSelecionado]=useState<string|null>(null);
 const [copiado,setCopiado]=useState(false);
 const resumoRef=useRef<HTMLDivElement>(null);
 const selecionadoPlano=planos.find(p=>p.nome===selecionado);
 useEffect(()=>{setCopiado(false)},[selecionado]);
 function escolher(nome:string){setSelecionado(nome);window.requestAnimationFrame(()=>resumoRef.current?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"nearest"}));}
 async function copiar(){if(!selecionadoPlano)return;try{await navigator.clipboard.writeText(resumo(selecionadoPlano));setCopiado(true);}catch{setCopiado(false);}}
 return <div className="mm-pricing" id="site-planos">
  <div className="mm-pricing-head"><span><Sparkles size={16}/> Projetos com orçamento transparente</span><small>Visualize todos os planos e escolha o que combina com o seu negócio.</small></div>
  <div className="mm-pricing-grid">
   {planos.map((p,i)=><article key={p.nome} className={`mm-pricing-card${i===1?" is-featured":""}${selecionado===p.nome?" is-selected":""}`} aria-label={`Plano ${p.nome}, ${p.preco}`}>
    <div className="mm-pricing-top"><span className="mm-pricing-category">{p.ideal}</span>{selecionado===p.nome&&<span className="mm-pricing-selected"><CheckCircle2 size={15}/> Selecionado</span>}</div>
    <h3>{p.nome}</h3><p className="mm-pricing-desc">{p.descricao}</p>
    <div className="mm-pricing-value"><strong>{p.preco}</strong><small>pagamento único*</small></div>
    <div className="mm-pricing-divider"/>
    <ul>{p.itens.map(v=><li key={v}><Check size={17}/><span>{v}</span></li>)}</ul>
    <p className="mm-pricing-maintenance">Manutenção opcional: <b>{p.manutencao}</b></p>
    <button type="button" className="mm-pricing-pick" onClick={()=>escolher(p.nome)} aria-pressed={selecionado===p.nome}>{selecionado===p.nome?"Plano selecionado":"Selecionar plano"}<ArrowRight size={18}/></button>
   </article>)}
  </div>
  <div className={`mm-pricing-confirm${selecionadoPlano?" is-active":""}`} ref={resumoRef} aria-live="polite">
   {selecionadoPlano?<><div><span className="mm-pricing-confirm-eyebrow"><CheckCircle2 size={17}/> PLANO ESCOLHIDO</span><h3>{selecionadoPlano.nome} · {selecionadoPlano.preco}</h3><p>Pronto! Para solicitar uma proposta, envie os detalhes do seu projeto. A escolha não gera uma compra nem cobrança automática.</p></div><div className="mm-pricing-confirm-actions"><a className="lp-btn" href={`mailto:${contato}?subject=${encodeURIComponent(`Orçamento — Plano ${selecionadoPlano.nome}`)}&body=${encodeURIComponent(resumo(selecionadoPlano))}`}><Mail size={17}/> Solicitar orçamento</a><button type="button" onClick={()=>void copiar()}><Copy size={17}/>{copiado?"Resumo copiado":"Copiar resumo"}</button></div></>:<><CheckCircle2 size={23}/><span>Escolha um dos planos acima para ver o próximo passo e solicitar seu orçamento.</span></>}
  </div>
 </div>;
}
