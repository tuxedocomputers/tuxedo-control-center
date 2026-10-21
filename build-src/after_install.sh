#!/bin/bash

# In case TFC service is active, deactivate
systemctl stop tuxedofancontrol > /dev/null 2>&1 || true
systemctl disable tuxedofancontrol > /dev/null 2>&1 || true

DIST_DATA=/opt/tuxedo-control-center/resources/dist/tuxedo-control-center/data/dist-data

# Enable services
systemctl daemon-reload
systemctl enable tccd tccd-sleep
systemctl restart tccd

# set up udev rules
udevadm control --reload-rules && udevadm trigger

# ---
# Original electron-builder after-install.tpl
# ---
ln -sf '/opt/tuxedo-control-center/tuxedo-control-center' '/usr/bin/tuxedo-control-center' || true

# SUID chrome-sandbox for Electron 5+
chmod 4755 '/opt/tuxedo-control-center/chrome-sandbox' || true

update-mime-database /usr/share/mime || true
update-desktop-database /usr/share/applications || true
