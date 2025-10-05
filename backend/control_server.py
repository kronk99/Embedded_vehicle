# backend/control_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import requests

app = Flask(__name__)
CORS(app)

CAR_API_BASE = "http://192.168.61.200:5000"
STEER_PULSE_MS = 500

state = {
    "speed": 0,
    "moving_dir": None,      # "forward" | "backward" | None
    "moving_active": False,
}

def log(*args):
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[{now}]", *args)

def post(path: str, json: dict | None = None):
    url = f"{CAR_API_BASE}{path}"
    try:
        r = requests.post(url, json=json, timeout=2.0)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log("ERROR POST", url, json, "->", e)
        return {"error": str(e)}

def handle_movement(key: str, state_down: bool, dir_label: str):
    global state
    if dir_label in ("forward", "backward"):
        if state_down:
            state["moving_dir"] = dir_label
            state["moving_active"] = True
            resp = post(f"/move/{dir_label}", {"speed": int(state["speed"])})
            log("MOVE", dir_label, "speed", state["speed"], "->", resp)
        else:
            state["moving_active"] = False
            resp = post("/stop", {})
            log("STOP ->", resp)
    elif dir_label in ("left", "right"):
        if state_down:
            resp = post(f"/steer/{dir_label}", {"pulse": STEER_PULSE_MS})
            log("STEER", dir_label, f"{STEER_PULSE_MS}ms", "->", resp)

def handle_blinkers(left: bool | None, right: bool | None):
    if left is not None:
        resp = post("/light/left_signal", {"state": bool(left)})
        log("BLINKER LEFT =", left, "->", resp)
    if right is not None:
        resp = post("/light/right_signal", {"state": bool(right)})
        log("BLINKER RIGHT =", right, "->", resp)

def handle_main_lights(state_on: bool):
    resp = post("/light/main_lights", {"state": bool(state_on)})
    log("MAIN LIGHTS =", state_on, "->", resp)

def handle_speed(new_speed: int):
    global state
    state["speed"] = int(new_speed)
    log("SPEED =", state["speed"])
    if state["moving_active"] and state["moving_dir"] in ("forward", "backward"):
        resp = post(f"/move/{state['moving_dir']}", {"speed": state["speed"]})
        log("MOVE (update speed)", state["moving_dir"], state["speed"], "->", resp)

@app.route("/event", methods=["POST"])
def event():
    data = request.get_json(force=True, silent=True) or {}
    topic = data.get("topic")
    payload = data.get("payload", {}) or {}

    if topic == "movement":
        key = str(payload.get("key", "")).lower()
        st = payload.get("state")
        dir_label = payload.get("dir")
        if key and st in ("down", "up") and dir_label in ("forward", "backward", "left", "right"):
            handle_movement(key, st == "down", dir_label)
        else:
            log("WARN movement payload inválido:", payload)

    elif topic == "blinkers":
        left = payload.get("left")
        right = payload.get("right")
        handle_blinkers(left if left is not None else None,
                        right if right is not None else None)

    elif topic == "main_lights":
        state_on = bool(payload.get("state", False))
        handle_main_lights(state_on)

    elif topic == "lights":
        front = payload.get("front")
        if front is not None:
            handle_main_lights(bool(front))

    elif topic == "speed":
        try:
            value = int(payload.get("value", 0))
        except Exception:
            value = 0
        handle_speed(value)

    else:
        log("WARN topic desconocido:", topic, payload)

    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
