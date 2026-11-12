"use client";
import {useEffect,useState} from "react";
import {Moon,Sun} from "lucide-react";
export default function SiteThemeToggle(){
 const [mode,setMode]=useState<"dark"|"light">("dark");
 useEffect(()=>{let m=window.localStorage.getItem("mm4-theme");if(m!=="light")m="dark";setMode(m as "dark"|"light");document.documentElement.dataset.theme=m;},[]);
 function toggle(){const m=mode==="dark"?"light":"dark";setMode(m);window.localStorage.setItem("mm4-theme",m);document.documentElement.dataset.theme=m;}
 return <button className="lp-mode" type="button" onClick={toggle} aria-label={mode==="dark"?"Ativar tema claro":"Ativar tema escuro"} title={mode==="dark"?"Ativar tema claro":"Ativar tema escuro"}>{mode==="dark"?<Sun size={19}/>:<Moon size={19}/>}<span>{mode==="dark"?"Claro":"Noturno"}</span></button>;
}
