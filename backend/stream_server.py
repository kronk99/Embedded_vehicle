# backend/stream_server.py
import requests
from flask import Flask, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Endpoint directo de snapshot de tu cámara
CAMERA_SNAPSHOT_URL = "http://192.168.18.164:5001/snapshot.jpg"

@app.get("/capture")
def capture():
    """
    Descarga una imagen instantánea del stream remoto y la reenvía como JPEG.
    """
    try:
        r = requests.get(CAMERA_SNAPSHOT_URL, timeout=5)
        r.raise_for_status()
        return Response(r.content, mimetype="image/jpeg")
    except Exception as e:
        return Response(f"Error al obtener captura: {e}", status=500, mimetype="text/plain")

@app.get("/health")
def health():
    return {"ok": True, "snapshot": CAMERA_SNAPSHOT_URL}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
