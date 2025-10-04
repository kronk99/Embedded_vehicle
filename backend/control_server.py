# backend/control_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)  # permitir CORS desde http://localhost:3000 (Next.js)

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route("/event", methods=["POST"])
def event():
    """
    Front envía:
      - Movimiento (W/S sostenidos; A/D pulso 80ms):
        {"topic":"movement","payload":{"key":"w|a|s|d","state":"down|up","dir":"forward|right|reverse|left"}}
      - Luces:
        {"topic":"lights","payload":{"rear":bool,"front":bool}}
      - Direccionales (exclusivos) con teclas J/L o botones:
        {"topic":"blinkers","payload":{"left":bool,"right":bool}}
      - Velocidad (limitada a {0,5,30,60,90,100}):
        {"topic":"speed","payload":{"value":int}}
    """
    data = request.get_json(force=True, silent=True) or {}
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[{now}] EVENT:", data)
    return jsonify({"ok": True}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)


if __name__ == "__main__":
    # Escucha en 5001
    app.run(host="0.0.0.0", port=5001, debug=True)
