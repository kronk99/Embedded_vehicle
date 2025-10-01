SUMMARY = "GPIO driver en C hecho por habitecsito"
DESCRIPTION = "Librería compartida simple para controlar GPIO con /sys/class/gpio"
LICENSE = "CLOSED"
PV = "1.0"

SRC_URI = "file://gpio_driver.c \
           file://gpio-symlink.init"

S = "${WORKDIR}"

FILESEXTRAPATHS:prepend := "${THISDIR}/files:"

inherit update-rc.d

INITSCRIPT_NAME = "gpio-symlink"
INITSCRIPT_PARAMS = "defaults 99"

do_compile() {
    ${CC} ${LDFLAGS} -shared -fPIC -Wl,-soname,libgpio.so.1 -o libgpio.so.1.0 gpio_driver.c
}

do_install() {
    install -d ${D}${libdir}
    install -m 0755 libgpio.so.1.0 ${D}${libdir}/

    # instalamos script init
    install -d ${D}${sysconfdir}/init.d
    install -m 0755 ${WORKDIR}/gpio-symlink.init ${D}${sysconfdir}/init.d/gpio-symlink
}

FILES:${PN} += "${libdir}/libgpio.so.1.0 \
                ${sysconfdir}/init.d/gpio-symlink"

INSANE_SKIP:${PN} += "dev-so ldflags"

