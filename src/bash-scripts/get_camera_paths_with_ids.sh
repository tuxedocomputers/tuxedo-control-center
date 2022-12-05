 find_by_id(){
    v=${1%:*}; p=${1#*:}
    v=${v#${v%%[!0]*}}; p=${p#${p%%[!0]*}}
    grep -il "^PRODUCT=$v/$p" /sys/bus/usb/devices/*:*/uevent |
    sed s,uevent,, |
    xargs -r grep -r '^DEVNAME=' --include uevent | grep 'video' | cut -d '=' -f 2- | jq  --raw-input .  | jq --slurp
}
find_by_id $1
