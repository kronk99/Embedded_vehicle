"use client";



import { useEffect, useState, useCallback, useRef } from "react";



type Pressed = {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
};

const API_BASE = "http://localhost:5001"; // <-- tu API
const EXTERNAL_STREAM_SRC = "http://192.168.18.164:5001";
const ULTRASONIC_URL = "http://localhost:5051/distance_level";

async function apiPost(path: string, data: any = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || res.statusText);
  try {
    return text ? JSON.parse(text) : { ok: true, status: res.status };
  } catch {
    return { ok: true, status: res.status, raw: text };
  }
}



const ALLOWED_SPEEDS = [0, 5, 30, 60, 90, 100] as const;

export default function DrivePage() {
  const [username, setUsername] = useState("");
  const [pressed, setPressed] = useState<Pressed>({
    w: false,
    a: false,
    s: false,
    d: false,
  });
  const [mainLights, setMainLights] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [leftBlinker, setLeftBlinker] = useState(false);
  const [rightBlinker, setRightBlinker] = useState(false);
  const [ultra, setUltra] = useState({
    front: { distance: 0, level: 0 },
    rear: { distance: 0, level: 0 },
  });

  // "forward" | "backward" | null
  const [moveDir, setMoveDir] = useState<"forward" | "backward" | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

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

  // === ENDPOINTS CORRECTOS: /move/{direction} ===
  const startMove = useCallback(
    async (direction: "forward" | "backward") => {
      setMoveDir(direction);
      await apiPost(`/move/${direction}`, { speed }); // body debe ser { speed }
    },
    [speed]
  );

  const stopMove = useCallback(async () => {
    // Detén el movimiento y evita re-envíos por cambios de velocidad
    setMoveDir(null);
    await apiPost("/move/forward", { speed: 0 }); // tu backend usa /move/{direction} y body {speed}
  }, []);

  const setSteer = useCallback(async (dir: "left" | "right", state: boolean) => {
    // Ahora el backend invierte si hace falta; aquí se manda "left" o "right" literal
    await apiPost(`/steer_state/${dir}`, { state });
  }, []);


  const setLight = useCallback(
    async (
      name: "main_lights" | "left_signal" | "right_signal",
      state: boolean
    ) => {
      await apiPost(`/light/${name}`, { state }); // body EXACTO {"state": bool}
    },
    []
  );

  const steerState = useCallback(
  async (dir: "left" | "right", state: boolean) => {
    // Si tu backend usa otro path, cámbialo aquí.
    await apiPost(`/steer_state/${dir}`, { state });
  },
  []
);

  // Ultrasónico opcional
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
    const u =
      typeof window !== "undefined" ? localStorage.getItem("username") : "";
    if (u) setUsername(u);
  }, []);

  // === Teclas: SOLO W/S mueven; A/D sin giro ===
  const setKey = useCallback(
    (key: keyof Pressed, val: boolean) => {
        setPressed((p) => (p[key] === val ? p : { ...p, [key]: val }));

        if (key === "w") {
          if (val) {
            startMove("forward");
          } else {
            if (pressed.s) {
              startMove("backward");
            } else {
              stopMove(); // 👉 solté W y no hay S: detén y deja de enviar
            }
          }
        }

        if (key === "s") {
          if (val) {
            startMove("backward");
          } else {
            if (pressed.w) {
              startMove("forward");
            } else {
              stopMove(); // 👉 solté S y no hay W: detén y deja de enviar
            }
          }
        }
         // ===== Dirección A/D (steer hold) =====
    // A / D: giro con hold
if (key === "a") {
  if (val) {
    // Inicia giro a la izquierda
    setSteer("left", true);
    // Si estaba girando a la derecha, suéltalo
    if (pressed.d) {
      setPressed((p) => ({ ...p, d: false }));
      setSteer("right", false);
    }
  } else {
    // Suelta giro a la izquierda
    setSteer("left", false);
  }
}

if (key === "d") {
  if (val) {
    // Inicia giro a la derecha
    setSteer("right", true);
    // Si estaba girando a la izquierda, suéltalo
    if (pressed.a) {
      setPressed((p) => ({ ...p, a: false }));
      setSteer("left", false);
    }
  } else {
    // Suelta giro a la derecha
    setSteer("right", false);
  }
}
  }, [pressed.s, pressed.w, pressed.a, pressed.d, startMove, stopMove, setSteer]);


  const [autoBlinkers, setAutoBlinkers] = useState(true);

  const toggleAutoBlinkers = useCallback(() => {
    setAutoBlinkers((prev) => {
      const next = !prev;
      // no esperamos respuesta; fire-and-forget
      apiPost("/lights/auto_blinkers", { enabled: next }).catch(() => {});
      return next;
    });
  }, []);

  // Direccionales manuales
  const toggleLeftBlinker = useCallback(() => {
    setLeftBlinker((prev) => {
      const next = !prev;
      if (next) {
        setRightBlinker(false);
        setLight("right_signal", false);
      }
      setLight("left_signal", next);
      return next;
    });
  }, [setLight]);

  const toggleRightBlinker = useCallback(() => {
    setRightBlinker((prev) => {
      const next = !prev;
      if (next) {
        setLeftBlinker(false);
        setLight("left_signal", false);
      }
      setLight("right_signal", next);
      return next;
    });
  }, [setLight]);

  // Luces principales
  const toggleMainLights = useCallback(() => {
    setMainLights((prev) => {
      const next = !prev;
      setLight("main_lights", next); // nombre correcto del endpoint
      return next;
    });
  }, [setLight]);

  // Listeners de teclado
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
        toggleMainLights();
        return;
      }

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
        if (!pressed.a) setKey("a", true);
        return;
      }
      if (k === "d") {
        e.preventDefault();
        if (!pressed.d) setKey("d", true);
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

      if (k === "a" && pressed.a) {
        e.preventDefault();
        setKey("a", false);
        return;
      }
      if (k === "d" && pressed.d) {
        e.preventDefault();
        setKey("d", false);
        return;
      }
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
 }, [pressed.w, pressed.s, pressed.a, pressed.d, setKey, toggleLeftBlinker, toggleRightBlinker, toggleMainLights]);

  // Si cambia la velocidad y seguimos en movimiento, reenviar al endpoint correcto
  useEffect(() => {
    if (moveDir) {
      // ✅ siempre {speed} y URL con la dirección
      apiPost(`/move/${moveDir}`, { speed });
    }
  }, [speed, moveDir]);

  // ====== UI (no modificada en estilos) ======
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
            W = forward (hold) · S = reverse (hold) · A/D sin giro · Direccionales: <b>J</b>/<b>L</b>. Luces: <b>T</b>.
          </p>

          {/* D-pad */}
          <div className="grid grid-cols-3 gap-3 place-items-center mb-3">
            <div />
            <button
              className={btnClass(pressed.w)}
              onMouseDown={() => setKey("w", true)}
              onMouseUp={() => setKey("w", false)}
            >
              W
            </button>
            <div />
            <button
                className={btnClass(pressed.a)}
                onMouseDown={() => setKey("a", true)}
                onMouseUp={() => setKey("a", false)}
              >
                A
              </button>

            <div className="w-16 h-16" />
            <button
  className={btnClass(pressed.d)}
  onMouseDown={() => setKey("d", true)}
  onMouseUp={() => setKey("d", false)}
>
  D
</button>
            <div />
            <button
              className={btnClass(pressed.s)}
              onMouseDown={() => setKey("s", true)}
              onMouseUp={() => setKey("s", false)}
            >
              S
            </button>
            <div />
          </div>

          {/* Direccionales */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button className={blinkerBtnClass(leftBlinker)} onClick={toggleLeftBlinker}>
              ←
            </button>
            <button className={blinkerBtnClass(rightBlinker)} onClick={toggleRightBlinker}>
              →
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 mb-4">
  <div className="text-sm font-medium">Direccionales automáticas</div>
  <button
    className={lightBtnClass(autoBlinkers)}
    onClick={toggleAutoBlinkers}
    title="Si está ON, se activan al girar (solo si no hay manuales encendidas)"
  >
    {autoBlinkers ? "Auto: ON" : "Auto: OFF"}
  </button>
</div>

          <div className="border-t pt-3 mt-1 space-y-2">
            <button className={lightBtnClass(mainLights)} onClick={toggleMainLights}>
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
            Stream embebido directamente desde <code>{EXTERNAL_STREAM_SRC}</code>.
          </p>

          <div className="grid gap-3 mb-6">
            <div className="relative">
              <iframe
                src={EXTERNAL_STREAM_SRC}
                className="w-full aspect-video rounded-xl border border-gray-200 bg-black"
                allow="autoplay; fullscreen"
                title="Camera Stream"
              />

              <button
                onClick={async () => {
                  try {
                    const resp = await fetch("http://localhost:5002/capture");
                    if (!resp.ok) throw new Error("Error al obtener captura");
                    const blob = await resp.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `captura_${new Date()
                      .toISOString()
                      .replace(/[:.]/g, "-")}.jpg`;
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
              * Stream embebido desde {EXTERNAL_STREAM_SRC}. El botón descarga
              una captura actual a través del proxy Flask.
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <Info label="Main Lights" value={mainLights ? "ON" : "OFF"} highlight={mainLights} />
            <Info label="Velocidad" value={`${speed}`} />
            <Info label="Direccional izq." value={leftBlinker ? "ON" : "OFF"} highlight={leftBlinker} />
            <Info label="Direccional der." value={rightBlinker ? "ON" : "OFF"} highlight={rightBlinker} />
            <Info label="Reverse (S)" value={pressed.s ? "ON" : "OFF"} highlight={pressed.s} />
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <SensorBar title="Sensor Frontal" data={ultra.front} />
            <SensorBar title="Sensor Trasero" data={ultra.rear} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-2xl border ${
        highlight ? "bg-black text-white border-black" : "bg-white border-gray-200"
      }`}
    >
      <div className="text-sm opacity-70">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function SensorBar({
  title,
  data,
}: {
  title: string;
  data: { distance: number; level: number };
}) {
  const colors = ["bg-green-500", "bg-lime-400", "bg-yellow-400", "bg-orange-500", "bg-red-600"];
  return (
    <div className="p-4 rounded-2xl border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="flex items-end gap-2 h-24">
        {[1, 2, 3, 4, 5].map((lvl) => {
          const active = lvl <= data.level;
          const heights = {
            1: "h-6",
            2: "h-10",
            3: "h-14",
            4: "h-20",
            5: "h-24",
          } as const;
          return (
            <div key={lvl} className="flex flex-col items-center">
              <div
                className={`w-8 ${heights[lvl as 1 | 2 | 3 | 4 | 5]} rounded-md border ${
                  active ? `${colors[lvl - 1]} border-gray-400` : "bg-gray-200 border-gray-300"
                }`}
                title={`Nivel ${lvl}`}
              />
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
