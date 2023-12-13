export interface IDBusFanData {
    cpu: FanData;
    gpu1: FanData;
    gpu2: FanData;
  }

export class dbusVariant<T>
{
    public signature: string;
    public value: T;
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
    public speed: TimeData;
    public temp: TimeData;
    constructor(timestamp = 0, speed = 0, temp = 0)
    {
        this.speed = new TimeData(timestamp, speed);
        this.temp = new TimeData(timestamp, temp);
    }
}


/**
 * Structure for timestamped data
 */
export class TimeData {
    public timestamp: dbusVariant<number>;
    public data: number;
    constructor(timestampNumber: number, data:number) {
        this.timestamp = new dbusVariant('x', timestampNumber);
        this.data = data;
    }

}



