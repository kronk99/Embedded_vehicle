//codigo de ejemplo para el uso de la biblioteca , un led con un boton 
//este codigo va a generar un valor en un pin de salida para un led (pin 17), 
//va a leer el pin 18 esperando una entrada (conectar el circuito simple pushbutton con led y fuente, va a esperar que el boton se presione 10 veces y luego de 10 veces el led se apaga)
#include "gpioAPI.h"
int main(int argc, char **argv) {
    //el siguiente ejemplo se utiliza para 
    unsigned int gpio_out;
    struct pollfd fdpoll; //structs del include de poll, esto es un tipo de syscall para interactuar con los file descriptors
    int num_fdpoll = 1; //el numero de archivos tipo fd (FILE DESCRIPTOR que queremos abstraer)
    int gpio_in, gpio_in_fd; //pin in a leer y su file descriptor
    int res;
    int looper = 0; //contador 
    char *buf[64];  //buffer

    if(argc<3) {
        printf("Usage: gpio_usage_sysfs <gpio-out> <gpio-in>\r\n");
        exit(-1);
    }
//EJEMPLO
    // esto va a leer los 2 primeros argumentos luego de compilar el .c , por ejemplo ./main #pin1 #pin2  -> ./main 17 18 , esto jalaria los pínes 17 y 18 aca
    gpio_out = atoi(argv[1]); //pin de salida (el primer argumento , en el ejemplo el 17)
    gpio_in = atoi(argv[2]); //pin de entrada ( en el segundo argumento del ejemplo es el 18)
//llamo al kernel para que borre las carpertas en el SO, en caso de que existan residuos
    gpio_unexport(gpio_out);
    gpio_unexport(gpio_in);
//Llamo al kernel para que genere las carpetas donde se guardan los fd 
    gpio_export(gpio_out);
    gpio_export(gpio_in);
//configuro las direcciones (VER LAS CONSTANTES EN GPIOAPI.H)
    gpio_set_direction(gpio_out,DIR_OUT);
    gpio_set_direction(gpio_in,DIR_IN);
//seteo los valores de los pines
    gpio_set_value(gpio_out,VALUE_HIGH);
    gpio_set_edge(gpio_in,EDGE_FALLING); //va a leer la señal en el ciclo negativo (reduce rebote en el boton)
//leo el pin y genero su file descriptor
    gpio_in_fd = gpio_get_fd_to_value(gpio_in);

    // Esperamos 10 segundos a que se presione el boton o termina el programa 
    while(looper<10) {
        memset((void *)&fdpoll,0,sizeof(fdpoll));
        fdpoll.fd = gpio_in_fd; //esta funcion lo que hace es decir cual file descriptor voy a observar cambios
        fdpoll.events = POLLPRI; //defino cuales eventos voy a observar, pollpri observa eventos de prioridad / cambiantes

        res = poll(&fdpoll,num_fdpoll,POLL_TIMEOUT); //llamada a la funcion poll

        if(res < 0) { //caso donde no encontro fd
            printf("Poll failed...%d\r\n",res);            
        }
        if(res == 0) { //caso de timeout, la espera es aproximadamente 1 segundo , o si se presiono el boton 
            printf("Poll success...timed out or received button press...\r\n");
        }
        if(fdpoll.revents & POLLPRI) { //revisa en los eventos y busca el pollpri
			lseek(fdpoll.fd, 0, SEEK_SET); //se va al inicio del file descriptor buscando algun evento generado
			read(fdpoll.fd, buf, 64); //lee el evento 
            printf("Received a button press...%d\r\n",looper); //manda mencesa de que se recibio un boton 
        }
        ++looper;
        fflush(stdout);
    }

    close(gpio_in_fd);
    gpio_set_value(gpio_out,VALUE_LOW);
    gpio_unexport(gpio_out);
    gpio_unexport(gpio_in);

    return 0;
}