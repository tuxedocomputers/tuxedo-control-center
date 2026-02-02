#!/bin/bash

# Stop, disable and remove services
systemctl disable tccd tccd-sleep || true
systemctl stop tccd || true
rm /etc/systemd/system/tccd.service || true
rm /etc/systemd/system/tccd-sleep.service || true
systemctl daemon-reload || true

# Remove log and config files if pure uninstall
if [ "$1" = "remove" ] || [ "$1" = "purge" ] || [ "$1" = "0" ]; then
    rm -rf /var/log/tcc/ || true
    rm -rf /var/log/tccd/ || true
    rm -rf /etc/tcc/ || true
fi

# Delete the link to the binary
rm -f '/usr/bin/tuxedo-control-center'
