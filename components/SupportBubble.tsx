"use client";
import {useEffect,useState} from "react";
import {MessageCircle,X,ArrowRight} from "lucide-react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {getSupabase} from "../lib/supabase";

export default function SupportBubble(){
 const path=usePathname();
 const [opened,setOpened]=useState(false);
 const [loggedIn,setLoggedIn]=useState(false);
 const [isSupportAdmin,setIsSupportAdmin]=useState(false);
 useEffect(()=>{
   let valid=true;
   async function check(){
     try{
       const client=getSupabase();
       const {data:{user}}=await client.auth.getUser();
       if(!valid)return;
       setLoggedIn(Boolean(user));
       if(user){
         const {data}=await client.from("suporte_administradores").select("usuario_id").eq("usuario_id",user.id).maybeSingle();
         if(valid)setIsSupportAdmin(Boolean(data));
       }else setIsSupportAdmin(false);
     }catch{if(valid){setLoggedIn(false);setIsSupportAdmin(false);}}
   }
   check();
   const client=getSupabase();
   const {data:listener}=client.auth.onAuthStateChange(()=>{void check()});
   return()=>{valid=false;listener.subscription.unsubscribe()};
 },[path]);
 if(path==="/suporte"||path.startsWith("/admin/")||path==="/entrar"||isSupportAdmin)return null;
 return <div className="mm-support-widget">
   {opened&&<section className="mm-support-popup" aria-label="Atendimento MM">
     <div className="mm-support-popup-head"><div><strong>Suporte MM</strong><small>Atendimento humano</small></div><button type="button" aria-label="Fechar chat" onClick={()=>setOpened(false)}><X size={20}/></button></div>
     {loggedIn?<iframe title="Conversa com suporte" src="/suporte?embed=1" className="mm-support-frame"/>:<div className="mm-support-guest"><p>Entre em sua conta para falar com a equipe de suporte.</p><Link className="btn" href="/entrar">Entrar para conversar <ArrowRight size={16}/></Link></div>}
   </section>}
   <button className="mm-support-trigger" type="button" onClick={()=>setOpened(x=>!x)} aria-label={opened?"Fechar atendimento":"Abrir atendimento"} aria-expanded={opened}><MessageCircle size={28}/><span>Suporte</span></button>
 </div>;
}
