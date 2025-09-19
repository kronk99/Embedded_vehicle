#!/usr/bin/env python3
import subprocess
import time
import os

SSID = "habitec"
PASSWORD = "habitec07"
WPA_CONF = "/tmp/wpa.conf"
INTERFACE = "wlan0"


def run_cmd(cmd: list, check: bool = True):
    """Run a shell command and return its stdout"""
    try:
        result = subprocess.run(cmd, check=check, capture_output=True, text=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] {cmd} -> {e.stderr.strip()}")
        return None


def create_wpa_conf():
    """Generate wpa.conf file using wpa_passphrase"""
    print("[INFO] Generating wpa.conf...")
    with open(WPA_CONF, "w") as f:
        proc = subprocess.Popen(
            ["wpa_passphrase", SSID, PASSWORD],
            stdout=f,
            stderr=subprocess.PIPE,
            text=True
        )
        proc.wait()
    print(f"[INFO] File generated at {WPA_CONF}")


def bring_interface_up():
    """Bring up the wireless interface"""
    print(f"[INFO] Bringing up interface {INTERFACE}...")
    run_cmd(["ip", "link", "set", INTERFACE, "up"], check=False)


def connect_wifi():
    """Run wpa_supplicant in the background"""
    print("[INFO] Starting wpa_supplicant...")
    run_cmd(["wpa_supplicant", "-B", "-i", INTERFACE, "-c", WPA_CONF])


def get_ip():
    """Request IP via DHCP and print it"""
    print("[INFO] Requesting IP address...")
    run_cmd(["dhcpcd", INTERFACE], check=False)
    time.sleep(3)  # give DHCP some time

    ip = run_cmd(["ip", "-4", "addr", "show", INTERFACE])
    if ip:
        for line in ip.splitlines():
            line = line.strip()
            if line.startswith("inet "):
                print(f"[INFO] Assigned IP: {line.split()[1]}")
                return
    print("[WARN] No IP address found.")



def main():
    bring_interface_up()
    create_wpa_conf()
    connect_wifi()
    get_ip()


if __name__ == "__main__":
    main()

