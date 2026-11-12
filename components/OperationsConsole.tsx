"use client";
import {useCallback,useEffect,useRef,useState,type MouseEvent} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft,ArrowRight,Building2,Cloud,CloudAlert,CloudUpload,Download,RefreshCcw,ShieldCheck} from "lucide-react";
import {getSupabase} from "../lib/supabase";
import {WorkspaceControls} from "./WorkspaceControls";

type Company={id:string;nome:string};
type Snapshot=Record<string,unknown>;
type BridgeMessage={source?:string;type?:string;document?:unknown};
type SyncState="loading"|"ready"|"pending"|"saving"|"synced"|"error"|"conflict";
const CLIENT_SOURCE="mm-central-v1";
const HOST_SOURCE="mm-host-v1";
const MAX_BYTES=12*1024*1024;
const isMissingMigration=(message:string)=>/schema cache|could not find the table|does not exist|42883|42P01|PGRST202|PGRST205/i.test(message);
const isConflict=(message:string,code?:string)=>code==="40001"||/conflito de vers[aã]o|changed by another|conflict/i.test(message);
const isSnapshot=(value:unknown):value is Snapshot=>Boolean(value)&&typeof value==="object"&&!Array.isArray(value)&&
 ["sales","stock","pricing","catalog","campaigns","expenses","requests","listings","checkins","history"].every(k=>Array.isArray((value as Snapshot)[k]));

export default function OperationsConsole(){
 const router=useRouter();
 const iframeRef=useRef<HTMLIFrameElement>(null);
 const readyRef=useRef(false);
 const versionRef=useRef(0);
 const pendingRef=useRef<Snapshot|null>(null);
 const writingRef=useRef(false);
 const conflictedRef=useRef(false);
 const generationRef=useRef(0);
 const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const companyRef=useRef("");
 const snapshotRef=useRef<Snapshot>({});
 const [companies,setCompanies]=useState<Company[]>([]);
 const [companyId,setCompanyId]=useState("");
 const [email,setEmail]=useState("");
 const [loading,setLoading]=useState(true);
 const [dataLoading,setDataLoading]=useState(true);
 const [dataReady,setDataReady]=useState(false);
 const [reloadNonce,setReloadNonce]=useState(0);
 const [template,setTemplate]=useState("");
 const [syncState,setSyncState]=useState<SyncState>("loading");
 const [error,setError]=useState("");
 const [blocked,setBlocked]=useState("");

 const postToFrame=useCallback((message:Record<string,unknown>)=>{
  iframeRef.current?.contentWindow?.postMessage({source:HOST_SOURCE,...message},"*");
 },[]);

 const bootstrap=useCallback(()=>{
  if(!readyRef.current||dataLoading||!companyRef.current)return;
  postToFrame({type:"hydrate",document:snapshotRef.current,operator:email||"Operação MM"});
 },[postToFrame,dataLoading,email]);

 useEffect(()=>{
  let alive=true;
  (async()=>{
   try{
    const sb=getSupabase();
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError||!user){router.replace("/entrar");return;}
    const {data:{session}}=await sb.auth.getSession();
    if(!session){router.replace("/entrar");return;}
    const authHeader={Authorization:`Bearer ${session.access_token}`};
    const accessResponse=await fetch("/api/acesso/status",{headers:authHeader,cache:"no-store"});
    const access=await accessResponse.json();
    if(!accessResponse.ok)throw new Error(access.error||"Não foi possível validar o acesso à MM.");
    if(access.status!=="aprovado"){
     if(alive)setBlocked(access.status==="confirmar_email"?"Confirme seu e-mail antes de entrar.":"Seu acesso à MM ainda não foi aprovado.");
     return;
    }
    const [companiesResult,templateResponse]=await Promise.all([
     sb.from("empresas").select("id,nome").order("criado_em",{ascending:false}),
     fetch("/api/operacoes/template",{headers:authHeader,cache:"no-store"}),
    ]);
    if(companiesResult.error)throw companiesResult.error;
    if(!templateResponse.ok)throw new Error("Não foi possível abrir o módulo de operações.");
    const html=await templateResponse.text();
    if(!alive)return;
    setEmail(user.email||"");
    setTemplate(html);
    const list=(companiesResult.data||[]) as Company[];
    setCompanies(list);
    const saved=sessionStorage.getItem("mm_empresa_ativa");
    setCompanyId(list.some(c=>c.id===saved)?saved!:list[0]?.id||"");
   }catch(e){if(alive)setError(e instanceof Error?e.message:"Falha ao preparar operações.");}
   finally{if(alive)setLoading(false);}
  })();
  return()=>{alive=false;};
 },[router]);

 useEffect(()=>{
  const generation=++generationRef.current;
  companyRef.current=companyId;
  readyRef.current=false;
  versionRef.current=0;
  snapshotRef.current={};
  pendingRef.current=null;
  conflictedRef.current=false;
  if(timerRef.current)clearTimeout(timerRef.current);
  setDataReady(false);
  if(!companyId){setDataLoading(false);return;}
  sessionStorage.setItem("mm_empresa_ativa",companyId);
  setDataLoading(true);setSyncState("loading");setError("");
  (async()=>{
   try{
    const {data,error:dbError}=await getSupabase().from("mm_central_operacoes")
     .select("documento,versao").eq("empresa_id",companyId).maybeSingle();
    if(dbError)throw dbError;
    if(generationRef.current!==generation)return;
    const snapshot=data?.documento;
    snapshotRef.current=snapshot&&typeof snapshot==="object"&&!Array.isArray(snapshot)?snapshot as Snapshot:{};
    versionRef.current=Number(data?.versao||0);
    setSyncState("ready");
    setDataReady(true);
    setDataLoading(false);
   }catch(e){
    if(generationRef.current!==generation)return;
    const message=e instanceof Error?e.message:"Erro ao carregar os dados.";
    setError(isMissingMigration(message)?"O módulo precisa da migração supabase/migrations/20261110_01_mm_central_operacoes.sql no Supabase.":message);
    setSyncState("error");setDataLoading(false);
   }
  })();
 },[companyId,reloadNonce]);

 useEffect(()=>{bootstrap();},[bootstrap]);
 useEffect(()=>{
  const warn=(event:BeforeUnloadEvent)=>{
   if(pendingRef.current||writingRef.current){event.preventDefault();event.returnValue="";}
  };
  window.addEventListener("beforeunload",warn);
  return()=>window.removeEventListener("beforeunload",warn);
 },[]);
 const guardLink=(event:MouseEvent<HTMLAnchorElement>)=>{
  if(pendingRef.current||writingRef.current){event.preventDefault();setError("Existem alterações aguardando sincronização. Faça backup ou finalize a gravação antes de sair.");}
 };


 // Serializa atualizações da mesma empresa e protege contra sobrescrita silenciosa.
 const flush=useCallback(async()=>{
  if(writingRef.current||conflictedRef.current||!pendingRef.current||!companyRef.current)return;
  const generation=generationRef.current;
  const company=companyRef.current;
  writingRef.current=true;
  setSyncState("saving");
  while(pendingRef.current&&generationRef.current===generation&&!conflictedRef.current){
   const document=pendingRef.current;
   pendingRef.current=null;
   try{
    const {data,error:dbError}=await getSupabase().rpc("mm_operacoes_salvar",{
     p_empresa_id:company,p_documento:document,p_versao:versionRef.current,
    });
    if(dbError)throw dbError;
    if(generationRef.current!==generation)return;
    if(!Number.isFinite(Number(data)))throw new Error("O servidor não confirmou a gravação.");
    versionRef.current=Number(data);
    snapshotRef.current=document;
    setError("");
   }catch(e){
    if(generationRef.current!==generation)return;
    const message=e instanceof Error?e.message:"Erro ao sincronizar a nuvem.";
    const code=typeof e==="object"&&e!==null&&"code" in e?String(e.code):"";
    pendingRef.current=document;
    const conflict=isConflict(message,code);
    conflictedRef.current=conflict;
    setSyncState(conflict?"conflict":"error");
    setError(conflict?"Outro usuário alterou os dados desta empresa. Faça o backup das suas alterações antes de recarregar para evitar perda de informação.":message);
    postToFrame({type:"sync-error"});
    break;
   }
  }
  if(generationRef.current===generation){
   writingRef.current=false;
   if(!pendingRef.current&&!conflictedRef.current)setSyncState("synced");
  }
 },[postToFrame]);

 useEffect(()=>{
  const handleMessage=(event:MessageEvent<BridgeMessage>)=>{
   if(event.source!==iframeRef.current?.contentWindow||event.data?.source!==CLIENT_SOURCE)return;
   if(event.data.type==="ready"){
    readyRef.current=true;
    if(!dataLoading&&dataReady)bootstrap();
    return;
   }
   if(event.data.type!=="save"||!readyRef.current||dataLoading||!companyRef.current)return;
   const document=event.data.document;
   if(!isSnapshot(document)){
    setError("Formato de dados recebido não é válido. Faça um backup e revise o módulo.");setSyncState("error");return;
   }
   if(JSON.stringify(document).length>MAX_BYTES){
    setError("A base ultrapassou 12 MB. Exporte e arquive o histórico antes de salvar.");setSyncState("error");return;
   }
   pendingRef.current=document;
   if(!conflictedRef.current){
    setSyncState("pending");
    if(timerRef.current)clearTimeout(timerRef.current);
    timerRef.current=setTimeout(()=>void flush(),650);
   }
  };
  window.addEventListener("message",handleMessage);
  return()=>window.removeEventListener("message",handleMessage);
 },[dataLoading,dataReady,bootstrap,flush]);

 const retry=()=>{if(!pendingRef.current||conflictedRef.current)return;setError("");conflictedRef.current=false;void flush();};
 const backup=()=>postToFrame({type:"backup"});
 const reload=()=>{
  if(pendingRef.current&&!window.confirm("Existem alterações não sincronizadas. Exporte um backup antes de recarregar. Deseja continuar mesmo assim?"))return;
  setReloadNonce(v=>v+1);
 };
 const changeCompany=(next:string)=>{
  if(pendingRef.current||writingRef.current){setError("Aguarde a sincronização ou exporte um backup antes de mudar de empresa.");return;}
  setCompanyId(next);
 };
 const stateLabel:Record<SyncState,string>={loading:"Carregando base",ready:"Pronto para operar",pending:"Alterações pendentes",saving:"Salvando na nuvem",synced:"Sincronizado na nuvem",error:"Falha de sincronização",conflict:"Conflito entre sessões"};
 return <main className="mm-operations">
  <header className="mmo-topbar"><Link className="mmo-brand" href="/" onClick={guardLink}><span className="mmo-symbol">MM<span>.</span></span><span>MM INTELLIGENCE<small>CENTRAL DE OPERAÇÕES</small></span></Link><nav><Link href="/workspace" onClick={guardLink}><ArrowLeft size={16}/> Meu workspace</Link><Link href="/painel" onClick={guardLink}>Painel</Link><WorkspaceControls email={email} compact/></nav></header>
  <div className="mmo-container">
   <section className="mmo-heading"><div><span className="mmo-kicker">WORKSPACE / COMERCIAL & OPERAÇÕES</span><h1>Central de Operações</h1><p>Controle operacional importado da Fit House, agora integrado ao ambiente MM Intelligence.</p></div><div className="mmo-heading-icon"><Cloud size={28}/></div></section>
   {loading?<div className="mmo-message">Verificando autenticação e preparando o workspace...</div>:blocked?<div className="mmo-message"><ShieldCheck size={22}/><strong>Acesso restrito</strong><p>{blocked}</p><Link href="/painel">Voltar ao painel <ArrowRight size={15}/></Link></div>:error&&!template?<div className="mmo-message" role="alert"><CloudAlert size={23}/>{error}</div>:companies.length===0?<div className="mmo-message">Você precisa cadastrar uma empresa primeiro. <Link href="/painel">Abrir painel</Link></div>:<>
    <div className="mmo-toolbar"><label><Building2 size={17}/> Empresa ativa <select value={companyId} disabled={syncState==="saving"||syncState==="pending"||syncState==="conflict"} onChange={e=>changeCompany(e.target.value)}>{companies.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></label><span className={`mmo-sync mmo-sync-${syncState}`} aria-live="polite">{syncState==="synced"?<ShieldCheck size={16}/>:syncState==="error"||syncState==="conflict"?<CloudAlert size={16}/>:<CloudUpload size={16}/>} {stateLabel[syncState]}</span><div className="mmo-tools"><button type="button" onClick={backup} disabled={!template||dataLoading} title="Baixar JSON com os registros desta empresa"><Download size={16}/> Backup</button><button type="button" onClick={reload} disabled={dataLoading||syncState==="saving"}><RefreshCcw size={16}/> Recarregar</button>{syncState==="error"&&pendingRef.current&&<button type="button" onClick={retry}>Tentar sincronizar</button>}</div></div>
    {error&&<div className="mmo-error" role="alert"><CloudAlert size={19}/><div>{error}{syncState==="conflict"&&<p>Não use "Tentar sincronizar" para forçar a gravação. Faça backup e recarregue os dados atuais da nuvem.</p>}</div></div>}
    {!dataLoading&&dataReady&&template?<div className="mmo-frame-shell"><iframe key={`${companyId}-${reloadNonce}`} ref={iframeRef} title="Central de Operações da empresa" srcDoc={template} sandbox="allow-scripts allow-downloads allow-forms allow-modals" onLoad={()=>{readyRef.current=true;bootstrap();}}/></div>:dataLoading?<div className="mmo-message">Carregando a base operacional da empresa...</div>:null}
    <p className="mmo-footnote">Os registros desta central são uma base operacional própria por empresa. A importação não modifica automaticamente pedidos, produtos, saldos ou integrações já existentes na MM. Valide dados e regras comerciais antes de tomar decisões.</p>
   </>}
  </div>
 </main>;
}
