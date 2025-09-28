// src/app/drive/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Pressed = {
  w: boolean;
  a: boolean;
  s: boolean; // reverse
  d: boolean;
};

// URLs de tus Flask
const CONTROLS_URL = "http://localhost:5001"; // control_server.py
const STREAM_URL = "http://localhost:5002";   // stream_server.py

async function postEvent(topic: string, payload: any) {
  try {
    await fetch(`${CONTROLS_URL}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, payload }),
      keepalive: true,
    });
  } catch {
    // opcional: console.warn("No se pudo enviar evento", e);
  }
}

// Mapeo de dirección según tu definición:
// A = derecha, W = frente, D = izquierda, S = reversa
function keyToDir(k: keyof Pressed) {
  switch (k) {
    case "w": return "forward";
    case "s": return "reverse";
    case "a": return "right";
    case "d": return "left";
    default: return "";
  }
}

export default function DrivePage() {
  const [username, setUsername] = useState<string>("");
  const [pressed, setPressed] = useState<Pressed>({ w: false, a: false, s: false, d: false });

  // switches y slider
  const [rearLights, setRearLights] = useState<boolean>(false);
  const [frontLights, setFrontLights] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(0); // 0..100, step 10

  // direccionales
  const [leftBlinker, setLeftBlinker] = useState<boolean>(false);
  const [rightBlinker, setRightBlinker] = useState<boolean>(false);

  // canvas del stream
  const streamCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Distancia de retroceso (0..5) donde 5 = muy cerca del choque
  const [distanceLevel, setDistanceLevel] = useState<number>(0);

  // Cargar usuario
  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("username") : "";
    if (u) setUsername(u);
  }, []);

  // === CAMBIO CLAVE: setKey ahora envía SOLO la tecla que cambió ===
  const setKey = useCallback((key: keyof Pressed, val: boolean) => {
    setPressed((p) => {
      if (p[key] === val) return p;
      return { ...p, [key]: val };
    });
    // Enviar solo el evento de esta tecla con tu mapeo de dirección
    postEvent("movement", { key, state: val ? "down" : "up", dir: keyToDir(key) });
  }, []);

  // Handlers de direccionales (exclusivos)
  const toggleLeftBlinker = useCallback(() => {
    setLeftBlinker((prev) => {
      const next = !prev;
      if (next) setRightBlinker(false);
      return next;
    });
  }, []);
  const toggleRightBlinker = useCallback(() => {
    setRightBlinker((prev) => {
      const next = !prev;
      if (next) setLeftBlinker(false);
      return next;
    });
  }, []);

  // Teclado global: WASD + FLECHAS (← →)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const raw = e.key;
      const k = raw.length === 1 ? raw.toLowerCase() : raw.toLowerCase();

      // Evita auto-repetición para toggles de direccionales
      if (e.repeat && (k === "arrowleft" || k === "arrowright")) return;

      if (k === "arrowleft") {
        e.preventDefault();
        toggleLeftBlinker();
        // reporta estado actual de blinkers
        postEvent("blinkers", { left: !leftBlinker, right: false });
        return;
      }
      if (k === "arrowright") {
        e.preventDefault();
        toggleRightBlinker();
        postEvent("blinkers", { left: false, right: !rightBlinker });
        return;
      }

      if (k === "w" || k === "a" || k === "s" || k === "d") {
        e.preventDefault();
        setKey(k as keyof Pressed, true);
      }
    };
    const up = (e: KeyboardEvent) => {
      const raw = e.key;
      const k = raw.length === 1 ? raw.toLowerCase() : raw.toLowerCase();
      // Flechas son toggle → no hacemos nada en keyup
      if (k === "w" || k === "a" || k === "s" || k === "d") {
        e.preventDefault();
        setKey(k as keyof Pressed, false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [setKey, toggleLeftBlinker, toggleRightBlinker, leftBlinker, rightBlinker]);

  // Auto luces traseras en reversa (S)
  useEffect(() => {
    setRearLights(pressed.s);
  }, [pressed.s]);

  // Reportar cambios de luces / direccionales / velocidad (estos sí son independientes)
  useEffect(() => {
    postEvent("lights", { rear: rearLights, front: frontLights });
  }, [rearLights, frontLights]);

  useEffect(() => {
    postEvent("blinkers", { left: leftBlinker, right: rightBlinker });
  }, [leftBlinker, rightBlinker]);

  useEffect(() => {
    postEvent("speed", { value: speed });
  }, [speed]);

  // === Dibujar frames del Flask de stream en el canvas ===
  useEffect(() => {
    let cancelled = false;
    const canvas = streamCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const drawLoop = async () => {
      while (!cancelled) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = `${STREAM_URL}/frame.jpg?t=${Date.now()}`; // evita cache

          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
          });

          // Mantener aspect-ratio centrado
          ctx.clearRect(0, 0, W, H);
          const iw = img.width;
          const ih = img.height;
          const scale = Math.min(W / iw, H / ih);
          const dw = iw * scale;
          const dh = ih * scale;
          const dx = (W - dw) / 2;
          const dy = (H - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
        await new Promise((r) => setTimeout(r, 140)); // ~7 fps
      }
    };

    drawLoop();
    return () => {
      cancelled = true;
    };
  }, []);

  // Captura foto del canvas
  const handleCapturePhoto = () => {
    const canvas = streamCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `captura_${ts}.png`;
    a.click();
  };

  // Estilos
  const btnClass = (active: boolean) =>
    `w-16 h-16 rounded-xl border text-lg font-bold grid place-items-center select-none 
     ${active ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"} 
     hover:border-black transition`;

  const blinkerBtnClass = (active: boolean) =>
    `w-12 h-12 rounded-lg border text-lg font-bold grid place-items-center select-none
     ${active ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}
     hover:border-black transition`;

  const Switch = ({
    checked,
    onChange,
    label,
    id,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    id: string;
  }) => (
    <label htmlFor={id} className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm font-medium">{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-black" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header fijo */}
      <div className="fixed top-4 left-4 z-10">
        <span className="text-xl font-extrabold tracking-wide">
          LETS DRIVE{username ? `, ${username}` : ""}
        </span>
      </div>

      {/* Layout */}
      <div className="max-w-6xl mx-auto pt-20 px-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Panel izquierdo */}
        <aside className="bg-white rounded-2xl shadow p-4 h-fit sticky top-20">
          <h2 className="text-base font-semibold mb-3">Controles</h2>
          <p className="text-sm text-gray-600 mb-3">
            Usa el <b>mouse</b> manteniendo presionado o el <b>teclado</b> (W/A/S/D).{" "}
            Direccionales: teclas <b>←</b> y <b>→</b>.
          </p>

          {/* D-pad WASD */}
          <div className="grid grid-cols-3 gap-3 place-items-center mb-3">
            <div />
            <button
              className={btnClass(pressed.w)}
              onMouseDown={() => setKey("w", true)}
              onMouseUp={() => setKey("w", false)}
              onMouseLeave={() => setKey("w", false)}
              aria-pressed={pressed.w}
              title="W = forward"
            >
              W
            </button>
            <div />

            <button
              className={btnClass(pressed.a)}
              onMouseDown={() => setKey("a", true)}
              onMouseUp={() => setKey("a", false)}
              onMouseLeave={() => setKey("a", false)}
              aria-pressed={pressed.a}
              title="A = right"
            >
              A
            </button>

            <div className="w-16 h-16" />

            <button
              className={btnClass(pressed.d)}
              onMouseDown={() => setKey("d", true)}
              onMouseUp={() => setKey("d", false)}
              onMouseLeave={() => setKey("d", false)}
              aria-pressed={pressed.d}
              title="D = left"
            >
              D
            </button>

            <div />
            <button
              className={btnClass(pressed.s)}
              onMouseDown={() => setKey("s", true)}
              onMouseUp={() => setKey("s", false)}
              onMouseLeave={() => setKey("s", false)}
              aria-pressed={pressed.s}
              title="S = reverse"
            >
              S
            </button>
            <div />
          </div>

          {/* Direccionales ← → */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              className={blinkerBtnClass(leftBlinker)}
              onClick={() => { toggleLeftBlinker(); postEvent("blinkers", { left: !leftBlinker, right: false }); }}
              title="Direccional izquierda (←)"
              aria-pressed={leftBlinker}
            >
              ←
            </button>
            <button
              className={blinkerBtnClass(rightBlinker)}
              onClick={() => { toggleRightBlinker(); postEvent("blinkers", { left: false, right: !rightBlinker }); }}
              title="Direccional derecha (→)"
              aria-pressed={rightBlinker}
            >
              →
            </button>
          </div>

          {/* Switches */}
          <div className="border-t pt-3 mt-1 space-y-2">
            <Switch
              id="rear-lights"
              label="Luces traseras"
              checked={rearLights}
              onChange={(v) => { setRearLights(v); /* evento lo manda el useEffect */ }}
            />
            <Switch
              id="front-lights"
              label="Luces delanteras"
              checked={frontLights}
              onChange={(v) => { setFrontLights(v); }}
            />
          </div>

          {/* Slider velocidad */}
          <div className="border-t pt-3 mt-3">
            <label htmlFor="speed" className="block text-sm font-medium mb-2">
              Velocidad: <span className="font-semibold">{speed}</span>
            </label>
            <input
              id="speed"
              type="range"
              min={0}
              max={100}
              step={10}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              {[0,10,20,30,40,50,60,70,80,90,100].map(n => <span key={n}>{n}</span>)}
            </div>
          </div>
        </aside>

        {/* Contenido principal */}
        <section className="bg-white rounded-2xl shadow p-6 min-h-[60vh]">
          <h2 className="text-2xl font-semibold mb-2">Panel de conducción</h2>
          <p className="text-gray-600 mb-4">
            Aquí puedes integrar video en tiempo real, indicadores, telemetría, etc.
          </p>

          {/* STREAM + FOTO */}
          <div className="grid gap-3 mb-6">
            <div className="relative">
              <canvas
                ref={streamCanvasRef}
                width={960}
                height={540}
                className="w-full aspect-video rounded-xl border border-gray-200 bg-black"
              />
              <button
                onClick={handleCapturePhoto}
                className="absolute bottom-3 right-3 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold shadow"
                title="Capturar foto del stream"
              >
                📷 Foto
              </button>
            </div>
            <div className="text-xs text-gray-500">
              * Este canvas dibuja los frames de <code>{STREAM_URL}/frame.jpg</code>; el botón descarga la captura actual.
            </div>
          </div>

          {/* Estado de direcciones (ON/OFF) — con tus labels */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card label="Forward (W)" active={pressed.w} />
            <Card label="Right (A)"   active={pressed.a} />
            <Card label="Reverse (S)" active={pressed.s} />
            <Card label="Left (D)"    active={pressed.d} />
          </div>

          {/* Sección de retroceso visible solo con S */}
          {pressed.s && (
            <div className="mt-4 p-4 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold mb-2">Asistencia de retroceso</h3>
              <p className="text-sm text-gray-600 mb-3">
                Representación de distancia a obstáculo: <b>5 = muy cerca (riesgo)</b>, 1 = lejos.
              </p>

              <div className="flex items-end gap-2 h-24">
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const active = lvl <= distanceLevel;
                  const heights = { 1: "h-6", 2: "h-10", 3: "h-14", 4: "h-20", 5: "h-24" } as const;
                  return (
                    <div key={lvl} className="flex flex-col items-center">
                      <div
                        className={`w-8 ${heights[lvl as 1 | 2 | 3 | 4 | 5]} rounded-md border ${
                          active ? "bg-red-600 border-red-700" : "bg-gray-200 border-gray-300"
                        }`}
                        title={`Nivel ${lvl}`}
                      />
                      <span className="text-xs mt-1"> {lvl} </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 text-sm">
                Nivel actual:{" "}
                <b className={`${distanceLevel >= 4 ? "text-red-600" : "text-gray-900"}`}>
                  {distanceLevel}
                </b>
              </div>

              {/* TODO: setDistanceLevel(0..5) con dato real del ultrasonido */}
            </div>
          )}

          {/* Info general + direccionales */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
            <Info label="Luces traseras"   value={rearLights ? "ON" : "OFF"} highlight={rearLights} />
            <Info label="Luces delanteras" value={frontLights ? "ON" : "OFF"} highlight={frontLights} />
            <Info label="Velocidad"        value={`${speed}`} />
            <Info label="Direccional izq." value={leftBlinker ? "ON" : "OFF"} highlight={leftBlinker} />
            <Info label="Direccional der." value={rightBlinker ? "ON" : "OFF"} highlight={rightBlinker} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        active ? "bg-black text-white border-black" : "bg-white border-gray-200"
      }`}
    >
      <div className="text-sm opacity-70">Estado</div>
      <div className="text-lg font-semibold">{label}</div>
      <div className="mt-2 text-sm">{active ? "ON" : "OFF"}</div>
    </div>
  );
}

function Info({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        highlight ? "bg-black text-white border-black" : "bg-white border-gray-200"
      }`}
    >
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
