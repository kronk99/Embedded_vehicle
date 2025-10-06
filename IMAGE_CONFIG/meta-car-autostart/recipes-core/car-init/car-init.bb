SUMMARY = "Car control, camera, and ultrasonic API initialization system"
DESCRIPTION = "Installs and launches all APIs (car, camera, ultrasonic) after Wi-Fi connection."
LICENSE = "CLOSED"
PR = "r8"

SRC_URI = "file://car_init.sh \
           file://car_api.py \
           file://apiCamera.py \
           file://apiUltrasonic.py \
           file://ultrasonic_sensor.py \
           file://pwm_utils.py \
           file://car_controller.py"

S = "${WORKDIR}"

do_install() {
    # Install Python scripts
    install -d ${D}/home/controlcart
    install -m 0755 ${WORKDIR}/car_api.py ${D}/home/controlcart/
    install -m 0755 ${WORKDIR}/apiCamera.py ${D}/home/controlcart/
    install -m 0755 ${WORKDIR}/apiUltrasonic.py ${D}/home/controlcart/
    install -m 0755 ${WORKDIR}/ultrasonic_sensor.py ${D}/home/controlcart/
    install -m 0755 ${WORKDIR}/pwm_utils.py ${D}/home/controlcart/
    install -m 0755 ${WORKDIR}/car_controller.py ${D}/home/controlcart/

    # Install init.d script
    install -d ${D}${sysconfdir}/init.d
    install -m 0755 ${WORKDIR}/car_init.sh ${D}${sysconfdir}/init.d/car_init

    # Create rc.d symlinks for runlevels 2–5
    for lvl in 2 3 4 5; do
        install -d ${D}/etc/rc${lvl}.d
        ln -sf ../init.d/car_init ${D}/etc/rc${lvl}.d/S20car_init
    done
}

FILES:${PN} += "/home/controlcart \
                ${sysconfdir}/init.d/car_init \
                /etc/rc2.d/S20car_init \
                /etc/rc3.d/S20car_init \
                /etc/rc4.d/S20car_init \
                /etc/rc5.d/S20car_init"

