#!/bin/bash

# In case TFC service is active, deactivate
systemctl stop tuxedofancontrol || true
systemctl disable tuxedofancontrol || true

DIST_DATA=/opt/tuxedo-control-center/resources/dist/tuxedo-control-center/data/dist-data

rm /usr/share/applications/tuxedo-control-center.desktop || true
cp ${DIST_DATA}/tuxedo-control-center.desktop /usr/share/applications/tuxedo-control-center.desktop || true

mkdir -p /etc/skel/.config/autostart || true
cp ${DIST_DATA}/tuxedo-control-center-tray.desktop /etc/skel/.config/autostart/tuxedo-control-center-tray.desktop || true

cp ${DIST_DATA}/com.tuxedocomputers.tccd.policy /usr/share/polkit-1/actions/com.tuxedocomputers.tccd.policy || true
cp ${DIST_DATA}/com.tuxedocomputers.tccd.conf /usr/share/dbus-1/system.d/com.tuxedocomputers.tccd.conf || true

cp ${DIST_DATA}/com.tuxedocomputers.tomte.policy /usr/share/polkit-1/actions/com.tuxedocomputers.tomte.policy || true

# Copy and enable services
cp ${DIST_DATA}/tccd.service /etc/systemd/system/tccd.service || true
cp ${DIST_DATA}/tccd-sleep.service /etc/systemd/system/tccd-sleep.service || true
systemctl daemon-reload
systemctl enable tccd tccd-sleep
systemctl restart tccd

# chmod +x /opt/tuxedocc/resources/output/dist/data/tuxedocc-pkexec
ln -s /opt/tuxedo-control-center/tuxedo-control-center /usr/bin/tuxedo-control-center || true
