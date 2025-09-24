import gpioDRIVER import GPIO
from pwm import pwm_init, pwm_set_duty, pwm_start, pwm_stop

rom flask import Flask, jsonify
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
        gpio.set_value("1")
        return jsonify({"pin": pin, "state": "HIGH"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/gpio/<int:pin>/off", methods=["POST"])
def gpio_off(pin):
    try:
        gpio = get_gpio(pin)
        gpio.write("0")
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

#necesita mas verificacion , caso si ya agarre el pin 18 por ejemplo
@app.route("/pwm/<int:pin>/init", methods=["POST"])
def api_pwm_init(pin):
    return pwm_init(pin)
   
@app.route("/pwm/<int:pin>/duty", methods=["POST"])
def api_pwm_set_duty(pin):
    data = request.get_json()
    valor = data.get("value")
    if valor is None or not (0 <= valor <= 100):
        return {"error": "El valor de duty cycle debe estar entre 0 y 100"}, 400
    return pwm_set_duty(pin, valor)


@app.route("/pwm/<int:pin>/start", methods=["POST"])
def api_pwm_start(pin):
    return pwm_start(pin)


@app.route("/pwm/<int:pin>/stop", methods=["POST"])
def api_pwm_stop(pin):
    return pwm_stop(pin)
app.run(host="0.0.0.0", port=5000, debug=True)