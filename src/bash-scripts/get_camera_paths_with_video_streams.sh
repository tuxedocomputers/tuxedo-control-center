{
OLDIFS=$IFS
pairs=()
for dev in `find /dev -iname 'video*' -printf "%f\n"`
do
  v4l2-ctl --list-formats --device /dev/$dev | \
    grep -v 'GREY' | grep -qE '\[[0-9]\]' && pairs+=(\"$dev\")
done
IFS=,
echo "[${pairs[*]}]"
IFS=$OLDIFS
}
