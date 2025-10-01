#include <stdio.h>
#include <stdlib.h>

#define BASE 512

int gpio_export(int bcm_pin) {
    int pin = BASE + bcm_pin;
    char cmd[64];
    snprintf(cmd, sizeof(cmd), "echo %d > /sys/class/gpio/export", pin);
    return system(cmd);
}

int gpio_unexport(int bcm_pin) {
    int pin = BASE + bcm_pin;
    char cmd[64];
    snprintf(cmd, sizeof(cmd), "echo %d > /sys/class/gpio/unexport", pin);
    return system(cmd);
}

int gpio_set_direction(int bcm_pin, const char* direction) {
    int pin = BASE + bcm_pin;
    char cmd[128];
    snprintf(cmd, sizeof(cmd),
             "echo %s > /sys/class/gpio/gpio%d/direction",
             direction, pin);
    return system(cmd);
}

int gpio_write(int bcm_pin, int value) {
    int pin = BASE + bcm_pin;
    char cmd[128];
    snprintf(cmd, sizeof(cmd),
             "echo %d > /sys/class/gpio/gpio%d/value",
             value, pin);
    return system(cmd);
}

int gpio_read(int bcm_pin) {
    int pin = BASE + bcm_pin;
    char path[128];
    FILE *f;
    int val;
    snprintf(path, sizeof(path), "/sys/class/gpio/gpio%d/value", pin);
    f = fopen(path, "r");
    if (f == NULL) return -1;
    fscanf(f, "%d", &val);
    fclose(f);
    return val;
}
