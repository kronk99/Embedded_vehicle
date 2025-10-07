from flask import Flask, jsonify
from flask_cors import CORS
import threading
import time
import requests

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


ULTRASONIC_API = "http://192.168.18.164:5050"
latest_data = {"front": {"distance": 0.0, "level": 0},
               "rear": {"distance": 0.0, "level": 0}}
stop_thread = False


def get_distance(sensor):
    """Lee distancia desde /sensor/front o /sensor/rear"""
    try:
        r = requests.get(f"{ULTRASONIC_API}/sensor/{sensor}", timeout=1.0)
        if r.status_code == 200:
            js = r.json()
            if js.get("status") == "ok":
                return float(js.get("distance_cm", 0.0))
    except Exception as e:
        print(f"[WARN] No se pudo leer {sensor} -> {e}")
    return None


def distance_to_level(dist_cm):
    """Mapea la distancia a un nivel 0–5."""
    if dist_cm <= 5:
        return 5
    elif dist_cm <= 10:
        return 4
    elif dist_cm <= 20:
        return 3
    elif dist_cm <= 35:
        return 2
    elif dist_cm <= 50:
        return 1
    else:
        return 0


def update_loop():
    """Actualiza cada segundo."""
    global latest_data
    while not stop_thread:
        updated = latest_data.copy()
        for name in ("front", "rear"):
            dist = get_distance(name)
            if dist is not None:
                updated[name] = {
                    "distance": round(dist, 1),
                    "level": distance_to_level(dist)
                }
        latest_data = updated
        print(f"[UPDATE] {latest_data}")
        time.sleep(1.0)


@app.route("/distance_level", methods=["GET"])
def distance_level():
    """Devuelve JSON listo para el frontend."""
    return jsonify(latest_data)


if __name__ == "__main__":
    thread = threading.Thread(target=update_loop, daemon=True)
    thread.start()
    try:
        app.run(host="0.0.0.0", port=5051)
    finally:
        stop_thread = True
