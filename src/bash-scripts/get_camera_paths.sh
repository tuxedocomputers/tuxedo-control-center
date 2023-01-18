{
OLDIFS=$IFS
pairs=()
for webcam_path in `find /dev -iname 'video*' -printf "%f\n"`
do
    if v4l2-ctl --list-formats --device /dev/$webcam_path | grep -v 'GREY' | grep -qE '\[[0-9]\]'; then
        webcam_id=$(udevadm info --query=all /dev/$webcam_path 2>/dev/null | grep 'VENDOR_ID\|MODEL_ID' | grep -o '....$' | xargs | tr ' ' ':')
        pairs+=(\"$webcam_path\":\"$webcam_id\")
    fi
done
IFS=,
echo "{${pairs[*]}}"
IFS=$OLDIFS
}
