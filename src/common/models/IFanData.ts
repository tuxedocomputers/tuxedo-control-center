

export class dbusVariant<T>
{
    signature: string;
    value: T;
    constructor(signature: string, value: T)
    {
        this.signature = signature;
        this.value = value;
    }
}

/**
 * Structure for fan data
 */
export class FanData {
    public speed = new TimeData<number>(0,new  dbusVariant('i', 0));
    public temp = new TimeData<number>(0, new dbusVariant('i', 0));
    export() {
        return exportOwnProperties(this, ['speed', 'temp']);
    }
}


/**
 * Structure for timestamped data
 */
export class TimeData<T> {
    public timestamp: dbusVariant<number>;
    // not sure if timestampnumber can be private, VScode complains about it being unused...
    constructor(timestampNumber: number, public data: dbusVariant<T>) {
        this.timestamp = new dbusVariant('x', timestampNumber);
    }
    set(timestamp: number, data: T) { this.timestamp.value = timestamp; this.data.value = data; }
    export() {
        return exportOwnProperties(this, ['timestamp', 'data']);
    }
}

function exportOwnProperties(obj: object, keys: string[]) {
    const o = {};
    for (const key of keys) {
        if (obj[key].export !== undefined) {
            o[key] = obj[key].export();
        } else {
            o[key] = obj[key];
        }
    }
    return o;
}


