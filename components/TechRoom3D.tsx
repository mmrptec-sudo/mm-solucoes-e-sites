"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { RotateCcw, Minus, Plus, Focus, Pause, Play, RotateCw, RotateCcw as RotateLeft, Eye } from "lucide-react";
import { MEMBERS, Room3D } from "../lib/room3d-engine";
import type { RoomAgent } from "./TechRoom";

type Props = {
  agents: RoomAgent[];
  selected: string;
  onSelect: (id: string) => void;
  moving: boolean;
};

type SceneState = "visao-geral" | "foco";

/**
 * Cena 3D TypeScript/React: sem iframe e sem scripts externos.
 * Os modelos são estilizados e procedurais, não arquivos GLB licenciados.
 */
export default function TechRoom3D({ agents, selected, onSelect, moving }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Room3D | null>(null);
  const selectRef = useRef(onSelect);
  const [sceneState, setSceneState] = useState<SceneState>("visao-geral");
  const [backend, setBackend] = useState<"webgl" | "canvas2d" | "indisponivel">("indisponivel");
  const [sceneError, setSceneError] = useState("");
  selectRef.current = onSelect;

  useEffect(() => {
    const canvas = canvasRef.current;
    const labels = labelsRef.current;
    if (!canvas || !labels) return;
    try {
      const scene = new Room3D(canvas, labels, {
        selected,
        onSelect: (agentId) => selectRef.current(agentId),
      });
      sceneRef.current = scene;
      scene.setMotion(moving);
      setBackend(scene.backend);
      if (scene.status) setSceneError(scene.status);
      return () => { scene.destroy(); sceneRef.current = null; };
    } catch (cause) {
      setSceneError(cause instanceof Error ? cause.message : "Não foi possível abrir a sala 3D.");
    }
    // A cena é instanciada uma vez; seleção e movimento são sincronizados abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { sceneRef.current?.setSelected(selected); }, [selected]);
  useEffect(() => { sceneRef.current?.setMotion(moving); }, [moving]);

  const focus = useCallback(() => {
    const focused = sceneRef.current?.focus();
    if (focused !== undefined) setSceneState(focused ? "foco" : "visao-geral");
  }, []);
  const reset = useCallback(() => {
    sceneRef.current?.reset();
    setSceneState("visao-geral");
  }, []);
  const validIds = new Set(agents.map((agent) => agent.id));

  return (
    <div className="mm-studio-3d" aria-label="Escritório virtual tridimensional com seis agentes">
      <div className="mm3d-topline">
        <span className="mm3d-pill"><span className="mm3d-pulse"/> ESTÚDIO 3D</span>
        <span className="mm3d-backend">{backend === "webgl" ? "Renderização WebGL" : backend === "canvas2d" ? "Modo compatível" : "Preparando cena"}</span>
      </div>

      <div className="mm3d-toolbar" aria-label="Controles da câmera 3D">
        <button type="button" onClick={() => sceneRef.current?.orbit(-0.22)} aria-label="Girar câmera para esquerda" title="Girar à esquerda"><RotateLeft size={16}/></button>
        <button type="button" onClick={() => sceneRef.current?.orbit(0.22)} aria-label="Girar câmera para direita" title="Girar à direita"><RotateCw size={16}/></button>
        <button type="button" onClick={() => sceneRef.current?.zoom(-2)} aria-label="Aproximar câmera" title="Zoom +"><Plus size={16}/></button>
        <button type="button" onClick={() => sceneRef.current?.zoom(2)} aria-label="Afastar câmera" title="Zoom −"><Minus size={16}/></button>
        <button type="button" onClick={focus} aria-pressed={sceneState === "foco"} title="Focar no personagem selecionado"><Focus size={16}/> <span>Focar</span></button>
        <button type="button" onClick={reset} aria-label="Voltar para visão geral" title="Restaurar câmera"><RotateCcw size={16}/></button>
      </div>

      <canvas ref={canvasRef} className="mm3d-canvas" tabIndex={0} aria-label="Ambiente 3D. Arraste para girar, utilize a roda para zoom ou selecione um especialista abaixo." />
      <div ref={labelsRef} className="mm3d-labels">
        {MEMBERS.filter((member) => validIds.has(member.id)).map((member) => (
          <button
            key={member.id}
            type="button"
            data-3d-agent=""
            data-agent={member.id}
            className={`mm3d-agent-label ${selected === member.id ? "selected" : ""}`}
            style={{ "--agent": member.color } as CSSProperties}
            onClick={() => onSelect(member.id)}
            aria-pressed={selected === member.id}
            title={`Selecionar ${member.name} — ${member.role}`}
          ><strong>{member.name}</strong><small>{member.role.split(" e ")[0]}</small></button>
        ))}
      </div>

      {sceneError ? (
        <div className="mm3d-error" role="alert">{sceneError}. Selecione um agente na lista lateral para continuar.</div>
      ) : (
        <div className="mm3d-footer"><Eye size={13}/> Arraste para girar · roda para zoom · clique para selecionar · <strong>{sceneState === "foco" ? "Foco individual" : "Visão geral"}</strong></div>
      )}
      <div className="mm3d-screenreader" aria-live="polite">Agente selecionado: {MEMBERS.find((m) => m.id === selected)?.name ?? selected}.</div>
    </div>
  );
}
