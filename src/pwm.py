#BIBLIOTECA DEL GPIO #18 PARA PWM DE HARDWARE , OTROS PINES SON PWM POR SOFTWARE Ajustando tiempos en la CPU o usando temporizadores
#FUNCIONES A CREAR : pwm_init(pin), pwm_set_duty(pin, valor), pwm_start(pin), pwm_stop(pin)
with open("/sys/class/pwm/pwmchip0/export", "w") as f:
    f.write("0")

with open("/sys/class/pwm/pwmchip0/pwm0/period", "w") as f:
    f.write("20000000")

with open("/sys/class/pwm/pwmchip0/pwm0/duty_cycle", "w") as f:
    f.write("1500000")

with open("/sys/class/pwm/pwmchip0/pwm0/enable", "w") as f:
    f.write("1")



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


👉 Para mover el servo:

1000000 → ~0° (1 ms)

1500000 → ~90° (1.5 ms)

2000000 → ~180° (2 ms)

5. Desactivar el PWM
Cuando quieras apagarlo:

echo 0 | sudo tee enable