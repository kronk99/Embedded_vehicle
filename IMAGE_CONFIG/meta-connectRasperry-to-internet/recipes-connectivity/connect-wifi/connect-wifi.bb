SUMMARY = "Auto Wi-Fi connection script"
DESCRIPTION = "Python script and init.d service to auto-connect Raspberry Pi to Wi-Fi at boot."
LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://${COMMON_LICENSE_DIR}/MIT;md5=0835ade698e0bcf8506ecda2f7b4f302"

SRC_URI = " \
    file://connection.py \
    file://connect-wifi.init \
"

S = "${WORKDIR}"

inherit update-rc.d

INITSCRIPT_NAME = "connect-wifi"
INITSCRIPT_PARAMS = "defaults 99"

do_install() {
    # Install Python script
    install -d ${D}${bindir}
    install -m 0755 ${WORKDIR}/connection.py ${D}${bindir}/connection.py

    # Install init.d script
    install -d ${D}${sysconfdir}/init.d
    install -m 0755 ${WORKDIR}/connect-wifi.init ${D}${sysconfdir}/init.d/connect-wifi
}

# Minimal runtime dependencies
RDEPENDS:${PN} += "python3-core wpa-supplicant iw busybox"

