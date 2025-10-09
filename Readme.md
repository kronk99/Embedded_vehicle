
# Proyect #1 : Custom car embedded System
**Course:** Embedded Systems  
**Students:**  
- Mariana Rojas Rojas  
- Luis Alfredo González Sánchez  
- Andres Molina Redondo
- -Isaac Solis Sandí

---

## Description

This project involves a custom-built embedded system designed for an intelligent vehicle, enabling control through a web-based interface and a tailored operating system developed using Yocto.
---

## Freatures

### 🌐 Embedded Web Server
- Custom-built embedded web server tailored for the vehicle.
- Seamless integration with the user interface for real-time control and monitoring.

### 🔐 Secure Authentication System
- Encrypted and secure authentication mechanism to ensure authorized access to vehicle controls.

### 🚗 Directional Movement Control
- Supports four-directional movement: forward, backward, left, and right.
- Motor control implemented via **PWM (Pulse Width Modulation)** to enable variable speed regulation.

### 📊 Real-Time Status Display
- Web interface displays live updates on vehicle motion and speed.
- Enhances user awareness and operational precision.

### 💡 Intelligent Lighting System
- Smart front and rear lighting system responsive to vehicle state and environmental conditions.

### 🎥 Real-Time Camera Streaming
- Integrated camera system providing live video transmission for enhanced situational awareness.

### 🧰 Custom GPIO Control Library
- Tailored control library for **Raspberry Pi 4 GPIO ports**, enabling precise hardware interaction.

### ⚙️ Automatic Server Execution
- Server application configured to launch automatically upon system power-up, ensuring seamless startup.

### 🖥️ Minimal Custom Linux-Based OS
- Lightweight, purpose-built operating system based on Linux, optimized for embedded performance.

### 🔌 Circuit Design and Power Management
- Electrical schematics and circuitry designed with careful consideration of resource constraints and power consumption.

### 🚙 Custom Vehicle Chassis
- Bespoke chassis engineered for optimal integration with the embedded electronic system.

---

# 🚗 Embedded Vehicle – Installation Guide

This guide explains how to set up and build the Yocto-based Linux image for the **Embedded Vehicle Project** using a Raspberry Pi 4 Model B.

---

### 📦 Prerequisites

- Ubuntu/Debian-based Linux host (Yocto build environment recommended).
- Installed dependencies:  

```bash
sudo apt-get update
sudo apt-get install gawk wget git-core diffstat unzip texinfo gcc-multilib \
     build-essential chrpath socat cpio python3 python3-pip python3-pexpect \
     xz-utils debianutils iputils-ping python3-git python3-jinja2 libegl1-mesa \
     libsdl1.2-dev pylint3 xterm
```
* At least 100 GB free disk space and 8–12 GB RAM.
* Git installed and configured.
###Clone the repository and extract it, on MAIN branch
```bash
git clone <your-repo-url> embedded-vehicle
cd embedded-vehicle
```
### Install the yocto proyect 
```bash
wget https://downloads.yoctoproject.org/releases/yocto/yocto-5.0.10/poky-ac257900c33754957b2696529682029d997a8f28.tar.bz2
```
on meta-poky directory , create 2 new directories , downloads and project 

###Copy the IMAGE_CONFIG directory (from the downloaded repository) into meta-poky 
Make sure your bblayers.conf includes the following layers
```
/home/user/poky/meta
/home/user/poky/meta-poky
/home/user/poky/meta-yocto-bsp
/home/user/poky/meta-raspberrypi
/home/user/poky/meta-openembedded/meta-oe
/home/user/poky/meta-openembedded/meta-python
/home/user/poky/meta-openembedded/meta-networking
/home/user/poky/meta-openembedded/meta-multimedia
/home/user/poky/raspberry-image/meta-connectRasperry-to-internet
/home/user/poky/raspberry-image/meta-picamera2
/home/user/poky/raspberry-image/meta-gpio
/home/user/poky/raspberry-image/meta-car-autostart
```
chage user to your computer user.
### Download Raspberry Pi BSP
Make sure you have the Yocto Raspberry Pi BSP for Raspberry Pi 4 Model B
on meta-poky directory : 
```
git clone -b scarthgap git://git.yoctoproject.org/meta-raspberrypi
```
### ⚙️ Initialize Build Environment
From the root of your Yocto project:
```source oe-init-build-env build
 ```
This sets up the environment and moves you into the build/ directory.
###🏗 Build the Image
Run bitbake to build the custom image:
```
bitbake IMAGE_CONFIG

```
###💾 Deploy to SD Card
Once the build finishes, the image will be located in:
build/tmp/deploy/images/raspberrypi4/
Flash it to an SD card (replace /dev/sdX with your device):
```
sudo dd if=tmp/deploy/images/raspberrypi4/core-image-base-raspberrypi4.rpi-sdimg of=/dev/sdX bs=4M status=progress conv=fsync
```
---
# 🚗 Compile the Project (web page)

### Switch to the correct branch
From your local repository, change to the **web_page** branch:

```bash
git checkout web_page
```
### Set up the Python virtual environment
Activate the virtual environment and install dependencies:

```bash
source .venv/bin/activate
pip install --upgrade pip
pip install Flask flask-cors
```
### Run the Flask APIs
Open three separate terminals, activate the environment in each, and run the servers:

Terminal 1 – Control API
```
bash
source backend/.venv/bin/activate
python backend/control_server.py
Terminal 2 – Stream API
```
```bash
source backend/.venv/bin/activate
python backend/stream_server.py
Terminal 3 – Ultrasonic API
```
```bash
source backend/.venv/bin/activate
python backend/ultrasonic_server.py
```
### Run the React Web Page
Navigate to the React project folder:
```
```bash
cd ~/Documents/empotrados/proy1/Embedded_vehicle/mi-web
Install dependencies (only the first time):
```
###Install dependencies (only the first time):
```bash
npm install
```
###Start the development server:

```bash
npm run dev
5. Access the Application
```
Open your browser and go to:

👉 http://localhost:3000

---
# 🕹️ How to Use the System

Once the Raspberry Pi is running the custom Yocto image and the web application is started, you can control the embedded vehicle through the web interface.

---

## 1. Access the Web Page
- Open your browser and go to:
  👉 [http://localhost:3000](http://localhost:3000)  
- The main dashboard will load, showing the control panel for the vehicle.
- create a new user for the car system (SEE BELOW)

---

## 2. Vehicle Controls
From the web interface you can:

- **Directional Control**: Use the on-screen buttons to move the car **forward, backward, left, and right**.  
- **Camera Stream**: View the live video feed from the Raspberry Pi camera.  
- **Ultrasonic Sensor**: Monitor distance readings in real time to avoid obstacles.  
- **Status Indicators**: Check connectivity and system status (APIs running, sensors active).

---

## 3. System Requirements
- The car must be powered on and connected to the same network as your computer.  
- The three Flask APIs (`control_server.py`, `stream_server.py`, `ultrasonic_server.py`) must be running.  
- The React web page must be active (`npm run dev`).  

---

## 4. Typical Workflow
1. Power on the Raspberry Pi and the vehicle.  
2. Ensure the Flask APIs are running in the background.  
3. Start the React web page.  
4. Open the browser at [http://localhost:3000](http://localhost:3000).  
5. Use the dashboard to control the car and monitor sensors.  

---
## 5 . What you should see 
<img width="766" height="366" alt="image" src="https://github.com/user-attachments/assets/7930a608-0af2-4fce-bc75-015d231c52dc" />
<img width="337" height="269" alt="image" src="https://github.com/user-attachments/assets/4ac3c718-0b59-4324-af23-0e942f1b7447" />


## Final notes:

- This project was designed for Linux-based sistems , and run on a raspberry pi 4 **It has not been tested on other platforms or microprocessors**
- It is recommended that you build your car following the circuit diagram present in this documentation
- If you encounter any issues during project execution or compilation, please verify the dependencies and ensure your operating system version is compatible
- - If the video stream does not appear, check that the **camera module** is enabled and the `picamera2` service is running.  
- If the ultrasonic sensor shows no data, verify the GPIO connections.  
- For SSH access:  
  ```bash
  ssh root@<raspberrypi-ip>```
  ```
---

