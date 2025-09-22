from flask import Flask , Response
from picamera2 import picamera2
import cv2
app = Flask(__name__)

camara = Picamera2()
camera.configure(camera.create_preview_configuration(main={"format": 'XRGB8888',"size": (640,480)}))
camera.start()

#generador de frames, esto va a tomar capturas por cada ciclo while (rapido) cv2 va a agarrar el array
#de fotos .jpg y lo va a convertir en data stremeable (en un buffer)
#frame contiene los bytes de la imagen 
#yield manda la data.

def generate_frames():
    while True:
        frame = camera.capture_array()
        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
@app.route("/")
def index():
    return jsonify({"status": "API streaming Flask activa 🚀"})
    

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


    