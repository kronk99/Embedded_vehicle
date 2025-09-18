#include "../include/gpioAPI.h"
#include "../include/vehicle.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <poll.h>
#include <fcntl.h>

int main(int argc, char **argv) {
    // Uso: ./vehicle_demo <L_IN1> <L_IN2> <R_IN1> <R_IN2> <GPIO_IN_BOTON> <GPIO_OUT_LED>
    if (argc < 7) {
        printf("Usage: %s <left_in1> <left_in2> <right_in1> <right_in2> <gpio-in> <gpio-out-led>\r\n", argv[0]);
        exit(-1);
    }

    // === Pines de motores (H-bridge) por argv ===
    int left_in1  = atoi(argv[1]);
    int left_in2  = atoi(argv[2]);
    int right_in1 = atoi(argv[3]);
    int right_in2 = atoi(argv[4]);

    // === GPIO de entrada (botón) y salida (LED indicador)===
    unsigned int gpio_out = atoi(argv[6]); // LED
    int gpio_in           = atoi(argv[5]); // botón
    int gpio_in_fd;                        // file descriptor del pin de entrada

    // === Estructura del vehiculo ===
    Vehicle car = {//rutas de GPIO de cada motor.
        .left  = { .in1 = left_in1,  .in2 = left_in2  },
        .right = { .in1 = right_in1, .in2 = right_in2 },
        .led_left  = -1,
        .led_right = -1,
        .led_brake = -1
    };

    // Limpieza por si quedaron residuos de sysfs
    gpio_unexport(gpio_out);
    gpio_unexport(gpio_in);
    gpio_unexport(left_in1);
    gpio_unexport(left_in2);
    gpio_unexport(right_in1);
    gpio_unexport(right_in2);

    // Exportar y configurar direcciones 
    gpio_export(gpio_out);
    gpio_export(gpio_in);
    gpio_set_direction(gpio_out, DIR_OUT);
    gpio_set_direction(gpio_in,  DIR_IN);

    // Configurar LED en HIGH inicial 
    gpio_set_value(gpio_out, VALUE_HIGH);

    // Configurar edge del botón para usar poll 
    gpio_set_edge(gpio_in, EDGE_FALLING); //generar evento cuando el boton pase a 0

    // Obtener FD del value del pin de entrada 
    gpio_in_fd = gpio_get_fd_to_value(gpio_in);//abre el archivo en read-only y da un file descriptor que poll() puede vigilar.

    // Inicializar vehiculo (exporta y pone OUT los pines de motor)
    if (vehicle_init(&car) != 0) {
        printf("Error inicializando vehículo\n");
        close(gpio_in_fd);
        gpio_unexport(gpio_out);
        gpio_unexport(gpio_in);
        return -1;
    }//hace export y direction=out de left/right.in1/in2. Deja ambos motores en stop (0/0).

    struct pollfd fdpoll;
    int num_fdpoll = 1;
    int res;
    int looper = 0; // contador de pulsos: de vueltas del bucle
    char buf[64];   // buffer (OJO: aquí es char buf[64](rreglo real de 64 chars), no char* buf[64])

    printf("Presiona el botón %d veces; en cada pulsación ejecuta un movimiento.\n", 10);
    printf("Secuencia: 0->adelante, 1->izquierda, 2->derecha, 3->atrás, 4->stop y repite...\n");

    while (looper < 10) {
        memset((void *)&fdpoll, 0, sizeof(fdpoll));
        fdpoll.fd = gpio_in_fd;
        fdpoll.events = POLLPRI; // eventos de prioridad (cambio en 'value')

        // Espera con timeout (POLL_TIMEOUT viene del header =10s)
        res = poll(&fdpoll, num_fdpoll, POLL_TIMEOUT);

        if (res < 0) {
            printf("Poll failed...%d\r\n", res);
        }
        if (res == 0) {
            printf("Poll success...timed out or received button press...\r\n");
        }
        if (fdpoll.revents & POLLPRI) { //sysfs GPIO: hubo cambio urgente en value
            // Requerido por sysfs: mover puntero e inmediatamente leer
            lseek(fdpoll.fd, 0, SEEK_SET); //vuelve al inicio del sysfs
            read(fdpoll.fd, buf, sizeof(buf));// come el cambio y vuelve a armar. 
            printf("Received a button press...%d\r\n", looper);

            // En cada pulsación ejecutamos una acción de movimiento
            switch (looper % 5) {//selecciona el movimiento.
                case 0:
                    printf("[MOVE] Adelante\n");
                    vehicle_forward(&car);
                    break;
                case 1:
                    printf("[MOVE] Izquierda (pivot)\n");
                    vehicle_left(&car);
                    break;
                case 2:
                    printf("[MOVE] Derecha (pivot)\n");
                    vehicle_right(&car);
                    break;
                case 3:
                    printf("[MOVE] Atrás\n");
                    vehicle_backward(&car);
                    break;
                case 4:
                default:
                    printf("[MOVE] Stop\n");
                    vehicle_stop(&car);
                    break;
            }
        }

        ++looper;
        fflush(stdout);
    }

    // Apagar y limpiar 
    close(gpio_in_fd);
    vehicle_stop(&car);
    vehicle_cleanup(&car);

    gpio_set_value(gpio_out, VALUE_LOW);
    gpio_unexport(gpio_out);
    gpio_unexport(gpio_in);

    return 0;
}
