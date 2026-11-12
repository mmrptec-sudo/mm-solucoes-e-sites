"use client";
import {useEffect,useRef,type CSSProperties,type ReactNode} from "react";

export type RoomAgent={id:string;name:string;role:string;color:string;symbol:string};
const spots:Record<string,[number,number]>={atlas:[0,-215],max:[-235,-95],luna:[235,-95],nexa:[-225,125],vega:[225,125],price:[0,245]};
const p=(x:number,y:number,z:number,extra="")=>({transform:`translate3d(${x}px,${y}px,${z}px) ${extra}`} as CSSProperties);

function Box({w,h,d,x,z,cls="",children}:{w:number;h:number;d:number;x:number;z:number;cls?:string;children?:ReactNode}){
 return <div className={`rm-box ${cls}`} style={{...p(x,0,z),width:w,height:h,depth:d,"--w":`${w}px`,"--h":`${h}px`,"--d":`${d}px`} as CSSProperties}>
  <i className="f t"/><i className="f fr"/><i className="f bk"/><i className="f l"/><i className="f r"/>{children}
 </div>;
}

export default function TechRoom({agents,selected,onSelect,moving}:{agents:RoomAgent[];selected:string;onSelect:(id:string)=>void;moving:boolean}){
 const room=useRef<HTMLDivElement>(null);const stage=useRef<HTMLDivElement>(null);
 const state=useRef({ry:-32,rx:-60,drag:false,x:0,y:0,t:0});
 const movingRef=useRef(moving);movingRef.current=moving;
 useEffect(()=>{
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;let raf=0;let last=performance.now();
  const apply=()=>{const s=state.current;const el=room.current;if(!el)return;const sway=movingRef.current&&!reduce&&!s.drag?Math.sin(s.t/5200)*7:0;el.style.setProperty("--ry",`${s.ry+sway}deg`);el.style.setProperty("--rx",`${s.rx}deg`);};
  const loop=(n:number)=>{state.current.t+=n-last;last=n;apply();raf=requestAnimationFrame(loop)};
  raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);
 },[]);
 const down=(e:React.PointerEvent)=>{const s=state.current;s.drag=true;s.x=e.clientX;s.y=e.clientY;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)};
 const move=(e:React.PointerEvent)=>{const s=state.current;if(!s.drag)return;s.ry=Math.max(-80,Math.min(10,s.ry+(e.clientX-s.x)*.35));s.rx=Math.max(-84,Math.min(-36,s.rx+(e.clientY-s.y)*.2));s.x=e.clientX;s.y=e.clientY};
 const up=()=>{state.current.drag=false};
 return <div ref={stage} className={`rm-stage ${moving?"rm-live":""}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
  <div className="rm-hint">Arraste para girar a sala</div>
  <div className="rm-room" ref={room}>
   <div className="rm-floor"><div className="rm-lane a"/><div className="rm-lane b"/><div className="rm-lane c"/><div className="rm-lane d"/></div>
   <div className="rm-wall rm-back">
    <div className="rm-bigscreen"><b>MM · CENTRAL DE OPERAÇÕES</b><div>{[40,62,48,80,66,92,74,58,86,70,96,82].map((h,i)=><span key={i} style={{height:`${h}%`,animationDelay:`${i*.18}s`}}/>)}</div></div>
    <div className="rm-strip s1"/><div className="rm-strip s2"/>
   </div>
   <div className="rm-wall rm-left"><div className="rm-window"/><div className="rm-window w2"/></div>
   {[-262,-222].map((x,i)=><Box key={x} w={34} h={150} d={44} x={x} z={-290} cls="rm-rack">{Array.from({length:9}).map((_,k)=><u key={k} style={{top:12+k*15,animationDelay:`${(k*.37+i*.5)%2}s`}}/>)}</Box>)}
   {[222,262].map((x,i)=><Box key={x} w={34} h={150} d={44} x={x} z={-290} cls="rm-rack">{Array.from({length:9}).map((_,k)=><u key={k} style={{top:12+k*15,animationDelay:`${(k*.29+i*.4)%2}s`}}/>)}</Box>)}
   <div className="rm-holo" style={p(0,0,0)}><span className="rm-base"/><span className="rm-ring r1"/><span className="rm-ring r2"/><span className="rm-core">MM</span><span className="rm-beam"/></div>
   {agents.map(a=>{const [x,z]=spots[a.id]||[0,0];const on=selected===a.id;
    return <button key={a.id} type="button" className={`rm-station ${on?"on":""}`} style={{...p(x,0,z),"--agent":a.color} as CSSProperties} onClick={()=>onSelect(a.id)} onPointerDown={e=>e.stopPropagation()} aria-label={`Selecionar ${a.name}`}>
     <span className="rm-pad"/>
     <Box w={110} h={34} d={52} x={-55} z={-26} cls="rm-desk"/>
     <span className="rm-mon"><i/><i/><i/></span>
     <span className="rm-bill"><span className="rm-walker" style={{"--wx":`${-x*.6}px`,"--wz":`${-z*.6}px`,"--dl":`${-(Object.keys(spots).indexOf(a.id))*2.7}s`} as CSSProperties}><span className="rm-person"><i className="hd"/><i className="bd">{a.symbol}</i><i className="lg"/><i className="lg l2"/></span><span className="rm-tag"><b>{a.name}</b><small>{a.role}</small></span></span></span>
    </button>})}
   <span className="rm-drone" style={p(0,-150,0)}><i/></span>
  </div>
  <div className="rm-vignette"/>
 </div>;
}
