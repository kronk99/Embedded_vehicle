# meta-picamera2/recipes-devtools/python/python3-picamera2/python3-picamera2.bb

SUMMARY = "Python bindings and helpers for libcamera (Picamera2)"
HOMEPAGE = "https://github.com/raspberrypi/picamera2"
LICENSE = "BSD-2-Clause"
LIC_FILES_CHKSUM = "file://LICENSE;md5=6541a38108b5accb25bd55a14e76086d"

inherit pypi setuptools3 pkgconfig

# Picamera2 desde PyPI
PYPI_PACKAGE = "picamera2"
PV = "0.3.17"
SRC_URI[sha256sum] = "10c1ea841f06237c9e6416008300e3709f3c840ecb72994b5a99e398dce08171"


S = "${WORKDIR}/picamera2-${PV}"

# Build-time deps
DEPENDS += " \
    libcamera \
    libcamera-apps \
"

# Runtime deps (sin PyAV real; usamos stub)
RDEPENDS:${PN} += " \
    python3-libcamera \
    python3-numpy \
    python3-pillow \
"

# Empaquetar módulo + vendorizados
FILES:${PN} += " \
    ${PYTHON_SITEPACKAGES_DIR}/picamera2* \
"
