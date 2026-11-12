"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import {ArrowUpRight,Calculator,CheckCircle2,ExternalLink,Info,Plus,Save,ShieldCheck,Trash2,TrendingUp} from "lucide-react";
import {getSupabase} from "../lib/supabase";
import {priceAnalysis,type PricingValues} from "../lib/pricing";

type PriceProduct=PricingValues&{id?:string;empresa_id?:string;nome:string;sku:string;canal:string;concorrente_url:string;concorrente_capturado_em:string|null};
const empty:PriceProduct={nome:"",sku:"",canal:"Mercado Livre",preco_atual:79.90,custo:42,frete:9,tarifa_fixa:0,taxa_percentual:15,imposto_percentual:5,ads_percentual:3,margem_minima:8,concorrente_preco:null,concorrente_url:"",concorrente_capturado_em:null};
const fields:{name:keyof PricingValues;label:string;step?:string}[]=[
 {name:"preco_atual",label:"Preço atual (R$)"},
 {name:"custo",label:"Custo do produto (R$)"},
 {name:"frete",label:"Frete e embalagem (R$)"},
 {name:"tarifa_fixa",label:"Taxa fixa (R$)"},
 {name:"taxa_percentual",label:"Comissão plataforma (%)"},
 {name:"imposto_percentual",label:"Tributos estimados (%)"},
 {name:"ads_percentual",label:"Publicidade sobre venda (%)"},
 {name:"margem_minima",label:"Margem mínima desejada (%)"},
 {name:"concorrente_preco",label:"Preço concorrente (R$)"},
];
const reais=(v:number|null)=>v===null?"Não disponível":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v);
const percent=(v:number|null)=>v===null?"—":`${v.toFixed(1).replace(".",",")}%`;
const validUrl=(s:string)=>{if(!s.trim())return true;try{const u=new URL(s);return u.protocol==="https:"||u.protocol==="http:"}catch{return false}};
function parseMoney(value:string){if(value.trim()==="")return 0;const n=Number(value);return Number.isFinite(n)?n:NaN;}

export default function PriceLab({companyId}:{companyId:string}){
 const [products,setProducts]=useState<PriceProduct[]>([]);
 const [selected,setSelected]=useState("");
 const [form,setForm]=useState<PriceProduct>({...empty});
 const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [connected,setConnected]=useState<boolean|null>(null);
 const calc=useMemo(()=>priceAnalysis(form),[form]);
 useEffect(()=>{
  let active=true;setProducts([]);setSelected("");setForm({...empty});setError("");setNotice("");setConnected(null);
  if(!companyId)return;
  (async()=>{setLoading(true);try{
   const {data,error}=await getSupabase().from("mm_price_products").select("id,empresa_id,nome,sku,canal,preco_atual,custo,frete,tarifa_fixa,taxa_percentual,imposto_percentual,ads_percentual,margem_minima,concorrente_preco,concorrente_url,concorrente_capturado_em").eq("empresa_id",companyId).order("atualizado_em",{ascending:false}).limit(200);
   if(error)throw error;
   if(active){setProducts((data||[]) as PriceProduct[]);setConnected(true);}
  }catch{if(active){setConnected(false);setError("A base do Price ainda não foi ativada no Supabase. O simulador funciona, mas os produtos não podem ser salvos até aplicar a migração SQL.");}}finally{if(active)setLoading(false);}})();return()=>{active=false};
 },[companyId]);
 function newProduct(){setSelected("");setForm({...empty});setError("");setNotice("");}
 function selectProduct(p:PriceProduct){setSelected(p.id||"");setForm({...p});setError("");setNotice("");}
 function field(name:keyof PricingValues,value:string){setForm(prev=>({...prev,[name]:name==="concorrente_preco"&&value===""?null:parseMoney(value)}));}
 async function save(e:FormEvent){e.preventDefault();setError("");setNotice("");
  if(!connected){setError("Ative o banco de dados do Price para salvar os produtos.");return;}
  if(!form.nome.trim()||form.nome.length>160){setError("Informe um nome de produto válido.");return;}
  if(!calc.valid||form.margem_minima>95||form.taxa_percentual>100||form.imposto_percentual>100||form.ads_percentual>100){setError("Revise os custos, percentuais e a margem mínima.");return;}
  if(!validUrl(form.concorrente_url)){setError("O link da referência deve começar com http:// ou https://.");return;}
  setSaving(true);
  try{
   const sb=getSupabase();const payload={empresa_id:companyId,nome:form.nome.trim(),sku:form.sku.trim(),canal:form.canal,preco_atual:form.preco_atual,custo:form.custo,frete:form.frete,tarifa_fixa:form.tarifa_fixa,taxa_percentual:form.taxa_percentual,imposto_percentual:form.imposto_percentual,ads_percentual:form.ads_percentual,margem_minima:form.margem_minima,concorrente_preco:form.concorrente_preco,concorrente_url:form.concorrente_url.trim()||null,concorrente_capturado_em:form.concorrente_preco!==null?new Date().toISOString():null,atualizado_em:new Date().toISOString()};
   const query=selected?sb.from("mm_price_products").update(payload).eq("id",selected).eq("empresa_id",companyId):sb.from("mm_price_products").insert(payload);
   const {data,error}=await query.select("*").single();if(error)throw error;
   const updated=data as PriceProduct;setProducts(old=>[updated,...old.filter(p=>p.id!==updated.id)]);setSelected(updated.id||"");setForm(updated);setNotice("Produto salvo. Nenhum preço foi alterado no marketplace.");
  }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar produto.");}finally{setSaving(false)}
 }
 async function remove(){if(!connected||!selected||!window.confirm("Excluir este produto do monitoramento do Price?"))return;setSaving(true);setError("");try{
  const {error}=await getSupabase().from("mm_price_products").delete().eq("id",selected).eq("empresa_id",companyId);if(error)throw error;
  setProducts(old=>old.filter(x=>x.id!==selected));newProduct();setNotice("Registro excluído do monitoramento.");
 }catch(e){setError(e instanceof Error?e.message:"Falha ao excluir.");}finally{setSaving(false)}}
 return <div className="mm4-price">
  <div className="hq-panel-top"><div><span className="hq-panel-eyebrow">PRICE / INTELIGÊNCIA COMERCIAL</span><h2>Centro de precificação</h2><p>Proteja sua margem antes de reagir aos concorrentes.</p></div><span className="mm4-verified"><ShieldCheck size={15}/> Simulação sem alterações automáticas</span></div>
  <div className="mm4-price-notice"><Info size={18}/><div><strong>Dados reais somente quando informados e validados.</strong><p>Referências concorrentes são cadastradas manualmente e podem ficar desatualizadas. A coleta automática dependerá de integração autorizada. Valores simulados não incluem custos que você não cadastrar.</p></div></div>
  {connected===false&&<div className="mm4-price-warning" role="status">Integração SQL pendente: simule os preços nesta tela; o salvamento só funciona após a migração.</div>}
  <div className="mm4-price-layout"><aside className="mm4-price-list"><div className="mm4-price-list-head"><strong>Produtos monitorados</strong><button type="button" onClick={newProduct}><Plus size={15}/> Novo</button></div>{loading?<p>Buscando produtos...</p>:products.length===0?<p>Nenhum produto cadastrado. Comece criando uma simulação.</p>:products.map(p=><button key={p.id} type="button" onClick={()=>selectProduct(p)} className={selected===p.id?"active":""}><b>{p.nome}</b><small>{p.sku||"Sem SKU"} · {p.canal}</small><span>{reais(Number(p.preco_atual))}</span></button>)}</aside>
  <form className="mm4-price-form" onSubmit={e=>void save(e)}><div className="mm4-form-row"><label>Produto<input required minLength={2} maxLength={160} value={form.nome} onChange={e=>setForm(v=>({...v,nome:e.target.value}))} placeholder="Ex.: Creatina monohidratada 300g"/></label><label>SKU<input value={form.sku} maxLength={100} onChange={e=>setForm(v=>({...v,sku:e.target.value}))} placeholder="Código interno"/></label></div><label>Canal de venda<select value={form.canal} onChange={e=>setForm(v=>({...v,canal:e.target.value}))}><option>Mercado Livre</option><option>Shopee</option><option>Amazon</option><option>TikTok Shop</option><option>Loja própria</option><option>Venda direta</option></select></label><div className="mm4-form-grid">{fields.map(f=><label key={f.name}>{f.label}<input type="number" min="0" max={f.name.endsWith("percentual")||f.name==="margem_minima"?100:undefined} step="0.01" value={form[f.name]??""} onChange={e=>field(f.name,e.target.value)} placeholder={f.name==="concorrente_preco"?"Sem referência":"0,00"}/></label>)}</div><label>URL do anúncio concorrente (opcional)<input type="url" value={form.concorrente_url||""} onChange={e=>setForm(v=>({...v,concorrente_url:e.target.value}))} placeholder="https://..."/></label>{form.concorrente_url&&validUrl(form.concorrente_url)&&<a target="_blank" rel="noreferrer noopener" className="mm4-price-source" href={form.concorrente_url}>Abrir referência cadastrada <ExternalLink size={14}/></a>}
  <div className="mm4-price-results"><div className="mm4-price-result-top"><Calculator size={18}/><strong>Diagnóstico do Price</strong></div><div className="mm4-result-grid"><div><small>Preço mínimo calculado</small><strong>{reais(calc.minimum)}</strong></div><div><small>Margem atual estimada</small><strong className={calc.margin!==null&&calc.margin<form.margem_minima?"mm4-danger":""}>{percent(calc.margin)}</strong></div><div><small>Lucro unitário estimado</small><strong>{reais(calc.profit)}</strong></div><div><small>Preço para testar</small><strong>{reais(calc.suggested)}</strong></div></div><p>{calc.status}</p>{form.concorrente_preco!==null&&<small>Concorrente: {reais(form.concorrente_preco)} {form.concorrente_capturado_em?`· referência registrada em ${new Date(form.concorrente_capturado_em).toLocaleDateString("pt-BR")}`:"· referência ainda não salva"}. Compare embalagem, frete e prazo.</small>}</div>
  {error&&<p className="mm4-form-error" role="alert">{error}</p>}{notice&&<p className="mm4-form-success" role="status"><CheckCircle2 size={16}/>{notice}</p>}
  <div className="mm4-price-actions"><button type="submit" disabled={saving||!connected||!calc.valid}><Save size={16}/>{saving?"Salvando...":selected?"Salvar alterações":"Cadastrar produto"}</button>{Boolean(selected)&&<button type="button" disabled={saving} onClick={()=>void remove()} className="mm4-remove"><Trash2 size={16}/> Excluir</button>}</div></form></div>
  <div className="mm4-price-foot"><TrendingUp size={18}/><p><strong>Próximo passo:</strong> APIs oficiais para monitoramento competitivo, histórico de mudanças, alertas de margem e revisão humana antes de qualquer publicação de preço.</p><ArrowUpRight size={17}/></div>
 </div>;
}
