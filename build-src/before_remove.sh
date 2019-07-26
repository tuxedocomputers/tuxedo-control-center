#!/bin/bash

rm -rf /var/log/tcc/ || true

rm -rf /usr/bin/tuxedo-control-center || true

rm /usr/share/polkit-1/actions/de.tuxedocomputers.tcc.policy || true
rm /usr/share/applications/tuxedocc.desktop || true
rm /etc/systemd/system/tccd.service  || true
