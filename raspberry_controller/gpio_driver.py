import os

BASE = 512  # gpiochip0 base en tu sistema

class GPIO:
    def __init__(self, bcm_pin):
        self.bcm_pin = bcm_pin
        self.pin = BASE + bcm_pin
        os.system(f"echo {self.pin} > /sys/class/gpio/export")

    def set_direction(self, direction="out"):
        os.system(f"echo {direction} > /sys/class/gpio/gpio{self.pin}/direction")

    def write(self, value: int):
        os.system(f"echo {value} > /sys/class/gpio/gpio{self.pin}/value")

    def read(self) -> int:
        with open(f"/sys/class/gpio/gpio{self.pin}/value", "r") as f:
            return int(f.read().strip())

    def cleanup(self):
        os.system(f"echo {self.pin} > /sys/class/gpio/unexport")

