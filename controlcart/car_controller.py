import threading, time
from gpio_adapter import GPIOAdapter
from pwm_utils import SoftwarePWM

class CarController:
    def __init__(self, traction_pwm, traction_dir_pins,
                 steering_pwm, steering_dir_pins,
                 lights_pins, frequency=100):
        # PWM de tracción
        self.traction_pwm = SoftwarePWM(traction_pwm, frequency)
        self.traction_pwm.start(0)

        # GPIO dirección de tracción
        self.traction_dir = {name: GPIOAdapter(pin) for name, pin in traction_dir_pins.items()}
        for gpio in self.traction_dir.values():
            gpio.set_direction("out")

        # PWM de steering
        self.steering_pwm = SoftwarePWM(steering_pwm, frequency)
        self.steering_pwm.start(0)

        # GPIO dirección de steering
        self.steering_dir = {name: GPIOAdapter(pin) for name, pin in steering_dir_pins.items()}
        for gpio in self.steering_dir.values():
            gpio.set_direction("out")

        # Luces (incluye direccionales y principales)
        self.lights = {name: GPIOAdapter(pin) for name, pin in lights_pins.items()}
        for gpio in self.lights.values():
            gpio.set_direction("out")

        # Control de blinkers
        self.blink_threads = {}
        self.blink_flags = {}

    # --- Tracción ---
    def move(self, direction, speed=100):
        self.traction_pwm.set_duty_cycle(0)

        if direction == "forward":
            self.traction_dir["in1"].write(1)
            self.traction_dir["in2"].write(0)
            self.traction_pwm.set_duty_cycle(speed)
            return f"Avanzando a {speed}%"

        elif direction == "backward":
            self.traction_dir["in1"].write(0)
            self.traction_dir["in2"].write(1)
            self.traction_pwm.set_duty_cycle(speed)
            return f"Retrocediendo a {speed}%"

        else:
            return "Dirección inválida para tracción"

    # --- Steering con pulso ---
    def steer(self, direction, pulse_ms=200):
        if direction == "left":
            self.steering_dir["in3"].write(1)
            self.steering_dir["in4"].write(0)
        elif direction == "right":
            self.steering_dir["in3"].write(0)
            self.steering_dir["in4"].write(1)
        else:
            return "Dirección inválida para steering"

        def pulse():
            self.steering_pwm.set_duty_cycle(100)
            time.sleep(pulse_ms / 1000.0)
            self.steering_pwm.set_duty_cycle(0)
            self.steering_dir["in3"].write(0)
            self.steering_dir["in4"].write(0)

        threading.Thread(target=pulse, daemon=True).start()
        return f"Girando {direction} con pulso de {pulse_ms}ms"

    # --- Luces ---
    def toggle_light(self, name, state):
        if name not in self.lights:
            return "Luz inválida"

        # Si es blinker (direccionales), manejarlo distinto
        if name in ["left_signal", "right_signal"]:
            if state:  # encender = iniciar parpadeo
                if name in self.blink_threads and self.blink_flags.get(name, False):
                    return f"{name} ya estaba activo"
                self.blink_flags[name] = True
                t = threading.Thread(target=self._blink, args=(name,), daemon=True)
                self.blink_threads[name] = t
                t.start()
                return f"{name} activado en modo blinker"
            else:  # apagar = detener parpadeo
                self.blink_flags[name] = False
                self.lights[name].write(0)
                return f"{name} apagado"
        else:
            # luces normales on/off
            self.lights[name].write(1 if state else 0)
            return f"{name} {'encendida' if state else 'apagada'}"

    def _blink(self, name, interval=0.5):
        while self.blink_flags.get(name, False):
            self.lights[name].write(1)
            time.sleep(interval)
            self.lights[name].write(0)
            time.sleep(interval)

    def stop(self):
        # Tracción
        self.traction_pwm.set_duty_cycle(0)
        for gpio in self.traction_dir.values():
            gpio.write(0)
        # Steering
        self.steering_pwm.set_duty_cycle(0)
        for gpio in self.steering_dir.values():
            gpio.write(0)
        # Luces
        for name, gpio in self.lights.items():
            self.blink_flags[name] = False
            gpio.write(0)
