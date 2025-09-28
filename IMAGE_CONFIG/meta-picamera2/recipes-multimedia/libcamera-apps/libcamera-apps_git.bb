SUMMARY = "Userland camera applications for libcamera on Raspberry Pi"
HOMEPAGE = "https://github.com/raspberrypi/libcamera-apps"
LICENSE = "BSD-2-Clause"
LIC_FILES_CHKSUM = "file://license.txt;md5=a0013d1b383d72ba4bdc5b750e7d1d77"

# Evita el sufijo 'git' implícito y fija una carpeta fuente estable
BB_GIT_DEFAULT_DESTSUFFIX = ""
SRC_URI = "git://github.com/raspberrypi/libcamera-apps.git;protocol=https;branch=main;destsuffix=src"
SRCREV = "${AUTOREV}"

S = "${WORKDIR}/src"
B = "${WORKDIR}/build"

inherit meson pkgconfig

DEPENDS = "\
    libcamera \
    boost \
    fmt \
    jpeg \
    tiff \
    libpng \
    v4l-utils \
    libdrm \
    libexif \
    libepoxy \
"

# Meson feature options: enabled/disabled/auto
EXTRA_OEMESON = "\
    -Denable_drm=enabled \
    -Denable_egl=enabled \
    -Denable_qt=disabled \
    -Denable_libav=disabled \
    -Denable_opencv=disabled \
    -Denable_tflite=disabled \
"

do_install() {
    meson install -C ${B} --destdir ${D}
}

# Ejecutables y datos
FILES:${PN} += "\
    ${bindir}/rpicam-* \
    ${datadir}/rpicam-apps \
    ${datadir}/rpi-camera-assets \
    ${libdir}/rpicam_app*.so* \
    ${libdir}/rpicam-apps-postproc/*.so* \
    ${libdir}/rpicam-apps-preview/*.so* \
"

# Runtime: script camera-bug-report requiere Python
RDEPENDS:${PN} += "python3-core"

# El .pc puede contener rutas de build; silenciar QA en -dev
INSANE_SKIP:${PN}-dev += "buildpaths"

# Compatibilidad con nombres antiguos de paquete
RPROVIDES:${PN} += "libcamera-apps rpi-libcamera-apps"

