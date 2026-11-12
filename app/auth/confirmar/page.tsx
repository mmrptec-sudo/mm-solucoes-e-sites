"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../../lib/supabase";
export default function Confirmar(){
  const [mensagem,setMensagem]=useState("Confirmando seu e-mail...");
  const router=useRouter();
  useEffect(()=>{const confirmar=async()=>{
    try{
      const url=new URL(window.location.href);
      const token_hash=url.searchParams.get("token_hash");
      const type=url.searchParams.get("type");
      if(token_hash && (type==="signup"||type==="email"||type==="recovery")){
        const {error}=await getSupabase().auth.verifyOtp({token_hash,type:type as "signup"|"email"|"recovery"});
        if(error)throw error;
        router.replace("/painel");return;
      }
      const {data}=await getSupabase().auth.getSession();
      if(data.session){router.replace("/painel");return;}
      setMensagem("Confirmação não encontrada. Retorne ao login e entre com sua conta após confirmar pelo e-mail.");
    }catch(e){setMensagem(e instanceof Error?e.message:"Falha ao confirmar e-mail.");}
  };void confirmar();},[router]);
  return <main className="auth-page"><div className="auth-card"><h1>Confirmação de cadastro</h1><p>{mensagem}</p><Link className="btn" href="/entrar">Ir para login</Link></div></main>
}
