# backend/control_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import requests
import os

app = Flask(__name__)

# Permitir solo a tu frontend
CORS(app, origins=["http://localhost:3000"], methods=["GET","POST","OPTIONS"], allow_headers=["Content-Type"])

CAR_API_BASE = os.environ.get("CAR_API_BASE", "http://192.168.18.164:5000")  # Car API real

def log(*args):
    ...

def post_car(path: str, json: dict | None = None):
    url = f"{CAR_API_BASE}{path}"
    try:
        r = requests.post(url, json=json, timeout=2.0)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log("ERROR POST", url, json, "->", e)
        # Devuelve algo legible al frontend aunque el Car API falle
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

if __name__ == "__main__":
    # corre en 5001 para no chocar con otros servicios
    app.run(host="0.0.0.0", port=5001, debug=True)
