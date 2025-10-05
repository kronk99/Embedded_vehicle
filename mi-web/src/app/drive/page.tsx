"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Pressed = {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
};

const CONTROLS_URL = "http://localhost:5001";
const EXTERNAL_STREAM_SRC = "http://192.168.61.200:5001";
const ULTRASONIC_URL = "http://localhost:5051/distance_level";

async function postEvent(topic: string, payload: any) {
  try {
    await fetch(`${CONTROLS_URL}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, payload }),
      keepalive: true,
    });
  } catch {}
}

function keyToDir(k: keyof Pressed) {
  switch (k) {
    case "w": return "forward";
    case "s": return "backward";
    case "a": return "right";
    case "d": return "left";
    default: return "";
  }
}

const ALLOWED_SPEEDS = [0, 5, 30, 60, 90, 100] as const;

export default function DrivePage() {
  const [username, setUsername] = useState("");
  const [pressed, setPressed] = useState<Pressed>({ w: false, a: false, s: false, d: false });
  const [mainLights, setMainLights] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [leftBlinker, setLeftBlinker] = useState(false);
  const [rightBlinker, setRightBlinker] = useState(false);
  const [ultra, setUltra] = useState({
    front: { distance: 0, level: 0 },
    rear: { distance: 0, level: 0 },
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const pulseTimers = useRef<{ a: number | null; d: number | null }>({ a: null, d: null });

  const playBeep = useCallback((distance: number) => {
    if (distance > 20) return;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    const freq = 200 + (20 - distance) * 40;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }, []);

  // 🔁 Mantener luces encendidas reenviando estado cada 0.5s
  useEffect(() => {
    const interval = setInterval(() => {
      if (mainLights || leftBlinker || rightBlinker) {
        postEvent("main_lights", { state: mainLights });
        postEvent("blinkers", { left: leftBlinker, right: rightBlinker });
      }
    }, 800);
    return () => clearInterval(interval);
  }, [mainLights, leftBlinker, rightBlinker]);

  // 🔊 Leer sensores ultrasónicos
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(ULTRASONIC_URL);
        if (!res.ok) return;
        const data = await res.json();
        if (data.front && data.rear) {
          const parsed = {
            front: { distance: data.front.distance, level: data.front.level },
            rear: { distance: data.rear.distance, level: data.rear.level },
          };
          setUltra(parsed);
          if (parsed.front.distance < 20) playBeep(parsed.front.distance);
          if (parsed.rear.distance < 20) playBeep(parsed.rear.distance);
        }
      } catch {}
    }, 1000);
    return () => clearInterval(interval);
  }, [playBeep]);

  useEffect(() => {
    const u = typeof window !== "undefined" ? localStorage.getItem("username") : "";
    if (u) setUsername(u);
  }, []);

// === Manejo de teclas y sincronización con luces ===
const setKey = useCallback(
  (key: keyof Pressed, val: boolean) => {
    setPressed((p) => (p[key] === val ? p : { ...p, [key]: val }));

    // Envía el evento de movimiento
    postEvent("movement", { key, state: val ? "down" : "up", dir: keyToDir(key) });

    // 💡 Mantiene sincronizadas luces y direccionales cada vez
    postEvent("main_lights", { state: mainLights });
    postEvent("blinkers", { left: leftBlinker, right: rightBlinker });
    postEvent("speed", { value: speed });
  },
  [mainLights, leftBlinker, rightBlinker, speed]
);

const toggleLeftBlinker = useCallback(() => { setLeftBlinker((prev) => { const next = !prev; if (next) setRightBlinker(false); postEvent("blinkers", { left: next, right: false }); return next; }); }, []); 
const toggleRightBlinker = useCallback(() => { setRightBlinker((prev) => { const next = !prev; if (next) setLeftBlinker(false); postEvent("blinkers", { left: false, right: next }); return next; }); }, []);



const pulseKey = useCallback(
  (key: "a" | "d") => {
    if (pulseTimers.current[key] !== null) return;
    setKey(key, true);
    const tid = window.setTimeout(() => {
      setKey(key, false);
      pulseTimers.current[key] = null;
    }, 80);
    pulseTimers.current[key] = tid as unknown as number;
  },
  [setKey]
);

useEffect(() => {
  const down = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if ((k === "j" || k === "l" || k === "t") && e.repeat) return;
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
    if (k === "t") {
      e.preventDefault();
      setMainLights((prev) => {
        const next = !prev;
        postEvent("main_lights", { state: next });
        return next;
      });
      return;
    }

    // Movimiento (mantiene luces encendidas)
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
      pulseKey("a");
      return;
    }
    if (k === "d") {
      e.preventDefault();
      pulseKey("d");
      return;
    }
  };

  const up = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();

    // 🔁 Al soltar también reenviamos luces y direccionales
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
    if (k === "a" || k === "d") {
      // aunque sean pulsos, reenviamos luces
      postEvent("main_lights", { state: mainLights });
      postEvent("blinkers", { left: leftBlinker, right: rightBlinker });
      postEvent("speed", { value: speed });
    }
  };

  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
  };
}, [pressed.w, pressed.s, setKey, pulseKey, toggleLeftBlinker, toggleRightBlinker, mainLights, leftBlinker, rightBlinker, speed]);



  // Se mantiene el de velocidad (importante)
  useEffect(() => {
    postEvent("speed", { value: speed });
  }, [speed]);

  // Opcional: mantener estos dos para respuesta inmediata (no son obligatorios)
  useEffect(() => {
    postEvent("main_lights", { state: mainLights });
  }, [mainLights]);

  useEffect(() => {
    postEvent("blinkers", { left: leftBlinker, right: rightBlinker });
  }, [leftBlinker, rightBlinker]);


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

  const lightBtnClass = (on: boolean) =>
    `w-full px-3 py-2 rounded-lg border text-sm font-semibold select-none
     ${on ? "bg-black text-white border-black" : "bg-white text-black border-gray-300"}
     hover:border-black transition`;

  return (
    <main className="min-h-screen bg-gray-50">
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
            W = forward (hold) · S = reverse (hold) · A = right (pulse 80 ms) · D = left (pulse 80 ms) ·
            Direccionales: <b>J</b>/<b>L</b>. Luces (Main): <b>T</b> o botón.
          </p>

          {/* D-pad */}
          <div className="grid grid-cols-3 gap-3 place-items-center mb-3">
            <div />
            <button className={btnClass(pressed.w)} onMouseDown={() => setKey("w", true)} onMouseUp={() => setKey("w", false)}>W</button>
            <div />
            <button className={btnClass(false)} onMouseDown={() => pulseKey("a")}>A</button>
            <div className="w-16 h-16" />
            <button className={btnClass(false)} onMouseDown={() => pulseKey("d")}>D</button>
            <div />
            <button className={btnClass(pressed.s)} onMouseDown={() => setKey("s", true)} onMouseUp={() => setKey("s", false)}>S</button>
            <div />
          </div>

          {/* Direccionales */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button className={blinkerBtnClass(leftBlinker)} onClick={toggleLeftBlinker}>←</button>
            <button className={blinkerBtnClass(rightBlinker)} onClick={toggleRightBlinker}>→</button>
          </div>

          <div className="border-t pt-3 mt-1 space-y-2">
            <button className={lightBtnClass(mainLights)} onClick={() => setMainLights((p) => { const n = !p; postEvent("main_lights", { state: n }); return n; })}>
              {mainLights ? "Main Lights: ON" : "Main Lights: OFF"}
            </button>
          </div>

          {/* Velocidad */}
          <div className="border-t pt-3 mt-3">
            <div className="mb-2 text-sm font-medium">
              Velocidad: <span className="font-semibold">{speed}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALLOWED_SPEEDS.map((v) => (
                <button key={v} className={speedBtnClass(speed === v)} onClick={() => setSpeed(v)}>{v}</button>
              ))}
            </div>
          </div>
        </aside>

        {/* Panel principal */}
        <section className="bg-white rounded-2xl shadow p-6 min-h-[60vh]">
          <h2 className="text-2xl font-semibold mb-2">Panel de conducción</h2>
          <p className="text-gray-600 mb-4">
            Stream embebido directamente desde <code>{EXTERNAL_STREAM_SRC}</code>.
          </p>

          {/* STREAM + CAPTURA */}
          <div className="grid gap-3 mb-6">
            <div className="relative">
              <iframe
                src={EXTERNAL_STREAM_SRC}
                className="w-full aspect-video rounded-xl border border-gray-200 bg-black"
                allow="autoplay; fullscreen"
                title="Camera Stream"
              />

              {/* Botón de captura */}
              <button
                onClick={async () => {
                  try {
                    const resp = await fetch("http://localhost:5002/capture");
                    if (!resp.ok) throw new Error("Error al obtener captura");
                    const blob = await resp.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `captura_${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    alert("No se pudo capturar el frame: " + err);
                  }
                }}
                className="absolute bottom-3 right-3 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold shadow"
                title="Capturar foto del stream"
              >
                📸 Captura
              </button>
            </div>

            <div className="text-xs text-gray-500">
              * Stream embebido desde {EXTERNAL_STREAM_SRC}. El botón descarga una captura actual a través del proxy Flask.
            </div>
          </div>


          {/* Estados */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <Info label="Main Lights" value={mainLights ? "ON" : "OFF"} highlight={mainLights} />
            <Info label="Velocidad" value={`${speed}`} />
            <Info label="Direccional izq." value={leftBlinker ? "ON" : "OFF"} highlight={leftBlinker} />
            <Info label="Direccional der." value={rightBlinker ? "ON" : "OFF"} highlight={rightBlinker} />
            <Info label="Reverse (S)" value={pressed.s ? "ON" : "OFF"} highlight={pressed.s} />
          </div>

          {/* Sensores ultrasónicos */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <SensorBar title="Sensor Frontal" data={ultra.front} />
            <SensorBar title="Sensor Trasero" data={ultra.rear} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl border ${highlight ? "bg-black text-white border-black" : "bg-white border-gray-200"}`}>
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function SensorBar({ title, data }: { title: string; data: { distance: number; level: number } }) {
  const colors = ["bg-green-500", "bg-lime-400", "bg-yellow-400", "bg-orange-500", "bg-red-600"];
  return (
    <div className="p-4 rounded-2xl border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="flex items-end gap-2 h-24">
        {[1,2,3,4,5].map((lvl) => {
          const active = lvl <= data.level;
          const heights = { 1: "h-6", 2: "h-10", 3: "h-14", 4: "h-20", 5: "h-24" } as const;
          return (
            <div key={lvl} className="flex flex-col items-center">
              <div className={`w-8 ${heights[lvl as 1|2|3|4|5]} rounded-md border ${
                active ? `${colors[lvl-1]} border-gray-400` : "bg-gray-200 border-gray-300"
              }`} title={`Nivel ${lvl}`} />
              <span className="text-xs mt-1">{lvl}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-sm">
        Medida actual: <b>{data.distance.toFixed(1)} cm</b>
      </div>
    </div>
  );
}
