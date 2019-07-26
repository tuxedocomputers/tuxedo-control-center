#!/bin/bash
rm /usr/share/applications/tuxedocc.desktop
cp /opt/tuxedo-control-center/resources/dist/tuxedo-control-center/data/dist-data/tuxedocc.desktop /usr/share/applications/tuxedocc.desktop
cp /opt/tuxedo-control-center/resources/dist/tuxedo-control-center/data/dist-data/de.tuxedocomputers.tcc.policy /usr/share/polkit-1/actions/de.tuxedocomputers.tcc.policy
cp /opt/tuxedo-control-center/resources/dist/tuxedo-control-center/data/dist-data/tccd.service /etc/systemd/system/tccd.service

# chmod +x /opt/tuxedocc/resources/output/dist/data/tuxedocc-pkexec
ln -s /opt/tuxedo-control-center/tuxedo-control-center /usr/bin/tuxedo-control-center
