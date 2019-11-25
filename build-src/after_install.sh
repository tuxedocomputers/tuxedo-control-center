#!/bin/bash
rm /usr/share/applications/tuxedo-control-center.desktop || true
cp /opt/tuxedo-control-center/resources/dist/tuxedo-control-center/data/dist-data/tuxedo-control-center.desktop /usr/share/applications/tuxedo-control-center.desktop || true
cp /opt/tuxedo-control-center/resources/dist/tuxedo-control-center/data/dist-data/de.tuxedocomputers.tcc.policy /usr/share/polkit-1/actions/de.tuxedocomputers.tcc.policy
cp /opt/tuxedo-control-center/resources/dist/tuxedo-control-center/data/dist-data/com.tuxedocomputers.tccd.conf /usr/share/dbus-1/system.d/com.tuxedocomputers.tccd.conf

# Copy and enable services
cp /opt/tuxedo-control-center/resources/dist/tuxedo-control-center/data/dist-data/tccd.service /etc/systemd/system/tccd.service
cp /opt/tuxedo-control-center/resources/dist/tuxedo-control-center/data/dist-data/tccd-sleep.service /etc/systemd/system/tccd-sleep.service
systemctl daemon-reload
systemctl enable tccd tccd-sleep
systemctl start tccd

# chmod +x /opt/tuxedocc/resources/output/dist/data/tuxedocc-pkexec
ln -s /opt/tuxedo-control-center/tuxedo-control-center /usr/bin/tuxedo-control-center
