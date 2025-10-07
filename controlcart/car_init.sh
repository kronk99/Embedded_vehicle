#!/bin/sh
### BEGIN INIT INFO
# Provides:          car_init
# Required-Start:    connect-wifi $network
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Start car, camera, and ultrasonic APIs after Wi-Fi connection
### END INIT INFO

DAEMON_DIR="/home/controlcart"
LOGFILE="/var/log/car_init.log"

wait_for_network() {
    echo "$(date '+%F %T') [car_init] Waiting for Wi-Fi connection..." >> $LOGFILE
    while true; do
        if ping -c1 -W1 8.8.8.8 >/dev/null 2>&1; then
            echo "$(date '+%F %T') [car_init] Network detected. Continuing startup." >> $LOGFILE
            return 0
        fi
        echo "$(date '+%F %T') [car_init] No connection yet, retrying in 3s..." >> $LOGFILE
        sleep 3
    done
}

start() {
    echo "$(date '+%F %T') [car_init] Starting initialization..." >> $LOGFILE

    # Give connect-wifi a head start
    sleep 10
    wait_for_network

    cd "$DAEMON_DIR" || exit 1
    sleep 5

    # Launch APIs
    nohup python3 car_api.py >/var/log/car_api.log 2>&1 &
    nohup python3 apiCamera.py >/var/log/apiCamera.log 2>&1 &
    nohup python3 apiUltrasonic.py >/var/log/apiUltrasonic.log 2>&1 &

    echo "$(date '+%F %T') [car_init] APIs successfully launched after Wi-Fi connection." >> $LOGFILE
}

stop() {
    echo "$(date '+%F %T') [car_init] Stopping APIs..." >> $LOGFILE
    for pid in $(ps | grep "python3 car_api.py" | grep -v grep | awk '{print $1}'); do kill "$pid"; done
    for pid in $(ps | grep "python3 apiCamera.py" | grep -v grep | awk '{print $1}'); do kill "$pid"; done
    for pid in $(ps | grep "python3 apiUltrasonic.py" | grep -v grep | awk '{print $1}'); do kill "$pid"; done
    echo "$(date '+%F %T') [car_init] APIs stopped." >> $LOGFILE
}

case "$1" in
  start)
    start &
    ;;
  stop)
    stop
    ;;
  restart)
    stop
    sleep 2
    start &
    ;;
  *)
    echo "Usage: /etc/init.d/car_init {start|stop|restart}"
    ;;
esac

exit 0

