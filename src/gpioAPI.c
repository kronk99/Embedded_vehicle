#include "../include/gpioAPI.h"
/*definicion de las funciones*/
/*SPRINTF : Permite generar un string a partir de cadenas de texto, para el acceso por sysfs , se necesita buscar la ruta al file descriptor
por lo que es mas comodo utilizar sprintf para construir la ruta al archivo del pin , por ejemplo si quiero usar el pin 18 tengo que ir a /sys/class/gpio/#depin*/

//funcion que me permite escribir en el file descriptor
static int file_open_and_write_value(const char *fname, const char *wdata) {
    int fd;
    fd = open(fname, O_WRONLY | O_NONBLOCK);
    if(fd < 0) {
        printf("Could not open file %s...%d\r\n",fname,fd);
    }
    write(fd,wdata,strlen(wdata));
    close(fd);
    return 0;
}
//considere las funciones export y unexport como funciones de "activacion" , si quiero habilitar el uso del gpio #10 , tengo que entonces hacer un export
//para que el kernel entienda que se debe de activar ese pin , internamente esto crea el archivo con sysfs para poder interactuar con el pin.
int gpio_export(int gpio_num){
    char gpio_str[4];
    sprintf(gpio_str,"%d",gpio_num);
    return file_open_and_write_value(SYSFS_GPIO_PATH SYSFS_GPIO_EXPORT_FN,gpio_str);
}
//funcion inversa, luego de utilizar un pin se debe de llamar a unexport para deshabilitar el pin , el sistema no esta activado con todos sus componentes siempre
//solo se usa cuando se ocupa, otra manera muy estirada de visualizarlo es un puntero, al usar punteros yo creo punteros, cuando termino de usarlos debo de eliminarlos
//para no consumir memoria, aca es igual solo que con recursos de la rasbpi
int gpio_unexport(int gpio_num){
    char gpio_str[4];
    sprintf(gpio_str,"%d",gpio_num);
    return file_open_and_write_value(SYSFS_GPIO_PATH SYSFS_GPIO_UNEXPORT_FN,gpio_str);
}
//funcion para el direccionamiento del pin , recibe el numero de pin y la direccion para configurarse (IN o OUT), el char 
//es un string con la palabra IN , o la palabra OUT
int gpio_set_dir(int gpio_num, const char* dir){
    char path_str[40]; //cadena para guardar la ruta completa a partir de las constantes de las rutas
    sprintf(path_str,"%s/gpio%d%s",SYSFS_GPIO_PATH,gpio_num,SYSFS_GPIO_DIRECTION); //esto me permite construir un string a partir de las constantes de rutas 
    //y los pines
    return file_open_and_write_value(path_str,dir); //funcion auxiliar, recibe el pathname construido y lo que se va a escribir 
}
//funcion que me permite establecer el valor del pin , si direction esta en modo escritura(OUT), puedo escribir high o low
//si esta en modo lectura (IN) solo puedo leer el valor del pin actual. escdribe low o high y lee 0 o 1
int gpio_set_value(int gpio_num, const char *value){
    char path_str[40];
    sprintf(path_str,"%s/gpio%d%s",SYSFS_GPIO_PATH,gpio_num,SYSFS_GPIO_VALUE);
    return file_open_and_write_value(path_str,value);
}// 0/1

// GPIO SET EDGE , atributo extraño,si esta activo , permite detectar flujos cambiantes entre low y high del pin , lo puedo configurar para que detecte solo el ciclo positivo
//o solo el ciclo negativo (FALTA REALIZAR PRUEBAS CON PWM con este atributo)
int gpio_set_edge(int gpio_num, const char* edge) {
    char path_str[40];
    sprintf(path_str,"%s/gpio%d%s",SYSFS_GPIO_PATH,gpio_num,SYSFS_GPIO_EDGE);
    return file_open_and_write_value(path_str,edge);
}
//metodo para la lectura de los pines, abre el archivo en modo readonly
int gpio_read(int gpio_num){
    int fd;
    char fname[40];
    sprintf(fname,"%s/gpio%d%s",SYSFS_GPIO_PATH,gpio_num,SYSFS_GPIO_VALUE);
    fd = open(fname, O_RDONLY | O_NONBLOCK);
    if(fd < 0) {
        printf("Could not open file %s...%d\r\n",fname,fd);
    }
    return fd;
}