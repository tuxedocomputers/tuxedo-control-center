export namespace interface {
    export class Interface {
        static configureMembers(args: any): void;
        constructor(name?: string);
    }
}

export class Interface {
    static configureMembers(args: any): void;
    // Add other members if needed or allow any
    [key: string]: any;
}

export class Variant<T = any> {
    constructor(signature?: string, value?: T); // Constructor needed too
    signature: string;
    value: T;
}

export interface MessageBus {
    getProxyObject(name: string, path: string): Promise<ProxyObject>;
    disconnect(): void;
    requestName(name: string, flags: number): Promise<number>;
    export(path: string, interface: any): void;
    unexport(path: string, interface: any): void;
}

export interface ClientInterface {
    on(event: string, listener: (...args: any[]) => void): void;
    [key: string]: any; // Allow any method call
}

export interface ProxyObject {
    getInterface(name: string): ClientInterface;
}

export function sessionBus(): MessageBus;
export function systemBus(): MessageBus;


