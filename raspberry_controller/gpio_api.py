from flask import Flask, jsonify
from gpio_driver import GPIO

app = Flask(__name__)
gpio_objects = {}

def get_gpio(pin):
    if pin not in gpio_objects:
        gpio = GPIO(pin)
        gpio.set_direction("out")
        gpio_objects[pin] = gpio
    return gpio_objects[pin]

@app.route("/")
def index():
    return jsonify({"status": "API GPIO Flask activa 🚀"})

@app.route("/gpio/<int:pin>/on", methods=["POST"])
def gpio_on(pin):
    try:
        gpio = get_gpio(pin)
        gpio.write(1)
        return jsonify({"pin": pin, "state": "HIGH"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/gpio/<int:pin>/off", methods=["POST"])
def gpio_off(pin):
    try:
        gpio = get_gpio(pin)
        gpio.write(0)
        return jsonify({"pin": pin, "state": "LOW"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/gpio/<int:pin>/toggle", methods=["POST"])
def gpio_toggle(pin):
    try:
        gpio = get_gpio(pin)
        value = 0 if gpio.read() == 1 else 1
        gpio.write(value)
        return jsonify({"pin": pin, "state": "HIGH" if value else "LOW"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/gpio/<int:pin>/read", methods=["GET"])
def gpio_read(pin):
    try:
        gpio = get_gpio(pin)
        value = gpio.read()
        return jsonify({"pin": pin, "state": "HIGH" if value else "LOW"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

app.run(host="0.0.0.0", port=5000, debug=True)