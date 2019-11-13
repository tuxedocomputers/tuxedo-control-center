// Test some of the standard dbus interfaces to make sure the client works
// correctly

let dbus = require('../../');
let bus = dbus.sessionBus();
bus.on('error', (err) => {
  console.log(`got unexpected connection error:\n${err.stack}`);
});

afterAll(() => {
  bus.disconnect();
});

test('lists names on the bus', async () => {
  let object = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
  let iface = object.getInterface('org.freedesktop.DBus');
  expect(iface).toBeDefined();
  let names = await iface.ListNames();
  expect(names.length).toBeGreaterThan(0);
  expect(names).toEqual(expect.arrayContaining(['org.freedesktop.DBus']));
});

test('get stats', async () => {
  let object = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus');
  let iface = object.getInterface('org.freedesktop.DBus.Debug.Stats');
  let stats = await iface.GetStats();
  expect(stats).toBeInstanceOf(Object);
  expect(stats).toHaveProperty('BusNames');
  let busNames = stats['BusNames'];
  expect(busNames).toBeInstanceOf(dbus.Variant);
  expect(busNames.signature).toBe('u');
  expect(busNames.value).toBeGreaterThan(0);
});

test('provided xml', async () => {
  let xml = `
<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN"
    "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/com/example/sample_object0">
    <interface name="com.example.SampleInterface0">
        <method name="Frobate">
            <arg name="foo" type="i" direction="in"/>
            <arg name="bar" type="s" direction="out"/>
            <arg name="baz" type="a{us}" direction="out"/>
            <annotation name="org.freedesktop.DBus.Deprecated" value="true"/>
        </method>
        <method name="Bazify">
            <arg name="bar" type="(iiu)" direction="in"/>
            <arg name="bar" type="v" direction="out"/>
        </method>
        <method name="Mogrify">
            <arg name="bar" type="(iiav)" direction="in"/>
        </method>
        <signal name="Changed">
            <arg name="new_value" type="b"/>
        </signal>
        <signal name="ChangedMulti">
            <arg name="new_value1" type="b"/>
            <arg name="new_value2" type="y"/>
        </signal>
        <property name="Bar" type="y" access="write"/>
    </interface>
    <node name="child_of_sample_object"/>
    <node name="another_child_of_sample_object"/>
</node>
`;
  let object = await bus.getProxyObject('com.example.Sample', '/com/example/sample_object0', xml);

  let iface = object.getInterface('com.example.SampleInterface0');
  expect(object.nodes.length).toEqual(2);
  expect(iface.Frobate).toBeDefined();
  expect(iface.Bazify).toBeDefined();
  expect(iface.Mogrify).toBeDefined();
  expect(iface.$signals.find((s) => s.name == 'Changed')).toBeDefined();
});
