#traduccion directa del gpioAPI
import os
#BASE = 512  # gpiochip0 base en tu sistema CONSULTAR ISOLIS.
SYSFS_GPIO_PATH = "/sys/class/gpio"
SYSFS_GPIO_EXPORT_FN = "/export"
SYSFS_GPIO_UNEXPORT_FN = "/unexport"
SYSFS_GPIO_VALUE = "/value"
SYSFS_GPIO_DIRECTION = "/direction"
SYSFS_GPIO_EDGE = "/edge"

DIR_IN = "in"
DIR_OUT = "out"

VALUE_HIGH = "1"
VALUE_LOW = "0"

EDGE_RISING = "rising"
EDGE_FALLING = "falling"

POLL_TIMEOUT = 10 * 1000  # en ms


def gpio_export(pin):
    return file_write(os.path.join(SYSFS_GPIO_PATH, SYSFS_GPIO_EXPORT_FN), str(pin))


def gpio_unexport(pin):
    return file_write(os.path.join(SYSFS_GPIO_PATH, SYSFS_GPIO_UNEXPORT_FN), str(pin))

#ALL DEBE DE ESTAR EN STRINGS 
class GPIO:
    def __init__(self, bcm_pin):
        self.bcm_pin = bcm_pin
        self.gpio_path = os.path.join(SYSFS_GPIO_PATH, f"gpio{bcm_pin}")
        # Exportar el pin para habilitarlo en sysfs
        if not os.path.exists(self.gpio_path):
            with open(os.path.join(SYSFS_GPIO_PATH, SYSFS_GPIO_EXPORT_FN), 'w') as f:
                f.write(str(bcm_pin))

    def set_direction(self, direction):
        path = os.path.join(self.gpio_path, SYSFS_GPIO_DIRECTION)
        with open(path, 'w') as f:
            f.write(direction)

    def set_value(self, value):
        path = os.path.join(self.gpio_path, SYSFS_GPIO_VALUE)
        with open(path, 'w') as f:
            f.write(value)
#esta funcion esta en veremos , no se si funcione por que no la puedo probar.
    def get_value(self):
        path = os.path.join(self.gpio_path, SYSFS_GPIO_VALUE)
        with open(path, 'r') as f:
            return f.read().strip()

    def set_edge(self, edge):
        path = os.path.join(self.gpio_path, SYSFS_GPIO_EDGE)
        with open(path, 'w') as f:
            f.write(edge)

    def unexport(self):
        if os.path.exists(self.gpio_path):
            with open(os.path.join(SYSFS_GPIO_PATH, SYSFS_GPIO_UNEXPORT_FN), 'w') as f:
                f.write(str(self.bcm_pin))