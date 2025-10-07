#!/usr/bin/env python3
import os, subprocess, threading, time
from contextlib import suppress
from flask import Flask, Response, jsonify

app = Flask(__name__)

WIDTH  = int(os.getenv("CAM_WIDTH",  "1280"))
HEIGHT = int(os.getenv("CAM_HEIGHT", "720"))
FPS    = int(os.getenv("CAM_FPS",    "30"))

class CameraStream:
    def __init__(self):
        self.proc = None
        self.lock = threading.Lock()
        self.cond = threading.Condition(self.lock)
        self.latest = None       # último frame JPEG (bytes)
        self.seq = 0             # contador de frames
        self.pump_thread = None
        self.running = False

    def _start_proc(self):
        cmd = [
            "rpicam-vid",
            "-t", "0",                    # infinito
            "--codec", "mjpeg",
            "--width", str(WIDTH),
            "--height", str(HEIGHT),
            "--framerate", str(FPS),
            "--nopreview",
            "-o", "-"                     # stdout
        ]
        self.proc = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0
        )

    def _pump(self):
        """Lee stdout, separa JPEGs y publica el último a todos los clientes."""
        buf = bytearray()
        try:
            while self.running and self.proc and self.proc.stdout:
                chunk = self.proc.stdout.read(4096)
                if not chunk:
                    break
                buf.extend(chunk)

                # extrae todos los JPEG completos del buffer
                while True:
                    soi = buf.find(b"\xff\xd8")  # start of image
                    if soi < 0:
                        if len(buf) > 2_000_000:
                            buf.clear()
                        break
                    eoi = buf.find(b"\xff\xd9", soi + 2)  # end of image
                    if eoi < 0:
                        if soi > 0:
                            del buf[:soi]
                        break

                    frame = bytes(buf[soi:eoi+2])
                    del buf[:eoi+2]
                    with self.cond:
                        self.latest = frame
                        self.seq += 1
                        self.cond.notify_all()
        finally:
            with suppress(Exception):
                self.proc.terminate()
            with suppress(Exception):
                self.proc.wait(timeout=2)

    def start(self):
        with self.lock:
            if self.running:
                return
            self.running = True
            self._start_proc()
            self.pump_thread = threading.Thread(target=self._pump, daemon=True)
            self.pump_thread.start()

    def stop(self):
        with self.lock:
            self.running = False
        if self.pump_thread:
            self.pump_thread.join(timeout=2)

    def frames(self):
        """
        Generador para cada cliente: espera nuevos frames y los envía.
        Todos leen del mismo 'latest' — soporta múltiples clientes.
        """
        self.start()
        last = -1
        while True:
            with self.cond:
                # espera un frame nuevo
                if self.seq == last:
                    self.cond.wait(timeout=2.0)
                if self.latest is None:
                    continue
                frame = self.latest
                last = self.seq
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n"
                   b"Content-Length: " + str(len(frame)).encode() + b"\r\n\r\n" +
                   frame + b"\r\n")

    def get_snapshot(self, timeout=3.0):
        """
        Devuelve el último frame si existe; si no, espera a que llegue uno.
        Evita lanzar rpicam-jpeg (que chocaría con el stream).
        """
        self.start()
        t0 = time.time()
        with self.cond:
            while self.latest is None and (time.time() - t0) < timeout:
                self.cond.wait(timeout=timeout)
            return self.latest

cam = CameraStream()

@app.get("/stream.mjpg")
def stream_mjpg():
    return Response(cam.frames(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")

@app.get("/snapshot.jpg")
def snapshot():
    img = cam.get_snapshot()
    if img is None:
        # no llegó ningún frame aún
        return Response("no frame", status=503)
    return Response(img, mimetype="image/jpeg")

@app.get("/")
def index():
    return Response(f"""<!doctype html>
<html><head><meta charset="utf-8"><title>RPi Camera</title></head>
<body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh">
<img src="/stream.mjpg" style="max-width:100%;height:auto;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.5)">
</body></html>""", mimetype="text/html")

@app.get("/healthz")
def health():
    return jsonify(ok=True, width=WIDTH, height=HEIGHT, fps=FPS, streaming=cam.running)

if __name__ == "__main__":
    # Arranque lazy: empieza cuando llega el primer cliente
    app.run(host="0.0.0.0", port=5001, threaded=True)
