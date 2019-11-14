#!/bin/bash

# Stop, disable and remove services
systemctl disable tccd tccd-sleep || true
systemctl stop tccd || true
rm /etc/systemd/system/tccd.service || true
rm /etc/systemd/system/tccd-sleep.service || true
systemctl daemon-reload || true

# Remove log files
rm -rf /var/log/tcc/ || true
rm -rf /var/log/tccd/ || true

# Remove link to GUI
rm -rf /usr/bin/tuxedo-control-center || true

# Remove policy kit and desktop files
rm /usr/share/polkit-1/actions/de.tuxedocomputers.tcc.policy || true
rm /usr/share/applications/tuxedo-control-center.desktop || true
rm /usr/share/dbus-1/system.d/com.tuxedocomputers.tccd.conf || true
