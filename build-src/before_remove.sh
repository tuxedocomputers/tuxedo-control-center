#!/bin/bash

# Stop and disable services
systemctl disable tccd tccd-sleep || true
systemctl stop tccd || true
