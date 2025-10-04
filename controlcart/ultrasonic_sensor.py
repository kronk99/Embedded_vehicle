# ultrasonic_sensor.py
import time
from gpio_adapter import GPIOAdapter

class UltrasonicSensor:
    """
    Robust control for an HC-SR04 ultrasonic sensor using GPIOAdapter.
    Includes timeout and safe error handling.
    """

    SPEED_OF_SOUND = 34300  # cm/s (approx. at 20°C)

    def __init__(self, trig_pin=5, echo_pin=6, max_distance_cm=400.0, timeout=0.04):
        self.trig_pin = trig_pin
        self.echo_pin = echo_pin
        self.max_distance_cm = max_distance_cm
        self.timeout = timeout

        try:
            self.trig = GPIOAdapter(trig_pin)
            self.echo = GPIOAdapter(echo_pin)

            self.trig.set_direction("out")
            self.echo.set_direction("in")
            self.trig.write(0)
            time.sleep(0.05)
            self.available = True
        except Exception as e:
            print(f"[ERROR] Failed to initialize sensor (TRIG={trig_pin}, ECHO={echo_pin}): {e}")
            self.available = False

    def _send_pulse(self):
        """Send a 10µs pulse safely."""
        try:
            self.trig.write(1)
            time.sleep(0.00001)
            self.trig.write(0)
        except Exception as e:
            print(f"[WARN] Could not send pulse: {e}")

    def get_distance(self):
        """Measure distance in cm. Returns None if no echo or failure."""
        if not self.available:
            return None

        try:
            self._send_pulse()
            start_time = time.time()

            # Wait for echo to go HIGH
            while self.echo.read() == 0:
                if time.time() - start_time > self.timeout:
                    return None

            pulse_start = time.time()

            # Wait for echo to go LOW
            while self.echo.read() == 1:
                if time.time() - pulse_start > self.timeout:
                    return None

            pulse_end = time.time()
            pulse_duration = pulse_end - pulse_start
            distance = (pulse_duration * self.SPEED_OF_SOUND) / 2

            if distance > self.max_distance_cm or distance < 1:
                return None

            return distance

        except Exception as e:
            print(f"[ERROR] get_distance() failed (TRIG={self.trig_pin}, ECHO={self.echo_pin}): {e}")
            return None

    def get_average_distance(self, samples=5, delay=0.05):
        """Take several measurements and average them."""
        if not self.available:
            return None

        readings = []
        for _ in range(samples):
            d = self.get_distance()
            if d is not None:
                readings.append(d)
            time.sleep(delay)

        if not readings:
            return None

        readings.sort()
        valid = readings[1:-1] if len(readings) > 3 else readings
        return sum(valid) / len(valid)
