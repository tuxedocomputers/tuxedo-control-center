#!/bin/bash

# In case TFC service is active, deactivate
systemctl stop tuxedofancontrol > /dev/null 2>&1 || true
systemctl disable tuxedofancontrol > /dev/null 2>&1 || true

# SUID chrome-sandbox for Electron 5+
chmod 4755 '/opt/tuxedo-control-center/chrome-sandbox' || true
