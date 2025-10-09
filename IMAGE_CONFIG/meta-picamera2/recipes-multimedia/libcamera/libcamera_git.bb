SUMMARY = "Camera support library for Linux"
DESCRIPTION = "Libcamera: A complex camera support library for Linux, with a focus on embedded systems such as Raspberry Pi."
HOMEPAGE = "https://libcamera.org/"
LICENSE = "LGPL-2.1-or-later"
LIC_FILES_CHKSUM = "file://LICENSES/LGPL-2.1-or-later.txt;md5=2a4f4fd2128ea2f65047ee63fbca9f68"

SRC_URI = "git://github.com/raspberrypi/libcamera.git;protocol=https;branch=main"
SRCREV = "${AUTOREV}"

S = "${WORKDIR}/git"
B = "${WORKDIR}/build"

inherit meson pkgconfig python3native

DEPENDS = " \
    udev \
    v4l-utils \
    libevent \
    libdrm \
    gnutls \
    openssl \
    libyaml \
    python3 \
    python3-jinja2-native \
    python3-ply-native \
    python3-pyyaml-native \
    python3-pybind11 \
    python3-pybind11-native \
    python3-setuptools-native \
    jpeg \
    fmt \
"

EXTRA_OEMESON = " \
    -Dpipelines=rpi/vc4 \
    -Dv4l2=enabled \
    -Dgstreamer=disabled \
    -Dcam=disabled \
    -Dlc-compliance=disabled \
    -Dpycamera=enabled \
"

FILES:${PN} += "${libdir} ${bindir}"

# Subpaquete con los bindings de Python
PACKAGES =+ "python3-libcamera"

# Lo que Meson instala (según tu log):
#   /usr/lib/python3.12/site-packages/libcamera/_libcamera.so
#   /usr/lib/python3.12/site-packages/libcamera/__init__.py
#   /usr/lib/python3.12/site-packages/libcamera/utils/...
FILES:python3-libcamera = " \                                   
    ${PYTHON_SITEPACKAGES_DIR}/libcamera \                        
    ${PYTHON_SITEPACKAGES_DIR}/libcamera/_libcamera*.so \         
"

RDEPENDS:python3-libcamera = "python3-core"

