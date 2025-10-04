// src/app/drive/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Pressed = {
  w: boolean; // forward
  a: boolean; // right (pulso 80ms)
  s: boolean; // reverse
  d: boolean; // left  (pulso 80ms)
};

const CONTROLS_URL = "http://localhost:5001"; // Flask controles
const STREAM_URL = "http://localhost:5002";   // Flask stream

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
// W = forward, S = reverse, A = right, D = left
function keyToDir(k: keyof Pressed) {
  switch (k) {
    case "w": return "forward";
    case "s": return "reverse";
    case "a": return "right";
    case "d": return "left";
    default: return "";
  }
}

// Velocidades permitidas
const ALLOWED_SPEEDS = [0, 5, 30, 60, 90, 100] as const;

export default function DrivePage() {
  const [username, setUsername] = useState<string>("");
  const [pressed, setPressed] = useState<Pressed>({ w: false, a: false, s: false, d: false });

  // switches y velocidad
  const [rearLights, setRearLights] = useState<boolean>(false);
  const [frontLights, setFrontLights] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(0); // limitado a ALLOWED_SPEEDS

  // direccionales (exclusivos)
  const [leftBlinker, setLeftBlinker] = useState<boolean>(false);
  const [rightBlinker, setRightBlinker] = useState<boolean>(false);

  // canvas del stream
  const streamCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // retroceso (0..5) 5 = muy cerca
  const [distanceLevel, setDistanceLevel] = useState<number>(0);

  // timers de pulso para A/D (evitar re-entradas)
  const pulseTimers = useRef<{ a: number | null; d: number | null }>({ a: null, d: null });

  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("username") : "";
    if (u) setUsername(u);
  }, []);

  // === Enviar solo la tecla que cambió ===
  const setKey = useCallback((key: keyof Pressed, val: boolean) => {
    setPressed((p) => (p[key] === val ? p : { ...p, [key]: val }));
    postEvent("movement", { key, state: val ? "down" : "up", dir: keyToDir(key) });
  }, []);

  // Pulso de 80ms para A/D
  const pulseKey = useCallback((key: "a" | "d") => {
    // evitar si ya hay un pulso activo
    if (pulseTimers.current[key] !== null) return;
    setKey(key, true); // down inmediato
    const tid = window.setTimeout(() => {
      setKey(key, false); // up a los 80ms
      pulseTimers.current[key] = null;
    }, 80);
    pulseTimers.current[key] = tid as unknown as number;
  }, [setKey]);

  // Direccionales exclusivos
  const toggleLeftBlinker = useCallback(() => {
    setLeftBlinker((prev) => {
      const next = !prev;
      if (next) setRightBlinker(false);
      postEvent("blinkers", { left: next, right: false });
      return next;
    });
  }, []);
  const toggleRightBlinker = useCallback(() => {
    setRightBlinker((prev) => {
      const next = !prev;
      if (next) setLeftBlinker(false);
      postEvent("blinkers", { left: false, right: next });
      return next;
    });
  }, []);

  // Teclado global:
  // - WASD: W/S sostenidos; A/D = pulso 80ms
  // - Direccionales con J (izq) y L (der)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      // Direccionales con J/L (toggle exclusivo, sin autorepeat spam)
      if ((k === "j" || k === "l") && e.repeat) return;

      if (k === "j") {
        e.preventDefault();
        toggleLeftBlinker();
        return;
      }
      if (k === "l") {
        e.preventDefault();
        toggleRightBlinker();
        return;
      }

      // Movimiento
      if (k === "w") {
        e.preventDefault();
        if (!pressed.w) setKey("w", true);
        return;
      }
      if (k === "s") {
        e.preventDefault();
        if (!pressed.s) setKey("s", true);
        return;
      }
      if (k === "a") {
        e.preventDefault();
        pulseKey("a"); // pulso 80ms
        return;
      }
      if (k === "d") {
        e.preventDefault();
        pulseKey("d"); // pulso 80ms
        return;
      }
    };

    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" && pressed.w) {
        e.preventDefault();
        setKey("w", false);
        return;
      }
      if (k === "s" && pressed.s) {
        e.preventDefault();
        setKey("s", false);
        return;
      }
      // A/D no hacen nada en keyup (ya son pulso)
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [pressed.w, pressed.s, setKey, pulseKey, toggleLeftBlinker, toggleRightBlinker]);

  // Auto luces traseras con S
  useEffect(() => {
    setRearLights(pressed.s);
  }, [pressed.s]);

  // Reportar cambios de luces / direccionales / velocidad
  useEffect(() => {
    postEvent("lights", { rear: rearLights, front: frontLights });
  }, [rearLights, frontLights]);

  useEffect(() => {
    postEvent("blinkers", { left: leftBlinker, right: rightBlinker });
  }, [leftBlinker, rightBlinker]);

  useEffect(() => {
    postEvent("speed", { value: speed });
  }, [speed]);

  // Dibujar frames del stream
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
          ctx.clearRect(0, 0, W, H);
          const iw = img.width, ih = img.height;
          const scale = Math.min(W / iw, H / ih);
          const dw = iw * scale, dh = ih * scale;
          const dx = (W - dw) / 2, dy = (H - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
        await new Promise((r) => setTimeout(r, 140)); // ~7 fps
      }
    };
    drawLoop();
    return () => { cancelled = true; };
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

  // UI helpers
  const btnClass = (active: boolean) =>
    `w-16 h-16 rounded-xl border text-lg font-bold grid place-items-center select-none 
     ${active ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"} 
     hover:border-black transition`;

  const blinkerBtnClass = (active: boolean) =>
    `w-12 h-12 rounded-lg border text-lg font-bold grid place-items-center select-none
     ${active ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}
     hover:border-black transition`;

  const speedBtnClass = (active: boolean) =>
    `px-3 py-1 rounded-lg border text-sm font-semibold select-none
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
      {/* Header */}
      <div className="fixed top-4 left-4 z-10">
        <span className="text-xl font-extrabold tracking-wide">
          LETS DRIVE{username ? `, ${username}` : ""}
        </span>
      </div>

      <div className="max-w-6xl mx-auto pt-20 px-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Panel izquierdo */}
        <aside className="bg-white rounded-2xl shadow p-4 h-fit sticky top-20">
          <h2 className="text-base font-semibold mb-3">Controles</h2>
          <p className="text-sm text-gray-600 mb-3">
            W = forward (sostenido) · S = reverse (sostenido) · A = right (pulso 80 ms) · D = left (pulso 80 ms) ·
            Direccionales: <b>J</b> (izq) y <b>L</b> (der).
          </p>

          {/* D-pad WASD (A/D con pulso) */}
          <div className="grid grid-cols-3 gap-3 place-items-center mb-3">
            <div />
            <button
              className={btnClass(pressed.w)}
              onMouseDown={() => setKey("w", true)}
              onMouseUp={() => setKey("w", false)}
              onMouseLeave={() => setKey("w", false)}
              aria-pressed={pressed.w}
              title="W = forward (hold)"
            >
              W
            </button>
            <div />

            <button
              className={btnClass(false /* pulso: no se queda activo */)}
              onMouseDown={() => pulseKey("a")}
              aria-pressed={false}
              title="A = right (pulso 80ms)"
            >
              A
            </button>

            <div className="w-16 h-16" />

            <button
              className={btnClass(false /* pulso: no se queda activo */)}
              onMouseDown={() => pulseKey("d")}
              aria-pressed={false}
              title="D = left (pulso 80ms)"
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
              title="S = reverse (hold)"
            >
              S
            </button>
            <div />
          </div>

          {/* Direccionales (botones) */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              className={blinkerBtnClass(leftBlinker)}
              onClick={toggleLeftBlinker}
              title="Direccional izquierda (tecla J)"
              aria-pressed={leftBlinker}
            >
              ←
            </button>
            <button
              className={blinkerBtnClass(rightBlinker)}
              onClick={toggleRightBlinker}
              title="Direccional derecha (tecla L)"
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
              onChange={(v) => setRearLights(v)}
            />
            <Switch
              id="front-lights"
              label="Luces delanteras"
              checked={frontLights}
              onChange={(v) => setFrontLights(v)}
            />
          </div>

          {/* Velocidad: solo valores permitidos */}
          <div className="border-t pt-3 mt-3">
            <div className="mb-2 text-sm font-medium">
              Velocidad: <span className="font-semibold">{speed}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALLOWED_SPEEDS.map((v) => (
                <button
                  key={v}
                  className={speedBtnClass(speed === v)}
                  onClick={() => setSpeed(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Panel principal */}
        <section className="bg-white rounded-2xl shadow p-6 min-h-[60vh]">
          <h2 className="text-2xl font-semibold mb-2">Panel de conducción</h2>
          <p className="text-gray-600 mb-4">
            Stream simulado desde <code>{STREAM_URL}</code>, controles y estados abajo.
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
              * El botón descarga la captura actual del canvas.
            </div>
          </div>

          {/* Estados de dirección (ON/OFF) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card label="Forward (W)" active={pressed.w} />
            <Card label="Right (A pulse)" active={false} />
            <Card label="Reverse (S)" active={pressed.s} />
            <Card label="Left (D pulse)" active={false} />
          </div>

          {/* Retroceso visible solo con S */}
          {pressed.s && (
            <div className="mt-4 p-4 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold mb-2">Asistencia de retroceso</h3>
              <p className="text-sm text-gray-600 mb-3">
                Representación de distancia a obstáculo: <b>5 = muy cerca (riesgo)</b>, 1 = lejos.
              </p>
              <div className="flex items-end gap-2 h-24">
                {[1,2,3,4,5].map((lvl) => {
                  const active = lvl <= distanceLevel;
                  const heights = { 1: "h-6", 2: "h-10", 3: "h-14", 4: "h-20", 5: "h-24" } as const;
                  return (
                    <div key={lvl} className="flex flex-col items-center">
                      <div
                        className={`w-8 ${heights[lvl as 1|2|3|4|5]} rounded-md border ${
                          active ? "bg-red-600 border-red-700" : "bg-gray-200 border-gray-300"
                        }`}
                        title={`Nivel ${lvl}`}
                      />
                      <span className="text-xs mt-1">{lvl}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-sm">
                Nivel actual:{" "}
                <b className={`${distanceLevel >= 4 ? "text-red-600" : "text-gray-900"}`}>{distanceLevel}</b>
              </div>
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
      className={`p-4 rounded-xl border ${active ? "bg-black text-white border-black" : "bg-white border-gray-200"}`}
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
      className={`p-4 rounded-xl border ${highlight ? "bg-black text-white border-black" : "bg-white border-gray-200"}`}
    >
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
