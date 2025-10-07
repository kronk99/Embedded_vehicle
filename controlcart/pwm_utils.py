import time, threading
from gpio_adapter import GPIOAdapter

class SoftwarePWM:
    def __init__(self, bcm_pin, frequency=100):
        self.gpio = GPIOAdapter(bcm_pin)
        self.gpio.set_direction("out")
        self.frequency = frequency
        self.period = 1.0 / frequency
        self.duty_cycle = 0
        self.running = False
        self.thread = None

    def _loop(self):
        while self.running:
            on_time = self.period * (self.duty_cycle / 100.0)
            off_time = self.period - on_time
            if on_time > 0:
                self.gpio.write(1)
                time.sleep(on_time)
            if off_time > 0:
                self.gpio.write(0)
                time.sleep(off_time)

    def start(self, duty_cycle=0):
        self.set_duty_cycle(duty_cycle)
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._loop, daemon=True)
            self.thread.start()

    def set_duty_cycle(self, duty_cycle):
        self.duty_cycle = max(0, min(100, duty_cycle))

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join()
        self.gpio.write(0)
        self.gpio.cleanup()
