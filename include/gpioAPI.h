#include <stdio.h>  // printf(), perror()
#include <stdlib.h> // exit()
#include <string.h> // strlen()
#include <errno.h>  // manejo de errores
#include <unistd.h>  // read(), write(), close()
#include <fcntl.h> // open()
#include <poll.h> // poll()

/*definicion de constantes necesarias para la interfaz sysls*/
#define SYSFS_GPIO_PATH             "/sys/class/gpio"
#define SYSFS_GPIO_EXPORT_FN        "/export"
#define SYSFS_GPIO_UNEXPORT_FN      "/unexport"
#define SYSFS_GPIO_VALUE            "/value"
#define SYSFS_GPIO_DIRECTION        "/direction"
#define SYSFS_GPIO_EDGE             "/edge"

#define DIR_IN                      "in"
#define DIR_OUT                     "out"

#define VALUE_HIGH                  "1"
#define VALUE_LOW                   "0"

#define EDGE_RISING                 "rising"
#define EDGE_FALLING                "falling"

#define POLL_TIMEOUT        10*1000
/*definicion de funciones para la api*/
int gpio_export(int pin);
int gpio_unexport(int pin);
int gpio_set_dir(int pin, int is_output);
int gpio_write(int pin, int value); // 0/1
int gpio_read(int pin); 
