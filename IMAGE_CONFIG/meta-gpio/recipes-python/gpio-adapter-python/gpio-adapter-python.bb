SUMMARY = "Adapter Python para libgpio.so"
DESCRIPTION = "Módulo Python que usa ctypes para hablar con libgpio.so"
LICENSE = "CLOSED"

SRC_URI = "file://gpio_adapter.py"
S = "${WORKDIR}"

inherit python3-dir
FILESEXTRAPATHS:prepend := "${THISDIR}/files:"

do_install() {
    install -d ${D}${PYTHON_SITEPACKAGES_DIR}
    install -m 0644 gpio_adapter.py ${D}${PYTHON_SITEPACKAGES_DIR}/gpio_adapter.py
}

FILES:${PN} = "${PYTHON_SITEPACKAGES_DIR}/gpio_adapter.py"
RDEPENDS:${PN} += "python3-core python3-ctypes"
