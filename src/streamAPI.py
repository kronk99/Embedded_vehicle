from flask import Flask, Response, jsonify
from picamera import PiCamera
import io
import time
#considerar usos de libjpeg-turbo en la imagen REVISARLOCAL.CONFIG
app = Flask(__name__)

camera = PiCamera()
camera.resolution = (640, 480)
camera.framerate = 24
time.sleep(0.1)

def generate_frames():
    stream = io.BytesIO()
    for _ in camera.capture_continuous(stream, format='jpeg', use_video_port=True):
        stream.seek(0)
        frame_bytes = stream.read()
        stream.seek(0)
        stream.truncate()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route("/")
def index():
    return jsonify({"status": "API streaming Flask activa 🚀"})

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5000, threaded=True)
    finally:
        camera.close()
