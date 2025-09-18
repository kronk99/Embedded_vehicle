#pragma once
#include "gpioAPI.h"
#include <stdbool.h>
#include <unistd.h> // usleep

typedef struct {
    int in1; // pin control 1 (motor)
    int in2; // pin control 2 (motor)
} MotorPins;

typedef struct {
    MotorPins left;   // motor izquierdo
    MotorPins right;  // motor derecho
    int led_left;     // opcional: direccional izquierda (GPIO)  (-1 si no se usa)
    int led_right;    // opcional: direccional derecha  (GPIO)   (-1 si no se usa)
    int led_brake;    // opcional: luz de freno (GPIO)           (-1 si no se usa)
} Vehicle;

/* Inicialización / limpieza */
int vehicle_init(Vehicle *v);
void vehicle_cleanup(Vehicle *v);

/* Movimiento básico (modo on/off con H-bridge) */
void vehicle_forward(Vehicle *v);
void vehicle_backward(Vehicle *v);
void vehicle_left(Vehicle *v);   // giro: pivote a la izquierda
void vehicle_right(Vehicle *v);  // giro: pivote a la derecha
void vehicle_stop(Vehicle *v);

/* Luces (opcionales; ignora si el pin es -1) */
void blinker_left_on(Vehicle *v);
void blinker_left_off(Vehicle *v);
void blinker_right_on(Vehicle *v);
void blinker_right_off(Vehicle *v);
void brake_on(Vehicle *v);
void brake_off(Vehicle *v);
