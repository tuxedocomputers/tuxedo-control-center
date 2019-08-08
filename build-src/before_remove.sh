#!/bin/bash

# Remove log files
rm -rf /var/log/tcc/ || true

# Remove link to GUI
rm -rf /usr/bin/tuxedo-control-center || true

# Remove policy kit and desktop files
rm /usr/share/polkit-1/actions/de.tuxedocomputers.tcc.policy || true
rm /usr/share/applications/tuxedocc.desktop || true

# Disable and remove service
systemctl disable tccd || true
systemctl stop tccd || true
rm /etc/systemd/system/tccd.service || true
systemctl daemon-reload || true
