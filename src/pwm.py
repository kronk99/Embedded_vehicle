
import os
PWM_CHIP_PATH = "/sys/class/pwm/pwmchip0"
PWM_EXPORT = os.path.join(PWM_CHIP_PATH, "export")
PWM_UNEXPORT = os.path.join(PWM_CHIP_PATH, "unexport")
PWM_CHANNEL = "pwm0"

#funcion que inicializa el pwm
def pwm_init(pin):
    if pin != 18:
        return {"error": "Solo GPIO18 soporta PWM hardware con sysfs en pwmchip0/pwm0"}, 400

    if not os.path.exists(os.path.join(PWM_CHIP_PATH, PWM_CHANNEL)):
        with open(PWM_EXPORT, "w") as f:
            f.write("0")
    with open(os.path.join(PWM_CHIP_PATH, PWM_CHANNEL, "period"), "w") as f:
        f.write("20000000")  # período 20ms
    with open(os.path.join(PWM_CHIP_PATH, PWM_CHANNEL, "duty_cycle"), "w") as f:
        f.write("0")
    return {"message": f"PWM inicializado en pin {pin}"}, 200

def pwm_set_duty(pin, valor):
    if pin != 18:
        return {"error": "Solo GPIO18 soporta PWM hardware"}, 400
    period_path = os.path.join(PWM_CHIP_PATH, PWM_CHANNEL, "period")
    duty_path = os.path.join(PWM_CHIP_PATH, PWM_CHANNEL, "duty_cycle")
    try:
        with open(period_path, "r") as f:
            period = int(f.read().strip())
        duty = int((valor / 100.0) * period)
        with open(duty_path, "w") as f:
            f.write(str(duty))
        return {"message": f"Duty cycle establecido a {valor}%"}, 200
    except Exception as e:
        return {"error": str(e)}, 500


def pwm_start(pin):
    if pin != 18:
        return {"error": "Solo GPIO18 soporta PWM hardware"}, 400
    enable_path = os.path.join(PWM_CHIP_PATH, PWM_CHANNEL, "enable")
    with open(enable_path, "w") as f:
        f.write("1")
    return {"message": f"PWM iniciado en pin {pin}"}, 200


def pwm_stop(pin):
    if pin != 18:
        return {"error": "Solo GPIO18 soporta PWM hardware"}, 400
    enable_path = os.path.join(PWM_CHIP_PATH, PWM_CHANNEL, "enable")
    with open(enable_path, "w") as f:
        f.write("0")
    return {"message": f"PWM detenido en pin {pin}"}, 200






"""
# Ejemplo uso
if __name__ == "__main__":
    CON FLASK DEBO DE LLAMAR A CADA UNO DE DICHOS METODOS
    pin = 18
    pwm_init(pin)
    pwm_set_duty(pin, 50)  # 50% duty cycle
    pwm_start(pin)
    input("Presiona Enter para detener PWM...")
    pwm_stop(pin)
PRINCIPALES FUNCIONES :


with open("/sys/class/pwm/pwmchip0/export", "w") as f:
    f.write("0")

with open("/sys/class/pwm/pwmchip0/pwm0/period", "w") as f:
    f.write("20000000")

with open("/sys/class/pwm/pwmchip0/pwm0/duty_cycle", "w") as f:
    f.write("1500000")

with open("/sys/class/pwm/pwmchip0/pwm0/enable", "w") as f:
    f.write("1")

IMPORTANTE CONFIGURAR !!!!!!!!!!!!!!!

comandos: 
sudo nano /boot/firmware/config.txt

Agrega al final esta línea para habilitar PWM en GPIO18:

dtoverlay=pwm,pin=18,func=2
Guarda (Ctrl+O, Enter) y cierra (Ctrl+X).
Reinicia la Pi:

sudo reboot
Después de reiniciar:

ls /sys/class/pwm


Deberías ver algo como pwmchip0.
Vamos a usarlo:

cd /sys/class/pwm/pwmchip0
xportar el canal
echo 0 | sudo tee export


Esto crea la carpeta /sys/class/pwm/pwmchip0/pwm0.


Configurar el periodo y el duty cycle
Ejemplo A: Servo (50 Hz = periodo 20 ms)
cd pwm0
echo 20000000 | sudo tee period         # periodo en ns (20 ms)
echo 1500000  | sudo tee duty_cycle     # pulso 1.5 ms = posición centro
echo 1        | sudo tee enable


 Para mover el servo:

1000000 → ~0° (1 ms)

1500000 → ~90° (1.5 ms)

2000000 → ~180° (2 ms)

5. Desactivar el PWM
Cuando quieras apagarlo:

echo 0 | sudo tee enable
"""