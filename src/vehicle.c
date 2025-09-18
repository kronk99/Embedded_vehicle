#include "../include/vehicle.h"

static void pin_out(int pin) {
    if (pin < 0) return;
    gpio_unexport(pin);                // limpia por si quedo algo
    gpio_export(pin);
    gpio_set_dir(pin, DIR_OUT);
}

static void write_pin(int pin, const char *val) {
    if (pin < 0) return;
    gpio_set_value(pin, val);
}

static void motor_forward(const MotorPins *m) {
    write_pin(m->in1, VALUE_HIGH);
    write_pin(m->in2, VALUE_LOW);
}

static void motor_backward(const MotorPins *m) {
    write_pin(m->in1, VALUE_LOW);
    write_pin(m->in2, VALUE_HIGH);
}

static void motor_stop(const MotorPins *m) {
    write_pin(m->in1, VALUE_LOW);
    write_pin(m->in2, VALUE_LOW);
}

static void setup_motor(const MotorPins *m) {
    pin_out(m->in1);
    pin_out(m->in2);
}

int vehicle_init(Vehicle *v) {
    if (!v) return -1;
    setup_motor(&v->left);
    setup_motor(&v->right);
    if (v->led_left  >= 0) pin_out(v->led_left);
    if (v->led_right >= 0) pin_out(v->led_right);
    if (v->led_brake >= 0) pin_out(v->led_brake);
    vehicle_stop(v);
    brake_off(v);
    blinker_left_off(v);
    blinker_right_off(v);
    return 0;
}

void vehicle_cleanup(Vehicle *v) {
    if (!v) return;
    vehicle_stop(v);
    brake_off(v);
    blinker_left_off(v);
    blinker_right_off(v);

    // desexportar
    gpio_unexport(v->left.in1);
    gpio_unexport(v->left.in2);
    gpio_unexport(v->right.in1);
    gpio_unexport(v->right.in2);
    if (v->led_left  >= 0) gpio_unexport(v->led_left);
    if (v->led_right >= 0) gpio_unexport(v->led_right);
    if (v->led_brake >= 0) gpio_unexport(v->led_brake);
}

/* ——— Movimientos ——— */

void vehicle_forward(Vehicle *v) {
    if (!v) return;
    brake_off(v);
    motor_forward(&v->left);
    motor_forward(&v->right);
}

void vehicle_backward(Vehicle *v) {
    if (!v) return;
    brake_on(v); // enciende luz de freno al reversar (opcional)
    motor_backward(&v->left);
    motor_backward(&v->right);
}

void vehicle_left(Vehicle *v) {
    if (!v) return;
    blinker_left_on(v);
    // Pivote: izquierdo atrás, derecho adelante (o izquierdo stop)
    motor_backward(&v->left);
    motor_forward(&v->right);
}

void vehicle_right(Vehicle *v) {
    if (!v) return;
    blinker_right_on(v);
    motor_forward(&v->left);
    motor_backward(&v->right);
}

void vehicle_stop(Vehicle *v) {
    if (!v) return;
    motor_stop(&v->left);
    motor_stop(&v->right);
}

/* ——— Luces ——— */

void blinker_left_on(Vehicle *v)  { write_pin(v->led_left,  VALUE_HIGH); }
void blinker_left_off(Vehicle *v) { write_pin(v->led_left,  VALUE_LOW);  }
void blinker_right_on(Vehicle *v) { write_pin(v->led_right, VALUE_HIGH); }
void blinker_right_off(Vehicle *v){ write_pin(v->led_right, VALUE_LOW);  }
void brake_on(Vehicle *v)         { write_pin(v->led_brake, VALUE_HIGH); }
void brake_off(Vehicle *v)        { write_pin(v->led_brake, VALUE_LOW);  }
