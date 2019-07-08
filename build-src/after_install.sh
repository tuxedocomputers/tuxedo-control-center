#!/bin/bash
rm /usr/share/applications/tuxedocc.desktop
cp /opt/tuxedocc/resources/output/dist/data/tuxedocc.desktop /usr/share/applications/tuxedocc.desktop
cp /opt/tuxedocc/resources/output/dist/data/de.tuxedocomputers.tuxedocc.policy /usr/share/polkit-1/actions/de.tuxedocomputers.tuxedocc.policy

# chmod +x /opt/tuxedocc/resources/output/dist/data/tuxedocc-pkexec
ln -s /opt/tuxedocc/tuxedocc /usr/bin/tuxedocc
