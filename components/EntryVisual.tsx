"use client";
import {useEffect,useState,type CSSProperties} from "react";
import "./entry.css";
const feed=[["Atlas","#5fa6ff","organizou as prioridades do dia"],["Max","#ffa35b","analisou os pedidos por canal"],["Luna","#4de5bd","conferiu taxas e margens"],["Nexa","#c395ff","avisou sobre risco de ruptura"],["Vega","#ff5d8f","encontrou uma oportunidade de campanha"]];
const bars=[30,44,38,60,52,74,66,88,80,96];
export default function EntryVisual(){
 const [i,setI]=useState(0);const [n,setN]=useState(0);
 useEffect(()=>{const a=setInterval(()=>setI(v=>v+1),2600);const b=setInterval(()=>setN(v=>(v+1)%bars.length),900);return()=>{clearInterval(a);clearInterval(b)}},[]);
 const shown=[0,1,2,3].map(k=>feed[(i+k)%feed.length]);
 return <div className="ev">
  <h2>Veja sua operação trabalhando por você.</h2>
  <p>Pedidos, lojas e uma equipe de IAs organizados em um só painel. Entre para acompanhar tudo em tempo real.</p>
  <div className="ev-board" aria-label="Demonstração ilustrativa">
   <div className="ev-top"><span>Simulação ilustrativa</span><i/></div>
   <div className="ev-chart">{bars.map((h,k)=><b key={k} style={{height:`${h}%`,opacity:k<=n?1:.35}}/>)}</div>
   <ul className="ev-feed">{shown.map(([nm,c,tx],k)=><li key={`${i}-${k}`} style={{"--c":c,opacity:1-k*.22} as CSSProperties}><i/><b>{nm}</b> {tx}</li>)}</ul>
  </div>
  <ul className="ev-points"><li>Pedidos e faturamento por loja e por dia</li><li>Gráficos de status, ticket médio e cancelamentos</li><li>Sala 3D com a equipe de IAs</li></ul>
 </div>}
