# backend/stream_server.py
import os
import time
from glob import glob
from flask import Flask, Response, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Carpeta de frames
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRAMES_DIR = os.path.join(BASE_DIR, "frames")

# Cargar lista de archivos
# Como tus nombres son ezgif-frame-001.jpg ... ezgif-frame-050.jpg
# el orden lexicográfico ya es correcto.
FRAME_FILES = sorted(glob(os.path.join(FRAMES_DIR, "ezgif-frame-*.jpg")))

if not FRAME_FILES:
    raise RuntimeError(f"No se encontraron frames en {FRAMES_DIR}")

_index = 0
def next_frame_path():
    global _index
    if not FRAME_FILES:
        return None
    path = FRAME_FILES[_index % len(FRAME_FILES)]
    _index += 1
    return path

@app.route("/frame.jpg")
def frame_jpg():
    """
    Devuelve UN frame por petición.
    El front pide /frame.jpg periódicamente y lo dibuja en un <canvas>.
    """
    path = next_frame_path()
    if not path:
        return Response(status=404)
    # No usar 'headers=' dentro de send_file (no existe ese kwarg en tu versión)
    resp = send_file(
        path,
        mimetype="image/jpeg",
        conditional=False,
        etag=False,
        last_modified=None,
        max_age=0,  # ayuda a evitar cache
    )
    # Añade los headers en el objeto response
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp

@app.route("/stream.mjpg")
def stream_mjpg():
    """
    (Opcional) Stream MJPEG multipart para usar con <img src=.../stream.mjpg>.
    """
    boundary = "frame"

    def gen():
        while True:
            path = next_frame_path()
            if not path:
                break
            with open(path, "rb") as f:
                frame = f.read()
            yield (
                b"--" + boundary.encode() + b"\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Cache-Control: no-store\r\n\r\n" + frame + b"\r\n"
            )
            time.sleep(0.12)  # ~8 fps

    return Response(gen(), mimetype=f"multipart/x-mixed-replace; boundary={boundary}")

if __name__ == "__main__":
    # Escucha en 5002
    app.run(host="0.0.0.0", port=5002, debug=True)
