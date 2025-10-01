
import ctypes

# Carga la librería instalada por la receta C
lib = ctypes.CDLL("/usr/lib/libgpio.so")

class GPIOAdapter:
    def __init__(self, bcm_pin):
        self.bcm_pin = bcm_pin
        lib.gpio_export(bcm_pin)

    def set_direction(self, direction="out"):
        lib.gpio_set_direction(self.bcm_pin, direction.encode('utf-8'))

    def write(self, value: int):
        lib.gpio_write(self.bcm_pin, value)

    def read(self) -> int:
        return lib.gpio_read(self.bcm_pin)

    def cleanup(self):
        lib.gpio_unexport(self.bcm_pin)
