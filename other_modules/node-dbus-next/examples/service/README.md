# dbus-next example service

Compile and run with:

```
npm install
npm start
```

Set a property:

```
gdbus call --session --dest org.test.name --object-path /org/test/path \
  --method org.freedesktop.DBus.Properties.Set \
  'org.test.iface' 'MapProperty' "<{'foo':<'bar'>}>"
```

Get a property:

```
gdbus call --session --dest org.test.name --object-path /org/test/path \
  --method org.freedesktop.DBus.Properties.Get \
  'org.test.iface' 'MapProperty'
```
