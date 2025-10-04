from flask import Flask, request, jsonify
from car_controller import CarController

app = Flask(__name__)

# Pines tracción
traction_pwm = 18
traction_dir_pins = {"in1": 23, "in2": 24}

# Pines steering
steering_pwm = 12
steering_dir_pins = {"in3": 20, "in4": 21}

# Pines luces
lights_pins = {
    "left_signal": 25,
    "right_signal": 26,
    "main_lights": 27
}

car = CarController(
    traction_pwm,
    traction_dir_pins,
    steering_pwm,
    steering_dir_pins,
    lights_pins,
    frequency=100
)

# --- Endpoints ---
@app.route("/move/<direction>", methods=["POST"])
def move(direction):
    data = request.get_json(force=True, silent=True) or {}
    speed = int(data.get("speed", 100))
    status = car.move(direction, speed)
    return jsonify({"status": status})

@app.route("/steer/<direction>", methods=["POST"])
def steer(direction):
    data = request.get_json(force=True, silent=True) or {}
    pulse = int(data.get("pulse", 200))
    status = car.steer(direction, pulse_ms=pulse)
    return jsonify({"status": status})

@app.route("/light/<name>", methods=["POST"])
def light(name):
    data = request.get_json(force=True, silent=True) or {}
    state = bool(data.get("state", True))
    status = car.toggle_light(name, state)
    return jsonify({"status": status})

@app.route("/stop", methods=["POST"])
def stop():
    car.stop()
    return jsonify({"status": "Carro detenido"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
