# backend/control_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import requests
import os

app = Flask(__name__)

# Permitir solo a tu frontend
CORS(app, origins=["http://localhost:3000"], methods=["GET","POST","OPTIONS"], allow_headers=["Content-Type"])

CAR_API_BASE = os.environ.get("CAR_API_BASE", "http://192.168.200.200:5000")  # Car API real

STEER_INVERT = True  # el hardware gira al revés: left->right y viceversa

state = {
    "auto_blinkers": True,  # puedes arrancar en True o False
    "manual": {
        "left_signal": False,
        "right_signal": False,
        "main_lights": False,
    },
    "steer_hold": {"left": False, "right": False},
}

def maybe_update_auto_blinkers():
    """
    Enciende direccionales por giro SOLO si:
    - auto_blinkers está activo
    - NO hay direccionales manuales encendidas
    """
    if not state["auto_blinkers"]:
        return
    if state["manual"]["left_signal"] or state["manual"]["right_signal"]:
        return

    left_on  = state["steer_hold"]["left"]  and not state["steer_hold"]["right"]
    right_on = state["steer_hold"]["right"] and not state["steer_hold"]["left"]

    post_car("/light/left_signal",  {"state": left_on})
    post_car("/light/right_signal", {"state": right_on})


def log(*args):
    ...

def post_car(path: str, json: dict | None = None):
    url = f"{CAR_API_BASE}{path}"
    try:
        r = requests.post(url, json=json, timeout=2.0)
        r.raise_for_status()
        # La API del carro a veces no devuelve JSON => tolerar texto/vacío
        content = (r.text or "").strip()
        if not content:
            return {"ok": True, "status": r.status_code}
        try:
            return {"ok": True, "status": r.status_code, **r.json()}
        except Exception:
            return {"ok": True, "status": r.status_code, "text": content[:200]}
    except Exception as e:
        log("ERROR POST", url, json, "->", e)
        return {"ok": False, "error": str(e)}
    

# ---------- ENDPOINTS QUE LLAMA EL FRONTEND ----------
@app.post("/move/forward")
def move_forward():
    body = request.get_json(silent=True) or {}
    speed = int(body.get("speed", 0))
    # opcional: mantener estado local
    return jsonify(post_car("/move/forward", {"speed": speed}))

@app.post("/move/backward")
def move_backward():
    body = request.get_json(silent=True) or {}
    speed = int(body.get("speed", 0))
    return jsonify(post_car("/move/backward", {"speed": speed}))

@app.post("/stop")
def stop():
    # algunos firmwares exigen cuerpo; mandamos speed=0
    return jsonify(post_car("/stop", {"speed": 0}))


@app.post("/steer_state/<direction>")
def steer_state(direction):
    direction = direction.lower()
    if direction not in ("left", "right"):
        return jsonify({"ok": False, "error": "invalid direction"}), 400

    body = request.get_json(silent=True) or {}
    st = bool(body.get("state", False))

    # Actualiza hold lógico
    state["steer_hold"][direction] = st
    if st:
        other = "right" if direction == "left" else "left"
        state["steer_hold"][other] = False  # exclusivo

    # Envía al hardware (con inversión si aplica)
    if STEER_INVERT:
        car_dir = "right" if direction == "left" else "left"
    else:
        car_dir = direction
    resp = post_car(f"/steer_state/{car_dir}", {"state": st})

    # Evalúa direccionales automáticos
    maybe_update_auto_blinkers()
    return jsonify(resp)


# ---------- LUCES: main_lights, left_signal, right_signal ----------
# ---------- LUCES: main_lights, left_signal, right_signal (rutas explícitas) ----------
@app.post("/light/main_lights")
def light_main():
    body = request.get_json(silent=True) or {}
    s = bool(body.get("state", False))
    state["manual"]["main_lights"] = s
    return jsonify(post_car("/light/main_lights", {"state": s}))

@app.post("/light/left_signal")
def light_left():
    body = request.get_json(silent=True) or {}
    s = bool(body.get("state", False))
    state["manual"]["left_signal"] = s
    if s:
        # Exclusivo: si prendes izquierda manual, apaga derecha manual
        state["manual"]["right_signal"] = False
        post_car("/light/right_signal", {"state": False})
    resp = post_car("/light/left_signal", {"state": s})
    return jsonify(resp)

@app.post("/light/right_signal")
def light_right():
    body = request.get_json(silent=True) or {}
    s = bool(body.get("state", False))
    state["manual"]["right_signal"] = s
    if s:
        # Exclusivo: si prendes derecha manual, apaga izquierda manual
        state["manual"]["left_signal"] = False
        post_car("/light/left_signal", {"state": False})
    resp = post_car("/light/right_signal", {"state": s})
    return jsonify(resp)

@app.post("/lights/auto_blinkers")
def set_auto_blinkers():
    body = request.get_json(silent=True) or {}
    enabled = bool(body.get("enabled", False))
    state["auto_blinkers"] = enabled

    # Si lo apagas, y no hay manuales activos, apaga ambas por si quedaron encendidas
    if not enabled and not (state["manual"]["left_signal"] or state["manual"]["right_signal"]):
        post_car("/light/left_signal",  {"state": False})
        post_car("/light/right_signal", {"state": False})

    return jsonify({"ok": True, "auto_blinkers": enabled})



if __name__ == "__main__":
    # corre en 5001 para no chocar con otros servicios
    app.run(host="0.0.0.0", port=5001, debug=True)
