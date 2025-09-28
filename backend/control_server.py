# backend/control_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)  # permitir CORS desde http://localhost:3000 (Next.js)

@app.route("/event", methods=["POST"])
def event():
    """
    Espera JSON:
    {
      "topic": "movement" | "lights" | "blinkers" | "speed",
      "payload": {...}
    }
    Ejemplos:
      movement: {"key":"w","state":"down"} or {"key":"s","state":"up"}
      lights:   {"rear": true, "front": false}
      blinkers: {"left": true, "right": false}
      speed:    {"value": 60}
    """
    data = request.get_json(force=True, silent=True) or {}
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[{now}] EVENT:", data)  # 👉 Se imprime en la consola del servidor
    return jsonify({"ok": True}), 200

if __name__ == "__main__":
    # Escucha en 5001
    app.run(host="0.0.0.0", port=5001, debug=True)
