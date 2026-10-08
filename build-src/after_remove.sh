#!/bin/bash

systemctl daemon-reload || true

# Remove log and config files if pure uninstall
if [ "$1" = "remove" ] || [ "$1" = "purge" ] || [ "$1" = "0" ]; then
    rm -rf /var/log/tcc/ || true
    rm -rf /var/log/tccd/ || true
    rm -rf /etc/tcc/ || true
fi

# Delete the link to the binary
rm -f '/usr/bin/tuxedo-control-center'
