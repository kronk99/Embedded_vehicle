
# apiUltrasonic.py
from flask import Flask, jsonify, request
from ultrasonic_sensor import UltrasonicSensor
import threading
import time

app = Flask(__name__)

GLOBAL_TIMEOUT = 0.04  # seconds

# --- Safe initialization ---
def init_sensor(name, trig, echo):
    try:
        sensor = UltrasonicSensor(trig_pin=trig, echo_pin=echo, timeout=GLOBAL_TIMEOUT)
        test = sensor.get_distance()
        if test is None:
            print(f"[WARN] Sensor '{name}' not responding. Marked as inactive.")
            return None
        print(f"[OK] Sensor '{name}' initialized successfully.")
        return sensor
    except Exception as e:
        print(f"[ERROR] Cannot initialize sensor '{name}': {e}")
        return None


# --- Two sensors setup ---
sensors = {
    "front": init_sensor("front", 5, 6),
    "rear": init_sensor("rear", 19, 26)
}

latest_readings = {"front": 0.0, "rear": 0.0}
stop_thread = False


# --- Safe reading wrappers ---
def safe_distance(sensor):
    """Read safely from one sensor."""
    if sensor is None or not getattr(sensor, "available", False):
        return 0.0, "not detected"
    dist = sensor.get_distance()
    if dist is None:
        return 0.0, "timeout"
    return round(dist, 2), "ok"


def safe_average(sensor, samples=5, delay=0.05):
    """Average reading safely."""
    if sensor is None or not getattr(sensor, "available", False):
        return 0.0, "not detected"
    dist = sensor.get_average_distance(samples=samples, delay=delay)
    if dist is None:
        return 0.0, "timeout"
    return round(dist, 2), "ok"


def sensor_loop(interval=0.3):
    """Background thread that updates readings periodically."""
    global latest_readings
    while not stop_thread:
        for name, sensor in sensors.items():
            dist, _ = safe_average(sensor)
            latest_readings[name] = dist
        time.sleep(interval)


# --- API Routes ---
@app.route("/")
def index():
    return jsonify({
        "status": "ok",
        "message": "Dual Ultrasonic Sensor API (fault-tolerant) active 🚗📡",
        "endpoints": [
            "/sensors",
            "/sensor/<name>",
            "/sensor/<name>/average",
            "/status"
        ]
    })


@app.route("/sensors", methods=["GET"])
def get_all_sensors():
    """Return average readings from all sensors."""
    result = {}
    for name, sensor in sensors.items():
        dist, status = safe_average(sensor)
        result[name] = {"distance_cm": dist, "status": status}
    return jsonify(result)


@app.route("/sensor/<name>", methods=["GET"])
def get_sensor_distance(name):
    """Immediate reading from one sensor."""
    if name not in sensors:
        return jsonify({"error": f"Sensor '{name}' not found"}), 404

    dist, status = safe_distance(sensors[name])
    return jsonify({"sensor": name, "distance_cm": dist, "status": status})


@app.route("/sensor/<name>/average", methods=["GET"])
def get_sensor_average(name):
    """Averaged reading from one sensor."""
    if name not in sensors:
        return jsonify({"error": f"Sensor '{name}' not found"}), 404

    samples = int(request.args.get("samples", 5))
    delay = float(request.args.get("delay", 0.05))
    dist, status = safe_average(sensors[name], samples=samples, delay=delay)
    return jsonify({"sensor": name, "distance_cm": dist, "status": status})


@app.route("/status", methods=["GET"])
def get_status():
    """Return latest background readings."""
    return jsonify({
        "latest_distances_cm": latest_readings,
        "running": not stop_thread
    })


# --- Run the API ---
if __name__ == "__main__":
    thread = threading.Thread(target=sensor_loop, daemon=True)
    thread.start()
    try:
        app.run(host="0.0.0.0", port=5050)
    finally:
        stop_thread = True
