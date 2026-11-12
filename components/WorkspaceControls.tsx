"use client";

import {useEffect,useRef,useState} from "react";
import {Camera,Check,ChevronDown,Clock3,Moon,Sun,UserRound,X} from "lucide-react";
import {getSupabase} from "../lib/supabase";

type ThemeMode="dark"|"light";
const avatarBucket="mm-avatars";
function initialName(email:string){return (email.split("@")[0]||"Minha conta").replace(/[._-]+/g," ");}
function isTheme(value:string|null):value is ThemeMode{return value==="dark"||value==="light";}

export function WorkspaceControls({email,compact=false}:{email:string;compact?:boolean}){
 const [theme,setTheme]=useState<ThemeMode>("dark");
 const [clock,setClock]=useState<{date:string;time:string}|null>(null);
 const [name,setName]=useState("");
 const [avatar,setAvatar]=useState("");
 const [open,setOpen]=useState(false);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 const fileRef=useRef<HTMLInputElement>(null);
 const [uid,setUid]=useState("");
 useEffect(()=>{
  const saved=window.localStorage.getItem("mm4-theme");
  const applied:ThemeMode=isTheme(saved)?saved:"dark";
  setTheme(applied);document.documentElement.dataset.theme=applied;
  const update=()=>{const d=new Date();setClock({time:d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),date:d.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short",year:"numeric"}).replace(/\./g,"")});};
  update();const timer=window.setInterval(update,15000);return()=>window.clearInterval(timer);
 },[]);
 useEffect(()=>{
  let active=true;
  if(!email)return;
  (async()=>{
   try{
    const sb=getSupabase();const {data:{user}}=await sb.auth.getUser();if(!active||!user)return;
    setUid(user.id);
    setName(String(user.user_metadata?.full_name||user.user_metadata?.name||initialName(user.email||email)));
    const path=user.user_metadata?.avatar_path;
    if(typeof path==="string"&&path.startsWith(`${user.id}/`)){
     const {data,error}=await sb.storage.from(avatarBucket).createSignedUrl(path,3600);
     if(active&&!error&&data?.signedUrl)setAvatar(data.signedUrl);
    }
   }catch{/* Sem autenticação em demos públicas: avatar usa iniciais. */}
  })();return()=>{active=false};
 },[email]);
 function changeTheme(){const next=theme==="dark"?"light":"dark";setTheme(next);document.documentElement.dataset.theme=next;window.localStorage.setItem("mm4-theme",next);}
 async function saveName(){if(!name.trim()){setMessage("Informe seu nome.");return;}setSaving(true);setMessage("");try{
  const {error}=await getSupabase().auth.updateUser({data:{full_name:name.trim().slice(0,80)}});if(error)throw error;
  setMessage("Nome atualizado.");
 }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível atualizar o nome.");}finally{setSaving(false);}}
 async function uploadPhoto(file:File|undefined){if(!file||!uid)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){setMessage("Use JPG, PNG ou WebP.");return;}
  if(file.size>2*1024*1024){setMessage("A foto deve ter no máximo 2 MB.");return;}
  setSaving(true);setMessage("");
  try{
   const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
   const path=`${uid}/avatar-${Date.now()}.${ext}`;
   const sb=getSupabase();const {error:uploadError}=await sb.storage.from(avatarBucket).upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;
   const {error:profileError}=await sb.auth.updateUser({data:{avatar_path:path}});if(profileError)throw profileError;
   const {data,error}=await sb.storage.from(avatarBucket).createSignedUrl(path,3600);if(error)throw error;
   setAvatar(data.signedUrl);setMessage("Foto atualizada.");
  }catch(e){setMessage(`Não foi possível salvar a foto. ${e instanceof Error?e.message:"Verifique a migração de perfis."}`);}finally{setSaving(false);}
 }
 const display=name.trim()||initialName(email);
 return <div className={`mm4-controls ${compact?"mm4-controls-compact":""}`}>
  <div className="mm4-datetime" aria-label="Data e hora local"><Clock3 size={18}/><span><b>{clock?.time||"--:--"}</b><small>{clock?.date||"Horário local"}</small></span></div>
  <button className="mm4-theme-btn" type="button" onClick={changeTheme} aria-label={theme==="dark"?"Ativar modo claro":"Ativar modo noturno"} title={theme==="dark"?"Ativar modo claro":"Ativar modo noturno"}>{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}<span>{theme==="dark"?"Modo claro":"Modo noturno"}</span></button>
  <button className="mm4-profile-trigger" type="button" onClick={()=>{setMessage("");setOpen(true);}} aria-label={`Editar perfil de ${display}`}><span className="mm4-profile-avatar">{avatar?<img src={avatar} alt="Foto de perfil"/>:<UserRound size={20}/>}</span><span className="mm4-profile-name"><b>{display}</b><small>{email||"Perfil"}</small></span><ChevronDown size={15}/></button>
  {open&&<div className="mm4-modal-layer" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><section role="dialog" aria-modal="true" aria-labelledby="mm4-profile-title" className="mm4-profile-dialog"><header><div><small>MINHA CONTA</small><h2 id="mm4-profile-title">Editar perfil</h2></div><button type="button" aria-label="Fechar" onClick={()=>setOpen(false)}><X size={19}/></button></header><div className="mm4-profile-photo-row"><span className="mm4-profile-avatar mm4-profile-avatar-lg">{avatar?<img src={avatar} alt="Foto de perfil"/>:<UserRound size={32}/>}</span><div><strong>Sua foto</strong><p>JPG, PNG ou WebP, até 2 MB.</p><button type="button" disabled={saving} onClick={()=>fileRef.current?.click()}><Camera size={15}/> Alterar foto</button><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{void uploadPhoto(e.target.files?.[0]);e.currentTarget.value="";}}/></div></div><label htmlFor="mm4-profile-name">Nome de exibição</label><input id="mm4-profile-name" maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome"/><label htmlFor="mm4-profile-email">E-mail</label><input id="mm4-profile-email" value={email} readOnly/><p className="mm4-profile-help">Nome salvo na sua conta. A foto exige a migração do bucket privado no Supabase.</p>{message&&<p role="status" className="mm4-profile-message">{message}</p>}<footer><button type="button" onClick={()=>setOpen(false)}>Fechar</button><button type="button" onClick={()=>void saveName()} disabled={saving||!name.trim()}><Check size={16}/> {saving?"Salvando...":"Salvar nome"}</button></footer></section></div>}
 </div>;
}
